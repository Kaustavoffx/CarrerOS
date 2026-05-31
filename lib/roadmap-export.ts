import type { jsPDF } from "jspdf";
import type { RoadmapRecord, RoadmapMilestoneRecord, RoadmapResourceLink } from "./supabase/types";

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

const CMGEOM_FONT_URL = new URL("../assets/fonts/CMGeom-Regular.ttf", import.meta.url).toString();

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

function drawBadge(doc: jsPDF, text: string, x: number, y: number, bgColor: string, textColor = "#1e293b", fontSize = 8) {
  doc.setFont("CMGeom", "normal");
  doc.setFontSize(fontSize);
  const textWidth = doc.getTextWidth(text);
  const paddingX = 5;
  const paddingY = 3;
  const badgeWidth = textWidth + paddingX * 2;
  const badgeHeight = fontSize + paddingY * 2;
  
  doc.setFillColor(bgColor);
  doc.roundedRect(x, y - fontSize - paddingY + 1, badgeWidth, badgeHeight, 2, 2, "F");
  
  doc.setTextColor(textColor);
  doc.text(text, x + paddingX, y - 1);
  
  return badgeWidth;
}

function drawProgressBar(doc: jsPDF, x: number, y: number, width: number, height: number, progress: number, activeColor = "#7777FF", trackColor = "#f1f5f9") {
  doc.setFillColor(trackColor);
  doc.roundedRect(x, y, width, height, height / 2, height / 2, "F");
  
  if (progress > 0) {
    const fillWidth = Math.max(height, (width * Math.min(100, progress)) / 100);
    doc.setFillColor(activeColor);
    doc.roundedRect(x, y, fillWidth, height, height / 2, height / 2, "F");
  }
}

function drawSprintCard(doc: jsPDF, roadmap: RoadmapRecord, x: number, y: number, width: number, index: number) {
  const height = 76;
  
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.8);
  doc.setFillColor("#ffffff");
  doc.roundedRect(x, y, width, height, 5, 5, "FD");
  
  const indexColors = ["#FFF77F", "#AEFF77", "#77FF92", "#77FFE4", "#77C9FF", "#7777FF", "#C977FF", "#FF77E4", "#FF7792", "#FFAE77"];
  const indexColor = indexColors[index % indexColors.length];
  const badgeText = `SPRINT ${String(index + 1).padStart(2, "0")}`;
  const badgeW = drawBadge(doc, badgeText, x + 12, y + 18, indexColor, "#0f172a", 7);
  
  doc.setFont("CMGeom", "normal");
  doc.setFontSize(10);
  doc.setTextColor("#0f172a");
  doc.text(roadmap.title, x + 12 + badgeW + 8, y + 14);
  
  const statusColors: Record<string, string> = {
    Active: "#AEFF77",
    Done: "#77FF92",
    Planned: "#77FFE4"
  };
  const statusColor = statusColors[roadmap.status] || "#77FFE4";
  drawBadge(doc, roadmap.status.toUpperCase(), x + width - 64, y + 18, statusColor, "#0f172a", 7);
  
  doc.setFont("CMGeom", "normal");
  doc.setFontSize(8);
  doc.setTextColor("#475569");
  
  const endText = roadmap.estimated_completion_date ? `  ·  Est. End: ${roadmap.estimated_completion_date}` : "";
  const infoText = `${roadmap.total_duration_weeks} Weeks  ·  ${roadmap.weekly_hours} hrs/wk  ·  Demand: ${roadmap.career_demand_score}/100${endText}`;
  doc.text(infoText, x + 12, y + 32);
  
  doc.setFont("CMGeom", "normal");
  doc.setFontSize(7);
  doc.setTextColor("#64748b");
  doc.text("PROGRESS", x + 12, y + 46);
  drawProgressBar(doc, x + 64, y + 41, 100, 5, roadmap.progress || 0, "#7777FF", "#f1f5f9");
  doc.text(`${roadmap.progress || 0}%`, x + 172, y + 46);
  
  doc.setFont("CMGeom", "normal");
  doc.setFontSize(8);
  doc.setTextColor("#475569");
  const bulletItems = getSafeArray<string>(roadmap.expected_outcomes).slice(0, 2);
  const outcomesText = bulletItems.length ? bulletItems.map(item => `• ${item}`).join("   ") : `• Focus on core domain skills and initial deliverables.`;
  const truncatedOutcomes = outcomesText.length > 95 ? outcomesText.substring(0, 92) + "..." : outcomesText;
  doc.text(truncatedOutcomes, x + 12, y + 60);
  
  return height;
}

function drawConciseMilestone(doc: jsPDF, milestone: RoadmapMilestoneRecord, x: number, y: number, width: number, index: number) {
  const height = 24;
  
  const colors = ["#FFF77F", "#AEFF77", "#77FF92", "#77FFE4", "#77C9FF", "#7777FF", "#C977FF", "#FF77E4", "#FF7792", "#FFAE77"];
  const bgColor = colors[index % colors.length];
  
  const mBadgeText = `M${String(index + 1).padStart(2, "0")}`;
  drawBadge(doc, mBadgeText, x, y + 10, bgColor, "#0f172a", 7);
  
  doc.setFont("CMGeom", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor("#0f172a");
  doc.text(milestone.title, x + 34, y + 8);
  
  doc.setFontSize(8);
  doc.setTextColor("#64748b");
  const metaText = `(${milestone.estimated_duration_weeks} wk · ${milestone.difficulty_level})`;
  doc.text(metaText, x + 34 + doc.getTextWidth(milestone.title) + 6, y + 8);
  
  doc.setFontSize(8);
  doc.setTextColor("#475569");
  const tasks = getSafeArray<string>(milestone.completion_criteria).concat(getSafeArray<string>(milestone.project_tasks));
  const tasksText = tasks.slice(0, 2).join("  ·  ");
  const truncatedTasks = tasksText.length > 95 ? tasksText.substring(0, 92) + "..." : tasksText;
  doc.text(`Tasks: ${truncatedTasks || "Focus on core milestone goals."}`, x + 34, y + 19);
  
  return height;
}

export async function generateRoadmapPdfBlob(report: RoadmapPdfReport) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "letter", compress: true });
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

  function drawPageFrame(pageNum: number, totalPages: number) {
    doc.setFont("CMGeom", "normal");
    doc.setFontSize(8);
    doc.setTextColor("#94a3b8");
    
    doc.text("CAREEROS PROFESSIONAL ROADMAP", margins.left, 24);
    doc.text("RECRUITER-READY REPORT", pageWidth - margins.right, 24, { align: "right" });
    
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.6);
    doc.line(margins.left, 28, pageWidth - margins.right, 28);
    
    doc.line(margins.left, pageHeight - 28, pageWidth - margins.right, pageHeight - 28);
    doc.text("CareerOS © 2026", margins.left, pageHeight - 16);
    doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margins.right, pageHeight - 16, { align: "right" });
  }

  // Page 1
  let y = 50;

  doc.setFontSize(16);
  doc.setTextColor("#0f172a");
  doc.text("CAREER ROADMAP REPORT", centerX, y, { align: "center" });
  y += 10;
  
  doc.setFontSize(8);
  doc.setTextColor("#64748b");
  doc.text(`GENERATED ON ${new Date(report.exportedAt).toLocaleDateString()}  ·  VERIFIED BY CAREEROS`, centerX, y, { align: "center" });
  y += 18;

  const careerGoal = report.careerGoal || report.title || "Professional Career Plan";
  const readinessScore = report.readinessScore || 0;
  
  const safeRoadmaps = getSafeArray<RoadmapRecord>(report.roadmaps);
  const totalDuration = safeRoadmaps.reduce((sum, rm) => sum + (rm.total_duration_weeks || 0), 0);
  const avgWeeklyHours = safeRoadmaps.length 
    ? Math.round(safeRoadmaps.reduce((sum, rm) => sum + (rm.weekly_hours || 0), 0) / safeRoadmaps.length)
    : 0;

  const cardHeight = 56;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(1);
  doc.setFillColor("#f8fafc");
  doc.roundedRect(margins.left, y, contentWidth, cardHeight, 6, 6, "FD");

  doc.setFontSize(7);
  doc.setTextColor("#64748b");
  doc.text("CAREER GOAL", margins.left + 16, y + 15);
  doc.setFontSize(11);
  doc.setTextColor("#0f172a");
  const truncatedGoal = careerGoal.length > 40 ? careerGoal.substring(0, 37) + "..." : careerGoal;
  doc.text(truncatedGoal, margins.left + 16, y + 28);
  doc.setFontSize(8);
  doc.setTextColor("#475569");
  doc.text(`Domain: ${safeRoadmaps[0]?.career_domain || "Tech/Business"}`, margins.left + 16, y + 42);

  doc.setDrawColor(226, 232, 240);
  doc.line(margins.left + 240, y + 10, margins.left + 240, y + cardHeight - 10);

  doc.setFontSize(7);
  doc.setTextColor("#64748b");
  doc.text("READINESS SCORE", margins.left + 256, y + 15);
  const readinessColor = readinessScore >= 80 ? "#77FF92" : readinessScore >= 50 ? "#FFF77F" : "#FFAE77";
  drawBadge(doc, `${readinessScore}% READY`, margins.left + 256, y + 33, readinessColor, "#0f172a", 9);

  doc.line(margins.left + 370, y + 10, margins.left + 370, y + cardHeight - 10);

  doc.setFontSize(7);
  doc.setTextColor("#64748b");
  doc.text("TIMELINE & COMMITMENT", margins.left + 386, y + 15);
  doc.setFontSize(10);
  doc.setTextColor("#0f172a");
  doc.text(`${totalDuration} Weeks total`, margins.left + 386, y + 28);
  doc.setFontSize(8);
  doc.setTextColor("#475569");
  doc.text(`${avgWeeklyHours} Hours / week`, margins.left + 386, y + 41);

  y += cardHeight + 20;

  doc.setFontSize(10);
  doc.setTextColor("#0f172a");
  doc.text("SPRINT OVERVIEWS & SUMMARY", margins.left, y);
  y += 6;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.8);
  doc.line(margins.left, y, pageWidth - margins.right, y);
  y += 14;

  safeRoadmaps.forEach((roadmap, index) => {
    const cardH = drawSprintCard(doc, roadmap, margins.left, y, contentWidth, index);
    y += cardH + 12;
  });

  // Page 2
  doc.addPage();
  
  y = 50;

  doc.setFontSize(10);
  doc.setTextColor("#0f172a");
  doc.text("CORE MILESTONES & DELIVERABLES DIRECTORY", margins.left, y);
  y += 6;
  doc.line(margins.left, y, pageWidth - margins.right, y);
  y += 14;

  let milestoneIndex = 0;
  safeRoadmaps.forEach((roadmap) => {
    const milestones = getSafeArray<RoadmapMilestoneRecord>(roadmap.milestones);
    milestones.forEach((milestone) => {
      const mileH = drawConciseMilestone(doc, milestone, margins.left, y, contentWidth, milestoneIndex);
      y += mileH + 4;
      milestoneIndex++;
    });
  });

  y += 12;

  doc.setFontSize(10);
  doc.setTextColor("#0f172a");
  doc.text("CURATED ACADEMIC & LEARNING DIRECTORY", margins.left, y);
  y += 6;
  doc.line(margins.left, y, pageWidth - margins.right, y);
  y += 12;

  const uniqueResourcesMap = new Map<string, { label: string; provider: string }>();
  safeRoadmaps.forEach((roadmap) => {
    getSafeArray<RoadmapResourceLink>(roadmap.resource_links).forEach((res) => {
      const key = `${res.label}-${res.provider}`;
      if (!uniqueResourcesMap.has(key)) {
        uniqueResourcesMap.set(key, { label: res.label, provider: res.provider });
      }
    });
    getSafeArray<RoadmapMilestoneRecord>(roadmap.milestones).forEach((mile) => {
      getSafeArray<RoadmapResourceLink>(mile.resource_links).forEach((res) => {
        const key = `${res.label}-${res.provider}`;
        if (!uniqueResourcesMap.has(key)) {
          uniqueResourcesMap.set(key, { label: res.label, provider: res.provider });
        }
      });
    });
  });

  const uniqueResources = Array.from(uniqueResourcesMap.values());
  doc.setFontSize(8);
  doc.setTextColor("#475569");
  
  if (uniqueResources.length) {
    const colWidth = contentWidth / 2;
    uniqueResources.slice(0, 8).forEach((res, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const resX = margins.left + col * colWidth;
      const resY = y + row * 12;
      doc.text(`•  ${res.label} (${res.provider})`, resX, resY);
    });
    y += Math.ceil(Math.min(8, uniqueResources.length) / 2) * 12 + 10;
  } else {
    doc.text("•  No resources linked. Refer to standard program docs.", margins.left, y);
    y += 16;
  }

  y += 6;

  doc.setFontSize(10);
  doc.setTextColor("#0f172a");
  doc.text("PROFESSIONAL OUTCOMES & RECRUITER CHECKLIST", margins.left, y);
  y += 6;
  doc.line(margins.left, y, pageWidth - margins.right, y);
  y += 12;

  const allOutcomes = Array.from(new Set(
    safeRoadmaps.flatMap((roadmap) => getSafeArray<string>(roadmap.expected_outcomes))
  )).slice(0, 4);

  doc.setFontSize(8);
  doc.setTextColor("#334155");
  if (allOutcomes.length) {
    allOutcomes.forEach((outcome) => {
      const wrapped = doc.splitTextToSize(outcome, contentWidth - 16);
      doc.text("•", margins.left, y);
      doc.text(wrapped, margins.left + 12, y);
      y += wrapped.length * 10 + 2;
    });
  } else {
    doc.text("•  Demonstrable portfolio projects matching career domain requirements.", margins.left + 12, y);
    y += 12;
  }

  doc.setPage(1);
  drawPageFrame(1, 2);
  doc.setPage(2);
  drawPageFrame(2, 2);

  return doc.output("blob");
}