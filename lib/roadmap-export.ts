import type { RoadmapRecord, RoadmapMilestoneRecord, RoadmapResourceLink } from "./supabase/types";
import { validateRoadmapDomainConsistency, auditRoadmapQuality, validateRoadmapDomain, MissingRoadmapTitleError, MissingRoadmapMetadataError, IncompleteRoadmapRecordError } from "./roadmap-plan";

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

export interface JsPdfExtended {
  GState: new (options: { opacity: number }) => unknown;
}

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

export function wrapText(text: string, maxWidth: number, doc?: unknown): string[] {
  if (!text) return [];
  const safeDoc = doc as { getTextWidth?: (t: string) => number } | null | undefined;
  
  const getWidth = (t: string): number => {
    if (safeDoc && typeof safeDoc.getTextWidth === "function") {
      return safeDoc.getTextWidth(t);
    }
    return t.length * 5.5;
  };

  if (getWidth(text) <= maxWidth) {
    return [text];
  }

  const lines: string[] = [];
  const paragraphs = text.split("\n");

  for (const paragraph of paragraphs) {
    const words = paragraph.split(" ");
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine ? currentLine + " " + word : word;
      if (getWidth(testLine) <= maxWidth) {
        currentLine = testLine;
        continue;
      }

      if (currentLine) {
        lines.push(currentLine);
        currentLine = "";
      }

      if (getWidth(word) <= maxWidth) {
        currentLine = word;
        continue;
      }

      let remainingWord = word;
      while (remainingWord.length > 0) {
        let low = 1;
        let high = remainingWord.length;
        let bestLen = 0;

        while (low <= high) {
          const mid = Math.floor((low + high) / 2);
          const chunk = remainingWord.slice(0, mid);
          if (getWidth(chunk) <= maxWidth) {
            bestLen = mid;
            low = mid + 1;
          } else {
            high = mid - 1;
          }
        }

        if (bestLen === 0) {
          bestLen = 1;
        }

        const chunk = remainingWord.slice(0, bestLen);
        lines.push(chunk);
        remainingWord = remainingWord.slice(bestLen);
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }
  }

  return lines;
}

export function formatAndWrapUrl(url: string, maxWidth: number, doc?: unknown, maxLines = 2): string[] {
  let lines = wrapText(url, maxWidth, doc);
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    const lastLine = lines[maxLines - 1];
    if (lastLine.length > 3) {
      lines[maxLines - 1] = lastLine.slice(0, lastLine.length - 3) + "...";
    } else {
      lines[maxLines - 1] = "...";
    }
  }
  return lines;
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

  public verifyHorizontalBounds(): string[] {
    const warnings: string[] = [];
    for (const box of this.boxes) {
      const isHeaderOrFooter = box.y1 < 48 || box.y2 > 793.89;
      if (!isHeaderOrFooter) {
        if (box.x1 < this.pageMargins - 0.1 || box.x2 > this.pageWidth - this.pageMargins + 0.1) {
          warnings.push(
            `LAYOUT WARNING: Element '${box.label}' violates horizontal margins [x1=${box.x1.toFixed(2)}, x2=${box.x2.toFixed(2)}] on page ${box.page}`
          );
        }
      }
    }
    return warnings;
  }

  public verify() {
    for (const box of this.boxes) {
      const isHeaderOrFooter = box.y1 < 48 || box.y2 > 793.89;
      
      if (!isHeaderOrFooter) {
        if (box.y1 < this.pageMargins - 0.1 || box.y2 > this.pageHeight - this.pageMargins + 0.1) {
          throw new Error(
            `LAYOUT FAILURE: Element '${box.label}' violates vertical margins [y1=${box.y1.toFixed(2)}, y2=${box.y2.toFixed(2)}] on page ${box.page}`
          );
        }
        if (box.x1 < 0 || box.x2 > this.pageWidth) {
          throw new Error(
            `LAYOUT FAILURE: Element '${box.label}' exceeds physical page width [x1=${box.x1.toFixed(2)}, x2=${box.x2.toFixed(2)}] on page ${box.page}`
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
  if (safeRoadmaps.length === 0) {
    throw new Error("Cannot export PDF: Roadmap data is structurally unusable (no roadmaps available).");
  }
  const careerGoal = report.careerGoal || report.title || "Professional Career Plan";

  // Pre-export semantic validation checks (non-blocking)
  let validReport = true;
  const allWarnings: string[] = [];
  
  safeRoadmaps.forEach((roadmap) => {
    try {
      const checkResult = validateRoadmapDomainConsistency(roadmap, careerGoal, { throwOnError: false });
      if (!checkResult.valid) {
        validReport = false;
        const mappedWarnings = checkResult.warnings.map(w => {
          if (
            w.includes("title") || 
            w.includes("metadata") || 
            w.includes("incomplete") || 
            w.includes("Missing") ||
            w.includes("Incomplete")
          ) {
            return "Missing roadmap metadata";
          }
          return w;
        });
        allWarnings.push(...mappedWarnings);
      }
      validateRoadmapDomain(roadmap, careerGoal);
    } catch (error) {
      let errMsg = error instanceof Error ? error.message : String(error);
      if (
        error instanceof MissingRoadmapTitleError ||
        error instanceof MissingRoadmapMetadataError ||
        error instanceof IncompleteRoadmapRecordError ||
        errMsg.includes("title") ||
        errMsg.includes("metadata") ||
        errMsg.includes("incomplete")
      ) {
        errMsg = "Missing roadmap metadata";
      }
      validReport = false;
      allWarnings.push(errMsg);
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
  
  function getContentWidth() {
    return pageWidth - margins.left - margins.right;
  }
  const contentWidth = getContentWidth();
  const centerX = pageWidth / 2;

  let totalContentHeight = 0;
  const ledger = new LayoutLedger();

  // Typography Tokens aligned to McKinsey and Notion AI professional standards
  const fontSizes = {
    title: 32,
    pageHeading: 22,
    section: 14,
    cardTitle: 11,
    body: 10,
    meta: 8.5,
    caption: 8.5
  };

  const colorsPalette = ["#0cc6d8", "#0bb0c0", "#099aa8", "#088490", "#066e78", "#055860", "#044248", "#032c30"];

  // Precompute aggregated projects & readiness checkpoints for Page 5
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

  function drawSubtlePageBackground() {
    // Fill full background with Deep Black
    doc.setFillColor("#020508");
    doc.rect(0, 0, pageWidth, pageHeight, "F");

    // Ambient Cyan top glow bar using translucent GState
    doc.saveGraphicsState();
    const glowGState = new (doc as unknown as JsPdfExtended).GState({ opacity: 0.05 });
    doc.setGState(glowGState);
    doc.setFillColor("#0cc6d8");
    doc.circle(0, 0, 250, "F");
    doc.circle(pageWidth, 0, 180, "F");
    doc.circle(centerX, 0, 200, "F");
    
    // Bottom center faint glow to represent Dark Graphite to Near Black blend
    doc.setFillColor("#081b24");
    doc.circle(centerX, pageHeight, 220, "F");
    doc.restoreGraphicsState();

    // Top border accent
    doc.saveGraphicsState();
    const borderGState = new (doc as unknown as JsPdfExtended).GState({ opacity: 0.15 });
    doc.setGState(borderGState);
    doc.setFillColor("#0cc6d8");
    doc.rect(0, 0, pageWidth, 4, "F");
    doc.restoreGraphicsState();
  }

  function getTextHeight(text: string, maxWidth: number, fontSize: number, lineSpacing = 1.25) {
    doc.setFontSize(fontSize);
    const lines = wrapText(text, maxWidth, doc);
    return lines.length * fontSize * lineSpacing;
  }

  function getTextLayout(text: string, maxWidth: number, baseFontSize: number, lineSpacing = 1.15) {
    let fontSize = baseFontSize;
    doc.setFontSize(fontSize);
    let textWidth = doc.getTextWidth(text);
    const minFontSize = Math.max(7, baseFontSize * 0.7);
    
    while (textWidth > maxWidth && fontSize > minFontSize) {
      fontSize -= 0.5;
      doc.setFontSize(fontSize);
      textWidth = doc.getTextWidth(text);
    }
    
    const lines = wrapText(text, maxWidth, doc);
    const height = lines.length * fontSize * lineSpacing;
    return { lines, fontSize, height };
  }

  function drawText(
    text: string, 
    x: number, 
    yVal: number, 
    options?: { 
      align?: "left" | "right" | "center"; 
      fontSize?: number; 
      fontColor?: string; 
      maxWidth?: number;
    }
  ): number {
    let currentFontSize = options?.fontSize || doc.getFontSize();
    doc.setFontSize(currentFontSize);
    
    if (options?.fontColor) {
      doc.setTextColor(options.fontColor);
    } else {
      doc.setTextColor("#94a3b8"); // default body text color is soft gray/cyan
    }

    let targetMaxWidth = options?.maxWidth;
    if (targetMaxWidth === undefined) {
      if (options?.align === "right") {
        targetMaxWidth = x - margins.left;
      } else if (options?.align === "center") {
        targetMaxWidth = 2 * Math.min(x - margins.left, pageWidth - margins.right - x);
      } else {
        targetMaxWidth = pageWidth - margins.right - x;
      }
    }
    
    let textWidth = doc.getTextWidth(text);
    
    // Auto-shrink font size if text exceeds maxWidth
    if (textWidth > targetMaxWidth) {
      const originalFontSize = currentFontSize;
      const minFontSize = Math.max(7, originalFontSize * 0.7);
      while (textWidth > targetMaxWidth && currentFontSize > minFontSize) {
        currentFontSize -= 0.5;
        doc.setFontSize(currentFontSize);
        textWidth = doc.getTextWidth(text);
      }
    }

    // If it still exceeds maxWidth, split and wrap
    if (textWidth > targetMaxWidth) {
      const wrappedLines = wrapText(text, targetMaxWidth, doc);
      const lSpacing = 1.15;
      let curY = yVal;
      wrappedLines.forEach((line, idx) => {
        if (idx > 0) {
          curY += currentFontSize * lSpacing;
        }
        
        doc.setFontSize(currentFontSize);
        const lineW = doc.getTextWidth(line);
        let lx = x;
        if (options?.align === "right") {
          lx = x - lineW;
        } else if (options?.align === "center") {
          lx = x - lineW / 2;
        }
        const ly1 = curY - currentFontSize;
        const ly2 = curY;
        
        doc.text(line, x, curY, { align: options?.align });
        ledger.pushBox(doc.getNumberOfPages(), lx, ly1, lx + lineW, ly2, `Text: ${line.substring(0, 15)}`);
      });
      return curY;
    } else {
      let x1 = x;
      if (options?.align === "right") {
        x1 = x - textWidth;
      } else if (options?.align === "center") {
        x1 = x - textWidth / 2;
      }

      const y1 = yVal - currentFontSize;
      const x2 = x1 + textWidth;
      const y2 = yVal;

      doc.text(text, x, yVal, { align: options?.align });
      ledger.pushBox(doc.getNumberOfPages(), x1, y1, x2, y2, `Text: ${text.substring(0, 15)}`);
      return yVal;
    }
  }

  function drawWrappedText(text: string, x: number, yVal: number, maxWidth: number, fontSize: number, options?: { fontColor?: string; lineSpacing?: number; align?: "left" | "right" | "center" }) {
    doc.setFont("CMGeom", "normal");
    doc.setFontSize(fontSize);
    
    const lSpacing = options?.lineSpacing || 1.25;
    const safeText = text || "";
    const wrappedLines = wrapText(safeText, maxWidth, doc);
    
    let curY = yVal;
    wrappedLines.forEach((line: string) => {
      const nextY = drawText(line, x, curY, { align: options?.align, fontSize, fontColor: options?.fontColor, maxWidth });
      curY = nextY + fontSize * lSpacing;
    });

    return curY - yVal;
  }

  function drawRoundedCard(x: number, yVal: number, width: number, height: number, rx = 4, ry = 4, style = "F", fillColor = "#081b24", strokeColor = "#0cc6d8", strokeWidth = 0.5) {
    // Fill background with `#081b24` (Deep Middle Teal/Blue-Black)
    doc.setFillColor(fillColor);
    doc.roundedRect(x, yVal, width, height, rx, ry, "F");
    
    // Draw subtle semi-transparent cyan border to complete the soft glass look
    doc.saveGraphicsState();
    const borderOpacity = new (doc as unknown as JsPdfExtended).GState({ opacity: 0.15 });
    doc.setGState(borderOpacity);
    doc.setDrawColor(strokeColor);
    doc.setLineWidth(strokeWidth);
    doc.roundedRect(x, yVal, width, height, rx, ry, style);
    doc.restoreGraphicsState();
    
    ledger.pushBox(doc.getNumberOfPages(), x, yVal, x + width, yVal + height, `Card: [x=${x}, y=${yVal}, w=${width}, h=${height}]`);
  }

  function drawBadge(text: string, x: number, yVal: number, bgColor: string, textColor = "#e0f7fa", fontSize = 7.5) {
    doc.setFontSize(fontSize);
    const textWidth = doc.getTextWidth(text);
    const paddingX = 4;
    const paddingY = 2;
    const badgeWidth = textWidth + paddingX * 2;
    const badgeHeight = fontSize + paddingY * 2;
    
    doc.setFillColor("#081b24");
    doc.roundedRect(x, yVal - fontSize - paddingY + 1, badgeWidth, badgeHeight, 2, 2, "F");
    
    doc.saveGraphicsState();
    const badgeBorderOpacity = new (doc as unknown as JsPdfExtended).GState({ opacity: 0.15 });
    doc.setGState(badgeBorderOpacity);
    doc.setDrawColor("#0cc6d8");
    doc.setLineWidth(0.5);
    doc.roundedRect(x, yVal - fontSize - paddingY + 1, badgeWidth, badgeHeight, 2, 2, "D");
    doc.restoreGraphicsState();
    
    doc.setTextColor(textColor);
    doc.text(text, x + paddingX, yVal - 1);
    
    ledger.pushBox(doc.getNumberOfPages(), x, yVal - fontSize - paddingY + 1, x + badgeWidth, yVal - fontSize - paddingY + 1 + badgeHeight, `Badge: ${text}`);
    return badgeWidth;
  }

  function drawProgressBar(x: number, yVal: number, width: number, height: number, progress: number, activeColor = "#0cc6d8", trackColor = "#081b24") {
    doc.setFillColor(trackColor);
    doc.roundedRect(x, yVal, width, height, height / 2, height / 2, "F");

    doc.saveGraphicsState();
    const trackBorderOpacity = new (doc as unknown as JsPdfExtended).GState({ opacity: 0.1 });
    doc.setGState(trackBorderOpacity);
    doc.setDrawColor("#0cc6d8");
    doc.setLineWidth(0.4);
    doc.roundedRect(x, yVal, width, height, height / 2, height / 2, "D");
    doc.restoreGraphicsState();
    
    if (progress > 0) {
      const fillWidth = Math.max(height, (width * Math.min(100, progress)) / 100);
      doc.setFillColor(activeColor);
      doc.roundedRect(x, yVal, fillWidth, height, height / 2, height / 2, "F");
    }

    ledger.pushBox(doc.getNumberOfPages(), x, yVal, x + width, yVal + height, "ProgressBar");
  }

  function drawPageFrame(pageNum: number, totalPagesCount: number) {
    doc.setFont("CMGeom", "normal");
    doc.setFontSize(fontSizes.caption);
    doc.setTextColor("#64748b");
    
    // Left: CareerOS Professional Roadmap
    doc.text("CareerOS Professional Roadmap", margins.left, 32);
    
    // Center: Roadmap Title
    const rawTitle = report.title || safeRoadmaps[0]?.title || "Tech/Business Roadmap";
    const centerTitle = rawTitle.length > 28 ? rawTitle.substring(0, 25) + "..." : rawTitle;
    doc.text(centerTitle.toUpperCase(), centerX, 32, { align: "center" });
    
    // Right: Page X of Y
    doc.text(`Page ${pageNum} of ${totalPagesCount}`, pageWidth - margins.right, 32, { align: "right" });
    
    // Header divider line
    doc.saveGraphicsState();
    const frameBorderOpacity = new (doc as unknown as JsPdfExtended).GState({ opacity: 0.15 });
    doc.setGState(frameBorderOpacity);
    doc.setDrawColor("#0cc6d8");
    doc.setLineWidth(0.4);
    doc.line(margins.left, 36, pageWidth - margins.right, 36);
    
    // Footer divider line
    doc.line(margins.left, pageHeight - 36, pageWidth - margins.right, pageHeight - 36);
    doc.restoreGraphicsState();

    // Small and elegant footer on every page
    // Left: CareerOS  ·  Generated Date
    doc.setTextColor("#64748b");
    doc.text(`CareerOS  ·  Generated: ${new Date(report.exportedAt).toLocaleDateString()}`, margins.left, pageHeight - 24);
    
    // Right: User Career Goal  ·  Page Number
    const truncatedGoal = careerGoal.length > 28 ? careerGoal.substring(0, 25) + "..." : careerGoal;
    doc.text(`${truncatedGoal.toUpperCase()}  ·  Page ${pageNum} of ${totalPagesCount}`, pageWidth - margins.right, pageHeight - 24, { align: "right" });

    // Track frame elements in ledger
    ledger.pushBox(pageNum, margins.left, 24, pageWidth - margins.right, 36, "HeaderFrame");
    ledger.pushBox(pageNum, margins.left, pageHeight - 36, pageWidth - margins.right, pageHeight - 16, "FooterFrame");
  }

  let y = margins.top;

  function ensureSpace(height: number) {
    if (y + height > pageHeight - margins.bottom) {
      totalContentHeight += (y - margins.top);
      doc.addPage();
      drawSubtlePageBackground();
      y = margins.top;
    }
  }

  function drawSectionTitle(titleText: string) {
    ensureSpace(40);
    y += 10;

    const currentY = y;
    drawText(titleText, margins.left, currentY, { fontSize: fontSizes.section, fontColor: "#0cc6d8", maxWidth: contentWidth });
    
    y += 6;

    doc.saveGraphicsState();
    const titleBorderOpacity = new (doc as unknown as JsPdfExtended).GState({ opacity: 0.15 });
    doc.setGState(titleBorderOpacity);
    doc.setDrawColor("#0cc6d8");
    doc.setLineWidth(0.4);
    doc.line(margins.left, y, pageWidth - margins.right, y);
    doc.restoreGraphicsState();
    ledger.pushBox(doc.getNumberOfPages(), margins.left, y - 0.2, pageWidth - margins.right, y + 0.2, `Section Line: ${titleText}`);
    
    y += 8;
  }

  function drawSectionHelpCard(sectionTitle: string, purpose: string, why: string, action: string) {
    ensureSpace(20);
    const helpH = 16;
    drawRoundedCard(margins.left, y, contentWidth, helpH, 3, 3, "F");
    
    const text = `ⓘ  ${sectionTitle}  ·  What: ${purpose}  ·  Why: ${why}  ·  Next: ${action}`;
    const cleanText = text.length > 120 ? text.substring(0, 117) + "..." : text;
    
    drawText(cleanText, margins.left + 8, y + 11, { fontSize: 7, fontColor: "#e0f7fa", maxWidth: contentWidth - 16 });
    y += helpH + 4;
  }

  function drawSectionDivider() {
    ensureSpace(10);
    y += 4;
    doc.saveGraphicsState();
    const dividerOpacity = new (doc as unknown as JsPdfExtended).GState({ opacity: 0.1 });
    doc.setGState(dividerOpacity);
    doc.setDrawColor("#0cc6d8");
    doc.setLineWidth(0.4);
    doc.line(margins.left, y, pageWidth - margins.right, y);
    doc.restoreGraphicsState();
    y += 6;
  }

  // Draw initial page background
  drawSubtlePageBackground();

  // ==========================================
  // PAGE 1: EXECUTIVE ROADMAP OVERVIEW
  // ==========================================
  const headerBottomY = 36;
  const reservedZoneTop = 60;

  const headerBox = { y1: 24, y2: 36 };
  doc.setFontSize(6.5);
  const paddingY = 2;
  const badgeBox = !validReport ? { y1: 32 - 6.5 - paddingY + 1, y2: 32 - 6.5 - paddingY + 1 + 6.5 + paddingY * 2 } : { y1: 0, y2: 0 };

  let titleTop = headerBottomY + 24;

  if (!validReport) {
    const alertY = margins.top;
    const alertH = 20;
    doc.setFillColor("#b91c1c");
    doc.roundedRect(margins.left, alertY, contentWidth, alertH, 3, 3, "F");

    doc.setFont("CMGeom", "normal");
    doc.setFontSize(8);
    doc.setTextColor("#ffffff");
    doc.text("⚠️ WARNING: DOMAIN MISMATCH OR CONTAMINATION DETECTED IN THIS ROADMAP", centerX, alertY + 12, { align: "center" });

    ledger.pushBox(1, margins.left, alertY, margins.left + contentWidth, alertY + alertH, "RedAlertWarningBar");
    titleTop = alertY + alertH + 12;
  }

  const reservedHeaderBottom = Math.max(headerBox.y2, badgeBox.y2, reservedZoneTop);
  if (titleTop < reservedHeaderBottom) {
    titleTop = reservedHeaderBottom;
  }

  const titleHeight = fontSizes.title;
  const calculatedTitleY = titleTop + titleHeight;

  let subtitleTop = calculatedTitleY + 12;
  if (subtitleTop < calculatedTitleY + 12) {
    subtitleTop = calculatedTitleY + 12;
  }

  const subtitleHeight = fontSizes.meta;
  const calculatedSubtitleY = subtitleTop + subtitleHeight;

  // Title & Subtitle in White and Gray
  drawText("CAREER ROADMAP REPORT", centerX, calculatedTitleY, { align: "center", fontSize: fontSizes.title, fontColor: "#ffffff" });

  drawText(`GENERATED ON ${new Date(report.exportedAt).toLocaleDateString()}  ·  VERIFIED BY CAREEROS`, centerX, calculatedSubtitleY, { align: "center", fontSize: fontSizes.meta, fontColor: "#64748b" });

  y = calculatedSubtitleY + 12;

  const readinessScore = report.readinessScore || 0;
  const totalDuration = safeRoadmaps.reduce((sum, rm) => sum + (rm.total_duration_weeks || 0), 0);
  const avgWeeklyHours = safeRoadmaps.length 
    ? Math.round(safeRoadmaps.reduce((sum, rm) => sum + (rm.weekly_hours || 0), 0) / safeRoadmaps.length)
    : 0;

  // McKinsey Executive Card (Redesigned for Premium Spacing & Typography)
  const cardHeight = 60;
  drawRoundedCard(margins.left, y, contentWidth, cardHeight, 4, 4, "F");

  drawText("CAREER GOAL", margins.left + 16, y + 14, { fontSize: fontSizes.meta, fontColor: "#64748b" });
  drawText(careerGoal, margins.left + 16, y + 26, { fontSize: fontSizes.body, fontColor: "#ffffff", maxWidth: 208 });
  drawText(`Domain: ${safeRoadmaps[0]?.career_domain || "Tech/Business"}`, margins.left + 16, y + 40, { fontSize: fontSizes.meta, fontColor: "#94a3b8" });

  doc.saveGraphicsState();
  const executiveDividerOpacity = new (doc as unknown as JsPdfExtended).GState({ opacity: 0.15 });
  doc.setGState(executiveDividerOpacity);
  doc.setDrawColor("#0cc6d8");
  doc.setLineWidth(0.4);
  doc.line(margins.left + 240, y + 10, margins.left + 240, y + cardHeight - 10);
  doc.restoreGraphicsState();

  drawText("READINESS SCORE", margins.left + 256, y + 14, { fontSize: fontSizes.meta, fontColor: "#64748b" });
  const readinessColor = readinessScore >= 80 ? "#0cc6d8" : readinessScore >= 50 ? "#0bb0c0" : "#066e78";
  drawBadge(`${readinessScore}% READY`, margins.left + 256, y + 26, readinessColor, "#e0f7fa", 8);

  doc.saveGraphicsState();
  doc.setGState(executiveDividerOpacity);
  doc.line(margins.left + 368, y + 10, margins.left + 368, y + cardHeight - 10);
  doc.restoreGraphicsState();

  drawText("TIMELINE & CAPACITY", margins.left + 384, y + 14, { fontSize: fontSizes.meta, fontColor: "#64748b" });
  drawText(`${totalDuration} Weeks total`, margins.left + 384, y + 26, { fontSize: fontSizes.body, fontColor: "#ffffff" });
  drawText(`${avgWeeklyHours} Hours / week`, margins.left + 384, y + 40, { fontSize: fontSizes.meta, fontColor: "#94a3b8" });

  y += cardHeight;
  drawSectionDivider();

  // Career Snapshot Dashboard Panel
  drawSectionTitle("CAREER SNAPSHOT");
  drawSectionHelpCard("Career Snapshot", "Key market signals for your goal.", "Highlights demand, salary, and risk.", "Target top high-paying domains.");

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
      return 11.25 + 8 + wrappedH;
    });

    maxContentH = Math.max(...contentHeights);
    const snapH = 8 + maxContentH + 8;

    values.forEach((val, idx) => {
      const cardX = margins.left + idx * (colW + 8);
      drawRoundedCard(cardX, y, colW, snapH, 4, 4, "F");

      const offset = (snapH - contentHeights[idx]) / 2;
      drawText(labels[idx], cardX + 8, y + offset + 6, { fontSize: fontSizes.meta, fontColor: "#64748b" });
      
      drawWrappedText(val, cardX + 8, y + offset + 6 + 6 + 9, colW - 16, fontSizes.body, { fontColor: "#ffffff" });
    });

    y += snapH;
    drawSectionDivider();
  }

  // Roadmap Summary Section (Required Page 1 layout)
  drawSectionTitle("ROADMAP SUMMARY");
  drawSectionHelpCard("Roadmap Summary", "Core achievements planned for your growth.", "Provides actionable learning milestones.", "Complete milestones sequentially.");

  const summaryColW = (contentWidth - 16) / 3;
  const summaryTitles = ["WHAT YOU'LL LEARN", "WHAT YOU'LL BUILD", "WHAT YOU'LL ACHIEVE"];
  const summaryTexts = [
    "What: Core syntax, DSA, & systems\nWhy: Meets SDE-I benchmarks\nNext: Learn weekly modules",
    "What: Deployed full stack portals\nWhy: Proves real execution proof\nNext: Push clean code to GitHub",
    "What: Resume, portfolio, story bank\nWhy: Boosts recruitment pipeline\nNext: Run mock interview loops"
  ];

  summaryTitles.forEach((sTitle, idx) => {
    const cardX = margins.left + idx * (summaryColW + 8);
    const cardH = 54;
    drawRoundedCard(cardX, y, summaryColW, cardH, 4, 4, "F");

    drawText(sTitle, cardX + 8, y + 12, { fontSize: fontSizes.meta, fontColor: "#0cc6d8" });
    drawWrappedText(summaryTexts[idx], cardX + 8, y + 22, summaryColW - 16, fontSizes.body - 1, { fontColor: "#94a3b8" });
  });

  y += 54 + 6;

  // Build Sprints Data array
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

  // ==========================================
  // PAGES 2 TO 4: DEDICATED SPRINT PAGES
  // ==========================================
  sprintsData.forEach((sprint, sIndex) => {
    totalContentHeight += (y - margins.top);
    doc.addPage();
    drawSubtlePageBackground();
    y = margins.top;

    drawSectionTitle(sprint.title.toUpperCase());
    drawSectionHelpCard("Sprint Plan", "Sprint schedule & core milestones.", "Deconstructs large domains into structured projects.", "Focus on completion criteria.");

    // Sprint Stats Card (Redesigned for Professional Spacing)
    const statsCardH = 30;
    drawRoundedCard(margins.left, y, contentWidth, statsCardH, 4, 4, "F");

    drawText("DURATION", margins.left + 16, y + 11, { fontSize: fontSizes.meta, fontColor: "#64748b" });
    drawText(`${sprint.weeks} Weeks`, margins.left + 16, y + 22, { fontSize: fontSizes.body, fontColor: "#ffffff" });

    drawText("COMMITMENT", margins.left + 116, y + 11, { fontSize: fontSizes.meta, fontColor: "#64748b" });
    drawText(`${sprint.hours} hrs/wk`, margins.left + 116, y + 22, { fontSize: fontSizes.body, fontColor: "#ffffff" });

    drawText("STATUS", margins.left + 224, y + 11, { fontSize: fontSizes.meta, fontColor: "#64748b" });
    const statusColors: Record<string, string> = {
      Active: "#0cc6d8",   // Deep Cyan
      Done: "#10b981",     // Soft Emerald
      Planned: "#3b82f6",  // Muted Blue
      Warning: "#f59e0b"   // Amber
    };
    const sColor = statusColors[sprint.status] || "#0cc6d8";
    drawBadge(sprint.status.toUpperCase(), margins.left + 224, y + 20, sColor, "#e0f7fa", 7.5);

    drawText("COMPLETION PROGRESS", margins.left + 332, y + 11, { fontSize: fontSizes.meta, fontColor: "#64748b" });
    drawProgressBar(margins.left + 332, y + 14, 100, 5, sprint.progress, "#0cc6d8", "#081b24");
    drawText(`${sprint.progress}%`, margins.left + 442, y + 20, { fontSize: fontSizes.body, fontColor: "#ffffff" });

    y += statsCardH + 6;

    // Skills & Projects Block (Side-by-side Cards Redesigned)
    const halfColW = (contentWidth - 12) / 2;
    const overviewH = 50;
    ensureSpace(overviewH + 8);
    drawRoundedCard(margins.left, y, halfColW, overviewH, 4, 4, "F");
    drawText("CORE TECHNICAL SKILLS", margins.left + 8, y + 12, { fontSize: fontSizes.meta, fontColor: "#0cc6d8" });
    drawWrappedText("Skills: Design, components, and APIs\nPractice: Rehearse weekly syntax drills", margins.left + 8, y + 21, halfColW - 16, fontSizes.body - 1, { fontColor: "#94a3b8" });

    drawRoundedCard(margins.left + halfColW + 12, y, halfColW, overviewH, 4, 4, "F");
    drawText("CAPSTONE PROJECTS", margins.left + halfColW + 20, y + 12, { fontSize: fontSizes.meta, fontColor: "#0cc6d8" });
    const capstoneText = `Capstone: ${sprint.milestones.flatMap(m => getSafeArray<string>(m.projects)).filter(Boolean).slice(0, 1).join(", ") || "Capstone module"}\nTask: Deploy live project versions`;
    drawWrappedText(capstoneText, margins.left + halfColW + 20, y + 21, halfColW - 16, fontSizes.body - 1, { fontColor: "#94a3b8" });
    y += overviewH + 6;

    // Sprints Milestones Cards
    drawSectionTitle("CORE SPRINT MILESTONES & PROJECTS");
    drawSectionHelpCard("Milestones & Projects", "Step-by-step milestone progression.", "Each milestone resolves a core capability.", "Ensure completion criteria are met.");

    sprint.milestones.forEach((milestone, mIdx) => {
      const maxTitleW = contentWidth - 12 - 25 - 6 - 90 - 12;
      const titleLayout = getTextLayout(milestone.title, maxTitleW, fontSizes.cardTitle);

      const whyMatters = milestone.why_it_matters || "Validates core domain capability.";
      const deliverables = getSafeArray<string>(milestone.deliverables).slice(0, 1).join(", ");
      const descText = `Focus: ${whyMatters}\nDeliverable: ${deliverables || "Completed milestones"}`;
      const descLayout = getTextLayout(descText, contentWidth - 24, fontSizes.body - 1, 1.25);
      
      const mileCardH = 10 + Math.max(15, titleLayout.height) + 6 + descLayout.height + 10;
      ensureSpace(mileCardH + 6);
      drawRoundedCard(margins.left, y, contentWidth, mileCardH, 4, 4, "F");

      const mColor = colorsPalette[(sIndex * 3 + mIdx) % colorsPalette.length];
      const mBadgeW = drawBadge(`M${String(mIdx + 1).padStart(2, "0")}`, margins.left + 12, y + 14, mColor, "#e0f7fa", 7.5);

      const titleY = y + 13;
      titleLayout.lines.forEach((line, idx) => {
        drawText(line, margins.left + 12 + mBadgeW + 6, titleY + idx * titleLayout.fontSize * 1.15, { fontSize: titleLayout.fontSize, fontColor: "#ffffff", maxWidth: maxTitleW });
      });

      const inlineMeta = `(${milestone.estimated_duration_weeks} wk · ${milestone.difficulty_level})`;
      drawText(inlineMeta, margins.left + contentWidth - 12, y + 13, { align: "right", fontSize: fontSizes.meta, fontColor: "#64748b" });

      const descY = y + 10 + Math.max(15, titleLayout.height) + 6;
      drawWrappedText(descText, margins.left + 12, descY, contentWidth - 24, fontSizes.body - 1, { fontColor: "#94a3b8" });

      y += mileCardH + 4;
    });

    drawSectionDivider();

    // Sprint bibliography / resources
    drawSectionTitle("RECOMMENDED LEARNING & ACADEMIC DIRECTORY");
    drawSectionHelpCard("Resources", "Curated directory of learning links.", "Replaces unstructured search with verified platforms.", "Complete the linked tutorials.");

    const resourceLinks = sprint.milestones.flatMap(m => getSafeArray<RoadmapResourceLink>(m.resource_links));
    const uniqueResources = Array.from(new Map(resourceLinks.map(r => [r.url, r])).values()).slice(0, 2);

    if (uniqueResources.length) {
      const resColW = (contentWidth - 12) / 2;
      const paddingX = 8;
      const paddingY = 8;
      const innerWidth = resColW - paddingX * 2;

      const cardLayouts = uniqueResources.map((res) => {
        const labelLayout = getTextLayout(res.label, innerWidth, fontSizes.body);
        const providerLayout = getTextLayout(res.provider, innerWidth, fontSizes.meta);
        
        const urlLines = formatAndWrapUrl(res.url, innerWidth, doc, 2);
        const urlLayout = {
          lines: urlLines,
          fontSize: fontSizes.meta,
          height: urlLines.length * fontSizes.meta * 1.15
        };
        
        const spacing = 3;
        const totalTextHeight = labelLayout.height + spacing + providerLayout.height + spacing + urlLayout.height;
        const cardHeight = totalTextHeight + paddingY * 2;
        
        return { labelLayout, providerLayout, urlLayout, cardHeight };
      });

      const maxResH = Math.max(...cardLayouts.map(l => l.cardHeight));
      ensureSpace(maxResH + 6);

      uniqueResources.forEach((res, rIdx) => {
        const cardX = margins.left + rIdx * (resColW + 12);
        drawRoundedCard(cardX, y, resColW, maxResH, 4, 4, "F");

        const layout = cardLayouts[rIdx];
        
        let curY = y + 8 + layout.labelLayout.fontSize;
        layout.labelLayout.lines.forEach((line) => {
          drawText(line, cardX + 8, curY, { fontSize: layout.labelLayout.fontSize, fontColor: "#ffffff", maxWidth: innerWidth });
          curY += layout.labelLayout.fontSize * 1.15;
        });
        
        curY += 2;
        layout.providerLayout.lines.forEach((line) => {
          drawText(line, cardX + 8, curY, { fontSize: layout.providerLayout.fontSize, fontColor: "#64748b", maxWidth: innerWidth });
          curY += layout.providerLayout.fontSize * 1.15;
        });
        
        curY += 2;
        layout.urlLayout.lines.forEach((line) => {
          drawText(line, cardX + 8, curY, { fontSize: layout.urlLayout.fontSize, fontColor: "#0cc6d8", maxWidth: innerWidth });
          curY += layout.urlLayout.fontSize * 1.15;
        });
      });
      y += maxResH + 4;
    }

    drawSectionDivider();

    // Sprint Outcomes
    drawSectionTitle("EXPECTED SPRINT OUTCOMES");
    drawSectionHelpCard("Outcomes", "Expected technical deliverables and skills.", "Formulates proof of work for recruiters.", "Upload capstone products to GitHub.");

    const sprintOutcomes = Array.from(new Set(sprint.milestones.flatMap(m => getSafeArray<string>(m.expected_outcomes)))).slice(0, 2);
    sprintOutcomes.forEach((outcome) => {
      const outcomeText = `□  ${outcome}`;
      const layout = getTextLayout(outcomeText, contentWidth, fontSizes.body);
      ensureSpace(layout.height + 4);
      y = drawText(outcomeText, margins.left, y + 8, { fontSize: fontSizes.body, fontColor: "#94a3b8", maxWidth: contentWidth });
      y += 4;
    });
  });

  // ==========================================
  // PAGE 5: FINAL PAGE CAREER READINESS CHECKLIST
  // ==========================================
  totalContentHeight += (y - margins.top);
  doc.addPage();
  drawSubtlePageBackground();
  y = margins.top;

  drawSectionTitle("CAREER READINESS PORTFOLIO CHECKLIST");
  drawSectionHelpCard("Readiness Checklist", "Recruiter-ready milestones & portfolio review.", "Ensures structural competency alignment.", "Verify all checkboxes before applications.");

  const gridW = (contentWidth - 12) / 2;
  const gridH = 68;
  ensureSpace(gridH * 2 + 10);
  
  // Card 1: PORTFOLIO PROJECTS
  drawRoundedCard(margins.left, y, gridW, gridH, 4, 4, "F");
  drawText("PORTFOLIO PROJECTS", margins.left + 8, y + 12, { fontSize: fontSizes.meta, fontColor: "#0cc6d8" });
  const projList = uniqueProjects.slice(0, 2).join(", ") || "Capstone application modules";
  drawWrappedText(`What: Deployed developer tools\nWhy: Proves real capability\nTarget: ${projList.length > 28 ? projList.substring(0, 25) + "..." : projList}`, margins.left + 8, y + 22, gridW - 16, fontSizes.body - 1, { fontColor: "#94a3b8" });

  // Card 2: RESUME READINESS
  drawRoundedCard(margins.left + gridW + 12, y, gridW, gridH, 4, 4, "F");
  drawText("RESUME READINESS", margins.left + gridW + 20, y + 12, { fontSize: fontSizes.meta, fontColor: "#0cc6d8" });
  drawWrappedText("What: Keyword-optimized SDE resume\nWhy: Maximizes ATS pass rate\nTarget: ATS-ready SDE-I", margins.left + gridW + 20, y + 22, gridW - 16, fontSizes.body - 1, { fontColor: "#94a3b8" });

  y += gridH + 6;

  // Card 3: GITHUB READINESS
  drawRoundedCard(margins.left, y, gridW, gridH, 4, 4, "F");
  drawText("GITHUB READINESS", margins.left + 8, y + 12, { fontSize: fontSizes.meta, fontColor: "#0cc6d8" });
  drawWrappedText("What: Semantic commits & READMEs\nWhy: Proves collaborative habits\nTarget: Clean GitHub profile", margins.left + 8, y + 22, gridW - 16, fontSizes.body - 1, { fontColor: "#94a3b8" });

  // Card 4: INTERVIEW READINESS
  drawRoundedCard(margins.left + gridW + 12, y, gridW, gridH, 4, 4, "F");
  drawText("INTERVIEW READINESS", margins.left + gridW + 20, y + 12, { fontSize: fontSizes.meta, fontColor: "#0cc6d8" });
  drawWrappedText("What: System design & STAR stories\nWhy: Proves tradeoff mastery\nTarget: Scalability story bank", margins.left + gridW + 20, y + 22, gridW - 16, fontSizes.body - 1, { fontColor: "#94a3b8" });

  y += gridH + 4;
  drawSectionDivider();

  drawSectionTitle("RECRUITMENT READINESS & UNIFIED CHECKLIST");
  drawSectionHelpCard("Career Checklist", "Unified milestone progression tracker.", "Validates complete career-goal readiness.", "Execute all checks before applying.");

  readinessPoints.forEach((point) => {
    const pointText = `□  ${point}`;
    const layout = getTextLayout(pointText, contentWidth, fontSizes.body);
    ensureSpace(layout.height + 4);
    y = drawText(pointText, margins.left, y + 8, { fontSize: fontSizes.body, fontColor: "#94a3b8", maxWidth: contentWidth });
    y += 4;
  });

  // Draw Page Frames on all pages
  const totalPages = doc.getNumberOfPages();
  for (let pNum = 1; pNum <= totalPages; pNum++) {
    doc.setPage(pNum);
    drawPageFrame(pNum, totalPages);
  }

  // PDF Density Report calculation
  totalContentHeight += (y - margins.top);
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

  const layoutWarnings = ledger.verifyHorizontalBounds();
  if (layoutWarnings.length > 0) {
    console.warn("PDF generation encountered horizontal layout warnings:", layoutWarnings);
    allWarnings.push(...layoutWarnings);
  }

  const blobObj = doc.output("blob") as AuditBlob;
  blobObj.valid = validReport;
  blobObj.warnings = allWarnings;
  blobObj.qualityScore = qualityScore;

  return blobObj;
}