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

function drawBadge(doc: jsPDF, text: string, x: number, y: number, bgColor: string, textColor = "#1e293b", fontSize = 8) {
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

function drawProgressBar(doc: jsPDF, x: number, y: number, width: number, height: number, progress: number, activeColor = "#7777FF", trackColor = "#f1f5f9") {
  doc.setFillColor(trackColor);
  doc.roundedRect(x, y, width, height, height / 2, height / 2, "F");
  
  if (progress > 0) {
    const fillWidth = Math.max(height, (width * Math.min(100, progress)) / 100);
    doc.setFillColor(activeColor);
    doc.roundedRect(x, y, fillWidth, height, height / 2, height / 2, "F");
  }
}

function drawSectionTitle(doc: jsPDF, titleText: string, yVal: number, beforeSpace = 14, afterSpace = 8) {
  const finalY = yVal + beforeSpace;
  doc.setFont("CMGeom", "normal");
  doc.setFontSize(16);
  doc.setTextColor("#0f172a");
  doc.text(titleText, 40, finalY);
  
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.6);
  doc.line(40, finalY + 4, doc.internal.pageSize.getWidth() - 40, finalY + 4);
  
  return finalY + 4 + afterSpace;
}

function drawCareerSnapshot(doc: jsPDF, roadmap: RoadmapRecord, x: number, y: number, width: number) {
  const height = 40;
  
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.6);
  doc.setFillColor("#f8fafc");
  doc.roundedRect(x, y, width, height, 4, 4, "FD");
  
  const colW = width / 4;
  
  doc.setFont("CMGeom", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor("#64748b");
  doc.text("DEMAND SCORE", x + 10, y + 13);
  drawBadge(doc, `${roadmap.career_demand_score}/100`, x + 10, y + 29, "#FFF77F", "#0f172a", 8);
  
  doc.setDrawColor(226, 232, 240);
  doc.line(x + colW, y + 8, x + colW, y + height - 8);
  
  doc.setFontSize(7.5);
  doc.setTextColor("#64748b");
  doc.text("SALARY RANGE", x + colW + 10, y + 13);
  drawBadge(doc, roadmap.salary_range || "N/A", x + colW + 10, y + 29, "#FF7792", "#0f172a", 8);
  
  doc.line(x + colW * 2, y + 8, x + colW * 2, y + height - 8);
  
  doc.setFontSize(7.5);
  doc.setTextColor("#64748b");
  doc.text("MARKET OUTLOOK", x + colW * 2 + 10, y + 13);
  const truncatedOutlook = (roadmap.market_outlook || "Stable").length > 18 
    ? (roadmap.market_outlook || "Stable").substring(0, 15) + "..."
    : (roadmap.market_outlook || "Stable");
  drawBadge(doc, truncatedOutlook, x + colW * 2 + 10, y + 29, "#77C9FF", "#0f172a", 8);
  
  doc.line(x + colW * 3, y + 8, x + colW * 3, y + height - 8);
  
  doc.setFontSize(7.5);
  doc.setTextColor("#64748b");
  doc.text("AUTOMATION RISK", x + colW * 3 + 10, y + 13);
  drawBadge(doc, roadmap.automation_risk || "Low", x + colW * 3 + 10, y + 29, "#FFAE77", "#0f172a", 8);
  
  return height;
}

export async function generateRoadmapPdfBlob(report: RoadmapPdfReport) {
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
    doc.setFontSize(8);
    doc.setTextColor("#94a3b8");
    
    doc.text("CAREEROS PROFESSIONAL ROADMAP", margins.left, 24);
    doc.text("RECRUITER-READY ACTIONABLE STUDY PLAN", pageWidth - margins.right, 24, { align: "right" });
    
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.6);
    doc.line(margins.left, 28, pageWidth - margins.right, 28);
    
    doc.line(margins.left, pageHeight - 28, pageWidth - margins.right, pageHeight - 28);
    doc.text("CareerOS © 2026", margins.left, pageHeight - 16);
    doc.text(`Page ${pageNum} of ${totalPagesCount}`, pageWidth - margins.right, pageHeight - 16, { align: "right" });
  }

  const safeRoadmaps = getSafeArray<RoadmapRecord>(report.roadmaps);
  
  let y = 50;

  function ensureSpace(height: number) {
    if (y + height > pageHeight - margins.bottom) {
      doc.addPage();
      y = 50;
    }
  }

  // ==========================================
  // PAGE 1: EXECUTIVE ROADMAP OVERVIEW
  // ==========================================
  doc.setFontSize(24);
  doc.setTextColor("#0f172a");
  doc.text("CAREER ROADMAP REPORT", centerX, y, { align: "center" });
  totalContentHeight += 24;
  y += 10;
  
  doc.setFontSize(9);
  doc.setTextColor("#64748b");
  doc.text(`GENERATED ON ${new Date(report.exportedAt).toLocaleDateString()}  ·  VERIFIED BY CAREEROS`, centerX, y, { align: "center" });
  totalContentHeight += 9;
  y += 18;

  const careerGoal = report.careerGoal || report.title || "Professional Career Plan";
  const readinessScore = report.readinessScore || 0;
  
  const totalDuration = safeRoadmaps.reduce((sum, rm) => sum + (rm.total_duration_weeks || 0), 0);
  const avgWeeklyHours = safeRoadmaps.length 
    ? Math.round(safeRoadmaps.reduce((sum, rm) => sum + (rm.weekly_hours || 0), 0) / safeRoadmaps.length)
    : 0;

  const cardHeight = 56;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.8);
  doc.setFillColor("#f8fafc");
  doc.roundedRect(margins.left, y, contentWidth, cardHeight, 5, 5, "FD");

  doc.setFontSize(7.5);
  doc.setTextColor("#64748b");
  doc.text("CAREER GOAL", margins.left + 16, y + 15);
  doc.setFontSize(11);
  doc.setTextColor("#0f172a");
  const truncatedGoal = careerGoal.length > 40 ? careerGoal.substring(0, 37) + "..." : careerGoal;
  doc.text(truncatedGoal, margins.left + 16, y + 28);
  doc.setFontSize(9);
  doc.setTextColor("#475569");
  doc.text(`Domain: ${safeRoadmaps[0]?.career_domain || "Tech/Business"}`, margins.left + 16, y + 42);

  doc.setDrawColor(226, 232, 240);
  doc.line(margins.left + 240, y + 10, margins.left + 240, y + cardHeight - 10);

  doc.setFontSize(7.5);
  doc.setTextColor("#64748b");
  doc.text("READINESS SCORE", margins.left + 256, y + 15);
  const readinessColor = readinessScore >= 80 ? "#77FF92" : readinessScore >= 50 ? "#FFF77F" : "#FFAE77";
  drawBadge(doc, `${readinessScore}% READY`, margins.left + 256, y + 33, readinessColor, "#0f172a", 9);

  doc.line(margins.left + 370, y + 10, margins.left + 370, y + cardHeight - 10);

  doc.setFontSize(7.5);
  doc.setTextColor("#64748b");
  doc.text("TIMELINE & CAPACITY", margins.left + 386, y + 15);
  doc.setFontSize(10);
  doc.setTextColor("#0f172a");
  doc.text(`${totalDuration} Weeks total`, margins.left + 386, y + 28);
  doc.setFontSize(9);
  doc.setTextColor("#475569");
  doc.text(`${avgWeeklyHours} Hours / week`, margins.left + 386, y + 41);

  totalContentHeight += cardHeight;
  y += cardHeight + 14;

  y = drawSectionTitle(doc, "CAREER SNAPSHOT", y, 10, 8);
  totalContentHeight += 24;

  const firstRoadmap = safeRoadmaps[0];
  if (firstRoadmap) {
    const snapH = drawCareerSnapshot(doc, firstRoadmap, margins.left, y, contentWidth);
    totalContentHeight += snapH;
    y += snapH + 16;
  }

  y = drawSectionTitle(doc, "HIGH-LEVEL DEVELOPMENT PATHWAY", y, 10, 8);
  totalContentHeight += 24;

  safeRoadmaps.forEach((roadmap, index) => {
    const rowH = 32;
    doc.setFillColor("#f8fafc");
    doc.roundedRect(margins.left, y, contentWidth, rowH, 3, 3, "F");

    const indexColor = colorsPalette[index % colorsPalette.length];
    const sBadgeW = drawBadge(doc, `SPRINT ${String(index + 1).padStart(2, "0")}`, margins.left + 10, y + 20, indexColor, "#0f172a", 8);
    
    doc.setFont("CMGeom", "normal");
    doc.setFontSize(11);
    doc.setTextColor("#0f172a");
    const sprintTitleText = roadmap.title.length > 40 ? roadmap.title.substring(0, 37) + "..." : roadmap.title;
    doc.text(sprintTitleText, margins.left + 10 + sBadgeW + 8, y + 18);

    doc.setFontSize(9);
    doc.setTextColor("#64748b");
    doc.text(`Duration: ${roadmap.total_duration_weeks} wks  ·  ${roadmap.weekly_hours} hrs/wk`, margins.left + 10 + sBadgeW + 8, y + 28);

    const statusColors: Record<string, string> = {
      Active: "#AEFF77",
      Done: "#77FF92",
      Planned: "#77FFE4"
    };
    const sColor = statusColors[roadmap.status] || "#77FFE4";
    drawBadge(doc, roadmap.status.toUpperCase(), margins.left + contentWidth - 70, y + 20, sColor, "#0f172a", 8);

    totalContentHeight += rowH;
    y += rowH + 6;
  });

  y += 8;

  y = drawSectionTitle(doc, "EXECUTIVE ROADMAP OBJECTIVE", y, 10, 8);
  totalContentHeight += 24;

  doc.setFontSize(11);
  doc.setTextColor("#475569");
  const baselinePurposeText = `This report details the highly structured learning progression resolved for the target career path. By pacing milestones through individual sprints, the student accumulates demonstrable portfolio assets and practices core technical behaviors required by industry-grade recruitment teams. Use the subsequent pages as a weekly planner and deliverables checklist.`;
  const wrappedPurpose = doc.splitTextToSize(baselinePurposeText, contentWidth);
  doc.text(wrappedPurpose, margins.left, y);
  totalContentHeight += wrappedPurpose.length * 12;

  // ==========================================
  // PAGES 2 TO N-1: CONTINUOUS SPRINT SEGMENTS
  // ==========================================
  safeRoadmaps.forEach((roadmap, sIndex) => {
    // Dynamic content-driven page transition
    ensureSpace(120);
    
    y = drawSectionTitle(doc, `SPRINT ${String(sIndex + 1).padStart(2, "0")}: ${roadmap.title.toUpperCase()}`, y, 14, 8);
    totalContentHeight += 24;

    doc.setFillColor("#f8fafc");
    doc.roundedRect(margins.left, y, contentWidth, 32, 4, 4, "F");

    doc.setFontSize(7.5);
    doc.setTextColor("#64748b");
    doc.text("DURATION", margins.left + 12, y + 12);
    doc.setFontSize(11);
    doc.setTextColor("#0f172a");
    doc.text(`${roadmap.total_duration_weeks} Weeks`, margins.left + 12, y + 24);

    doc.setFontSize(7.5);
    doc.setTextColor("#64748b");
    doc.text("COMMITMENT", margins.left + 112, y + 12);
    doc.setFontSize(11);
    doc.setTextColor("#0f172a");
    doc.text(`${roadmap.weekly_hours} hrs/wk`, margins.left + 112, y + 24);

    doc.setFontSize(7.5);
    doc.setTextColor("#64748b");
    doc.text("STATUS", margins.left + 222, y + 12);
    const statusColors: Record<string, string> = {
      Active: "#AEFF77",
      Done: "#77FF92",
      Planned: "#77FFE4"
    };
    const sColor = statusColors[roadmap.status] || "#77FFE4";
    drawBadge(doc, roadmap.status.toUpperCase(), margins.left + 222, y + 25, sColor, "#0f172a", 8);

    doc.setFontSize(7.5);
    doc.setTextColor("#64748b");
    doc.text("COMPLETION PROGRESS", margins.left + 332, y + 12);
    drawProgressBar(doc, margins.left + 332, y + 17, 100, 5, roadmap.progress || 0, "#7777FF", "#e2e8f0");
    doc.setFontSize(11);
    doc.setTextColor("#0f172a");
    doc.text(`${roadmap.progress || 0}%`, margins.left + 442, y + 23);

    totalContentHeight += 32;
    y += 32 + 16;

    // Weekly schedule syllabus
    ensureSpace(80);
    y = drawSectionTitle(doc, "WEEKLY PLANNER & SYLLABUS", y, 10, 8);
    totalContentHeight += 24;

    const weeklySchedule = getSafeArray<string>(roadmap.weekly_schedule);
    doc.setFontSize(11);
    doc.setTextColor("#475569");
    
    if (weeklySchedule.length) {
      const midPoint = Math.ceil(weeklySchedule.length / 2);
      const colWidth = contentWidth / 2;
      weeklySchedule.forEach((sched, idx) => {
        const col = idx >= midPoint ? 1 : 0;
        const row = idx >= midPoint ? idx - midPoint : idx;
        const itemX = margins.left + col * colWidth;
        const itemY = y + row * 13;
        doc.text(`• Week ${idx + 1}: ${sched}`, itemX, itemY);
      });
      const schedH = Math.max(1, Math.min(midPoint, 4)) * 13;
      totalContentHeight += schedH;
      y += schedH + 10;
    } else {
      doc.text("• Weekly self-paced structured study based on milestone syllabus.", margins.left, y);
      totalContentHeight += 13;
      y += 16;
    }

    y += 4;

    // Sprints milestones
    ensureSpace(120);
    y = drawSectionTitle(doc, "CORE SPRINT MILESTONES & SPECIFIC TASKS", y, 10, 8);
    totalContentHeight += 24;

    const milestones = getSafeArray<RoadmapMilestoneRecord>(roadmap.milestones);
    milestones.forEach((milestone, mIdx) => {
      // Prevent milestone card from split
      const mileCardH = 74;
      ensureSpace(mileCardH);

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.6);
      doc.setFillColor("#ffffff");
      doc.roundedRect(margins.left, y, contentWidth, mileCardH, 4, 4, "FD");

      const mColor = colorsPalette[(sIndex * 3 + mIdx) % colorsPalette.length];
      const mBadgeW = drawBadge(doc, `M${String(mIdx + 1).padStart(2, "0")}`, margins.left + 12, y + 16, mColor, "#0f172a", 8);

      doc.setFont("CMGeom", "normal");
      doc.setFontSize(11);
      doc.setTextColor("#0f172a");
      doc.text(milestone.title, margins.left + 12 + mBadgeW + 6, y + 13);
      
      doc.setFontSize(9);
      doc.setTextColor("#64748b");
      const inlineMeta = `(${milestone.estimated_duration_weeks} wk · ${milestone.difficulty_level})`;
      doc.text(inlineMeta, margins.left + 12 + mBadgeW + 6 + doc.getTextWidth(milestone.title) + 6, y + 13);

      doc.setFontSize(9);
      doc.setTextColor("#64748b");
      const italicWhy = `Objective: ${milestone.why_it_matters}`;
      const truncatedWhy = italicWhy.length > 100 ? italicWhy.substring(0, 97) + "..." : italicWhy;
      doc.text(truncatedWhy, margins.left + 12, y + 26);

      doc.setFontSize(10);
      doc.setTextColor("#475569");
      const tasks = getSafeArray<string>(milestone.completion_criteria).concat(getSafeArray<string>(milestone.project_tasks)).concat(getSafeArray<string>(milestone.deliverables));
      const uniqueTasks = Array.from(new Set(tasks)).slice(0, 3);
      
      uniqueTasks.forEach((task, tIdx) => {
        const taskX = margins.left + 12;
        const taskY = y + 39 + tIdx * 10;
        const wrappedTask = task.length > 105 ? task.substring(0, 102) + "..." : task;
        doc.text(`- ${wrappedTask}`, taskX, taskY);
      });

      totalContentHeight += mileCardH;
      y += mileCardH + 8;
    });

    y += 8;

    // Sprint specific bibliography/resources
    ensureSpace(70);
    y = drawSectionTitle(doc, "RECOMMENDED LEARNING & ACADEMIC DIRECTORY", y, 10, 8);
    totalContentHeight += 24;

    const resourceLinks = getSafeArray<RoadmapResourceLink>(roadmap.resource_links);
    doc.setFontSize(11);
    doc.setTextColor("#475569");
    
    if (resourceLinks.length) {
      const colWidth = contentWidth / 2;
      resourceLinks.slice(0, 4).forEach((res, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const resX = margins.left + col * colWidth;
        const resY = y + row * 13;
        doc.text(`• [${res.provider}] ${res.label}`, resX, resY);
      });
      const resH = Math.ceil(Math.min(4, resourceLinks.length) / 2) * 13;
      totalContentHeight += resH;
      y += resH + 10;
    } else {
      doc.text("• General verified online documentation & industry guidelines.", margins.left, y);
      totalContentHeight += 13;
      y += 16;
    }

    y += 4;

    // Sprint Outcomes
    ensureSpace(60);
    y = drawSectionTitle(doc, "EXPECTED SPRINT OUTCOMES", y, 10, 8);
    totalContentHeight += 24;

    const outcomes = getSafeArray<string>(roadmap.expected_outcomes).slice(0, 3);
    doc.setFontSize(11);
    doc.setTextColor("#475569");
    if (outcomes.length) {
      outcomes.forEach((outcome, idx) => {
        const wrappedOutcome = outcome.length > 105 ? outcome.substring(0, 102) + "..." : outcome;
        doc.text(`[ ]  ${wrappedOutcome}`, margins.left, y + idx * 13);
      });
      const outH = outcomes.length * 13;
      totalContentHeight += outH;
      y += outH;
    } else {
      doc.text("[ ] Accumulation of key domain credentials and demonstrable work.", margins.left, y);
      totalContentHeight += 13;
    }
  });

  // ==========================================
  // FINAL PAGE: CAREER CHECKLIST & PORTFOLIO
  // ==========================================
  ensureSpace(240);
  
  y = drawSectionTitle(doc, "CAREER READINESS PORTFOLIO CHECKLIST", y, 16, 8);
  totalContentHeight += 24;

  doc.setFontSize(9);
  doc.setTextColor("#64748b");
  doc.text("PORTFOLIO DELIVERABLES & INTERVIEW VERIFICATION DIRECTORY", margins.left, y);
  totalContentHeight += 9;
  y += 14;

  y = drawSectionTitle(doc, "PORTFOLIO PROJECTS & ARTIFACT DEVELOPMENT", y, 10, 8);
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
  doc.setFontSize(11);
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
    y += projH + 18;
  } else {
    doc.text("[ ] Build core domain application modules as portfolio assets.", margins.left, y);
    totalContentHeight += 15;
    y += 24;
  }

  ensureSpace(120);
  y = drawSectionTitle(doc, "INTERVIEW READINESS & CORE SYSTEM CAPABILITIES", y, 10, 8);
  totalContentHeight += 24;

  // Role aware checklist
  const domainLabel = safeRoadmaps[0]?.career_domain || "Tech/Business";
  const isSde = ["software", "engineering", "sde", "developer", "swe", "programming", "computer"].some(term => domainLabel.toLowerCase().includes(term) || careerGoal.toLowerCase().includes(term));
  const isPm = ["product", "pm", "roadmap", "discovery"].some(term => domainLabel.toLowerCase().includes(term) || careerGoal.toLowerCase().includes(term));
  const isMarketing = ["marketing", "growth", "seo", "brand"].some(term => domainLabel.toLowerCase().includes(term) || careerGoal.toLowerCase().includes(term));

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

  doc.setFontSize(11);
  doc.setTextColor("#475569");
  readinessPoints.forEach((point, idx) => {
    doc.text(`[ ]  ${point}`, margins.left, y + idx * 14);
  });
  const readyH = readinessPoints.length * 14;
  totalContentHeight += readyH;
  y += readyH + 18;

  ensureSpace(120);
  y = drawSectionTitle(doc, "UNIFIED MILESTONE TRACKER", y, 10, 8);
  totalContentHeight += 24;

  const allMilestoneTitles: string[] = [];
  safeRoadmaps.forEach((rm) => {
    getSafeArray<RoadmapMilestoneRecord>(rm.milestones).forEach((mile) => {
      allMilestoneTitles.push(mile.title);
    });
  });

  const uniqueMilestones = Array.from(new Set(allMilestoneTitles)).slice(0, 10);
  doc.setFontSize(11);
  doc.setTextColor("#475569");
  
  if (uniqueMilestones.length) {
    const colWidth = contentWidth / 2;
    uniqueMilestones.forEach((mTitle, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const mX = margins.left + col * colWidth;
      const mY = y + row * 14;
      const truncatedMTitle = mTitle.length > 46 ? mTitle.substring(0, 43) + "..." : mTitle;
      doc.text(`[ ]  ${truncatedMTitle}`, mX, mY);
    });
    const trackerH = Math.ceil(uniqueMilestones.length / 2) * 14;
    totalContentHeight += trackerH;
  } else {
    doc.text("[ ] Programming fundamentals and interview baseline.", margins.left, y);
    totalContentHeight += 14;
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
  console.log("=================================");

  return doc.output("blob");
}