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

export type BoundingBox = {
  page: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
};

export class LayoutLedger {
  private boxes: BoundingBox[] = [];
  private pageMargins = 48;
  private pageWidth = 595.28;
  private pageHeight = 841.89;

  public pushBox(page: number, x1: number, y1: number, x2: number, y2: number, label: string) {
    this.boxes.push({ page, x1, y1, x2, y2, label });
  }

  public verify() {
    for (const box of this.boxes) {
      const isHeaderOrFooter = box.y1 < 48 || box.y2 > 793.89;
      
      if (!isHeaderOrFooter) {
        if (box.x1 < this.pageMargins - 0.1 || box.x2 > this.pageWidth - this.pageMargins + 0.1) {
          throw new Error(
            `LAYOUT FAILURE: Element '${box.label}' violates horizontal margins [x1=${box.x1.toFixed(2)}, x2=${box.x2.toFixed(2)}] on page ${box.page}`
          );
        }
        if (box.y1 < this.pageMargins - 0.1 || box.y2 > this.pageHeight - this.pageMargins + 0.1) {
          throw new Error(
            `LAYOUT FAILURE: Element '${box.label}' violates vertical margins [y1=${box.y1.toFixed(2)}, y2=${box.y2.toFixed(2)}] on page ${box.page}`
          );
        }
      } else {
        if (box.y1 < 10 || box.y2 > 830) {
          throw new Error(
            `LAYOUT FAILURE: Header/Footer element '${box.label}' exceeds physical page borders [y1=${box.y1.toFixed(2)}, y2=${box.y2.toFixed(2)}] on page ${box.page}`
          );
        }
      }
    }
  }
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
  const margins = { top: 48, right: 48, bottom: 48, left: 48 };
  const contentWidth = getContentWidth();
  const centerX = pageWidth / 2;

  let totalContentHeight = 0;
  const ledger = new LayoutLedger();

  // Typography Tokens
  const fontSizes = {
    title: 26,
    section: 18,
    cardTitle: 14,
    body: 11,
    meta: 9,
    caption: 7.5
  };

  function getTextHeight(text: string, maxWidth: number, fontSize: number, lineSpacing = 1.25) {
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, maxWidth);
    return lines.length * fontSize * lineSpacing;
  }

  function drawText(text: string, x: number, yVal: number, options?: { align?: "left" | "right" | "center"; fontSize?: number; fontColor?: string }) {
    const fSize = options?.fontSize || doc.getFontSize();
    doc.setFontSize(fSize);
    
    if (options?.fontColor) {
      doc.setTextColor(options.fontColor);
    } else {
      doc.setTextColor("#0f172a");
    }

    const textWidth = doc.getTextWidth(text);
    let x1 = x;
    if (options?.align === "right") {
      x1 = x - textWidth;
    } else if (options?.align === "center") {
      x1 = x - textWidth / 2;
    }

    const y1 = yVal - fSize;
    const x2 = x1 + textWidth;
    const y2 = yVal;

    doc.text(text, x, yVal, { align: options?.align });
    ledger.pushBox(doc.getNumberOfPages(), x1, y1, x2, y2, `Text: ${text.substring(0, 15)}`);
  }

  function getContentWidth() {
    return pageWidth - margins.left - margins.right;
  }

  function drawWrappedText(text: string, x: number, yVal: number, maxWidth: number, fontSize: number, options?: { fontColor?: string; lineSpacing?: number; align?: "left" | "right" | "center" }) {
    doc.setFont("CMGeom", "normal");
    doc.setFontSize(fontSize);
    
    const lSpacing = options?.lineSpacing || 1.25;
    const safeText = text || "";
    const wrappedLines = doc.splitTextToSize(safeText, maxWidth);
    
    wrappedLines.forEach((line: string, idx: number) => {
      const curY = yVal + idx * fontSize * lSpacing;
      drawText(line, x, curY, { align: options?.align, fontSize, fontColor: options?.fontColor });
    });

    return wrappedLines.length * fontSize * lSpacing;
  }

  function drawRoundedCard(x: number, yVal: number, width: number, height: number, rx = 4, ry = 4, style = "FD", fillColor = "#ffffff", strokeColor = "#e2e8f0", strokeWidth = 0.4) {
    doc.setFillColor(fillColor);
    doc.setDrawColor(strokeColor);
    doc.setLineWidth(strokeWidth);
    doc.roundedRect(x, yVal, width, height, rx, ry, style);
    
    ledger.pushBox(doc.getNumberOfPages(), x, yVal, x + width, yVal + height, `Card: [x=${x}, y=${yVal}, w=${width}, h=${height}]`);
  }

  function drawBadge(text: string, x: number, yVal: number, bgColor: string, textColor = "#0f172a", fontSize = 7.5) {
    doc.setFontSize(fontSize);
    const textWidth = doc.getTextWidth(text);
    const paddingX = 4;
    const paddingY = 2;
    const badgeWidth = textWidth + paddingX * 2;
    const badgeHeight = fontSize + paddingY * 2;
    
    doc.setFillColor(bgColor);
    doc.roundedRect(x, yVal - fontSize - paddingY + 1, badgeWidth, badgeHeight, 2, 2, "F");
    
    doc.setTextColor(textColor);
    doc.text(text, x + paddingX, yVal - 1);
    
    ledger.pushBox(doc.getNumberOfPages(), x, yVal - fontSize - paddingY + 1, x + badgeWidth, yVal - fontSize - paddingY + 1 + badgeHeight, `Badge: ${text}`);
    return badgeWidth;
  }

  function drawProgressBar(x: number, yVal: number, width: number, height: number, progress: number, activeColor = "#7777FF", trackColor = "#e2e8f0") {
    doc.setFillColor(trackColor);
    doc.roundedRect(x, yVal, width, height, height / 2, height / 2, "F");
    
    if (progress > 0) {
      const fillWidth = Math.max(height, (width * Math.min(100, progress)) / 100);
      doc.setFillColor(activeColor);
      doc.roundedRect(x, yVal, fillWidth, height, height / 2, height / 2, "F");
    }

    ledger.pushBox(doc.getNumberOfPages(), x, yVal, x + width, yVal + height, "ProgressBar");
  }

  function drawPageFrame(pageNum: number, totalPagesCount: number) {
    doc.setFontSize(fontSizes.caption);
    doc.setTextColor("#94a3b8");
    
    doc.text("CAREEROS PROFESSIONAL ROADMAP", margins.left, 32);
    
    if (!validReport) {
      const labelText = "QUALITY REVIEW RECOMMENDED";
      doc.setFontSize(6.5);
      const textW = doc.getTextWidth(labelText);
      const paddingX = 4;
      const paddingY = 2;
      const badgeW = textW + paddingX * 2;
      const badgeH = 6.5 + paddingY * 2;
      const badgeX = centerX - badgeW / 2;
      
      doc.setFillColor("#FFAE77");
      doc.roundedRect(badgeX, 32 - 6.5 - paddingY + 1, badgeW, badgeH, 1.5, 1.5, "F");
      
      doc.setTextColor("#0f172a");
      doc.text(labelText, badgeX + paddingX, 32 - 1);
      
      doc.setFontSize(fontSizes.caption);
      doc.setTextColor("#94a3b8");
    }
    
    doc.text("RECRUITER-READY ACTIONABLE STUDY PLAN", pageWidth - margins.right, 32, { align: "right" });
    
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(margins.left, 36, pageWidth - margins.right, 36);
    
    doc.line(margins.left, pageHeight - 36, pageWidth - margins.right, pageHeight - 36);
    doc.text("CareerOS © 2026", margins.left, pageHeight - 24);
    doc.text(`Page ${pageNum} of ${totalPagesCount}`, pageWidth - margins.right, pageHeight - 24, { align: "right" });

    // Track frame elements in ledger
    ledger.pushBox(pageNum, margins.left, 24, pageWidth - margins.right, 36, "HeaderFrame");
    ledger.pushBox(pageNum, margins.left, pageHeight - 36, pageWidth - margins.right, pageHeight - 16, "FooterFrame");
  }

  let y = margins.top;

  function ensureSpace(height: number) {
    if (y + height > pageHeight - margins.bottom) {
      doc.addPage();
      y = margins.top;
    }
  }

  function drawSectionTitle(titleText: string) {
    // Ensure space for header + first line of content gap
    ensureSpace(80);
    y += 24;

    const currentY = y;
    doc.setFontSize(fontSizes.section);
    doc.setTextColor("#0f172a");
    doc.text(titleText, margins.left, currentY);
    ledger.pushBox(doc.getNumberOfPages(), margins.left, currentY - fontSizes.section, margins.left + doc.getTextWidth(titleText), currentY, `Section: ${titleText}`);
    
    y += 12; // Heading to divider line

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(margins.left, y, pageWidth - margins.right, y);
    ledger.pushBox(doc.getNumberOfPages(), margins.left, y - 0.2, pageWidth - margins.right, y + 0.2, `Section Line: ${titleText}`);
    
    y += 16; // Divider line to content
  }

  // ==========================================
  // PAGE 1: EXECUTIVE ROADMAP OVERVIEW
  // ==========================================
  // Spacing Rules & Safe Header Zone (0-60pt) Validation
  const headerBottomY = 36; // Divider line is at y = 36
  const reservedZoneTop = 60; // Safe Header Zone is 0-60pt

  // Define bounding boxes for layout validation
  const headerBox = { y1: 24, y2: 36 };
  doc.setFontSize(6.5);
  const paddingY = 2;
  const badgeBox = !validReport ? { y1: 32 - 6.5 - paddingY + 1, y2: 32 - 6.5 - paddingY + 1 + 6.5 + paddingY * 2 } : { y1: 0, y2: 0 };

  // Spacing after header row: minimum 24pt vertical spacing
  let titleTop = headerBottomY + 24; // 60

  // Validation: Check intersections with header labels, quality badge, and reserved zone
  const reservedHeaderBottom = Math.max(headerBox.y2, badgeBox.y2, reservedZoneTop);
  if (titleTop < reservedHeaderBottom) {
    // If overlap exists: auto-adjust Y positions
    titleTop = reservedHeaderBottom;
  }

  const titleHeight = fontSizes.title; // 26
  const calculatedTitleY = titleTop + titleHeight; // 86

  let subtitleTop = calculatedTitleY + 12; // 12pt spacing after title (bottom is baseline, so gap is to subtitle top)
  if (subtitleTop < calculatedTitleY + 12) {
    subtitleTop = calculatedTitleY + 12;
  }

  const subtitleHeight = fontSizes.meta; // 9
  const calculatedSubtitleY = subtitleTop + subtitleHeight; // 107

  // Draw Title & Subtitle centered
  drawText("CAREER ROADMAP REPORT", centerX, calculatedTitleY, { align: "center", fontSize: fontSizes.title });
  totalContentHeight += titleHeight;

  drawText(`GENERATED ON ${new Date(report.exportedAt).toLocaleDateString()}  ·  VERIFIED BY CAREEROS`, centerX, calculatedSubtitleY, { align: "center", fontSize: fontSizes.meta, fontColor: "#64748b" });
  totalContentHeight += subtitleHeight;

  // The first content card starts 24pt below the subtitle bottom
  y = calculatedSubtitleY + 24; // 107 + 24 = 131

  const readinessScore = report.readinessScore || 0;
  const totalDuration = safeRoadmaps.reduce((sum, rm) => sum + (rm.total_duration_weeks || 0), 0);
  const avgWeeklyHours = safeRoadmaps.length 
    ? Math.round(safeRoadmaps.reduce((sum, rm) => sum + (rm.weekly_hours || 0), 0) / safeRoadmaps.length)
    : 0;

  // McKinsey Executive Card
  const cardHeight = 56;
  drawRoundedCard(margins.left, y, contentWidth, cardHeight, 4, 4, "FD", "#f8fafc");

  drawText("CAREER GOAL", margins.left + 16, y + 16, { fontSize: fontSizes.meta, fontColor: "#64748b" });
  const truncatedGoal = careerGoal.length > 36 ? careerGoal.substring(0, 33) + "..." : careerGoal;
  drawText(truncatedGoal, margins.left + 16, y + 28, { fontSize: fontSizes.body });
  drawText(`Domain: ${safeRoadmaps[0]?.career_domain || "Tech/Business"}`, margins.left + 16, y + 42, { fontSize: fontSizes.meta, fontColor: "#475569" });

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(margins.left + 240, y + 10, margins.left + 240, y + cardHeight - 10);

  drawText("READINESS SCORE", margins.left + 256, y + 16, { fontSize: fontSizes.meta, fontColor: "#64748b" });
  const readinessColor = readinessScore >= 80 ? "#77FF92" : readinessScore >= 50 ? "#FFF77F" : "#FFAE77";
  drawBadge(`${readinessScore}% READY`, margins.left + 256, y + 33, readinessColor, "#0f172a", 8);

  doc.line(margins.left + 368, y + 10, margins.left + 368, y + cardHeight - 10);

  drawText("TIMELINE & CAPACITY", margins.left + 384, y + 16, { fontSize: fontSizes.meta, fontColor: "#64748b" });
  drawText(`${totalDuration} Weeks total`, margins.left + 384, y + 28, { fontSize: fontSizes.body });
  drawText(`${avgWeeklyHours} Hours / week`, margins.left + 384, y + 42, { fontSize: fontSizes.meta, fontColor: "#475569" });

  totalContentHeight += cardHeight;
  y += cardHeight;

  // Career Snapshot Dashboard Panel
  drawSectionTitle("CAREER SNAPSHOT");
  totalContentHeight += 24;

  const firstRoadmap = safeRoadmaps[0];
  if (firstRoadmap) {
    const colW = (contentWidth - 24) / 4;
    
    // Equal heights calculations
    const labels = ["DEMAND SCORE", "SALARY RANGE", "MARKET OUTLOOK", "AUTOMATION RISK"];
    const values = [
      `${firstRoadmap.career_demand_score}/100`,
      firstRoadmap.salary_range || "N/A",
      firstRoadmap.market_outlook || "Stable",
      firstRoadmap.automation_risk || "Low"
    ];
    
    let maxContentH = 0;
    const contentHeights = values.map((val) => {
      const wrappedH = getTextHeight(val, colW - 16, fontSizes.body);
      // Label(11.25pt) + gap(8pt) + wrapped val height
      return 11.25 + 8 + wrappedH;
    });

    maxContentH = Math.max(...contentHeights);
    const snapH = 12 + maxContentH + 12; // 12pt internal padding top/bottom

    values.forEach((val, idx) => {
      const cardX = margins.left + idx * (colW + 8);
      drawRoundedCard(cardX, y, colW, snapH, 4, 4, "FD", "#f8fafc");

      // Vertically center the content
      const offset = (snapH - contentHeights[idx]) / 2;
      drawText(labels[idx], cardX + 8, y + offset + 9, { fontSize: fontSizes.meta, fontColor: "#64748b" });
      
      drawWrappedText(val, cardX + 8, y + offset + 9 + 8 + 11, colW - 16, fontSizes.body, { fontColor: "#0f172a" });
    });

    totalContentHeight += snapH;
    y += snapH;
  }

  // Development Pathway Sprints Overview
  drawSectionTitle("HIGH-LEVEL DEVELOPMENT PATHWAY");
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
    const rowH = 36;
    drawRoundedCard(margins.left, y, contentWidth, rowH, 3, 3, "F", "#f8fafc");

    const indexColor = colorsPalette[(index + 4) % colorsPalette.length];
    const sBadgeW = drawBadge(`SPRINT ${String(index + 1).padStart(2, "0")}`, margins.left + 12, y + 20, indexColor, "#0f172a", 7.5);
    
    const sprintTitleText = sprint.title.length > 44 ? sprint.title.substring(0, 41) + "..." : sprint.title;
    drawText(sprintTitleText, margins.left + 12 + sBadgeW + 8, y + 18, { fontSize: fontSizes.body });
    drawText(`Duration: ${sprint.weeks} wks  ·  ${sprint.hours} hrs/wk`, margins.left + 12 + sBadgeW + 8, y + 29, { fontSize: fontSizes.meta, fontColor: "#64748b" });

    const statusColors: Record<string, string> = {
      Active: "#AEFF77",
      Done: "#77FF92",
      Planned: "#77FFE4"
    };
    const sColor = statusColors[sprint.status] || "#77FFE4";
    drawBadge(sprint.status.toUpperCase(), margins.left + contentWidth - 68, y + 20, sColor, "#0f172a", 7.5);

    totalContentHeight += rowH;
    y += rowH + 8;
  });

  y += 16;

  drawSectionTitle("EXECUTIVE ROADMAP OBJECTIVE");
  totalContentHeight += 24;

  const baselinePurposeText = `This report details the highly structured learning progression resolved for the target career path. By pacing milestones through individual sprints, the student accumulates demonstrable portfolio assets and practices core technical behaviors required by industry-grade recruitment teams. Use the subsequent pages as a weekly planner and deliverables checklist.`;
  const purposeHeight = drawWrappedText(baselinePurposeText, margins.left, y, contentWidth, fontSizes.body, { fontColor: "#475569", lineSpacing: 14 / fontSizes.body });
  totalContentHeight += purposeHeight;
  y += purposeHeight;

  // ==========================================
  // PAGES 2 TO 4: DEDICATED SPRINT PAGES
  // ==========================================
  sprintsData.forEach((sprint, sIndex) => {
    doc.addPage();
    y = margins.top;

    drawSectionTitle(sprint.title.toUpperCase());
    totalContentHeight += 24;

    // Sprint Stats Card
    const statsCardH = 36;
    drawRoundedCard(margins.left, y, contentWidth, statsCardH, 4, 4, "F", "#f8fafc");

    drawText("DURATION", margins.left + 16, y + 13, { fontSize: fontSizes.meta, fontColor: "#64748b" });
    drawText(`${sprint.weeks} Weeks`, margins.left + 16, y + 26, { fontSize: fontSizes.body });

    drawText("COMMITMENT", margins.left + 116, y + 13, { fontSize: fontSizes.meta, fontColor: "#64748b" });
    drawText(`${sprint.hours} hrs/wk`, margins.left + 116, y + 26, { fontSize: fontSizes.body });

    drawText("STATUS", margins.left + 224, y + 13, { fontSize: fontSizes.meta, fontColor: "#64748b" });
    const statusColors: Record<string, string> = {
      Active: "#AEFF77",
      Done: "#77FF92",
      Planned: "#77FFE4"
    };
    const sColor = statusColors[sprint.status] || "#77FFE4";
    drawBadge(sprint.status.toUpperCase(), margins.left + 224, y + 26, sColor, "#0f172a", 7.5);

    drawText("COMPLETION PROGRESS", margins.left + 332, y + 13, { fontSize: fontSizes.meta, fontColor: "#64748b" });
    drawProgressBar(margins.left + 332, y + 18, 100, 5, sprint.progress, "#7777FF", "#e2e8f0");
    drawText(`${sprint.progress}%`, margins.left + 442, y + 24, { fontSize: fontSizes.body });

    totalContentHeight += statsCardH;
    y += statsCardH;

    // Weekly Syllabus Planner
    drawSectionTitle("WEEKLY PLANNER & SYLLABUS");
    totalContentHeight += 24;

    const colWidth = (contentWidth - 24) / 2;
    sprint.milestones.forEach((m, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const itemX = margins.left + col * (colWidth + 24);
      const itemY = y + row * 16 + 11;
      const truncMTitle = m.title.length > 28 ? m.title.substring(0, 25) + "..." : m.title;
      drawWrappedText(`• Phase ${idx + 1}: ${truncMTitle} (${m.estimated_duration_weeks} wks)`, itemX, itemY, colWidth, fontSizes.body, { fontColor: "#475569" });
    });

    const plannerRows = Math.ceil(sprint.milestones.length / 2);
    const plannerH = Math.max(1, plannerRows) * 16;
    totalContentHeight += plannerH;
    y += plannerH;

    // Sprints Milestones Cards
    drawSectionTitle("CORE SPRINT MILESTONES & PROJECTS");
    totalContentHeight += 24;

    sprint.milestones.forEach((milestone, mIdx) => {
      // Dynamic Height Calculation for Milestone Card
      doc.setFontSize(7.5);
      const mBadgeW = doc.getTextWidth(`M${String(mIdx + 1).padStart(2, "0")}`) + 8;
      const titleMaxW = contentWidth - 24 - mBadgeW - 6 - 90; // leave 90pt for metadata on the right
      
      const headerH = getTextHeight(milestone.title, titleMaxW, fontSizes.cardTitle);

      const objectiveText = `Objective: ${milestone.why_it_matters}`;
      const objH = getTextHeight(objectiveText, contentWidth - 24, fontSizes.body);

      const tasks = getSafeArray<string>(milestone.completion_criteria).concat(getSafeArray<string>(milestone.project_tasks)).concat(getSafeArray<string>(milestone.deliverables));
      const uniqueTasks = Array.from(new Set(tasks)).slice(0, 2);
      let tasksH = 0;
      uniqueTasks.forEach((task) => {
        tasksH += getTextHeight(`- ${task}`, contentWidth - 24, fontSizes.body) + 4;
      });

      const cardPadding = 12;
      const mileCardH = cardPadding + headerH + 8 + objH + 8 + tasksH + cardPadding;

      // Ensure space on page
      ensureSpace(mileCardH + 24);

      drawRoundedCard(margins.left, y, contentWidth, mileCardH, 4, 4, "FD", "#ffffff");

      const mColor = colorsPalette[(sIndex * 3 + mIdx) % colorsPalette.length];
      drawBadge(`M${String(mIdx + 1).padStart(2, "0")}`, margins.left + 12, y + 16 + 5, mColor, "#0f172a", 7.5);

      // Draw title wrapped
      drawWrappedText(milestone.title, margins.left + 12 + mBadgeW + 6, y + 13 + 5, titleMaxW, fontSizes.cardTitle);
      
      // Draw metadata right-aligned
      const inlineMeta = `(${milestone.estimated_duration_weeks} wk · ${milestone.difficulty_level})`;
      drawText(inlineMeta, margins.left + contentWidth - 12, y + 13 + 5, { align: "right", fontSize: fontSizes.meta, fontColor: "#64748b" });

      let cardY = y + cardPadding + headerH + 8;
      
      // Objective wrapped text
      const realObjH = drawWrappedText(objectiveText, margins.left + 12, cardY, contentWidth - 24, fontSizes.body, { fontColor: "#64748b" });
      cardY += realObjH + 8;

      // Tasks wrapped list
      uniqueTasks.forEach((task) => {
        const taskH = drawWrappedText(`- ${task}`, margins.left + 12, cardY, contentWidth - 24, fontSizes.body, { fontColor: "#475569" });
        cardY += taskH + 4;
      });

      totalContentHeight += mileCardH;
      y += mileCardH + 8;
    });

    y += 16;

    // Sprint bibliography / resources
    drawSectionTitle("RECOMMENDED LEARNING & ACADEMIC DIRECTORY");
    totalContentHeight += 24;

    const resourceLinks = sprint.milestones.flatMap(m => getSafeArray<RoadmapResourceLink>(m.resource_links));
    const uniqueResources = Array.from(new Map(resourceLinks.map(r => [r.url, r])).values()).slice(0, 4);

    if (uniqueResources.length) {
      const resColW = (contentWidth - 16) / 2;
      const resRows: { left: RoadmapResourceLink; right?: RoadmapResourceLink }[] = [];
      for (let index = 0; index < uniqueResources.length; index += 2) {
        resRows.push({
          left: uniqueResources[index],
          right: uniqueResources[index + 1]
        });
      }

      resRows.forEach((row) => {
        // Calculate heights dynamically
        const leftH = 8 + getTextHeight(row.left.label, resColW - 16, fontSizes.body) + 4 + getTextHeight(row.left.provider, resColW - 16, fontSizes.meta) + 4 + getTextHeight(row.left.url, resColW - 16, fontSizes.meta) + 8;
        let rightH = 0;
        if (row.right) {
          rightH = 8 + getTextHeight(row.right.label, resColW - 16, fontSizes.body) + 4 + getTextHeight(row.right.provider, resColW - 16, fontSizes.meta) + 4 + getTextHeight(row.right.url, resColW - 16, fontSizes.meta) + 8;
        }

        const maxRowH = Math.max(leftH, rightH);
        ensureSpace(maxRowH + 24);

        // Draw left resource
        const leftX = margins.left;
        drawRoundedCard(leftX, y, resColW, maxRowH, 4, 4, "FD", "#f8fafc");
        
        let ry = y + 8 + 9;
        const leftLabelH = drawWrappedText(row.left.label, leftX + 8, ry, resColW - 16, fontSizes.body);
        ry += leftLabelH + 4;
        
        const leftProviderH = drawWrappedText(row.left.provider, leftX + 8, ry, resColW - 16, fontSizes.meta, { fontColor: "#64748b" });
        ry += leftProviderH + 4;
        
        drawWrappedText(row.left.url, leftX + 8, ry, resColW - 16, fontSizes.meta, { fontColor: "#7777FF" });

        // Draw right resource if present
        if (row.right) {
          const rightX = margins.left + resColW + 16;
          drawRoundedCard(rightX, y, resColW, maxRowH, 4, 4, "FD", "#f8fafc");

          let rry = y + 8 + 9;
          const rightLabelH = drawWrappedText(row.right.label, rightX + 8, rry, resColW - 16, fontSizes.body);
          rry += rightLabelH + 4;

          const rightProviderH = drawWrappedText(row.right.provider, rightX + 8, rry, resColW - 16, fontSizes.meta, { fontColor: "#64748b" });
          rry += rightProviderH + 4;

          drawWrappedText(row.right.url, rightX + 8, rry, resColW - 16, fontSizes.meta, { fontColor: "#7777FF" });
        }

        y += maxRowH + 8;
        totalContentHeight += maxRowH + 8;
      });
    } else {
      drawText("• General verified online documentation & industry guidelines.", margins.left, y + 11, { fontSize: fontSizes.body, fontColor: "#475569" });
      totalContentHeight += 16;
      y += 24;
    }

    y += 16;

    // Sprint Outcomes
    drawSectionTitle("EXPECTED SPRINT OUTCOMES");
    totalContentHeight += 24;

    const sprintOutcomes = Array.from(new Set(sprint.milestones.flatMap(m => getSafeArray<string>(m.expected_outcomes)))).slice(0, 3);
    if (sprintOutcomes.length) {
      sprintOutcomes.forEach((outcome) => {
        const outcomeText = `[ ]  ${outcome}`;
        const outH = getTextHeight(outcomeText, contentWidth, fontSizes.body, 14 / fontSizes.body);
        
        ensureSpace(outH + 16);
        drawWrappedText(outcomeText, margins.left, y + 11, contentWidth, fontSizes.body, { fontColor: "#475569", lineSpacing: 14 / fontSizes.body });
        y += outH + 8;
        totalContentHeight += outH + 8;
      });
    } else {
      drawText("[ ] Accumulation of key domain credentials and demonstrable work.", margins.left, y + 11, { fontSize: fontSizes.body, fontColor: "#475569" });
      totalContentHeight += 16;
      y += 24;
    }
  });

  // ==========================================
  // PAGE 5: FINAL PAGE CAREER READINESS CHECKLIST
  // ==========================================
  doc.addPage();
  y = margins.top;

  drawSectionTitle("CAREER READINESS PORTFOLIO CHECKLIST");
  totalContentHeight += 24;

  drawText("PORTFOLIO DELIVERABLES & INTERVIEW VERIFICATION DIRECTORY", margins.left, y + 9, { fontSize: fontSizes.meta, fontColor: "#64748b" });
  totalContentHeight += 9;
  y += 16;

  drawSectionTitle("PORTFOLIO PROJECTS & ARTIFACT DEVELOPMENT");
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
  
  if (uniqueProjects.length) {
    const listColW = (contentWidth - 24) / 2;
    const checklistRows: { left: string; right?: string }[] = [];
    for (let index = 0; index < uniqueProjects.length; index += 2) {
      checklistRows.push({
        left: uniqueProjects[index],
        right: uniqueProjects[index + 1]
      });
    }

    checklistRows.forEach((row) => {
      const leftText = `□  ${row.left}`;
      const leftH = getTextHeight(leftText, listColW, fontSizes.body, 15 / fontSizes.body);
      
      let rightH = 0;
      let rightText = "";
      if (row.right) {
        rightText = `□  ${row.right}`;
        rightH = getTextHeight(rightText, listColW, fontSizes.body, 15 / fontSizes.body);
      }

      const maxRowH = Math.max(leftH, rightH);
      ensureSpace(maxRowH + 12);

      drawWrappedText(leftText, margins.left, y + 11, listColW, fontSizes.body, { fontColor: "#475569", lineSpacing: 15 / fontSizes.body });

      if (row.right) {
        drawWrappedText(rightText, margins.left + listColW + 24, y + 11, listColW, fontSizes.body, { fontColor: "#475569", lineSpacing: 15 / fontSizes.body });
      }

      y += maxRowH + 8;
      totalContentHeight += maxRowH + 8;
    });
  } else {
    drawText("□  Build core domain application modules as portfolio assets.", margins.left, y + 11, { fontSize: fontSizes.body, fontColor: "#475569" });
    totalContentHeight += 16;
    y += 24;
  }

  y += 16;

  drawSectionTitle("INTERVIEW READINESS & CORE SYSTEM CAPABILITIES");
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
      "Usability Ready: user research, feedback feedback systems, and visual audit metrics",
      "Interview Ready: portfolio walkthrough presentation and behavioral stories resolved"
    ];
  } else if (isData) {
    readinessPoints = [
      "Analysis Shipped: 2 comprehensive analysis notebooks or statistics reviews",
      "Dashboard Ready: interactive Power BI or Tableau dashboard analytics",
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

  readinessPoints.forEach((point) => {
    const pointText = `□  ${point}`;
    const pointH = getTextHeight(pointText, contentWidth, fontSizes.body, 15 / fontSizes.body);
    ensureSpace(pointH + 12);

    drawWrappedText(pointText, margins.left, y + 11, contentWidth, fontSizes.body, { fontColor: "#475569", lineSpacing: 15 / fontSizes.body });

    y += pointH + 8;
    totalContentHeight += pointH + 8;
  });

  y += 16;

  drawSectionTitle("UNIFIED MILESTONE TRACKER");
  totalContentHeight += 24;

  const allMilestoneTitles: string[] = [];
  safeRoadmaps.forEach((rm) => {
    getSafeArray<RoadmapMilestoneRecord>(rm.milestones).forEach((mile) => {
      allMilestoneTitles.push(mile.title);
    });
  });

  const uniqueMilestones = Array.from(new Set(allMilestoneTitles)).slice(0, 10);
  
  if (uniqueMilestones.length) {
    const listColW = (contentWidth - 24) / 2;
    const trackerRows: { left: string; right?: string }[] = [];
    for (let index = 0; index < uniqueMilestones.length; index += 2) {
      trackerRows.push({
        left: uniqueMilestones[index],
        right: uniqueMilestones[index + 1]
      });
    }

    trackerRows.forEach((row) => {
      const leftText = `□  ${row.left}`;
      const leftH = getTextHeight(leftText, listColW, fontSizes.body, 15 / fontSizes.body);

      let rightH = 0;
      let rightText = "";
      if (row.right) {
        rightText = `□  ${row.right}`;
        rightH = getTextHeight(rightText, listColW, fontSizes.body, 15 / fontSizes.body);
      }

      const maxRowH = Math.max(leftH, rightH);
      ensureSpace(maxRowH + 12);

      drawWrappedText(leftText, margins.left, y + 11, listColW, fontSizes.body, { fontColor: "#475569", lineSpacing: 15 / fontSizes.body });

      if (row.right) {
        drawWrappedText(rightText, margins.left + listColW + 24, y + 11, listColW, fontSizes.body, { fontColor: "#475569", lineSpacing: 15 / fontSizes.body });
      }

      y += maxRowH + 8;
      totalContentHeight += maxRowH + 8;
    });
  } else {
    drawText("□  Programming fundamentals and interview baseline.", margins.left, y + 11, { fontSize: fontSizes.body, fontColor: "#475569" });
    totalContentHeight += 16;
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

  // Enforce Layout Verification Bounding Box Quality Audits!
  ledger.verify();

  const blobObj = doc.output("blob") as AuditBlob;
  blobObj.valid = validReport;
  blobObj.warnings = allWarnings;
  blobObj.qualityScore = qualityScore;

  return blobObj;
}