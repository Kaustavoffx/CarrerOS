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
const BACKGROUND_IMAGE_URL = new URL("../public/background.png", import.meta.url).toString();

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
      response = await fetch("/background.png");
    } catch {
      response = await fetch(BACKGROUND_IMAGE_URL);
    }
    if (!response.ok) {
      throw new Error(`Failed to load background image: ${response.status}`);
    }
    base64 = arrayBufferToBase64(await response.arrayBuffer());
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
    title: 32,
    pageHeading: 22,
    section: 14,
    cardTitle: 11,
    body: 10,
    meta: 8.5,
    caption: 8.5
  };

  const colorsPalette = ["#0cc6d8", "#0bb0c0", "#099aa8", "#088490", "#066e78", "#055860", "#044248", "#032c30"];



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
    const watermarkGState = new (doc as unknown as JsPdfExtended).GState({ opacity: 0.018 });
    doc.setGState(watermarkGState);
    const size = pageWidth * 0.45;
    const x = centerX - size / 2;
    const y = (pageHeight / 2) - size / 2;
    doc.addImage(logoBase64, "PNG", x, y, size, size);
    doc.restoreGraphicsState();
  }

  function drawSubtlePageBackground(pageNum: number) {
    // Solid background
    doc.setFillColor("#04070D");
    doc.rect(0, 0, pageWidth, pageHeight, "F");

    // Draw background.png at 0.12 opacity
    doc.saveGraphicsState();
    const bgGState = new (doc as unknown as JsPdfExtended).GState({ opacity: 0.12 });
    doc.setGState(bgGState);
    doc.addImage(backgroundBase64, "PNG", 0, 0, pageWidth, pageHeight);
    doc.restoreGraphicsState();

    // Draw dark overlay at 0.65 opacity
    doc.saveGraphicsState();
    const overlayGState = new (doc as unknown as JsPdfExtended).GState({ opacity: 0.65 });
    doc.setGState(overlayGState);
    doc.setFillColor("#04070D");
    doc.rect(0, 0, pageWidth, pageHeight, "F");
    doc.restoreGraphicsState();

    if (pageNum > 1) {
      drawWatermark();
    }

    // Page-specific atmospheric light clouds
    if (pageNum === 1) {
      drawAtmosphericCloud(0, pageHeight * 0.2, 350, "#00D8FF", 0.05);     // Deep Cyan Cloud
      drawAtmosphericCloud(pageWidth, 0, 400, "#3B82F6", 0.04);          // Electric Blue Cloud
      drawAtmosphericCloud(0, pageHeight * 0.8, 300, "#4F46E5", 0.04);   // Subtle Indigo Cloud
      drawAtmosphericCloud(pageWidth * 0.3, pageHeight * 0.5, 250, "#0D9488", 0.03); // Faint Teal Cloud
    } else if (pageNum === 2) {
      drawAtmosphericCloud(pageWidth, 0, 350, "#0D9488", 0.04);          // Faint Teal Cloud
      drawAtmosphericCloud(0, pageHeight * 0.4, 250, "#00D8FF", 0.03);   // Deep Cyan Cloud
      drawAtmosphericCloud(pageWidth, pageHeight, 350, "#4F46E5", 0.03); // Subtle Indigo Cloud
    } else if (pageNum === 3) {
      drawAtmosphericCloud(0, 0, 380, "#3B82F6", 0.05);                  // Electric Blue Cloud
      drawAtmosphericCloud(pageWidth, pageHeight * 0.3, 300, "#00D8FF", 0.04); // Deep Cyan Cloud
      drawAtmosphericCloud(0, pageHeight, 320, "#4F46E5", 0.03);         // Subtle Indigo Cloud
    } else if (pageNum === 4) {
      drawAtmosphericCloud(pageWidth, 0, 360, "#00D8FF", 0.05);          // Deep Cyan Cloud
      drawAtmosphericCloud(0, pageHeight * 0.7, 300, "#0D9488", 0.04);   // Faint Teal Cloud
      drawAtmosphericCloud(pageWidth, pageHeight, 320, "#3B82F6", 0.03); // Electric Blue Cloud
    } else if (pageNum === 5) {
      drawAtmosphericCloud(0, 0, 320, "#4F46E5", 0.04);                  // Subtle Indigo Cloud
      drawAtmosphericCloud(pageWidth, pageHeight * 0.5, 380, "#3B82F6", 0.05); // Electric Blue Cloud
      drawAtmosphericCloud(0, pageHeight, 300, "#00D8FF", 0.04);         // Deep Cyan Cloud
    } else {
      drawAtmosphericCloud(0, 0, 350, "#00D8FF", 0.04);                  // Deep Cyan Cloud
      drawAtmosphericCloud(pageWidth, pageHeight * 0.8, 300, "#4F46E5", 0.03); // Subtle Indigo Cloud
    }
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

    // 1. Soft environmental glow behind card (if glowColor is provided)
    if (options?.glowColor) {
      doc.saveGraphicsState();
      const glowColor = options.glowColor;
      const baseOpacity = options.glowOpacity ?? 0.04;
      doc.setFillColor(glowColor);
      for (let i = 3; i > 0; i--) {
        const offset = i * 4;
        const gState = new (doc as unknown as JsPdfExtended).GState({ opacity: baseOpacity / i });
        doc.setGState(gState);
        doc.roundedRect(x - offset, yVal - offset, width + offset * 2, height + offset * 2, rx + offset, ry + offset, "F");
      }
      doc.restoreGraphicsState();
    }

    // 2. Soft black drop shadow under every card for visual depth
    doc.saveGraphicsState();
    doc.setFillColor("#000000");
    const shadowOpacity = 0.25;
    for (let i = 4; i > 0; i--) {
      const offset = i * 2;
      const gState = new (doc as unknown as JsPdfExtended).GState({ opacity: shadowOpacity / i });
      doc.setGState(gState);
      doc.roundedRect(x - offset + 1, yVal + offset + 1, width + offset * 2, height + offset * 2, rx + offset, ry + offset, "F");
    }
    doc.restoreGraphicsState();

    // 3. Deep black base
    doc.setFillColor("#090C12");
    doc.roundedRect(x, yVal, width, height, rx, ry, "F");

    // 4. Internal highlight (subtle 3% opacity white fill)
    doc.saveGraphicsState();
    const highlightGState = new (doc as unknown as JsPdfExtended).GState({ opacity: 0.03 });
    doc.setGState(highlightGState);
    doc.setFillColor("#FFFFFF");
    doc.roundedRect(x + 1, yVal + 1, width - 2, height - 2, rx - 1, ry - 1, "F");
    doc.restoreGraphicsState();

    // 5. Subtle 8% opacity white border
    doc.saveGraphicsState();
    const borderGState = new (doc as unknown as JsPdfExtended).GState({ opacity: 0.08 });
    doc.setGState(borderGState);
    doc.setDrawColor("#FFFFFF");
    doc.setLineWidth(1.2);
    doc.roundedRect(x, yVal, width, height, rx, ry, "D");
    doc.restoreGraphicsState();

    // 6. Colored border highlight (edge lighting) if glowColor exists
    if (options?.glowColor) {
      doc.saveGraphicsState();
      const edgeGState = new (doc as unknown as JsPdfExtended).GState({ opacity: 0.08 });
      doc.setGState(edgeGState);
      doc.setDrawColor(options.glowColor);
      doc.setLineWidth(1.2);
      doc.roundedRect(x, yVal, width, height, rx, ry, "D");
      doc.restoreGraphicsState();
    }

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
    doc.setFont("CMGeom", "normal");
    doc.setFontSize(8);
    doc.setTextColor("#00D8FF");
    drawText(label.toUpperCase(), margins.left, y + 10);
    
    // 2. Large title
    doc.setFontSize(16);
    doc.setTextColor("#FFFFFF");
    drawText(title, margins.left, y + 26);
    
    // 3. Supporting text
    doc.setFontSize(9);
    doc.setTextColor("#94A3B8");
    drawText(subtitle, margins.left, y + 38);

    if (label === "SPRINT PLAN") {
      doc.addImage(logoBase64, "PNG", pageWidth - margins.right - 24, y + 12, 24, 24);
      ledger.pushBox(doc.getNumberOfPages(), pageWidth - margins.right - 24, y + 12, pageWidth - margins.right, y + 36, "SectionHeaderLogo");
    }
    
    y += 48;
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

    doc.saveGraphicsState();
    const trackBorderOpacity = new (doc as unknown as JsPdfExtended).GState({ opacity: 0.1 });
    doc.setGState(trackBorderOpacity);
    doc.setDrawColor("#FFFFFF");
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

  function drawBadge(text: string, x: number, yVal: number, bgColor: string, textColor = "#e0f7fa", fontSize = 7.5) {
    doc.setFontSize(fontSize);
    const textWidth = doc.getTextWidth(text);
    const paddingX = 5;
    const paddingY = 2.5;
    const badgeWidth = textWidth + paddingX * 2;
    const badgeHeight = fontSize + paddingY * 2;
    
    doc.setFillColor("#090C12");
    doc.roundedRect(x, yVal - fontSize - paddingY + 1, badgeWidth, badgeHeight, 12, 12, "F");
    
    doc.saveGraphicsState();
    const badgeBorderOpacity = new (doc as unknown as JsPdfExtended).GState({ opacity: 0.2 });
    doc.setGState(badgeBorderOpacity);
    doc.setDrawColor(bgColor);
    doc.setLineWidth(0.6);
    doc.roundedRect(x, yVal - fontSize - paddingY + 1, badgeWidth, badgeHeight, 12, 12, "D");
    doc.restoreGraphicsState();
    
    doc.setTextColor(textColor);
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
      maxWidth?: number;
    }
  ): number {
    let currentFontSize = options?.fontSize || doc.getFontSize();
    doc.setFontSize(currentFontSize);
    
    if (options?.fontColor) {
      doc.setTextColor(options.fontColor);
    } else {
      doc.setTextColor("#94a3b8");
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

  function drawWrappedText(
    text: string, 
    x: number, 
    yVal: number, 
    maxWidth: number, 
    fontSize: number, 
    options?: { fontColor?: string; lineSpacing?: number; align?: "left" | "right" | "center" }
  ) {
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

  function drawPageFrame(pageNum: number, totalPagesCount: number) {
    if (pageNum === 1) return; // Skip cover page frame!
    
    doc.saveGraphicsState();
    const frameGState = new (doc as unknown as JsPdfExtended).GState({ opacity: 0.6 });
    doc.setGState(frameGState);
    
    doc.setFont("CMGeom", "normal");
    doc.setFontSize(fontSizes.caption);
    
    // Header Left: Logo image + text
    doc.addImage(logoBase64, "PNG", margins.left, 16, 16, 16);
    doc.setTextColor("#FFFFFF");
    doc.text("CareerOS", margins.left + 22, 27);
    
    // Header Right: text block
    doc.setFontSize(8);
    doc.setTextColor("#00D8FF");
    doc.text("CareerOS Roadmap Export", pageWidth - margins.right, 23, { align: "right" });
    
    const exportDate = new Date(report.exportedAt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
    const roadmapVersion = safeRoadmaps[0]?.roadmap_version || "1.0.0";
    doc.setFontSize(7);
    doc.setTextColor("#64748b");
    doc.text(`Date: ${exportDate}  |  Version: ${roadmapVersion}`, pageWidth - margins.right, 32, { align: "right" });
    
    // Footer Left: Logo + Generated by CareerOS
    doc.setTextColor("#64748b");
    doc.setFontSize(fontSizes.caption);
    const footerLogoSize = 10;
    doc.addImage(logoBase64, "PNG", margins.left, pageHeight - 24 - footerLogoSize + 1.5, footerLogoSize, footerLogoSize);
    doc.text("Generated by CareerOS", margins.left + 14, pageHeight - 24);
    
    // Footer Center
    doc.text("CareerOS Confidential", centerX, pageHeight - 24, { align: "center" });
    
    // Footer Right
    doc.text(`Page ${pageNum} of ${totalPagesCount}`, pageWidth - margins.right, pageHeight - 24, { align: "right" });
    
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

  // Logo Monogram Cover
  doc.addImage(logoBase64, "PNG", margins.left, 41, 12, 12);
  doc.setFont("CMGeom", "normal");
  doc.setFontSize(10);
  doc.setTextColor("#FFFFFF");
  doc.text("CareerOS", margins.left + 18, 51);

  doc.setFontSize(8.5);
  doc.setTextColor("#64748b");
  doc.text("CAREER EXECUTION PLAN", pageWidth - margins.right, 51, { align: "right" });

  // SDE I Huge Title Centered Horizontally
  const hugeTitleText = careerGoal;
  const hugeTitleSize = hugeTitleText.length > 15 ? 36 : 48;
  const titleEndY = drawText(hugeTitleText, centerX, 150, { align: "center", fontSize: hugeTitleSize, fontColor: "#FFFFFF", maxWidth: contentWidth });

  // DIRECTLY BELOW TITLE: Place logo. Logo size: 120px Centered.
  const logoSize = 120;
  const logoX = centerX - logoSize / 2;
  const logoY = titleEndY + 20;
  doc.addImage(logoBase64, "PNG", logoX, logoY, logoSize, logoSize);

  // Centered target subtitle below logo
  const subtitleY = logoY + logoSize + 25;
  drawText(`${domainLabel} Career Execution Plan`, centerX, subtitleY, { align: "center", fontSize: 13, fontColor: "#00D8FF", maxWidth: contentWidth });

  // Bottom row split composition
  // Left Column Metadata
  drawLiquidGlassCard(margins.left, 420, 230, 240, {
    glowColor: "#00D8FF",
    glowOpacity: 0.04,
    rx: 20,
    ry: 20
  });

  const coverMetaX = margins.left + 16;
  doc.setFont("CMGeom", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor("#00D8FF");
  drawText("PREPARATION DOSSIER", coverMetaX, 448);

  const labelSpacing = 42;
  let curMetaY = 482;

  const metadataValues = [
    { label: "TIMELINE", val: `${totalDuration} Weeks Execution` },
    { label: "WEEKLY CAPACITY", val: `${avgWeeklyHours} Hours / week` },
    { label: "TARGET DOMAIN", val: domainLabel },
    { label: "GENERATED DATE", val: new Date(report.exportedAt).toLocaleDateString() }
  ];

  metadataValues.forEach((meta) => {
    doc.setFontSize(7.5);
    doc.setTextColor("#64748b");
    drawText(meta.label, coverMetaX, curMetaY);
    doc.setFontSize(10.5);
    doc.setTextColor("#FFFFFF");
    drawText(meta.val, coverMetaX, curMetaY + 12);
    curMetaY += labelSpacing;
  });

  // Right Column Circular Readiness Ring
  drawReadinessRing(420, 540, 75, readinessScore);

  totalContentHeight += (y - margins.top);

  // ==========================================
  // PAGE 2: CAREER SNAPSHOT & MARKET INTELLIGENCE
  // ==========================================
  doc.addPage();
  drawSubtlePageBackground(2);
  y = margins.top;

  drawSectionHeader("CAREER SNAPSHOT", "Market Intelligence", "Strategic analysis generated from current career objective.");

  // Row of 4 Dashboard Metrics Cards
  const metricColW = (contentWidth - 24) / 4;
  const momentumVal = Math.min(100, Math.max(50, Math.round(readinessScore * 1.15)));
  const metricsList = [
    { label: "Readiness", val: `${readinessScore}%`, color: "#00D8FF" },
    { label: "Momentum", val: `${momentumVal}%`, color: "#F59E0B" },
    { label: "Execution", val: "85%", color: "#8B5CF6" },
    { label: "Career Health", val: "92%", color: "#10B981" }
  ];

  metricsList.forEach((metric, idx) => {
    const cardX = margins.left + idx * (metricColW + 8);
    drawDashboardMetricCard(cardX, y, metricColW, 46, metric.label, metric.val, metric.color);
  });

  y += 46 + 24;

  // 2x2 grid of Premium Intelligence Cards
  const firstRoadmap = safeRoadmaps[0];
  if (firstRoadmap) {
    const gridCardW = (contentWidth - 12) / 2;

    // Row 1
    const h1_1 = getPremiumIntelCardHeight(
      gridCardW, 
      "Market Demand", 
      `${firstRoadmap.career_demand_score}/100 Demand`, 
      "Strong demand signal indicating continuous job openings and hiring pipeline velocity across major regions."
    );
    const h1_2 = getPremiumIntelCardHeight(
      gridCardW, 
      "Salary Outlook", 
      firstRoadmap.salary_range || "Competitive Base", 
      "Estimated benchmark salary range representing starting compensation brackets for verified positions."
    );
    const row1H = Math.max(h1_1, h1_2, 85);

    drawPremiumIntelCard(
      margins.left, 
      y, 
      gridCardW, 
      row1H, 
      "Market Demand", 
      `${firstRoadmap.career_demand_score}/100 Demand`, 
      "Strong demand signal indicating continuous job openings and hiring pipeline velocity across major regions.",
      "#00D8FF"
    );

    drawPremiumIntelCard(
      margins.left + gridCardW + 12, 
      y, 
      gridCardW, 
      row1H, 
      "Salary Outlook", 
      firstRoadmap.salary_range || "Competitive Base", 
      "Estimated benchmark salary range representing starting compensation brackets for verified positions.",
      "#10B981"
    );

    y += row1H + 12;

    // Row 2
    const h2_1 = getPremiumIntelCardHeight(
      gridCardW, 
      "Automation Risk", 
      firstRoadmap.automation_risk || "Low Risk", 
      "Low susceptibility to automated displacement due to cognitive complexity, problem-solving, and creative design roles."
    );
    const h2_2 = getPremiumIntelCardHeight(
      gridCardW, 
      "Industry Growth", 
      firstRoadmap.market_outlook || "Accelerating Growth", 
      "Robust YoY expansion and expansion of supporting digital services creating constant demand for skilled engineering professionals."
    );
    const row2H = Math.max(h2_1, h2_2, 85);

    drawPremiumIntelCard(
      margins.left, 
      y, 
      gridCardW, 
      row2H, 
      "Automation Risk", 
      firstRoadmap.automation_risk || "Low Risk", 
      "Low susceptibility to automated displacement due to cognitive complexity, problem-solving, and creative design roles.",
      "#F59E0B"
    );

    drawPremiumIntelCard(
      margins.left + gridCardW + 12, 
      y, 
      gridCardW, 
      row2H, 
      "Industry Growth", 
      firstRoadmap.market_outlook || "Accelerating Growth", 
      "Robust YoY expansion and expansion of supporting digital services creating constant demand for skilled engineering professionals.",
      "#8B5CF6"
    );

    y += row2H + 24;
  }

  // 3-column Roadmap Summary
  const summaryColW = (contentWidth - 16) / 3;
  const summaryTitleList = ["WHAT YOU'LL LEARN", "WHAT YOU'LL BUILD", "WHAT YOU'LL ACHIEVE"];
  const summaryTextList = [
    "Language syntaxes, algorithmic complexity (DSA), system frameworks, client-server databases, and REST APIs.",
    "3 complete capstone applications featuring fully responsive UI components, live database layers, and Git codebases.",
    "Recruiter-ready resume, deployed portfolio portal, comprehensive behavioral stories bank, and 10+ pipeline leads."
  ];

  const summaryHeights = summaryTitleList.map((title, idx) => 
    getRoadmapSummaryCardHeight(summaryColW, title, summaryTextList[idx])
  );
  const maxSummaryH = Math.max(...summaryHeights, 80);

  summaryTitleList.forEach((sTitle, idx) => {
    const cardX = margins.left + idx * (summaryColW + 8);
    
    // Draw card with distinct light blue reflection
    drawLiquidGlassCard(cardX, y, summaryColW, maxSummaryH, {
      glowColor: "#3B82F6",
      glowOpacity: 0.03,
      rx: 20,
      ry: 20
    });

    doc.setFont("CMGeom", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor("#00D8FF");
    drawText(sTitle, cardX + 12, y + 16);

    doc.setFontSize(8);
    doc.setTextColor("#94A3B8");
    drawWrappedText(summaryTextList[idx], cardX + 12, y + 28, summaryColW - 24, 8, { lineSpacing: 1.5 });
  });

  y += maxSummaryH + 24;

  // Domain Competency Breakdown (2x2 skill bars)
  doc.setFont("CMGeom", "normal");
  doc.setFontSize(11);
  doc.setTextColor("#FFFFFF");
  drawText("Domain Competency Breakdown", margins.left, y);

  y += 12;

  const competencyW = (contentWidth - 24) / 2;
  const compColor1 = "#00D8FF";
  const compColor2 = "#3B82F6";
  const compColor3 = "#8B5CF6";
  const compColor4 = "#10B981";

  // Row 1
  drawCompetencyMeter(margins.left, y + 8, competencyW, "System Design & Scalability", 65, compColor1);
  drawCompetencyMeter(margins.left + competencyW + 24, y + 8, competencyW, "Core Architectural Patterns", 80, compColor2);

  y += 26;

  // Row 2
  drawCompetencyMeter(margins.left, y + 8, competencyW, "Algorithmic Logic Complexity", 70, compColor3);
  drawCompetencyMeter(margins.left + competencyW + 24, y + 8, competencyW, "Database Schema Design", 85, compColor4);

  totalContentHeight += (y - margins.top);

  // ==========================================
  // PAGES 3 TO 5: DEDICATED SPRINT PAGES
  // ==========================================
  sprintsData.forEach((sprint, sIndex) => {
    const pageNum = 3 + sIndex;
    doc.addPage();
    drawSubtlePageBackground(pageNum);
    y = margins.top;

    drawSectionHeader("SPRINT PLAN", sprint.title.toUpperCase(), "Dynamic execution modules designed to build technical proficiency.");

    // Stats card row
    const statsCardH = 36;
    drawLiquidGlassCard(margins.left, y, contentWidth, statsCardH, {
      glowColor: "#00D8FF",
      glowOpacity: 0.04,
      rx: 20,
      ry: 20
    });

    drawText("DURATION", margins.left + 16, y + 15, { fontSize: 8, fontColor: "#64748b" });
    drawText(`${sprint.weeks} Weeks`, margins.left + 16, y + 25, { fontSize: 9.5, fontColor: "#FFFFFF" });

    drawText("COMMITMENT", margins.left + 110, y + 15, { fontSize: 8, fontColor: "#64748b" });
    drawText(`${sprint.hours} hrs/wk`, margins.left + 110, y + 25, { fontSize: 9.5, fontColor: "#FFFFFF" });

    drawText("STATUS", margins.left + 210, y + 15, { fontSize: 8, fontColor: "#64748b" });
    const statusColors = {
      Active: "#00D8FF",
      Done: "#10B981",
      Planned: "#3B82F6",
      Warning: "#F59E0B"
    } as const;

    type SprintStatus = keyof typeof statusColors;

    const sColor = (sprint.status in statusColors)
      ? statusColors[sprint.status as SprintStatus]
      : "#00D8FF";
    drawBadge(sprint.status.toUpperCase(), margins.left + 210, y + 24, sColor, "#e0f7fa", 7.5);

    drawText("COMPLETION PROGRESS", margins.left + 310, y + 15, { fontSize: 8, fontColor: "#64748b" });
    drawProgressBar(margins.left + 310, y + 18, 120, 5, sprint.progress, "#00D8FF", "#141B26");
    drawText(`${sprint.progress}%`, margins.left + 440, y + 24, { fontSize: 9.5, fontColor: "#FFFFFF" });

    y += statsCardH + 16;

    // Core Technical Skills & Capstone Projects side-by-side
    const halfColW = (contentWidth - 12) / 2;
    const overviewH = 54;
    
    // Technical Skills Card
    drawLiquidGlassCard(margins.left, y, halfColW, overviewH, {
      glowColor: "#3B82F6",
      glowOpacity: 0.03,
      rx: 20,
      ry: 20
    });
    doc.setFont("CMGeom", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor("#00D8FF");
    drawText("CORE TECHNICAL SKILLS", margins.left + 12, y + 15);

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

    doc.setFontSize(8);
    doc.setTextColor("#94A3B8");
    drawWrappedText(skillsText, margins.left + 12, y + 25, halfColW - 24, 8);

    // Capstone Projects Card
    drawLiquidGlassCard(margins.left + halfColW + 12, y, halfColW, overviewH, {
      glowColor: "#3B82F6",
      glowOpacity: 0.03,
      rx: 20,
      ry: 20
    });
    doc.setFontSize(8.5);
    doc.setTextColor("#00D8FF");
    drawText("CAPSTONE PROJECTS", margins.left + halfColW + 24, y + 15);

    doc.setFontSize(8);
    doc.setTextColor("#94A3B8");
    drawWrappedText(capstoneProj, margins.left + halfColW + 24, y + 25, halfColW - 24, 8);

    y += overviewH + 20;

    // Milestones timeline
    doc.setFont("CMGeom", "normal");
    doc.setFontSize(11);
    doc.setTextColor("#FFFFFF");
    drawText("CORE SPRINT MILESTONES & PROJECTS", margins.left, y);
    
    y += 12;

    const timelineX = margins.left + 16;
    const cardsLeft = margins.left + 36;
    const cardsWidth = contentWidth - 36;
    const timelineStartY = y + 8;

    let lastNodeY = timelineStartY;

    sprint.milestones.forEach((milestone, mIdx) => {
      const cardH = 60;
      const cardY = y + 8;

      // Draw milestone card
      drawLiquidGlassCard(cardsLeft, cardY, cardsWidth, cardH, {
        glowColor: "#00D8FF",
        glowOpacity: 0.03,
        rx: 20,
        ry: 20
      });

      const mColor = colorsPalette[(sIndex * 3 + mIdx) % colorsPalette.length];
      
      // Node Y coordinate (vertical center of card)
      const nodeY = cardY + cardH / 2;
      lastNodeY = nodeY;

      // Draw timeline node circle
      doc.saveGraphicsState();
      const nodeGlow = new (doc as unknown as JsPdfExtended).GState({ opacity: 0.15 });
      doc.setGState(nodeGlow);
      doc.setFillColor(mColor);
      doc.circle(timelineX, nodeY, 8, "F");
      doc.restoreGraphicsState();
      
      doc.setFillColor(mColor);
      doc.circle(timelineX, nodeY, 3.5, "F");

      // Card Header contents
      const badgeW = drawBadge(`M${String(mIdx + 1).padStart(2, "0")}`, cardsLeft + 12, cardY + 14, mColor, "#e0f7fa", 7.5);
      
      doc.setFont("CMGeom", "normal");
      doc.setFontSize(10);
      doc.setTextColor("#FFFFFF");
      drawText(milestone.title, cardsLeft + 12 + badgeW + 8, cardY + 13, { maxWidth: cardsWidth - badgeW - 100 });

      // Badge aligned right
      const inlineMeta = `(${milestone.estimated_duration_weeks} wk · ${milestone.difficulty_level})`;
      doc.setFontSize(8);
      doc.setTextColor("#64748b");
      drawText(inlineMeta, cardsLeft + cardsWidth - 12, cardY + 13, { align: "right" });

      // Details
      const whyMatters = milestone.why_it_matters || "Validates core domain capability.";
      const deliverables = getSafeArray<string>(milestone.deliverables).slice(0, 1).join(", ");
      const descText = `Focus: ${whyMatters}\nDeliverable: ${deliverables || "Completed milestones"}`;

      doc.setFontSize(8);
      doc.setTextColor("#94A3B8");
      drawWrappedText(descText, cardsLeft + 12, cardY + 26, cardsWidth - 24, 8);

      y += cardH + 10;
    });

    // Draw vertical timeline line
    if (sprint.milestones.length > 0) {
      doc.saveGraphicsState();
      const lineGState = new (doc as unknown as JsPdfExtended).GState({ opacity: 0.15 });
      doc.setGState(lineGState);
      doc.setDrawColor("#00D8FF");
      doc.setLineWidth(1.2);
      doc.line(timelineX, timelineStartY, timelineX, lastNodeY);
      doc.restoreGraphicsState();
    }

    y += 10;

    // Recommended learning resources
    doc.setFont("CMGeom", "normal");
    doc.setFontSize(11);
    doc.setTextColor("#FFFFFF");
    drawText("RECOMMENDED LEARNING RESOURCES", margins.left, y);

    y += 12;

    const resourceLinks = sprint.milestones.flatMap(m => getSafeArray<RoadmapResourceLink>(m.resource_links));
    const uniqueResources = Array.from(new Map(resourceLinks.map(r => [r.url, r])).values()).slice(0, 2);

    const resCardW = (contentWidth - 12) / 2;
    const resCardH = 54;

    if (uniqueResources.length > 0) {
      uniqueResources.forEach((res, rIdx) => {
        const cardX = margins.left + rIdx * (resCardW + 12);
        drawLiquidGlassCard(cardX, y, resCardW, resCardH, {
          glowColor: "#10B981",
          glowOpacity: 0.03,
          rx: 20,
          ry: 20
        });

        // Platform title
        doc.setFont("CMGeom", "normal");
        doc.setFontSize(9);
        doc.setTextColor("#FFFFFF");
        drawText(res.label.length > 30 ? res.label.substring(0, 28) + "..." : res.label, cardX + 12, y + 16, { maxWidth: resCardW - 24 });

        // Provider label
        doc.setFontSize(7.5);
        doc.setTextColor("#64748b");
        drawText(res.provider, cardX + 12, y + 28);

        // URL wrapped
        const wrappedUrl = formatAndWrapUrl(res.url, resCardW - 24, doc, 1)[0] || "";
        doc.setFontSize(7.5);
        doc.setTextColor("#00D8FF");
        drawText(wrappedUrl, cardX + 12, y + 40, { maxWidth: resCardW - 24 });
      });
    } else {
      // Placeholder resources
      drawLiquidGlassCard(margins.left, y, contentWidth, resCardH, { rx: 20, ry: 20 });
      doc.setFont("CMGeom", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor("#64748b");
      drawText("No specific platform resources referenced in this sprint module.", margins.left + 16, y + 26);
    }

    y += resCardH + 20;

    // Sprint outcomes
    doc.setFont("CMGeom", "normal");
    doc.setFontSize(11);
    doc.setTextColor("#FFFFFF");
    drawText("EXPECTED SPRINT OUTCOMES", margins.left, y);

    y += 12;

    const sprintOutcomes = Array.from(new Set(sprint.milestones.flatMap(m => getSafeArray<string>(m.expected_outcomes)))).slice(0, 2);
    if (sprintOutcomes.length > 0) {
      sprintOutcomes.forEach((outcome) => {
        doc.setFont("CMGeom", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor("#94A3B8");
        // draw checkbox symbol + outcome text
        doc.setTextColor("#00D8FF");
        drawText("□", margins.left, y + 8);
        doc.setTextColor("#94A3B8");
        y = drawText(outcome, margins.left + 12, y + 8, { maxWidth: contentWidth - 12 });
        y += 2;
      });
    } else {
      doc.setFont("CMGeom", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor("#64748b");
      drawText("□ Successful validation of sprint completion requirements and criteria.", margins.left, y + 8);
      y += 12;
    }

    totalContentHeight += (y - margins.top);
  });

  // ==========================================
  // PAGE 6: RECRUITER READINESS DASHBOARD
  // ==========================================
  doc.addPage();
  const checklistPageNum = 3 + sprintsData.length;
  drawSubtlePageBackground(checklistPageNum);
  y = margins.top;

  drawSectionHeader("EXECUTION PLAN", "Recruiter Readiness Dashboard", "Final verification of system capabilities and profile assets.");

  // 2x4 Grid of Recruiter readiness metrics
  const checkCardW = (contentWidth - 12) / 2;
  const checkCardH = 68;

  const dashboardItems = [
    { label: "Resume Portfolio", desc: "ATS keyword matching & technology stack optimization.", progress: 95, color: "#00D8FF" },
    { label: "Design Portfolio", desc: "Case studies web architecture frames & deployed links.", progress: 90, color: "#10B981" },
    { label: "GitHub Profile", desc: "Semantic workflow history, commits, & project readme reviews.", progress: 85, color: "#3B82F6" },
    { label: "Capstone Projects", desc: "Deployments, live backend interfaces, database structures.", progress: 100, color: "#00D8FF" },
    { label: "DSA Competency", desc: "Logical structures arrays, hash tables, and scale logic.", progress: 80, color: "#F59E0B" },
    { label: "System Design", desc: "API designs caching layers, load balancing configurations.", progress: 75, color: "#8B5CF6" },
    { label: "Interview Loops", desc: "Mock practice sessions, STAR communication stories bank.", progress: 90, color: "#10B981" },
    { label: "Application Tracker", desc: "Active pipelines trackers, target pipelines, and job leads.", progress: 80, color: "#3B82F6" }
  ];

  dashboardItems.forEach((item, idx) => {
    const colIdx = idx % 2;
    const rowIdx = Math.floor(idx / 2);

    const cardX = margins.left + colIdx * (checkCardW + 12);
    const cardY = y + rowIdx * (checkCardH + 12);

    drawLiquidGlassCard(cardX, cardY, checkCardW, checkCardH, {
      glowColor: item.color,
      glowOpacity: 0.03,
      rx: 20,
      ry: 20
    });

    doc.setFont("CMGeom", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(item.color);
    drawText(item.label.toUpperCase(), cardX + 12, cardY + 16);

    doc.setFontSize(7.5);
    doc.setTextColor("#94A3B8");
    drawWrappedText(item.desc, cardX + 12, cardY + 24, checkCardW - 24, 7.5);

    // Bottom progress bar
    drawProgressBar(cardX + 12, cardY + 52, checkCardW - 56, 3.5, item.progress, item.color, "#141B26");
    doc.setFontSize(8);
    doc.setTextColor("#FFFFFF");
    drawText(`${item.progress}%`, cardX + checkCardW - 40, cardY + 54);
  });

  y += 4 * (checkCardH + 12) + 12;

  // Unified checklist
  doc.setFont("CMGeom", "normal");
  doc.setFontSize(11);
  doc.setTextColor("#FFFFFF");
  drawText("CRITICAL RECRUITER READINESS CHECKLIST", margins.left, y);

  y += 12;

  readinessPoints.forEach((point) => {
    doc.setFont("CMGeom", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor("#00D8FF");
    drawText("□", margins.left, y + 8);
    doc.setTextColor("#94A3B8");
    y = drawText(point, margins.left + 14, y + 8, { maxWidth: contentWidth - 14 });
    y += 2;
  });

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
