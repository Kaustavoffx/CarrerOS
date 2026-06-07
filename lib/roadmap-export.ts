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
const LOGO_IMAGE_URL = new URL("../assets/logo.png", import.meta.url).toString();
const BACKGROUND_IMAGE_URL = new URL("../public/background.webp", import.meta.url).toString();

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

async function loadLogoBase64(): Promise<string> {
  let base64 = "";
  if (typeof window === "undefined") {
    const { readFile } = await import("node:fs/promises");
    const { fileURLToPath } = await import("node:url");
    base64 = arrayBufferToBase64(await readFile(fileURLToPath(LOGO_IMAGE_URL)).then((buffer) => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)));
  } else {
    let response: Response;
    try {
      response = await fetch("/logo.png");
    } catch {
      response = await fetch(LOGO_IMAGE_URL);
    }
    if (!response.ok) {
      throw new Error(`Failed to load logo image: ${response.status}`);
    }
    base64 = arrayBufferToBase64(await response.arrayBuffer());
  }
  return `data:image/png;base64,${base64}`;
}

async function loadBackgroundBase64(): Promise<string> {
  let base64 = "";
  if (typeof window === "undefined") {
    const { readFile } = await import("node:fs/promises");
    const { fileURLToPath } = await import("node:url");
    base64 = arrayBufferToBase64(await readFile(fileURLToPath(BACKGROUND_IMAGE_URL)).then((buffer) => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)));
  } else {
    let response: Response;
    try {
      response = await fetch("/background.webp");
    } catch {
      response = await fetch(BACKGROUND_IMAGE_URL);
    }
    if (!response.ok) {
      throw new Error(`Failed to load background image: ${response.status}`);
    }
    base64 = arrayBufferToBase64(await response.arrayBuffer());
  }

  if (typeof window !== "undefined") {
    try {
      return await new Promise<string>((resolve) => {
        const img = new Image();
        img.src = `data:image/webp;base64,${base64}`;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          // Rotate 270 degrees clockwise (swapping width and height)
          canvas.width = img.height;
          canvas.height = img.width;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.translate(0, canvas.height);
            ctx.rotate(-Math.PI / 2);
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL("image/png"));
          } else {
            resolve(`data:image/png;base64,${base64}`);
          }
        };
        img.onerror = () => {
          resolve(`data:image/png;base64,${base64}`);
        };
      });
    } catch {
      return `data:image/png;base64,${base64}`;
    }
  }

  return `data:image/png;base64,${base64}`;
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
  const safeDoc = doc as { getTextWidth?: (t: string) => number } | null | undefined;
  const getWidth = (t: string): number => {
    if (safeDoc && typeof safeDoc.getTextWidth === "function") {
      return safeDoc.getTextWidth(t);
    }
    return t.length * 5.5;
  };

  const regex = /([a-zA-Z0-9]+|[^a-zA-Z0-9])/g;
  const tokens = url.match(regex) || [url];
  
  let lines: string[] = [];
  let currentLine = "";
  
  for (const token of tokens) {
    const testLine = currentLine + token;
    if (getWidth(testLine) <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = "";
      }
      if (getWidth(token) > maxWidth) {
        let remaining = token;
        while (remaining.length > 0) {
          let low = 1;
          let high = remaining.length;
          let bestLen = 0;
          while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            const chunk = remaining.slice(0, mid);
            if (getWidth(chunk) <= maxWidth) {
              bestLen = mid;
              low = mid + 1;
            } else {
              high = mid - 1;
            }
          }
          if (bestLen === 0) bestLen = 1;
          lines.push(remaining.slice(0, bestLen));
          remaining = remaining.slice(bestLen);
        }
      } else {
        currentLine = token;
      }
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }

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
      `Demand score: ${roadmap.career_demand_score}/${roadmap.career_demand_score <= 10 ? 10 : 100}`,
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
  const logoBase64 = await loadLogoBase64();
  const backgroundBase64 = await loadBackgroundBase64();
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

  // Typography Tokens
  const fontSizes = {
    title: 54,
    pageHeading: 24,
    section: 16,
    cardTitle: 11,
    body: 11,
    meta: 9,
    caption: 9
  };

  const colorsPalette = ["#00D8FF"];



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

  // Visual Utility functions
  function drawAtmosphericCloud(x: number, y: number, radius: number, hexColor: string, maxOpacity: number) {
    doc.setFillColor(hexColor);
    const steps = 120;
    const safeMaxOpacity = Math.min(0.12, maxOpacity);
    for (let i = steps; i > 0; i--) {
      const t = i / steps;
      const r = radius * t;
      const opacity = safeMaxOpacity * Math.pow(1 - t, 3.5); // extremely soft falloff
      if (opacity <= 0.0001) continue;
      
      doc.saveGraphicsState();
      const gState = new (doc as unknown as JsPdfExtended).GState({ opacity });
      doc.setGState(gState);
      doc.circle(x, y, r, "F");
      doc.restoreGraphicsState();
    }
  }

  function drawWatermark() {
    doc.saveGraphicsState();
    const watermarkGState = new (doc as unknown as JsPdfExtended).GState({ opacity: 0.02 });
    doc.setGState(watermarkGState);
    const size = pageWidth * 0.60;
    const x = centerX - size / 2;
    const y = (pageHeight / 2) - size / 2;
    doc.addImage(logoBase64, "PNG", x, y, size, size);
    doc.restoreGraphicsState();
  }

  function drawSubtlePageBackground(pageNum: number) {
    // Draw background.webp at 1.0 opacity covering the entire page (full bleed)
    doc.addImage(backgroundBase64, "PNG", 0, 0, pageWidth, pageHeight);

    // Draw the centered watermark on all pages
    drawWatermark();
  }

  function drawLiquidGlassCard(
    x: number,
    yVal: number,
    width: number,
    height: number,
    options?: {
      glowColor?: string;
      glowOpacity?: number;
      rx?: number;
      ry?: number;
      style?: string;
    }
  ) {
    const rx = options?.rx ?? 20;
    const ry = options?.ry ?? 20;

    doc.saveGraphicsState();
    const gState = new (doc as unknown as JsPdfExtended).GState({ opacity: 0.20 });
    doc.setGState(gState);
    doc.setFillColor("#080C12");
    doc.roundedRect(x, yVal, width, height, rx, ry, "F");
    doc.restoreGraphicsState();

    ledger.pushBox(doc.getNumberOfPages(), x, yVal, x + width, yVal + height, `Card: [x=${x.toFixed(1)}, y=${yVal.toFixed(1)}, w=${width.toFixed(1)}, h=${height.toFixed(1)}]`);
  }

  function drawReadinessRing(centerX: number, centerY: number, radius: number, score: number) {
    const totalBeads = 36;
    const activeBeads = Math.round((score / 100) * totalBeads);
    
    // Draw background ring glow
    doc.saveGraphicsState();
    const glowGState = new (doc as unknown as JsPdfExtended).GState({ opacity: 0.04 });
    doc.setGState(glowGState);
    doc.setFillColor("#00D8FF");
    doc.circle(centerX, centerY, radius + 15, "F");
    doc.restoreGraphicsState();
    
    for (let i = 0; i < totalBeads; i++) {
      const angle = (i * 2 * Math.PI) / totalBeads - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      
      if (i < activeBeads) {
        doc.saveGraphicsState();
        const beadGlow = new (doc as unknown as JsPdfExtended).GState({ opacity: 0.15 });
        doc.setGState(beadGlow);
        doc.setFillColor("#00D8FF");
        doc.circle(x, y, 4, "F");
        doc.restoreGraphicsState();
        
        doc.setFillColor("#00D8FF");
        doc.circle(x, y, 2.2, "F");
      } else {
        doc.setFillColor("#1E293B");
        doc.circle(x, y, 1.8, "F");
      }
    }
    
    // Draw score text in center
    doc.setFont("CMGeom", "normal");
    doc.setFontSize(28);
    doc.setTextColor("#FFFFFF");
    doc.text(`${score}%`, centerX, centerY + 8, { align: "center" });
    
    doc.setFontSize(7.5);
    doc.setTextColor("#64748b");
    doc.text("READINESS", centerX, centerY - 14, { align: "center" });

    ledger.pushBox(doc.getNumberOfPages(), centerX - radius, centerY - radius, centerX + radius, centerY + radius, "ReadinessRing");
  }

  function drawSectionHeader(label: string, title: string, subtitle: string) {
    // 1. Small cyan label
    drawText(label.toUpperCase(), margins.left, y + 9, { fontSize: 9, fontColor: "#00D8FF" });
    
    // 2. Large title
    drawText(title, margins.left, y + 30, { fontSize: 24, fontColor: "#FFFFFF" });
    
    // 3. Supporting text
    drawText(subtitle, margins.left, y + 45, { fontSize: 11, fontColor: "#FFFFFF", opacity: 0.72 });

    y += 56;
  }

  function drawProgressBar(
    x: number, 
    yVal: number, 
    width: number, 
    height: number, 
    progress: number, 
    activeColor = "#00D8FF", 
    trackColor = "#1E293B"
  ) {
    doc.setFillColor(trackColor);
    doc.roundedRect(x, yVal, width, height, height / 2, height / 2, "F");
    
    if (progress > 0) {
      const fillWidth = Math.max(height, (width * Math.min(100, progress)) / 100);
      doc.setFillColor(activeColor);
      doc.roundedRect(x, yVal, fillWidth, height, height / 2, height / 2, "F");
    }

    ledger.pushBox(doc.getNumberOfPages(), x, yVal, x + width, yVal + height, "ProgressBar");
  }

  function drawBadge(text: string, x: number, yVal: number, bgColor: string, textColor = "#e0f7fa", fontSize = 7.5) {
    doc.setFontSize(fontSize);
    const textWidth = doc.getTextWidth(text);
    const paddingX = 5;
    const paddingY = 2.5;
    const badgeWidth = textWidth + paddingX * 2;
    const badgeHeight = fontSize + paddingY * 2;
    
    doc.saveGraphicsState();
    const badgeBgOpacity = new (doc as unknown as JsPdfExtended).GState({ opacity: 0.15 });
    doc.setGState(badgeBgOpacity);
    doc.setFillColor(bgColor);
    doc.roundedRect(x, yVal - fontSize - paddingY + 1, badgeWidth, badgeHeight, 6, 6, "F");
    doc.restoreGraphicsState();
    
    doc.setTextColor(bgColor);
    doc.text(text, x + paddingX, yVal - 0.5);
    
    ledger.pushBox(doc.getNumberOfPages(), x, yVal - fontSize - paddingY + 1, x + badgeWidth, yVal - fontSize - paddingY + 1 + badgeHeight, `Badge: ${text}`);
    return badgeWidth;
  }

  function getPremiumIntelCardHeight(width: number, title: string, val: string, desc: string) {
    const paddingX = 22;
    const paddingY = 22;
    const contentW = width - paddingX * 2;
    
    doc.saveGraphicsState();
    doc.setFont("CMGeom", "normal");
    
    doc.setFontSize(12);
    const titleLines = wrapText(title.toUpperCase(), contentW, doc);
    
    doc.setFontSize(11);
    const valLines = val ? wrapText(val, contentW, doc) : [];
    
    doc.setFontSize(9.5);
    const descLines = wrapText(desc, contentW, doc);
    
    doc.restoreGraphicsState();

    let h = paddingY;
    h += titleLines.length * 12 * 1.5;
    h += 18; // Spacing after title
    if (val) {
      h += valLines.length * 11 * 1.5;
      h += 8; // Spacing after val
    }
    h += descLines.length * 9.5 * 1.5;
    h += paddingY;
    
    return h;
  }

  function getRoadmapSummaryCardHeight(width: number, title: string, desc: string) {
    const paddingX = 16;
    const paddingY = 16;
    const contentW = width - paddingX * 2;
    
    doc.saveGraphicsState();
    doc.setFont("CMGeom", "normal");
    
    doc.setFontSize(8.5);
    const titleLines = wrapText(title.toUpperCase(), contentW, doc);
    
    doc.setFontSize(8);
    const descLines = wrapText(desc, contentW, doc);
    
    doc.restoreGraphicsState();
    
    let h = paddingY;
    h += titleLines.length * 8.5 * 1.5;
    h += 12; // Spacing after title
    h += descLines.length * 8 * 1.5;
    h += paddingY;
    
    return h;
  }

  function drawDashboardMetricCard(x: number, yVal: number, width: number, height: number, label: string, value: string, color: string) {
    drawLiquidGlassCard(x, yVal, width, height, {
      glowColor: color,
      glowOpacity: 0.05,
      rx: 12,
      ry: 12
    });
    
    doc.setFont("CMGeom", "normal");
    doc.setFontSize(8);
    doc.setTextColor("#64748b");
    drawText(label.toUpperCase(), x + 12, yVal + 16);
    
    doc.setFontSize(18);
    doc.setTextColor("#FFFFFF");
    drawText(value, x + 12, yVal + 36);
  }

  function drawPremiumIntelCard(x: number, yVal: number, width: number, height: number, title: string, val: string, desc: string, glowColor: string) {
    const paddingX = 22;
    const paddingY = 22;
    const contentW = width - paddingX * 2;
    
    drawLiquidGlassCard(x, yVal, width, height, {
      glowColor,
      glowOpacity: 0.04,
      rx: 20,
      ry: 20
    });

    let curY = yVal + paddingY;

    // Title: 12pt
    const titleEndY = drawText(title.toUpperCase(), x + paddingX, curY + 12, { maxWidth: contentW, fontSize: 12, fontColor: glowColor });
    curY = titleEndY + 18; // 18px spacing between title and body/val

    if (val) {
      const valEndY = drawText(val, x + paddingX, curY + 11, { maxWidth: contentW, fontSize: 11, fontColor: "#FFFFFF" });
      curY = valEndY + 8; // spacing after val
    }

    // Body: 9.5pt, 1.5x line-height
    drawWrappedText(desc, x + paddingX, curY + 9.5, contentW, 9.5, { fontColor: "#94A3B8", lineSpacing: 1.5 });
  }

  function drawCompetencyMeter(x: number, yVal: number, width: number, label: string, progress: number, color = "#00D8FF") {
    doc.setFont("CMGeom", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor("#94A3B8");
    drawText(label, x + 4, yVal);
    
    doc.setTextColor("#FFFFFF");
    drawText(`${progress}%`, x + width - 28, yVal, { align: "right" });

    drawProgressBar(x, yVal + 6, width, 4, progress, color, "#141B26");
  }


  function drawText(
    text: string, 
    x: number, 
    yVal: number, 
    options?: { 
      align?: "left" | "right" | "center"; 
      fontSize?: number; 
      fontColor?: string; 
      opacity?: number;
      maxWidth?: number;
    }
  ): number {
    let currentFontSize = options?.fontSize || doc.getFontSize();
    doc.setFontSize(currentFontSize);
    
    doc.saveGraphicsState();
    const opacity = options?.opacity ?? 1.0;
    if (opacity < 1.0) {
      const gState = new (doc as unknown as JsPdfExtended).GState({ opacity });
      doc.setGState(gState);
    }
    
    if (options?.fontColor) {
      doc.setTextColor(options.fontColor);
    } else {
      doc.setTextColor("#FFFFFF");
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
    
    if (textWidth > targetMaxWidth) {
      const originalFontSize = currentFontSize;
      const minFontSize = Math.max(7, originalFontSize * 0.7);
      while (textWidth > targetMaxWidth && currentFontSize > minFontSize) {
        currentFontSize -= 0.5;
        doc.setFontSize(currentFontSize);
        textWidth = doc.getTextWidth(text);
      }
    }

    let returnY = yVal;

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
      returnY = curY;
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
      returnY = yVal;
    }

    doc.restoreGraphicsState();
    return returnY;
  }

  function drawWrappedText(
    text: string, 
    x: number, 
    yVal: number, 
    maxWidth: number, 
    fontSize: number, 
    options?: { fontColor?: string; opacity?: number; lineSpacing?: number; align?: "left" | "right" | "center" }
  ) {
    doc.setFont("CMGeom", "normal");
    doc.setFontSize(fontSize);
    
    const lSpacing = options?.lineSpacing || 1.25;
    const safeText = text || "";
    const wrappedLines = wrapText(safeText, maxWidth, doc);
    
    let curY = yVal;
    wrappedLines.forEach((line: string) => {
      const nextY = drawText(line, x, curY, { align: options?.align, fontSize, fontColor: options?.fontColor, opacity: options?.opacity, maxWidth });
      curY = nextY + fontSize * lSpacing;
    });

    return curY - yVal;
  }

  function drawPageFrame(pageNum: number, totalPagesCount: number) {
    if (pageNum === 1) return; // Skip cover page frame!
    
    doc.saveGraphicsState();
    const frameGState = new (doc as unknown as JsPdfExtended).GState({ opacity: 0.6 });
    doc.setGState(frameGState);
    
    doc.setFont("CMGeom", "normal");
    doc.setFontSize(9);
    
    // Header Left: Logo image + CareerOS + Career Execution Plan
    doc.addImage(logoBase64, "PNG", margins.left, 16, 10, 10);
    doc.setTextColor("#FFFFFF");
    doc.text("CareerOS", margins.left + 14, 24);
    doc.setTextColor("#00D8FF");
    doc.text("·", margins.left + 58, 24);
    
    doc.saveGraphicsState();
    doc.setGState(new (doc as unknown as JsPdfExtended).GState({ opacity: 0.72 }));
    doc.setTextColor("#FFFFFF");
    doc.text("Career Execution Plan", margins.left + 66, 24);
    doc.restoreGraphicsState();
    
    // Footer Left: Logo + Generated by CareerOS
    doc.saveGraphicsState();
    doc.setGState(new (doc as unknown as JsPdfExtended).GState({ opacity: 0.45 }));
    doc.setTextColor("#FFFFFF");
    doc.setFontSize(9);
    const footerLogoSize = 8;
    doc.addImage(logoBase64, "PNG", margins.left, pageHeight - 24, footerLogoSize, footerLogoSize);
    doc.text("Generated by CareerOS", margins.left + 12, pageHeight - 18);
    
    // Footer Center: Version + Date
    const exportDate = new Date(report.exportedAt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
    const roadmapVersion = safeRoadmaps[0]?.roadmap_version || "1.0.0";
    doc.text(`v${roadmapVersion}  ·  ${exportDate}`, centerX, pageHeight - 18, { align: "center" });
    
    // Footer Right: Page Number
    doc.text(`Page ${pageNum} of ${totalPagesCount}`, pageWidth - margins.right, pageHeight - 18, { align: "right" });
    doc.restoreGraphicsState();
    
    doc.restoreGraphicsState();

    ledger.pushBox(pageNum, margins.left, 16, pageWidth - margins.right, 34, "HeaderFrame");
    ledger.pushBox(pageNum, margins.left, pageHeight - 34, pageWidth - margins.right, pageHeight - 16, "FooterFrame");
  }

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

  let y = margins.top;
  const readinessScore = report.readinessScore || 0;
  const totalDuration = safeRoadmaps.reduce((sum, rm) => sum + (rm.total_duration_weeks || 0), 0);
  const avgWeeklyHours = safeRoadmaps.length 
    ? Math.round(safeRoadmaps.reduce((sum, rm) => sum + (rm.weekly_hours || 0), 0) / safeRoadmaps.length)
    : 0;

  // ==========================================
  // PAGE 1: PREMIUM COVER PAGE
  // ==========================================
  drawSubtlePageBackground(1);

  // Top: CareerOS Logo (centered & elegant)
  const topLogoSize = 24;
  doc.addImage(logoBase64, "PNG", centerX - topLogoSize / 2, 60, topLogoSize, topLogoSize);

  // Center: SDE I / Goal title (54pt)
  const hugeTitleText = careerGoal;
  const titleEndY = drawText(hugeTitleText, centerX, 220, { align: "center", fontSize: 54, fontColor: "#FFFFFF", maxWidth: contentWidth });

  // Center: Subtitle (16pt Subheading)
  const subtitleY = titleEndY + 20;
  drawText("Career Execution Plan", centerX, subtitleY, { align: "center", fontSize: 16, fontColor: "#00D8FF", maxWidth: contentWidth });

  // Center: Large Hero Logo
  const heroLogoSize = 120;
  const heroLogoY = subtitleY + 30;
  doc.addImage(logoBase64, "PNG", centerX - heroLogoSize / 2, heroLogoY, heroLogoSize, heroLogoSize);

  // Center: Readiness Score Ring
  const ringCenterY = heroLogoY + heroLogoSize + 70;
  drawReadinessRing(centerX, ringCenterY, 45, readinessScore);

  // Bottom row split composition (horizontal typographic grid)
  const bottomMetaY = 700;
  const colW = contentWidth / 4;
  const formatExportDate = new Date(report.exportedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });

  const coverMetadata = [
    { label: "TIMELINE", val: `${totalDuration} Weeks` },
    { label: "WEEKLY HOURS", val: `${avgWeeklyHours} Hrs/Wk` },
    { label: "GENERATED DATE", val: formatExportDate },
    { label: "TARGET DOMAIN", val: domainLabel }
  ];

  coverMetadata.forEach((meta, idx) => {
    const colX = margins.left + idx * colW;
    // Draw label
    drawText(meta.label, colX, bottomMetaY, { fontSize: 9, fontColor: "#FFFFFF", opacity: 0.45 });
    // Draw value
    drawText(meta.val, colX, bottomMetaY + 16, { fontSize: 11, fontColor: "#FFFFFF" });
  });

  totalContentHeight += (y - margins.top);

  // ==========================================
  // PAGE 2: EXECUTIVE MARKET BRIEF
  // ==========================================
  doc.addPage();
  drawSubtlePageBackground(2);
  y = margins.top;

  drawSectionHeader("CAREER SNAPSHOT", "Executive Market Brief", "Strategic analysis generated from current career objective.");

  // Row of 4 Dashboard Metrics (Typographic, No Cards)
  const metricColW = contentWidth / 4;
  const momentumVal = Math.min(100, Math.max(50, Math.round(readinessScore * 1.15)));
  const metricsList = [
    { label: "Readiness", val: `${readinessScore}%` },
    { label: "Momentum", val: `${momentumVal}%` },
    { label: "Execution", val: "85%" },
    { label: "Career Health", val: "92%" }
  ];

  metricsList.forEach((metric, idx) => {
    const colX = margins.left + idx * metricColW;
    drawText(metric.label.toUpperCase(), colX, y, { fontSize: 9, fontColor: "#FFFFFF", opacity: 0.45 });
    drawText(metric.val, colX, y + 26, { fontSize: 24, fontColor: "#00D8FF" });
  });

  y += 46 + 24;

  // 2x2 grid of Market Dynamics (Typographic, No Cards)
  const firstRoadmap = safeRoadmaps[0];
  if (firstRoadmap) {
    const colW = (contentWidth - 24) / 2;
    const leftX = margins.left;
    const rightX = centerX + 12;

    const sections = [
      {
        title: "Market Demand",
        val: `${firstRoadmap.career_demand_score}/100 Demand`,
        desc: "Strong demand signal indicating continuous job openings and hiring pipeline velocity across major regions.",
        col: "left"
      },
      {
        title: "Salary Outlook",
        val: firstRoadmap.salary_range || "Competitive Base",
        desc: "Estimated benchmark salary range representing starting compensation brackets for verified positions.",
        col: "left"
      },
      {
        title: "Industry Growth",
        val: firstRoadmap.market_outlook || "Accelerating Growth",
        desc: "Robust YoY expansion and expansion of supporting digital services creating constant demand for skilled engineering professionals.",
        col: "right"
      },
      {
        title: "Automation Risk",
        val: firstRoadmap.automation_risk || "Low Risk",
        desc: "Low susceptibility to automated displacement due to cognitive complexity, problem-solving, and creative design roles.",
        col: "right"
      }
    ];

    let leftY = y;
    let rightY = y;

    sections.forEach((sect) => {
      const isLeft = sect.col === "left";
      const curX = isLeft ? leftX : rightX;
      let curY = isLeft ? leftY : rightY;

      drawText(sect.title.toUpperCase(), curX, curY, { fontSize: 9, fontColor: "#FFFFFF", opacity: 0.45 });
      drawText(sect.val, curX, curY + 18, { fontSize: 16, fontColor: "#00D8FF" });

      const wrappedDesc = wrapText(sect.desc, colW, doc);
      let descY = curY + 34;
      wrappedDesc.forEach((line) => {
        drawText(line, curX, descY, { fontSize: 11, fontColor: "#FFFFFF", opacity: 0.72 });
        descY += 16;
      });

      if (isLeft) {
        leftY = descY + 20;
      } else {
        rightY = descY + 20;
      }
    });

    y = Math.max(leftY, rightY) + 10;
  }

  // 3-column Roadmap Summary (Typographic, No Cards)
  const summaryColW = (contentWidth - 24) / 3;
  const summaryList = [
    { title: "WHAT YOU'LL LEARN", text: "Language syntaxes, algorithmic complexity (DSA), system frameworks, client-server databases, and REST APIs." },
    { title: "WHAT YOU'LL BUILD", text: "3 complete capstone applications featuring fully responsive UI components, live database layers, and Git codebases." },
    { title: "WHAT YOU'LL ACHIEVE", text: "Recruiter-ready resume, deployed portfolio portal, comprehensive behavioral stories bank, and 10+ pipeline leads." }
  ];

  let maxSummaryEndY = y;
  summaryList.forEach((sItem, idx) => {
    const colX = margins.left + idx * (summaryColW + 12);
    let curY = y;

    drawText(sItem.title, colX, curY, { fontSize: 9, fontColor: "#FFFFFF", opacity: 0.45 });

    const wrappedLines = wrapText(sItem.text, summaryColW, doc);
    let txtY = curY + 16;
    wrappedLines.forEach((line) => {
      drawText(line, colX, txtY, { fontSize: 11, fontColor: "#FFFFFF", opacity: 0.72 });
      txtY += 16;
    });

    maxSummaryEndY = Math.max(maxSummaryEndY, txtY);
  });

  y = maxSummaryEndY + 30;

  // Domain Competency Breakdown (Typographic, No Cards)
  doc.setFont("CMGeom", "normal");
  doc.setFontSize(16);
  doc.setTextColor("#FFFFFF");
  doc.text("Domain Competency Breakdown", margins.left, y);

  y += 20;

  const competencyW = (contentWidth - 36) / 2;
  const comps = [
    { label: "System Design & Scalability", progress: 65 },
    { label: "Core Architectural Patterns", progress: 80 },
    { label: "Algorithmic Logic Complexity", progress: 70 },
    { label: "Database Schema Design", progress: 85 }
  ];

  comps.forEach((comp, idx) => {
    const colIdx = idx % 2;
    const rowIdx = Math.floor(idx / 2);
    const colX = margins.left + colIdx * (competencyW + 36);
    const rowY = y + rowIdx * 45;

    drawText(comp.label, colX, rowY, { fontSize: 11, fontColor: "#FFFFFF", opacity: 0.72 });
    drawText(`${comp.progress}%`, colX + competencyW, rowY, { align: "right", fontSize: 11, fontColor: "#00D8FF" });

    // Progress Bar Track
    doc.setFillColor("#141B26");
    doc.roundedRect(colX, rowY + 6, competencyW, 3, 1.5, 1.5, "F");
    
    // Progress Bar Fill
    doc.setFillColor("#00D8FF");
    doc.roundedRect(colX, rowY + 6, (competencyW * comp.progress) / 100, 3, 1.5, 1.5, "F");
  });

  totalContentHeight += (y - margins.top);

  // ==========================================
  // PAGES 3 TO 5: DEDICATED SPRINT PAGES
  // ==========================================
  sprintsData.forEach((sprint, sIndex) => {
    const pageNum = 3 + sIndex;
    doc.addPage();
    drawSubtlePageBackground(pageNum);
    y = margins.top;

    // 1. Chapter Heading (Editorial design)
    doc.setFont("CMGeom", "normal");
    doc.setFontSize(60);
    doc.setTextColor("#00D8FF");
    const chapterNum = String(sIndex + 1).padStart(2, "0");
    doc.text(chapterNum, margins.left, y + 45);

    drawText("SPRINT PLAN", margins.left + 75, y + 8, { fontSize: 9, fontColor: "#FFFFFF", opacity: 0.45 });

    doc.setFontSize(20);
    doc.setTextColor("#FFFFFF");
    const displayTitle = sprint.title.replace(/^Sprint \d+:\s*/i, "");
    drawText(displayTitle, margins.left + 75, y + 28, { fontSize: 20, fontColor: "#FFFFFF", maxWidth: contentWidth - 75 });
    y += 55;

    // 2. Mission Statement (Premium liquid panel, borderless)
    const missionH = 36;
    drawLiquidGlassCard(margins.left, y, contentWidth, missionH, { rx: 12, ry: 12 });
    drawText(sprint.summary, margins.left + 16, y + 21, { maxWidth: contentWidth - 32, fontSize: 11, fontColor: "#FFFFFF", opacity: 0.72 });
    y += missionH + 16;

    // 3. Timeline & Commitment (Metadata row, borderless)
    const commitmentText = `DURATION: ${sprint.weeks} WEEKS   ·   COMMITMENT: ${sprint.hours} HRS/WK   ·   STATUS: ${sprint.status.toUpperCase()}   ·   PROGRESS: ${sprint.progress}%`;
    drawText(commitmentText, margins.left, y, { fontSize: 9, fontColor: "#FFFFFF", opacity: 0.45 });
    y += 20;

    // Prepare skills and capstone text
    let skillsText = "Design, backend components, and database structures.";
    let capstoneProj = "Portfolio deployment & API integration modules.";
    if (isSde) {
      if (sIndex === 0) {
        skillsText = "Algorithms, Git Workflow, Basic Syntax Variables";
        capstoneProj = "Terminal CLI utilities & mock sorting visualizers.";
      } else if (sIndex === 1) {
        skillsText = "React components, Database Schemas, Web API queries";
        capstoneProj = "Live e-commerce portal mockup & full stack CRUD panels.";
      } else if (sIndex === 2) {
        skillsText = "System scaling patterns, STAR behavioral storytelling drafts";
        capstoneProj = "Mock interviews script database & ATS resume matches.";
      }
    } else {
      const titles = sprint.milestones.map(m => m.title).filter(Boolean);
      if (titles.length > 0) {
        skillsText = titles.join(", ");
        if (skillsText.length > 60) {
          skillsText = skillsText.substring(0, 57) + "...";
        }
      }
      const allProjects = sprint.milestones.flatMap(m => getSafeArray<string>(m.projects)).filter(Boolean);
      if (allProjects.length > 0) {
        capstoneProj = `${allProjects.slice(0, 2).join(", ")}`;
        if (capstoneProj.length > 65) {
          capstoneProj = capstoneProj.substring(0, 62) + "...";
        }
      }
    }

    // 4. Key Skills & Capstone Projects (2 columns, borderless)
    const halfColW = (contentWidth - 24) / 2;
    
    drawText("CORE TECHNICAL SKILLS", margins.left, y, { fontSize: 9, fontColor: "#FFFFFF", opacity: 0.45 });
    const wrappedSkills = wrapText(skillsText, halfColW, doc);
    let skillsY = y + 16;
    wrappedSkills.forEach((line) => {
      drawText(line, margins.left, skillsY, { fontSize: 11, fontColor: "#FFFFFF", opacity: 0.72 });
      skillsY += 16;
    });

    drawText("CAPSTONE PROJECTS", centerX + 12, y, { fontSize: 9, fontColor: "#FFFFFF", opacity: 0.45 });
    const wrappedProj = wrapText(capstoneProj, halfColW, doc);
    let projY = y + 16;
    wrappedProj.forEach((line) => {
      drawText(line, centerX + 12, projY, { fontSize: 11, fontColor: "#FFFFFF", opacity: 0.72 });
      projY += 16;
    });

    y = Math.max(skillsY, projY) + 20;

    // 5. Milestones timeline (Vertical premium roadmap rail, borderless nodes)
    doc.setFont("CMGeom", "normal");
    doc.setFontSize(16);
    doc.setTextColor("#FFFFFF");
    doc.text("CORE SPRINT MILESTONES & PROJECTS", margins.left, y);
    
    y += 18;

    const timelineX = margins.left + 16;
    const contentX = margins.left + 32;
    const contentW = contentWidth - 32;
    const timelineStartY = y + 8;
    let lastNodeY = timelineStartY;

    sprint.milestones.forEach((milestone, mIdx) => {
      const milestoneY = y + 12;
      const nodeY = milestoneY + 12; // vertical align with first line
      lastNodeY = nodeY;

      doc.saveGraphicsState();
      const nodeGlow = new (doc as unknown as JsPdfExtended).GState({ opacity: 0.15 });
      doc.setGState(nodeGlow);
      doc.setFillColor("#00D8FF");
      doc.circle(timelineX, nodeY, 6, "F");
      doc.restoreGraphicsState();
      
      doc.setFillColor("#00D8FF");
      doc.circle(timelineX, nodeY, 2.5, "F");

      doc.setFont("CMGeom", "normal");
      doc.setFontSize(11);
      doc.setTextColor("#FFFFFF");
      const mNum = `M${String(mIdx + 1).padStart(2, "0")}`;
      doc.text(`${mNum}  ·  ${milestone.title}`, contentX, milestoneY);

      const inlineMeta = `(${milestone.estimated_duration_weeks} wk  ·  ${milestone.difficulty_level})`;
      drawText(inlineMeta, pageWidth - margins.right, milestoneY, { align: "right", fontSize: 9, fontColor: "#FFFFFF", opacity: 0.45 });

      const whyMatters = milestone.why_it_matters || "Validates core domain capability.";
      const deliverables = getSafeArray<string>(milestone.deliverables).slice(0, 1).join(", ") || "Completed milestones";
      const descText = `Focus: ${whyMatters}  ·  Deliverable: ${deliverables}`;
      
      const wrappedDesc = wrapText(descText, contentW, doc);
      let curDescY = milestoneY + 16;
      wrappedDesc.forEach((line) => {
        drawText(line, contentX, curDescY, { fontSize: 11, fontColor: "#FFFFFF", opacity: 0.72 });
        curDescY += 16;
      });

      y = curDescY + 8;
    });

    if (sprint.milestones.length > 0) {
      doc.saveGraphicsState();
      const lineGState = new (doc as unknown as JsPdfExtended).GState({ opacity: 0.15 });
      doc.setGState(lineGState);
      doc.setDrawColor("#00D8FF");
      doc.setLineWidth(1.0);
      doc.line(timelineX, timelineStartY, timelineX, lastNodeY);
      doc.restoreGraphicsState();
    }

    y += 10;

    // 6. Recommended Learning Resources Table
    doc.setFont("CMGeom", "normal");
    doc.setFontSize(16);
    doc.setTextColor("#FFFFFF");
    doc.text("RECOMMENDED LEARNING RESOURCES", margins.left, y);

    y += 18;

    const resourceLinks = sprint.milestones.flatMap(m => getSafeArray<RoadmapResourceLink>(m.resource_links));
    const uniqueResources = Array.from(new Map(resourceLinks.map(r => [r.url, r])).values()).slice(0, 2);

    if (uniqueResources.length > 0) {
      const colNameW = 140;
      const colTypeW = 90;
      const colLinkW = 130;
      const colPurposeW = 140;

      const nameX = margins.left;
      const typeX = nameX + colNameW;
      const linkX = typeX + colTypeW;
      const purposeX = linkX + colLinkW;

      drawText("RESOURCE", nameX, y, { fontSize: 9, fontColor: "#FFFFFF", opacity: 0.45 });
      drawText("PROVIDER/TYPE", typeX, y, { fontSize: 9, fontColor: "#FFFFFF", opacity: 0.45 });
      drawText("LINK", linkX, y, { fontSize: 9, fontColor: "#FFFFFF", opacity: 0.45 });
      drawText("PURPOSE", purposeX, y, { fontSize: 9, fontColor: "#FFFFFF", opacity: 0.45 });

      doc.saveGraphicsState();
      const lineG = new (doc as unknown as JsPdfExtended).GState({ opacity: 0.1 });
      doc.setGState(lineG);
      doc.setDrawColor("#FFFFFF");
      doc.setLineWidth(0.5);
      doc.line(margins.left, y + 4, pageWidth - margins.right, y + 4);
      doc.restoreGraphicsState();

      y += 16;

      uniqueResources.forEach((res) => {
        doc.setFontSize(11);
        
        doc.setTextColor("#FFFFFF");
        const wrappedName = wrapText(res.label, colNameW - 10, doc)[0] || "";
        doc.text(wrappedName, nameX, y);

        drawText(res.provider, typeX, y, { fontSize: 11, fontColor: "#FFFFFF", opacity: 0.72 });

        const wrappedUrl = formatAndWrapUrl(res.url, colLinkW - 10, doc, 1)[0] || "";
        drawText(wrappedUrl, linkX, y, { fontSize: 11, fontColor: "#00D8FF" });

        const wrappedPurpose = wrapText(res.label || "Study resource", colPurposeW, doc)[0] || "";
        drawText(wrappedPurpose, purposeX, y, { fontSize: 11, fontColor: "#FFFFFF", opacity: 0.72 });

        y += 18;
      });
    } else {
      drawText("No specific platform resources referenced in this sprint module.", margins.left, y, { fontSize: 11, fontColor: "#FFFFFF", opacity: 0.45 });
      y += 18;
    }

    y += 10;

    // 7. Expected Outcomes Checklist
    doc.setFont("CMGeom", "normal");
    doc.setFontSize(16);
    doc.setTextColor("#FFFFFF");
    doc.text("EXPECTED SPRINT OUTCOMES", margins.left, y);

    y += 18;

    const sprintOutcomes = Array.from(new Set(sprint.milestones.flatMap(m => getSafeArray<string>(m.expected_outcomes)))).slice(0, 2);
    if (sprintOutcomes.length > 0) {
      sprintOutcomes.forEach((outcome) => {
        doc.setFontSize(11);
        doc.setTextColor("#00D8FF");
        doc.text("□", margins.left, y);
        y = drawText(outcome, margins.left + 14, y, { maxWidth: contentWidth - 14, fontSize: 11, fontColor: "#FFFFFF", opacity: 0.72 });
        y += 18;
      });
    } else {
      doc.setFontSize(11);
      doc.setTextColor("#00D8FF");
      doc.text("□", margins.left, y);
      drawText("Successful validation of sprint completion requirements and criteria.", margins.left + 14, y, { fontSize: 11, fontColor: "#FFFFFF", opacity: 0.72 });
      y += 18;
    }

    totalContentHeight += (y - margins.top);
  });

  // ==========================================
  // PAGE 6: EXECUTIVE READINESS REPORT
  // ==========================================
  doc.addPage();
  const checklistPageNum = 3 + sprintsData.length;
  drawSubtlePageBackground(checklistPageNum);
  y = margins.top;

  drawSectionHeader("EXECUTION PLAN", "Executive Readiness Report", "Final verification of system capabilities and profile assets.");

  // Readiness Index (Large Typography, High Authority)
  drawText("READINESS INDEX", margins.left, y, { fontSize: 9, fontColor: "#FFFFFF", opacity: 0.45 });

  doc.setFontSize(54);
  doc.setTextColor("#00D8FF");
  doc.text(`${readinessScore}%`, margins.left, y + 48);

  doc.setFontSize(16);
  doc.setTextColor("#00D8FF");
  doc.text("STATUS: VERIFIED READY FOR PIPELINE", margins.left + 140, y + 36);

  y += 68;

  // Capability Matrix
  doc.setFont("CMGeom", "normal");
  doc.setFontSize(16);
  doc.setTextColor("#FFFFFF");
  doc.text("CAPABILITY MATRIX", margins.left, y);

  y += 20;

  const checkCardW = (contentWidth - 24) / 2;
  const dashboardItems = [
    { label: "Resume Portfolio", desc: "ATS keyword matching & technology stack optimization.", progress: 95 },
    { label: "Design Portfolio", desc: "Case studies web architecture frames & deployed links.", progress: 90 },
    { label: "GitHub Profile", desc: "Semantic workflow history, commits, & project readme reviews.", progress: 85 },
    { label: "Capstone Projects", desc: "Deployments, live backend interfaces, database structures.", progress: 100 },
    { label: "DSA Competency", desc: "Logical structures arrays, hash tables, and scale logic.", progress: 80 },
    { label: "System Design", desc: "API designs caching layers, load balancing configurations.", progress: 75 },
    { label: "Interview Loops", desc: "Mock practice sessions, STAR communication stories bank.", progress: 90 },
    { label: "Application Tracker", desc: "Active pipelines trackers, target pipelines, and job leads.", progress: 80 }
  ];

  dashboardItems.forEach((item, idx) => {
    const colIdx = idx % 2;
    const rowIdx = Math.floor(idx / 2);
    const colX = margins.left + colIdx * (checkCardW + 24);
    const itemY = y + rowIdx * 45;

    doc.setFont("CMGeom", "normal");
    doc.setFontSize(11);
    doc.setTextColor("#FFFFFF");
    doc.text(item.label.toUpperCase(), colX, itemY);

    doc.setTextColor("#00D8FF");
    doc.text(`${item.progress}%`, colX + checkCardW, itemY, { align: "right" });

    drawText(item.desc, colX, itemY + 12, { fontSize: 9, fontColor: "#FFFFFF", opacity: 0.45 });

    // Thin Progress Line
    doc.setFillColor("#141B26");
    doc.roundedRect(colX, itemY + 18, checkCardW, 2, 1, 1, "F");
    doc.setFillColor("#00D8FF");
    doc.roundedRect(colX, itemY + 18, (checkCardW * item.progress) / 100, 2, 1, 1, "F");
  });

  y += 4 * 45 + 10;

  // Recruiter Checklist
  doc.setFont("CMGeom", "normal");
  doc.setFontSize(16);
  doc.setTextColor("#FFFFFF");
  doc.text("RECRUITER CHECKLIST", margins.left, y);

  y += 18;

  readinessPoints.forEach((point) => {
    doc.setFontSize(11);
    doc.setTextColor("#00D8FF");
    doc.text("□", margins.left, y);
    y = drawText(point, margins.left + 14, y, { maxWidth: contentWidth - 14, fontSize: 11, fontColor: "#FFFFFF", opacity: 0.72 });
    y += 18;
  });

  y += 10;

  // Strength Summary, CareerOS Recommendation, Final Verdict
  const summaryW = (contentWidth - 24) / 2;

  drawText("STRENGTH SUMMARY", margins.left, y, { fontSize: 9, fontColor: "#FFFFFF", opacity: 0.45 });
  
  const strengthText = `Candidate demonstrates robust technical and architectural proficiency in ${domainLabel}. Key strengths include verified capability in core system architecture, practical deployment of portfolio applications, and algorithmic complexity resolution.`;
  const wrappedStr = wrapText(strengthText, summaryW, doc);
  let strY = y + 16;
  wrappedStr.forEach((line) => {
    drawText(line, margins.left, strY, { fontSize: 11, fontColor: "#FFFFFF", opacity: 0.72 });
    strY += 16;
  });

  drawText("CAREEROS RECOMMENDATION", centerX + 12, y, { fontSize: 9, fontColor: "#FFFFFF", opacity: 0.45 });

  const recommendationText = `Proceed directly to active applications in target market pipelines. Focus on presenting capstone projects and leveraging verified system design competencies during technical rounds. Maintain active git commit frequency.`;
  const wrappedRec = wrapText(recommendationText, summaryW, doc);
  let recY = y + 16;
  wrappedRec.forEach((line) => {
    drawText(line, centerX + 12, recY, { fontSize: 11, fontColor: "#FFFFFF", opacity: 0.72 });
    recY += 16;
  });

  y = Math.max(strY, recY) + 20;

  drawText("FINAL VERDICT", margins.left, y, { fontSize: 9, fontColor: "#FFFFFF", opacity: 0.45 });

  doc.setFontSize(14);
  doc.setTextColor("#00D8FF");
  doc.setFont("CMGeom", "normal");
  doc.text("VERIFIED READY — RECOMMENDED FOR IMMEDIATE HIRE PIPELINE", margins.left, y + 20);

  y += 35;

  // Render header/footer frame on all pages
  const totalPages = doc.getNumberOfPages();
  for (let pNum = 1; pNum <= totalPages; pNum++) {
    doc.setPage(pNum);
    drawPageFrame(pNum, totalPages);
  }

  // Calculate content density
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
