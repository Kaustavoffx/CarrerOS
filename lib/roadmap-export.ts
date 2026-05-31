import type { jsPDF } from "jspdf";
import type { RoadmapRecord, RoadmapMilestoneRecord, RoadmapResourceLink } from "./supabase/types";
import { validateRoadmapDomainConsistency, auditRoadmapQuality } from "./roadmap-plan";

export type RoadmapExportBundle = {
  json: string;
  markdown: string;
  pdf: {
    filename: string;
    report: RoadmapPdfReport;
  };
};

export type RoadmapPdfReport = {
  title: string;
  exportedAt: string;
  roadmaps: RoadmapRecord[];
  careerGoal?: string | null;
  readinessScore?: number | null;
};

export interface AuditBlob extends Blob {
  valid?: boolean;
  warnings?: string[];
  qualityScore?: number;
}

const CMGEOM_FONT_URL = new URL("../assets/fonts/CMGeom-Regular.ttf", import.meta.url).toString();

const colorsPalette = ["#FFF77F", "#AEFF77", "#77FF92", "#77FFE4", "#77C9FF", "#7777FF", "#C977FF", "#FF77E4", "#FF7792", "#FFAE77"];

function getSafeArray<T>(value: unknown) {
  return Array.isArray(value) ? (value as T[]) : [];
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

async function loadCmGeomFontBase64() {
  if (typeof window === "undefined") {
    const { readFile } = await import("node:fs/promises");
    const { fileURLToPath } = await import("node:url");
    return arrayBufferToBase64(await readFile(fileURLToPath(CMGEOM_FONT_URL)).then((buffer) => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)));
  }

  const response = await fetch(CMGEOM_FONT_URL);
  if (!response.ok) {
    throw new Error(`Failed to load CMGeom font: ${response.status}`);
  }

  return arrayBufferToBase64(await response.arrayBuffer());
}

function formatResourceLinks(roadmap: RoadmapRecord) {
  const resources = getSafeArray<RoadmapResourceLink>(roadmap.resource_links);
  return resources
    .map((resource) => `- [${resource.label}](${resource.url}) - ${resource.provider}`)
    .join("\n");
}

function formatList(items: string[]) {
  const safeItems = getSafeArray<string>(items);
  return safeItems.length ? safeItems.map((item) => `- ${item}`).join("\n") : "- None";
}

function formatMilestonesMarkdown(roadmap: RoadmapRecord) {
  const milestones = getSafeArray<RoadmapMilestoneRecord>(roadmap.milestones);
  return milestones
    .map((milestone) => {
      const criteria = Array.isArray(milestone.completion_criteria) 
        ? milestone.completion_criteria.map((item) => `  - ${item}`).join("\n") 
        : "  - None";
      const outcomes = Array.isArray(milestone.expected_outcomes) 
        ? milestone.expected_outcomes.map((outcome) => `  - ${outcome}`).join("\n") 
        : "  - None";

      return [
        `### ${milestone.title} (${milestone.estimated_duration_weeks} week(s) · ${milestone.difficulty_level})`,
        `Tasks & Criteria:\n${criteria}`,
        `Expected Outcomes:\n${outcomes}`
      ].join("\n\n");
    })
    .join("\n\n");
}

export function buildRoadmapExportBundle(roadmaps: RoadmapRecord[], title = "CareerOS Roadmap"): RoadmapExportBundle {
  const safeRoadmaps = getSafeArray<RoadmapRecord>(roadmaps);
  const exportedAt = new Date().toISOString();
  const json = JSON.stringify(
    {
      title,
      exported_at: exportedAt,
      roadmaps: safeRoadmaps
    },
    null,
    2
  );

  const markdown = [
    `# ${title}`,
    ``,
    `Exported at: ${exportedAt}`,
    ``,
    ...safeRoadmaps.flatMap((roadmap) => [
      `## ${roadmap.title}`,
      `Status: ${roadmap.status}`,
      `Summary: ${roadmap.summary}`,
      `Domain: ${roadmap.career_domain}`,
      `Demand score: ${roadmap.career_demand_score}/100`,
      `Market outlook: ${roadmap.market_outlook}`,
      `Salary range: ${roadmap.salary_range}`,
      `Automation risk: ${roadmap.automation_risk}`,
      `Version: ${roadmap.roadmap_version}`,
      `Total duration: ${roadmap.total_duration_weeks} week(s)`,
      `Weekly hours: ${roadmap.weekly_hours}`,
      `Estimated completion: ${roadmap.estimated_completion_date}`,
      `Weekly structure:\n${formatList(roadmap.weekly_schedule)}`,
      `Learning outcomes:\n${formatList(roadmap.learning_outcomes)}`,
      ``,
      `### Resources`,
      formatResourceLinks(roadmap),
      ``,
      `### Milestones`,
      formatMilestonesMarkdown(roadmap),
      ``,
      `### Expected outcomes`,
      ...roadmap.expected_outcomes.map((outcome) => `- ${outcome}`),
      ``
    ])
  ].join("\n");

  return {
    json,
    markdown,
    pdf: {
      filename: `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "careeros-roadmap"}.pdf`,
      report: {
        title,
        exportedAt,
        roadmaps: safeRoadmaps
      }
    }
  };
}

function drawBadge(doc: jsPDF, text: string, x: number, y: number, bgColor: string, textColor = "#0f172a", fontSize = 7.5) {
  doc.setFont("CMGeom", "normal");
  doc.setFontSize(fontSize);
  const textWidth = doc.getTextWidth(text);
  const paddingX = 4;
  const paddingY = 2;
  const badgeWidth = textWidth + paddingX * 2;
  const badgeHeight = fontSize + paddingY * 2;
  
  doc.setFillColor(bgColor);
  doc.roundedRect(x, y - fontSize - paddingY + 1, badgeWidth, badgeHeight, 2, 2, "F");
  
  doc.setTextColor(textColor);
  doc.text(text, x + paddingX, y - 1);
  
  return badgeWidth;
}

function drawProgressBar(doc: jsPDF, x: number, y: number, width: number, height: number, progress: number, activeColor = "#7777FF", trackColor = "#e2e8f0") {
  doc.setFillColor(trackColor);
  doc.roundedRect(x, y, width, height, height / 2, height / 2, "F");
  
  if (progress > 0) {
    const fillWidth = Math.max(height, (width * Math.min(100, progress)) / 100);
    doc.setFillColor(activeColor);
    doc.roundedRect(x, y, fillWidth, height, height / 2, height / 2, "F");
  }
}

function drawSectionTitle(doc: jsPDF, titleText: string, yVal: number, beforeSpace = 16, afterSpace = 8) {
  const finalY = yVal + beforeSpace;
  doc.setFont("CMGeom", "normal");
  doc.setFontSize(14);
  doc.setTextColor("#0f172a");
  doc.text(titleText, 40, finalY);
  
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(40, finalY + 4, doc.internal.pageSize.getWidth() - 40, finalY + 4);
  
  return finalY + 4 + afterSpace;
}

function drawCareerSnapshot(doc: jsPDF, roadmap: RoadmapRecord, x: number, y: number, width: number) {
  const height = 40;
  
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.setFillColor("#f8fafc");
  doc.roundedRect(x, y, width, height, 4, 4, "FD");
  
  const colW = width / 4;
  
  doc.setFont("CMGeom", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor("#64748b");
  doc.text("DEMAND SCORE", x + 10, y + 13);
  drawBadge(doc, `${roadmap.career_demand_score}/100`, x + 10, y + 29, "#FFF77F", "#0f172a", 7.5);
  
  doc.setDrawColor(226, 232, 240);
  doc.line(x + colW, y + 8, x + colW, y + height - 8);
  
  doc.setFontSize(7.5);
  doc.setTextColor("#64748b");
  doc.text("SALARY RANGE", x + colW + 10, y + 13);
  drawBadge(doc, roadmap.salary_range || "N/A", x + colW + 10, y + 29, "#FF7792", "#0f172a", 7.5);
  
  doc.line(x + colW * 2, y + 8, x + colW * 2, y + height - 8);
  
  doc.setFontSize(7.5);
  doc.setTextColor("#64748b");
  doc.text("MARKET OUTLOOK", x + colW * 2 + 10, y + 13);
  const truncatedOutlook = (roadmap.market_outlook || "Stable").length > 18 
    ? (roadmap.market_outlook || "Stable").substring(0, 15) + "..."
    : (roadmap.market_outlook || "Stable");
  drawBadge(doc, truncatedOutlook, x + colW * 2 + 10, y + 29, "#77C9FF", "#0f172a", 7.5);
  
  doc.line(x + colW * 3, y + 8, x + colW * 3, y + height - 8);
  
  doc.setFontSize(7.5);
  doc.setTextColor("#64748b");
  doc.text("AUTOMATION RISK", x + colW * 3 + 10, y + 13);
  drawBadge(doc, roadmap.automation_risk || "Low", x + colW * 3 + 10, y + 29, "#FFAE77", "#0f172a", 7.5);
  
  return height;
}

export async function generateRoadmapPdfBlob(report: RoadmapPdfReport) {
  const safeRoadmaps = getSafeArray<RoadmapRecord>(report.roadmaps);
  const careerGoal = report.careerGoal || report.title || "Professional Career Plan";

  // Pre-export semantic validation checks (non-blocking)
  let validReport = true;
  const allWarnings: string[] = [];
  
  safeRoadmaps.forEach((roadmap) => {
    const checkResult = validateRoadmapDomainConsistency(roadmap, careerGoal, { throwOnError: false });
    if (!checkResult.valid) {
      validReport = false;
      allWarnings.push(...checkResult.warnings);
    }
  });

  let qualityScore = 100;
  try {
    const auditRes = auditRoadmapQuality(safeRoadmaps, careerGoal);
    qualityScore = auditRes.qualityScore;
  } catch {
    // Suppress quality calculation errors for maximum export safety
  }

  if (allWarnings.length > 0) {
    console.warn("Roadmap PDF export warning(s) detected:", allWarnings);
  }

  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });
  const fontBase64 = await loadCmGeomFontBase64();
  const fontFileName = "CMGeom-Regular.ttf";

  doc.addFileToVFS(fontFileName, fontBase64);
  doc.addFont(fontFileName, "CMGeom", "normal");
  doc.setFont("CMGeom", "normal");

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margins = { top: 40, right: 40, bottom: 40, left: 40 };
  const contentWidth = pageWidth - margins.left - margins.right;
  const centerX = pageWidth / 2;

  let totalContentHeight = 0;

  function drawPageFrame(pageNum: number, totalPagesCount: number) {
    doc.setFont("CMGeom", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor("#94a3b8");
    
    doc.text("CAREEROS PROFESSIONAL ROADMAP", margins.left, 24);
    
    // Draw Quality Review Recommended badge if invalid
    if (!validReport) {
      const labelText = "QUALITY REVIEW RECOMMENDED";
      doc.setFont("CMGeom", "normal");
      doc.setFontSize(6.5);
      const textW = doc.getTextWidth(labelText);
      const paddingX = 4;
      const paddingY = 2;
      const badgeW = textW + paddingX * 2;
      const badgeH = 6.5 + paddingY * 2;
      const badgeX = margins.left + 155; // aligned next to CAREEROS PROFESSIONAL ROADMAP text
      
      doc.setFillColor("#FFAE77"); // Mac & Cheese
      doc.roundedRect(badgeX, 24 - 6.5 - paddingY + 1, badgeW, badgeH, 1.5, 1.5, "F");
      
      doc.setTextColor("#0f172a");
      doc.text(labelText, badgeX + paddingX, 24 - 1);
      
      // Reset font for subtitle
      doc.setFont("CMGeom", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor("#94a3b8");
    }
    
    doc.text("RECRUITER-READY ACTIONABLE STUDY PLAN", pageWidth - margins.right, 24, { align: "right" });
    
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(margins.left, 28, pageWidth - margins.right, 28);
    
    doc.line(margins.left, pageHeight - 28, pageWidth - margins.right, pageHeight - 28);
    doc.text("CareerOS © 2026", margins.left, pageHeight - 16);
    doc.text(`Page ${pageNum} of ${totalPagesCount}`, pageWidth - margins.right, pageHeight - 16, { align: "right" });
  }

  let y = 56;

  // ==========================================
  // PAGE 1: EXECUTIVE ROADMAP OVERVIEW
  // ==========================================
  doc.setFontSize(24);
  doc.setTextColor("#0f172a");
  doc.text("CAREER ROADMAP REPORT", centerX, y, { align: "center" });
  totalContentHeight += 24;
  y += 16;
  
  doc.setFontSize(9);
  doc.setTextColor("#64748b");
  doc.text(`GENERATED ON ${new Date(report.exportedAt).toLocaleDateString()}  ·  VERIFIED BY CAREEROS`, centerX, y, { align: "center" });
  totalContentHeight += 9;
  y += 24;

  const readinessScore = report.readinessScore || 0;
  const totalDuration = safeRoadmaps.reduce((sum, rm) => sum + (rm.total_duration_weeks || 0), 0);
  const avgWeeklyHours = safeRoadmaps.length 
    ? Math.round(safeRoadmaps.reduce((sum, rm) => sum + (rm.weekly_hours || 0), 0) / safeRoadmaps.length)
    : 0;

  // McKinsey Executive Card
  const cardHeight = 56;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.setFillColor("#f8fafc");
  doc.roundedRect(margins.left, y, contentWidth, cardHeight, 4, 4, "FD");

  doc.setFontSize(7.5);
  doc.setTextColor("#64748b");
  doc.text("CAREER GOAL", margins.left + 16, y + 16);
  doc.setFontSize(11);
  doc.setTextColor("#0f172a");
  const truncatedGoal = careerGoal.length > 40 ? careerGoal.substring(0, 37) + "..." : careerGoal;
  doc.text(truncatedGoal, margins.left + 16, y + 28);
  doc.setFontSize(9);
  doc.setTextColor("#475569");
  doc.text(`Domain: ${safeRoadmaps[0]?.career_domain || "Tech/Business"}`, margins.left + 16, y + 42);

  doc.line(margins.left + 240, y + 10, margins.left + 240, y + cardHeight - 10);

  doc.setFontSize(7.5);
  doc.setTextColor("#64748b");
  doc.text("READINESS SCORE", margins.left + 256, y + 16);
  const readinessColor = readinessScore >= 80 ? "#77FF92" : readinessScore >= 50 ? "#FFF77F" : "#FFAE77";
  drawBadge(doc, `${readinessScore}% READY`, margins.left + 256, y + 33, readinessColor, "#0f172a", 8);

  doc.line(margins.left + 368, y + 10, margins.left + 368, y + cardHeight - 10);

  doc.setFontSize(7.5);
  doc.setTextColor("#64748b");
  doc.text("TIMELINE & CAPACITY", margins.left + 384, y + 16);
  doc.setFontSize(10);
  doc.setTextColor("#0f172a");
  doc.text(`${totalDuration} Weeks total`, margins.left + 384, y + 28);
  doc.setFontSize(9);
  doc.setTextColor("#475569");
  doc.text(`${avgWeeklyHours} Hours / week`, margins.left + 384, y + 42);

  totalContentHeight += cardHeight;
  y += cardHeight + 16;

  // Career Snapshot Dashboard Panel
  y = drawSectionTitle(doc, "CAREER SNAPSHOT", y, 16, 8);
  totalContentHeight += 24;

  const firstRoadmap = safeRoadmaps[0];
  if (firstRoadmap) {
    const snapH = drawCareerSnapshot(doc, firstRoadmap, margins.left, y, contentWidth);
    totalContentHeight += snapH;
    y += snapH + 16;
  }

  // Development Pathway Sprints Overview
  y = drawSectionTitle(doc, "HIGH-LEVEL DEVELOPMENT PATHWAY", y, 16, 8);
  totalContentHeight += 24;

  let sprintsData: {
    title: string;
    summary: string;
    weeks: number;
    hours: number;
    status: string;
    progress: number;
    milestones: RoadmapMilestoneRecord[];
  }[] = [];

  if (safeRoadmaps.length === 1) {
    const rm = safeRoadmaps[0];
    const ms = getSafeArray<RoadmapMilestoneRecord>(rm.milestones);
    const count = ms.length;
    const size1 = Math.ceil(count / 3);
    const size2 = Math.ceil((count - size1) / 2);
    
    sprintsData = [
      {
        title: "Sprint 01: Core Foundations & Setup",
        summary: `Establish technical baseline skills, execute workspace setup, and verify basic syntax capabilities.`,
        weeks: ms.slice(0, size1).reduce((sum, m) => sum + m.estimated_duration_weeks, 0) || 4,
        hours: rm.weekly_hours || 12,
        status: rm.status === "Done" ? "Done" : "Active",
        progress: rm.progress >= 33 ? 100 : Math.round(rm.progress * 3),
        milestones: ms.slice(0, size1)
      },
      {
        title: "Sprint 02: Portfolio Projects & Applications",
        summary: `Construct hands-on software platforms, wireframes, or analytic queries to construct demonstrable assets.`,
        weeks: ms.slice(size1, size1 + size2).reduce((sum, m) => sum + m.estimated_duration_weeks, 0) || 4,
        hours: rm.weekly_hours || 12,
        status: rm.status === "Done" ? "Done" : rm.progress >= 33 ? "Active" : "Planned",
        progress: rm.progress >= 66 ? 100 : rm.progress < 33 ? 0 : Math.round((rm.progress - 33) * 3),
        milestones: ms.slice(size1, size1 + size2)
      },
      {
        title: "Sprint 03: Advanced Systems & Interview Prep",
        summary: `Deploy live solutions, model scale configurations, and practice mock loops for recruitment story loops.`,
        weeks: ms.slice(size1 + size2).reduce((sum, m) => sum + m.estimated_duration_weeks, 0) || 4,
        hours: rm.weekly_hours || 12,
        status: rm.status === "Done" ? "Done" : rm.progress >= 66 ? "Active" : "Planned",
        progress: rm.progress >= 100 ? 100 : rm.progress < 66 ? 0 : Math.round((rm.progress - 66) * 3),
        milestones: ms.slice(size1 + size2)
      }
    ];
  } else {
    sprintsData = safeRoadmaps.map((rm, idx) => ({
      title: `Sprint ${String(idx + 1).padStart(2, "0")}: ${rm.title}`,
      summary: rm.summary || `Phase targeting ${rm.career_domain} capability.`,
      weeks: rm.total_duration_weeks || 4,
      hours: rm.weekly_hours || 12,
      status: rm.status,
      progress: rm.progress || 0,
      milestones: getSafeArray<RoadmapMilestoneRecord>(rm.milestones)
    }));
  }

  sprintsData.forEach((sprint, index) => {
    const rowH = 32;
    doc.setFillColor("#f8fafc");
    doc.roundedRect(margins.left, y, contentWidth, rowH, 3, 3, "F");

    const indexColor = colorsPalette[(index + 4) % colorsPalette.length]; // Progress color mapping (Slate Blue/Maya Blue)
    const sBadgeW = drawBadge(doc, `SPRINT ${String(index + 1).padStart(2, "0")}`, margins.left + 10, y + 20, indexColor, "#0f172a", 7.5);
    
    doc.setFont("CMGeom", "normal");
    doc.setFontSize(10);
    doc.setTextColor("#0f172a");
    const sprintTitleText = sprint.title.length > 50 ? sprint.title.substring(0, 47) + "..." : sprint.title;
    doc.text(sprintTitleText, margins.left + 10 + sBadgeW + 8, y + 19);

    doc.setFontSize(8.5);
    doc.setTextColor("#64748b");
    doc.text(`Duration: ${sprint.weeks} wks  ·  ${sprint.hours} hrs/wk`, margins.left + 10 + sBadgeW + 8, y + 28);

    const statusColors: Record<string, string> = {
      Active: "#AEFF77", // Success - French Lime
      Done: "#77FF92",   // Success - Mint Green
      Planned: "#77FFE4" // Status - Aquamarine
    };
    const sColor = statusColors[sprint.status] || "#77FFE4";
    drawBadge(doc, sprint.status.toUpperCase(), margins.left + contentWidth - 64, y + 20, sColor, "#0f172a", 7.5);

    totalContentHeight += rowH;
    y += rowH + 8;
  });

  y += 8;

  y = drawSectionTitle(doc, "EXECUTIVE ROADMAP OBJECTIVE", y, 16, 8);
  totalContentHeight += 24;

  doc.setFontSize(9.5);
  doc.setTextColor("#475569");
  const baselinePurposeText = `This report details the highly structured learning progression resolved for the target career path. By pacing milestones through individual sprints, the student accumulates demonstrable portfolio assets and practices core technical behaviors required by industry-grade recruitment teams. Use the subsequent pages as a weekly planner and deliverables checklist.`;
  const wrappedPurpose = doc.splitTextToSize(baselinePurposeText, contentWidth);
  doc.text(wrappedPurpose, margins.left, y);
  totalContentHeight += wrappedPurpose.length * 12;

  // ==========================================
  // PAGES 2 TO 4: DEDICATED SPRINT PAGES
  // ==========================================
  sprintsData.forEach((sprint, sIndex) => {
    doc.addPage();
    y = 56;

    y = drawSectionTitle(doc, sprint.title.toUpperCase(), y, 16, 8);
    totalContentHeight += 24;

    // Sprint Stats Card
    const statsCardH = 32;
    doc.setFillColor("#f8fafc");
    doc.roundedRect(margins.left, y, contentWidth, statsCardH, 4, 4, "F");

    doc.setFontSize(7.5);
    doc.setTextColor("#64748b");
    doc.text("DURATION", margins.left + 12, y + 12);
    doc.setFontSize(10);
    doc.setTextColor("#0f172a");
    doc.text(`${sprint.weeks} Weeks`, margins.left + 12, y + 24);

    doc.setFontSize(7.5);
    doc.setTextColor("#64748b");
    doc.text("COMMITMENT", margins.left + 112, y + 12);
    doc.setFontSize(10);
    doc.setTextColor("#0f172a");
    doc.text(`${sprint.hours} hrs/wk`, margins.left + 112, y + 24);

    doc.setFontSize(7.5);
    doc.setTextColor("#64748b");
    doc.text("STATUS", margins.left + 220, y + 12);
    const statusColors: Record<string, string> = {
      Active: "#AEFF77",
      Done: "#77FF92",
      Planned: "#77FFE4"
    };
    const sColor = statusColors[sprint.status] || "#77FFE4";
    drawBadge(doc, sprint.status.toUpperCase(), margins.left + 220, y + 24, sColor, "#0f172a", 7.5);

    doc.setFontSize(7.5);
    doc.setTextColor("#64748b");
    doc.text("COMPLETION PROGRESS", margins.left + 332, y + 12);
    drawProgressBar(doc, margins.left + 332, y + 17, 100, 5, sprint.progress, "#7777FF", "#e2e8f0");
    doc.setFontSize(10);
    doc.setTextColor("#0f172a");
    doc.text(`${sprint.progress}%`, margins.left + 442, y + 23);

    totalContentHeight += statsCardH;
    y += statsCardH + 16;

    // Weekly Syllabus Planner
    y = drawSectionTitle(doc, "WEEKLY PLANNER & SYLLABUS", y, 16, 8);
    totalContentHeight += 24;

    doc.setFontSize(9.5);
    doc.setTextColor("#475569");
    const colWidth = contentWidth / 2;
    sprint.milestones.forEach((m, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const itemX = margins.left + col * colWidth;
      const itemY = y + row * 14;
      const truncMTitle = m.title.length > 32 ? m.title.substring(0, 29) + "..." : m.title;
      doc.text(`• Phase ${idx + 1}: ${truncMTitle} (${m.estimated_duration_weeks} wks)`, itemX, itemY);
    });

    const plannerRows = Math.ceil(sprint.milestones.length / 2);
    const plannerH = Math.max(1, plannerRows) * 14;
    totalContentHeight += plannerH;
    y += plannerH + 16;

    // Sprints Milestones Cards
    y = drawSectionTitle(doc, "CORE SPRINT MILESTONES & PROJECTS", y, 16, 8);
    totalContentHeight += 24;

    sprint.milestones.forEach((milestone, mIdx) => {
      const mileCardH = 64;
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.4);
      doc.setFillColor("#ffffff");
      doc.roundedRect(margins.left, y, contentWidth, mileCardH, 4, 4, "FD");

      const mColor = colorsPalette[(sIndex * 3 + mIdx) % colorsPalette.length];
      const mBadgeW = drawBadge(doc, `M${String(mIdx + 1).padStart(2, "0")}`, margins.left + 12, y + 16, mColor, "#0f172a", 7.5);

      doc.setFont("CMGeom", "normal");
      doc.setFontSize(10.5);
      doc.setTextColor("#0f172a");
      doc.text(milestone.title, margins.left + 12 + mBadgeW + 6, y + 13);
      
      doc.setFontSize(8.5);
      doc.setTextColor("#64748b");
      const inlineMeta = `(${milestone.estimated_duration_weeks} wk · ${milestone.difficulty_level})`;
      doc.text(inlineMeta, margins.left + 12 + mBadgeW + 6 + doc.getTextWidth(milestone.title) + 6, y + 13);

      doc.setFontSize(8.5);
      doc.setTextColor("#64748b");
      const italicWhy = `Objective: ${milestone.why_it_matters}`;
      const truncatedWhy = italicWhy.length > 105 ? italicWhy.substring(0, 102) + "..." : italicWhy;
      doc.text(truncatedWhy, margins.left + 12, y + 26);

      doc.setFontSize(9);
      doc.setTextColor("#475569");
      const tasks = getSafeArray<string>(milestone.completion_criteria).concat(getSafeArray<string>(milestone.project_tasks)).concat(getSafeArray<string>(milestone.deliverables));
      const uniqueTasks = Array.from(new Set(tasks)).slice(0, 2);
      
      uniqueTasks.forEach((task, tIdx) => {
        const taskX = margins.left + 12;
        const taskY = y + 38 + tIdx * 11;
        const wrappedTask = task.length > 110 ? task.substring(0, 107) + "..." : task;
        doc.text(`- ${wrappedTask}`, taskX, taskY);
      });

      totalContentHeight += mileCardH;
      y += mileCardH + 8;
    });

    y += 8;

    // Sprint bibliography / resources
    y = drawSectionTitle(doc, "RECOMMENDED LEARNING & ACADEMIC DIRECTORY", y, 16, 8);
    totalContentHeight += 24;

    const resourceLinks = sprint.milestones.flatMap(m => getSafeArray<RoadmapResourceLink>(m.resource_links));
    const uniqueResources = Array.from(new Map(resourceLinks.map(r => [r.url, r])).values()).slice(0, 4);

    doc.setFontSize(9.5);
    doc.setTextColor("#475569");
    
    if (uniqueResources.length) {
      uniqueResources.forEach((res, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const resX = margins.left + col * colWidth;
        const resY = y + row * 14;
        const labelText = res.label.length > 30 ? res.label.substring(0, 27) + "..." : res.label;
        doc.text(`• [${res.provider}] ${labelText}`, resX, resY);
      });
      const resH = Math.ceil(uniqueResources.length / 2) * 14;
      totalContentHeight += resH;
      y += resH + 16;
    } else {
      doc.text("• General verified online documentation & industry guidelines.", margins.left, y);
      totalContentHeight += 14;
      y += 24;
    }

    // Sprint Outcomes
    y = drawSectionTitle(doc, "EXPECTED SPRINT OUTCOMES", y, 16, 8);
    totalContentHeight += 24;

    const sprintOutcomes = Array.from(new Set(sprint.milestones.flatMap(m => getSafeArray<string>(m.expected_outcomes)))).slice(0, 3);
    doc.setFontSize(9.5);
    doc.setTextColor("#475569");
    if (sprintOutcomes.length) {
      sprintOutcomes.forEach((outcome, idx) => {
        const wrappedOutcome = outcome.length > 110 ? outcome.substring(0, 107) + "..." : outcome;
        doc.text(`[ ]  ${wrappedOutcome}`, margins.left, y + idx * 14);
      });
      const outH = sprintOutcomes.length * 14;
      totalContentHeight += outH;
    } else {
      doc.text("[ ] Accumulation of key domain credentials and demonstrable work.", margins.left, y);
      totalContentHeight += 14;
    }
  });

  // ==========================================
  // PAGE 5: FINAL PAGE CAREER READINESS CHECKLIST
  // ==========================================
  doc.addPage();
  y = 56;

  y = drawSectionTitle(doc, "CAREER READINESS PORTFOLIO CHECKLIST", y, 16, 8);
  totalContentHeight += 24;

  doc.setFontSize(8.5);
  doc.setTextColor("#64748b");
  doc.text("PORTFOLIO DELIVERABLES & INTERVIEW VERIFICATION DIRECTORY", margins.left, y);
  totalContentHeight += 9;
  y += 16;

  y = drawSectionTitle(doc, "PORTFOLIO PROJECTS & ARTIFACT DEVELOPMENT", y, 16, 8);
  totalContentHeight += 24;

  const aggregatedProjects: string[] = [];
  safeRoadmaps.forEach((rm) => {
    getSafeArray<RoadmapMilestoneRecord>(rm.milestones).forEach((mile) => {
      getSafeArray<string>(mile.projects).forEach((proj) => {
        if (proj && !aggregatedProjects.includes(proj)) {
          aggregatedProjects.push(proj);
        }
      });
      getSafeArray<string>(mile.deliverables).forEach((deliv) => {
        if (deliv && !aggregatedProjects.includes(deliv)) {
          aggregatedProjects.push(deliv);
        }
      });
    });
  });

  const uniqueProjects = Array.from(new Set(aggregatedProjects)).slice(0, 8);
  doc.setFontSize(9.5);
  doc.setTextColor("#475569");
  
  if (uniqueProjects.length) {
    const colWidth = contentWidth / 2;
    uniqueProjects.forEach((proj, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const projX = margins.left + col * colWidth;
      const projY = y + row * 15;
      const truncatedProj = proj.length > 46 ? proj.substring(0, 43) + "..." : proj;
      doc.text(`[ ]  ${truncatedProj}`, projX, projY);
    });
    const projH = Math.ceil(uniqueProjects.length / 2) * 15;
    totalContentHeight += projH;
    y += projH + 24;
  } else {
    doc.text("[ ] Build core domain application modules as portfolio assets.", margins.left, y);
    totalContentHeight += 15;
    y += 32;
  }

  y = drawSectionTitle(doc, "INTERVIEW READINESS & CORE SYSTEM CAPABILITIES", y, 16, 8);
  totalContentHeight += 24;

  const domainLabel = safeRoadmaps[0]?.career_domain || "Tech/Business";
  const goalText = careerGoal.toLowerCase();
  const isSde = ["software", "engineering", "sde", "developer", "swe", "programming", "computer"].some(term => domainLabel.toLowerCase().includes(term) || goalText.includes(term));
  const isUx = ["design", "ux", "ui", "product design", "interaction", "experience"].some(term => domainLabel.toLowerCase().includes(term) || goalText.includes(term));
  const isData = ["data", "analytics", "bi", "analysis", "reporting", "dashboard", "sql"].some(term => domainLabel.toLowerCase().includes(term) || goalText.includes(term));
  const isPm = ["product", "pm", "roadmap", "discovery"].some(term => domainLabel.toLowerCase().includes(term) || goalText.includes(term));
  const isMarketing = ["marketing", "growth", "seo", "brand", "campaign"].some(term => domainLabel.toLowerCase().includes(term) || goalText.includes(term));

  let readinessPoints = [
    "Domain specific standard capability assessment passed",
    "Hands-on portfolio website showing 3 structural projects",
    "Resume packaged, proofread, and ready for recruitment",
    "Core system architecture and operational concepts verified",
    "Project storytelling script and behavioral question answers prepared",
    "Application tracker operational with 10 active lead pipelines"
  ];

  if (isSde) {
    readinessPoints = [
      "Projects Built: 3 complete full stack or developer tools packaged",
      "GitHub Ready: semantic commit history and detailed structural READMEs",
      "Resume Ready: tech stack matched and SDE keyword optimized",
      "DSA Ready: arrays, hash maps, complexity, and mock patterns verified",
      "System Design Ready: relational modeling, APIs, and client-server tradeoffs resolved",
      "Interview Ready: mock loops, storytelling, and behavioral scripts prepared"
    ];
  } else if (isUx) {
    readinessPoints = [
      "Figma Case Studies: 3 structured mobile or web interface flows deployed",
      "Design System Ready: complete reusable component library with typography assets",
      "Resume Ready: UX portfolio link verified and visual design metrics optimized",
      "Wireframing Ready: information architecture, interactive prototypes, and layout systems",
      "Usability Ready: user research, feedback synthesis, and visual audit metrics",
      "Interview Ready: portfolio walkthrough presentation and behavioral stories resolved"
    ];
  } else if (isData) {
    readinessPoints = [
      "Analysis Shipped: 2 comprehensive analysis notebooks or statistics reviews",
      "Dashboard Ready: interactive Power BI or Tableau business intelligence dashboards",
      "Resume Ready: analytics achievements, database performance, and conversion metrics optimized",
      "SQL Query Ready: relational joins, groupings, and data modeling pipelines verified",
      "Data Storytelling Ready: data visualization layouts, cohort retention, and funnel reporting",
      "Interview Ready: metrics presentations, case loops, and analytical casing stories prepared"
    ];
  } else if (isPm) {
    readinessPoints = [
      "Projects Shipped: 2 comprehensive PRD products and launch metrics cases",
      "Product briefs compiled and detailed on professional portfolio",
      "Resume optimized: product delivery, scope, and cross-functional metrics highlighted",
      "Prioritization ready: RICE/Kano models, metrics, and experimentation scripts",
      "Agile and Scrum framework credentials ready for verification",
      "Interview ready: casing, metrics storytelling, and mock loops completed"
    ];
  } else if (isMarketing) {
    readinessPoints = [
      "Campaigns Planned: 3 acquisition funnels and analytics dashboards deployed",
      "Portfolio Ready: copywriting, copywriting assets, and positioning case studies",
      "Resume optimized: conversion rate metrics and SEO positioning highlights",
      "SEO/Analytics certified: Google Analytics and HubSpot academy credentials",
      "Storytelling ready: A/B testing methods and channel metrics scripts",
      "Interview ready: case loops, metrics presentations, and communication scripts"
    ];
  }

  doc.setFontSize(9.5);
  doc.setTextColor("#475569");
  readinessPoints.forEach((point, idx) => {
    doc.text(`[ ]  ${point}`, margins.left, y + idx * 15);
  });
  const readyH = readinessPoints.length * 15;
  totalContentHeight += readyH;
  y += readyH + 24;

  y = drawSectionTitle(doc, "UNIFIED MILESTONE TRACKER", y, 16, 8);
  totalContentHeight += 24;

  const allMilestoneTitles: string[] = [];
  safeRoadmaps.forEach((rm) => {
    getSafeArray<RoadmapMilestoneRecord>(rm.milestones).forEach((mile) => {
      allMilestoneTitles.push(mile.title);
    });
  });

  const uniqueMilestones = Array.from(new Set(allMilestoneTitles)).slice(0, 10);
  doc.setFontSize(9.5);
  doc.setTextColor("#475569");
  
  if (uniqueMilestones.length) {
    const colWidth = contentWidth / 2;
    uniqueMilestones.forEach((mTitle, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const mX = margins.left + col * colWidth;
      const mY = y + row * 15;
      const truncatedMTitle = mTitle.length > 46 ? mTitle.substring(0, 43) + "..." : mTitle;
      doc.text(`[ ]  ${truncatedMTitle}`, mX, mY);
    });
    const trackerH = Math.ceil(uniqueMilestones.length / 2) * 15;
    totalContentHeight += trackerH;
  } else {
    doc.text("[ ] Programming fundamentals and interview baseline.", margins.left, y);
    totalContentHeight += 15;
  }

  // Draw Page Frames on all pages
  const totalPages = doc.getNumberOfPages();
  for (let pNum = 1; pNum <= totalPages; pNum++) {
    doc.setPage(pNum);
    drawPageFrame(pNum, totalPages);
  }

  // PDF Density Report calculation
  const printableAreaPerPage = pageHeight - margins.top - margins.bottom;
  const totalPrintableArea = totalPages * printableAreaPerPage;
  const contentUtilization = Math.min(100, Math.round((totalContentHeight / totalPrintableArea) * 100));
  const whitespace = 100 - contentUtilization;

  console.log("\n=================================");
  console.log("       PDF DENSITY REPORT");
  console.log("=================================");
  console.log(`Pages:                ${totalPages}`);
  console.log(`Content Utilization:  ${contentUtilization}%`);
  console.log(`Whitespace:           ${whitespace}%`);
  const blobObj = doc.output("blob") as AuditBlob;
  blobObj.valid = validReport;
  blobObj.warnings = allWarnings;
  blobObj.qualityScore = qualityScore;

  return blobObj;
}