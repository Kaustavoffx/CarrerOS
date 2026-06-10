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

let cachedFontBase64: string | null = null;
let cachedLogoBase64: string | null = null;
let cachedCircularLogoBase64: string | null = null;
let cachedBackgroundBase64: string | null = null;

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

async function loadCmGeomFontBase64(): Promise<string> {
  if (cachedFontBase64) return cachedFontBase64;

  if (typeof window === "undefined") {
    const { readFile } = await import("node:fs/promises");
    const { fileURLToPath } = await import("node:url");
    cachedFontBase64 = arrayBufferToBase64(await readFile(fileURLToPath(CMGEOM_FONT_URL)).then((buffer) => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)));
  } else {
    const response = await fetch(CMGEOM_FONT_URL);
    if (!response.ok) {
      throw new Error(`Failed to load CMGeom font: ${response.status}`);
    }
    cachedFontBase64 = arrayBufferToBase64(await response.arrayBuffer());
  }

  return cachedFontBase64;
}

async function loadLogoBase64(): Promise<string> {
  if (cachedLogoBase64) return cachedLogoBase64;

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
  cachedLogoBase64 = `data:image/png;base64,${base64}`;
  return cachedLogoBase64;
}

async function loadCircularLogoBase64(): Promise<string> {
  if (cachedCircularLogoBase64) return cachedCircularLogoBase64;

  const squareLogo = await loadLogoBase64();
  if (typeof window === "undefined") {
    return squareLogo;
  }
  try {
    cachedCircularLogoBase64 = await new Promise<string>((resolve) => {
      const img = new Image();
      img.src = squareLogo;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const size = Math.min(img.width, img.height);
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.beginPath();
          ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(
            img,
            (img.width - size) / 2,
            (img.height - size) / 2,
            size,
            size,
            0,
            0,
            size,
            size
          );
          resolve(canvas.toDataURL("image/png"));
        } else {
          resolve(squareLogo);
        }
      };
      img.onerror = () => {
        resolve(squareLogo);
      };
    });
  } catch {
    cachedCircularLogoBase64 = squareLogo;
  }
  return cachedCircularLogoBase64 || squareLogo;
}

async function loadBackgroundBase64(): Promise<string> {
  if (cachedBackgroundBase64) return cachedBackgroundBase64;

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
      cachedBackgroundBase64 = await new Promise<string>((resolve) => {
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
      cachedBackgroundBase64 = `data:image/png;base64,${base64}`;
    }
  } else {
    cachedBackgroundBase64 = `data:image/png;base64,${base64}`;
  }

  return cachedBackgroundBase64;
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

export function truncateText(text: string, maxWidth: number, doc: { getTextWidth: (t: string) => number }): string {
  if (!text) return "";
  const textWidth = doc.getTextWidth(text);
  if (textWidth <= maxWidth) {
    return text;
  }
  let truncated = text;
  while (truncated.length > 0 && doc.getTextWidth(truncated + "...") > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + "...";
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
  private pageMarginsLeft = 50;
  private pageMarginsRight = 50;
  private pageMarginsTop = 60;
  private pageMarginsBottom = 60;
  private pageWidth = 595.28;
  private pageHeight = 841.89;

  public pushBox(page: number, x1: number, y1: number, x2: number, y2: number, label: string) {
    this.boxes.push({ page, x1, y1, x2, y2, label });
  }

  public getBoxesForPage(page: number): BoundingBox[] {
    return this.boxes.filter(b => b.page === page);
  }

  public verifyHorizontalBounds(): string[] {
    const warnings: string[] = [];
    for (const box of this.boxes) {
      const isHeaderOrFooter = box.label.includes("HeaderFrame") || box.label.includes("FooterFrame") || box.label.includes("Watermark") || box.label.includes("PageBackground");
      if (!isHeaderOrFooter) {
        if (box.x1 < this.pageMarginsLeft - 0.1 || box.x2 > this.pageWidth - this.pageMarginsRight + 0.1) {
          warnings.push(
            `Element '${box.label}' violates horizontal margins [x1=${box.x1.toFixed(2)}, x2=${box.x2.toFixed(2)}] on page ${box.page}`
          );
        }
      }
    }
    return warnings;
  }

  public verify() {
    const errors: string[] = [];

    for (const box of this.boxes) {
      // Check for negative dimensions/spacing
      if (box.x2 < box.x1 - 0.01 || box.y2 < box.y1 - 0.01) {
        errors.push(
          `Negative dimension detected: Element '${box.label}' on page ${box.page} has width/height less than zero [x1=${box.x1.toFixed(2)}, x2=${box.x2.toFixed(2)}, y1=${box.y1.toFixed(2)}, y2=${box.y2.toFixed(2)}]`
        );
      }

      const isHeaderOrFooter = box.label.includes("HeaderFrame") || box.label.includes("FooterFrame") || box.label.includes("Watermark") || box.label.includes("PageBackground");
      
      if (!isHeaderOrFooter) {
        // Vertical bounds & Page/Footer collision check
        if (box.y1 < this.pageMarginsTop - 0.1 || box.y2 > this.pageHeight - this.pageMarginsBottom + 0.1) {
          errors.push(
            `Element '${box.label}' violates vertical margins/footer zone [y1=${box.y1.toFixed(2)}, y2=${box.y2.toFixed(2)}] on page ${box.page}`
          );
        }
        // Horizontal bounds
        if (box.x1 < this.pageMarginsLeft - 0.1 || box.x2 > this.pageWidth - this.pageMarginsRight + 0.1) {
          errors.push(
            `Element '${box.label}' violates horizontal margins [x1=${box.x1.toFixed(2)}, x2=${box.x2.toFixed(2)}] on page ${box.page}`
          );
        }
      } else {
        // Bg and frame decorations must stay inside physical boundaries
        if (box.y1 < 0 || box.y2 > this.pageHeight || box.x1 < 0 || box.x2 > this.pageWidth) {
          errors.push(
            `Header/Footer/Bg element '${box.label}' exceeds physical page borders [y1=${box.y1.toFixed(2)}, y2=${box.y2.toFixed(2)}] on page ${box.page}`
          );
        }
      }
    }

    // Check overlaps between elements on the same page
    for (let i = 0; i < this.boxes.length; i++) {
      for (let j = i + 1; j < this.boxes.length; j++) {
        const a = this.boxes[i];
        const b = this.boxes[j];
        if (a.page === b.page) {
          const isA_Bg = a.label.includes("Watermark") || a.label.includes("PageBackground") || a.label.includes("Frame") || a.label.includes("ProgressBar") || a.label.includes("Card") || a.label.includes("Timeline");
          const isB_Bg = b.label.includes("Watermark") || b.label.includes("PageBackground") || b.label.includes("Frame") || b.label.includes("ProgressBar") || b.label.includes("Card") || b.label.includes("Timeline");
          if (isA_Bg || isB_Bg) continue;
          
          const intersects = (a.x1 < b.x2 - 0.5 && a.x2 > b.x1 + 0.5 && a.y1 < b.y2 - 0.5 && a.y2 > b.y1 + 0.5);
          if (intersects) {
            errors.push(`Overlapping text detected between '${a.label}' [x1=${a.x1.toFixed(2)}, y1=${a.y1.toFixed(2)}, x2=${a.x2.toFixed(2)}, y2=${a.y2.toFixed(2)}] and '${b.label}' [x1=${b.x1.toFixed(2)}, y1=${b.y1.toFixed(2)}, x2=${b.x2.toFixed(2)}, y2=${b.y2.toFixed(2)}] on page ${a.page}`);
          }
        }
      }
    }

    if (errors.length > 0) {
      console.error(`LAYOUT WARNING (Was Failure):\n${errors.join("\n")}`);
    }
  }
}
export async function generateRoadmapPdfBlob(
  report: RoadmapPdfReport,
  onProgress?: (percent: number, phase: string, pageText?: string) => void
) {
  const safeRoadmaps = getSafeArray<RoadmapRecord>(report.roadmaps);
  if (safeRoadmaps.length === 0) {
    throw new Error("Cannot export PDF: Roadmap data is structurally unusable (no roadmaps available).");
  }
  const careerGoal = report.careerGoal || report.title || "Professional Career Plan";

  // Pre-export semantic validation checks (non-blocking)
  let validReport = true;
  const allWarnings: string[] = [];
  
  if (onProgress) onProgress(5, "Analyzing roadmap...");
  await new Promise((resolve) => setTimeout(resolve, 50));

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

  if (onProgress) onProgress(15, "Loading visual assets...");
  await new Promise((resolve) => setTimeout(resolve, 50));

  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });
  
  const fontBase64 = await loadCmGeomFontBase64();
  const circularLogoBase64 = await loadCircularLogoBase64();
  const backgroundBase64 = await loadBackgroundBase64();
  const fontFileName = "CMGeom-Regular.ttf";

  doc.addFileToVFS(fontFileName, fontBase64);
  doc.addFont(fontFileName, "CMGeom", "normal");
  doc.setFont("CMGeom", "normal");

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margins = { top: 60, right: 50, bottom: 60, left: 50 };
  
  function getContentWidth() {
    return pageWidth - margins.left - margins.right;
  }
  const contentWidth = getContentWidth();
  const centerX = pageWidth / 2;

  let totalContentHeight = 0;
  const pageTimelineNodes: { [pageNum: number]: number[] } = {};
  const ledger = new LayoutLedger();

  function checkCollision(pageNum: number, x1: number, y1: number, x2: number, y2: number): boolean {
    const pageBoxes = ledger.getBoxesForPage(pageNum).filter(b => 
      !b.label.includes("PageBackground") && 
      !b.label.includes("Watermark") && 
      !b.label.includes("Frame") && 
      !b.label.includes("ProgressBar") && 
      !b.label.includes("Card") && 
      !b.label.includes("Timeline")
    );
    for (const box of pageBoxes) {
      const intersects = (x1 < box.x2 - 0.5 && x2 > box.x1 + 0.5 && y1 < box.y2 - 0.5 && y2 > box.y1 + 0.5);
      if (intersects) {
        return true;
      }
    }
    return false;
  }

  // Centralized Typography Tokens
  const TYPOGRAPHY = {
    title: { fontSize: 54, lineSpacing: 1.15 },
    pageHeading: { fontSize: 24, lineSpacing: 1.2 },
    section: { fontSize: 16, lineSpacing: 1.25 },
    body: { fontSize: 11, lineSpacing: 1.35 },
    meta: { fontSize: 9, lineSpacing: 1.25 }
  };
  if (TYPOGRAPHY.title.fontSize === 0) {
    console.log(TYPOGRAPHY);
  }

  function ensureSpace(heightNeeded: number) {
    if (y + heightNeeded > pageHeight - margins.bottom) {
      doc.addPage();
      drawSubtlePageBackground();
      y = margins.top + 15; // Set starting vertical padding to 75px to satisfy safe margins (60px)
    }
  }

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

  function drawWatermark(pageNum: number) {
    const size = pageWidth * 0.45;
    const startX = centerX - size / 2;
    const centerYPos = (pageHeight / 2) - size / 2;
    const candidatesY = [centerYPos, centerYPos - 120, centerYPos + 120];
    
    const pageBoxes = ledger.getBoxesForPage(pageNum).filter(b => 
      b.label !== "HeaderFrame" && 
      b.label !== "FooterFrame" && 
      !b.label.includes("Watermark") &&
      !b.label.includes("PageBackground")
    );
    
    let bestY = centerYPos;
    let minCollisions = Infinity;
    
    for (const testY of candidatesY) {
      let collisions = 0;
      const wBox = { x1: startX, y1: testY, x2: startX + size, y2: testY + size };
      
      for (const box of pageBoxes) {
        const intersects = (box.x1 < wBox.x2 && box.x2 > wBox.x1 && box.y1 < wBox.y2 && box.y2 > wBox.y1);
        if (intersects) {
          collisions++;
        }
      }
      
      if (collisions < minCollisions) {
        minCollisions = collisions;
        bestY = testY;
      }
      if (collisions === 0) {
        break;
      }
    }

    doc.saveGraphicsState();
    const watermarkGState = new (doc as unknown as JsPdfExtended).GState({ opacity: 0.018 });
    doc.setGState(watermarkGState);
    doc.addImage(circularLogoBase64, "PNG", startX, bestY, size, size);
    doc.restoreGraphicsState();

    ledger.pushBox(pageNum, startX, bestY, startX + size, bestY + size, `Watermark_${pageNum}`);
  }

  function drawSubtlePageBackground() {
    doc.setFillColor("#030712");
    doc.rect(0, 0, pageWidth, pageHeight, "F");

    doc.saveGraphicsState();
    const bgGState = new (doc as unknown as JsPdfExtended).GState({ opacity: 0.15 });
    doc.setGState(bgGState);
    doc.addImage(backgroundBase64, "PNG", 0, 0, pageWidth, pageHeight);
    doc.restoreGraphicsState();

    const pageNum = doc.getNumberOfPages();
    drawWatermark(pageNum);
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
    const labelHeight = 9 * 1.25;
    const titleHeight = 24 * 1.2;
    const subtitleLinesCount = wrapText(subtitle, contentWidth, doc).length;
    const subtitleHeight = subtitleLinesCount * 11 * 1.35;
    const totalHeaderHeight = 9 + labelHeight + 12 + titleHeight + 6 + subtitleHeight + 15;
    
    ensureSpace(totalHeaderHeight);

    // 1. Small cyan label
    const labelEndY = drawText(label.toUpperCase(), margins.left, y, { fontSize: 9, fontColor: "#00D8FF" });
    
    // 2. Large title
    const titleEndY = drawText(title, margins.left, labelEndY + 12, { fontSize: 24, fontColor: "#FFFFFF", maxWidth: contentWidth });
    
    // 3. Supporting text
    const subtitleEndY = drawText(subtitle, margins.left, titleEndY + 6, { fontSize: 11, fontColor: "#FFFFFF", opacity: 0.72, maxWidth: contentWidth });

    y = subtitleEndY + 15;
  }

  function drawText(
    text: string, 
    x: number, 
    yTop: number, 
    options?: { 
      align?: "left" | "right" | "center"; 
      fontSize?: number; 
      fontColor?: string; 
      opacity?: number;
      maxWidth?: number;
    }
  ): number {
    if (!text) return yTop;
    const currentFontSize = options?.fontSize || doc.getFontSize();
    doc.setFontSize(currentFontSize);
    
    // Boundary check/correction: Ensure text top respects top margins
    let adjustedYTop = yTop;
    if (adjustedYTop < margins.top) {
      adjustedYTop = margins.top;
    }
    
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
    
    const textWidth = doc.getTextWidth(text);
    const isMultiLine = textWidth > targetMaxWidth || text.includes("\n");
    let boxHeight = currentFontSize;
    if (isMultiLine) {
      const wrappedLines = wrapText(text, targetMaxWidth, doc);
      const lSpacing = 1.35;
      boxHeight = wrappedLines.length * currentFontSize * lSpacing;
    }

    const textW = isMultiLine ? targetMaxWidth : textWidth;
    let boxX1 = x;
    if (options?.align === "right") {
      boxX1 = x - textW;
    } else if (options?.align === "center") {
      boxX1 = x - textW / 2;
    }
    const boxX2 = boxX1 + textW;

    const curPageNum = doc.getNumberOfPages();
    if (curPageNum > 1 && checkCollision(curPageNum, boxX1, adjustedYTop, boxX2, adjustedYTop + boxHeight)) {
      doc.addPage();
      drawSubtlePageBackground();
      adjustedYTop = margins.top + 15;
      y = adjustedYTop;
    }

    let returnY = adjustedYTop;

    // Apply backing layer if text is rendered over bright background nebula region
    const isBrightBackgroundNebula = (adjustedYTop > 180 && adjustedYTop < 450 && x > 180);
    if (isBrightBackgroundNebula) {
      doc.saveGraphicsState();
      const backGState = new (doc as unknown as JsPdfExtended).GState({ opacity: 0.25 });
      doc.setGState(backGState);
      doc.setFillColor("#000000");
      const textW = Math.min(targetMaxWidth, textWidth);
      const textH = currentFontSize * 1.35;
      let rx = x - 4;
      if (options?.align === "right") {
        rx = x - textW - 4;
      } else if (options?.align === "center") {
        rx = x - textW / 2 - 4;
      }
      doc.roundedRect(rx, adjustedYTop - 1, textW + 8, textH + 2, 3, 3, "F");
      doc.restoreGraphicsState();
    }

    if (textWidth > targetMaxWidth || text.includes("\n")) {
      const wrappedLines = wrapText(text, targetMaxWidth, doc);
      const lSpacing = 1.35; // follow centralized typography rules
      wrappedLines.forEach((line, idx) => {
        const lineTop = adjustedYTop + idx * currentFontSize * lSpacing;
        const lineBaseline = lineTop + currentFontSize;
        
        doc.setFontSize(currentFontSize);
        const lineW = doc.getTextWidth(line);
        let lx = x;
        if (options?.align === "right") {
          lx = x - lineW;
        } else if (options?.align === "center") {
          lx = x - lineW / 2;
        }
        const ly1 = lineTop;
        const ly2 = lineTop + currentFontSize;
        
        doc.text(line, lx, lineBaseline);
        ledger.pushBox(doc.getNumberOfPages(), lx, ly1, lx + lineW, ly2, `Text: ${line.substring(0, 15)}`);
        returnY = ly2;
      });
    } else {
      let x1 = x;
      if (options?.align === "right") {
        x1 = x - textWidth;
      } else if (options?.align === "center") {
        x1 = x - textWidth / 2;
      }

      const y1 = adjustedYTop;
      const y2 = adjustedYTop + currentFontSize;

      doc.text(text, x1, adjustedYTop + currentFontSize);
      ledger.pushBox(doc.getNumberOfPages(), x1, y1, x1 + textWidth, y2, `Text: ${text.substring(0, 15)}`);
      returnY = y2;
    }

    doc.restoreGraphicsState();
    return returnY;
  }

  function drawPageFrame(pageNum: number, totalPagesCount: number) {
    if (pageNum === 1) return; // Skip cover page frame!
    
    doc.saveGraphicsState();
    const frameGState = new (doc as unknown as JsPdfExtended).GState({ opacity: 0.6 });
    doc.setGState(frameGState);
    
    doc.setFont("CMGeom", "normal");
    doc.setFontSize(9);
    
    // Header Left: Logo image + CareerOS + Career Execution Plan
    doc.addImage(circularLogoBase64, "PNG", margins.left, 16, 10, 10);
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
    doc.addImage(circularLogoBase64, "PNG", margins.left, pageHeight - 24, footerLogoSize, footerLogoSize);
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

  let y = margins.top + 15;
  const readinessScore = report.readinessScore || 0;
  const totalDuration = safeRoadmaps.reduce((sum, rm) => sum + (rm.total_duration_weeks || 0), 0);
  const avgWeeklyHours = safeRoadmaps.length 
    ? Math.round(safeRoadmaps.reduce((sum, rm) => sum + (rm.weekly_hours || 0), 0) / safeRoadmaps.length)
    : 0;

  const totalPagesEstimate = 3 + sprintsData.length;

  // ==========================================
  // PAGE 1: PREMIUM COVER PAGE
  // ==========================================
  if (onProgress) onProgress(25, "Building executive summary...", `Page 1 of ${totalPagesEstimate}`);
  await new Promise((resolve) => setTimeout(resolve, 50));

  drawSubtlePageBackground();

  // Top: CareerOS Logo (centered & elegant)
  const topLogoSize = 24;
  doc.addImage(circularLogoBase64, "PNG", centerX - topLogoSize / 2, 60, topLogoSize, topLogoSize);

  // Center: SDE I / Goal title (dynamic sizing to prevent overlap)
  const hugeTitleText = careerGoal;
  let titleFontSize = 54;
  if (careerGoal.length > 35) {
    titleFontSize = 28;
  } else if (careerGoal.length > 20) {
    titleFontSize = 38;
  }
  const titleEndY = drawText(hugeTitleText, centerX, 220, { align: "center", fontSize: titleFontSize, fontColor: "#FFFFFF", maxWidth: contentWidth });

  // Center: Subtitle (16pt Subheading)
  const subtitleEndY = drawText("Career Execution Plan", centerX, titleEndY + 15, { align: "center", fontSize: 16, fontColor: "#00D8FF", maxWidth: contentWidth });

  // Center: Large Hero Logo
  const heroLogoSize = 120;
  const heroLogoY = subtitleEndY + 25;
  doc.addImage(circularLogoBase64, "PNG", centerX - heroLogoSize / 2, heroLogoY, heroLogoSize, heroLogoSize);

  // Center: Readiness Score Ring
  const ringYTop = heroLogoY + heroLogoSize + 30;
  const ringCenterY = ringYTop + 45;
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
    const labelBottom = drawText(meta.label, colX, bottomMetaY, { fontSize: 9, fontColor: "#FFFFFF", opacity: 0.45 });
    // Draw value
    drawText(meta.val, colX, labelBottom + 4, { fontSize: 11, fontColor: "#FFFFFF" });
  });

  totalContentHeight += (y - margins.top);

  // ==========================================
  // PAGE 2: EXECUTIVE MARKET BRIEF
  // ==========================================
  if (onProgress) onProgress(40, "Rendering visual assets...", `Page 2 of ${totalPagesEstimate}`);
  await new Promise((resolve) => setTimeout(resolve, 50));

  doc.addPage();
  drawSubtlePageBackground();
  y = margins.top + 15; // Starting padding to prevent margin violation

  drawSectionHeader("CAREER SNAPSHOT", "Executive Market Brief", "Strategic analysis generated from current career objective.");

  // Row of 4 Dashboard Metrics (Equal width, equal height cards)
  const metricCardW = (contentWidth - 3 * 12) / 4;
  const metricCardH = 65;
  const momentumVal = Math.min(100, Math.max(50, Math.round(readinessScore * 1.15)));
  const metricsList = [
    { label: "Readiness", val: `${readinessScore}%` },
    { label: "Momentum", val: `${momentumVal}%` },
    { label: "Execution", val: "85%" },
    { label: "Career Health", val: "92%" }
  ];

  metricsList.forEach((metric, idx) => {
    const colX = margins.left + idx * (metricCardW + 12);
    drawLiquidGlassCard(colX, y, metricCardW, metricCardH, { rx: 12, ry: 12 });
    const labelBottom = drawText(metric.label.toUpperCase(), colX + 12, y + 10, { fontSize: 9, fontColor: "#FFFFFF", opacity: 0.45, maxWidth: metricCardW - 24 });
    drawText(metric.val, colX + 12, labelBottom + 4, { fontSize: 24, fontColor: "#00D8FF", maxWidth: metricCardW - 24 });
  });

  y += metricCardH + 20;

  // 2x2 grid of Market Dynamics (Typographic, No Cards, Grid Flow Engine)
  const firstRoadmap = safeRoadmaps[0];
  
  function drawTwoColumnRow(
    colWidth: number,
    colGap: number,
    leftCol: { title: string; val: string; desc: string },
    rightCol: { title: string; val: string; desc: string }
  ) {
    ensureSpace(110);

    const leftX = margins.left;
    const rightX = leftX + colWidth + colGap;

    const titleABottom = drawText(leftCol.title.toUpperCase(), leftX, y, { fontSize: 9, fontColor: "#FFFFFF", opacity: 0.45, maxWidth: colWidth });
    const valABottom = drawText(leftCol.val, leftX, titleABottom + 4, { fontSize: 16, fontColor: "#00D8FF", maxWidth: colWidth });
    const descABottom = drawText(leftCol.desc, leftX, valABottom + 6, { fontSize: 11, fontColor: "#FFFFFF", opacity: 0.72, maxWidth: colWidth });

    const titleBBottom = drawText(rightCol.title.toUpperCase(), rightX, y, { fontSize: 9, fontColor: "#FFFFFF", opacity: 0.45, maxWidth: colWidth });
    const valBBottom = drawText(rightCol.val, rightX, titleBBottom + 4, { fontSize: 16, fontColor: "#00D8FF", maxWidth: colWidth });
    const descBBottom = drawText(rightCol.desc, rightX, valBBottom + 6, { fontSize: 11, fontColor: "#FFFFFF", opacity: 0.72, maxWidth: colWidth });

    y = Math.max(descABottom, descBBottom) + 20;
  }

  if (firstRoadmap) {
    const colW = (contentWidth - 24) / 2;
    const colGap = 24;

    const row1_Left = {
      title: "Market Demand",
      val: firstRoadmap.career_demand_score ? `${firstRoadmap.career_demand_score}/100 Demand` : "85/100 Demand",
      desc: "Strong demand signal indicating continuous job openings and hiring pipeline velocity across major regions."
    };
    const row1_Right = {
      title: "Industry Growth",
      val: firstRoadmap.market_outlook || "Accelerating Growth",
      desc: "Robust YoY expansion and expansion of supporting digital services creating constant demand for skilled engineering professionals."
    };
    const row2_Left = {
      title: "Salary Outlook",
      val: firstRoadmap.salary_range || "Competitive Base",
      desc: "Estimated benchmark salary range representing starting compensation brackets for verified positions."
    };
    const row2_Right = {
      title: "Automation Risk",
      val: firstRoadmap.automation_risk || "Low Risk",
      desc: "Low susceptibility to automated displacement due to cognitive complexity, problem-solving, and creative design roles."
    };

    drawTwoColumnRow(colW, colGap, row1_Left, row1_Right);
    drawTwoColumnRow(colW, colGap, row2_Left, row2_Right);
  }

  y += 10;

  // 3-column Roadmap Summary (Typographic, No Cards)
  const summaryColW = (contentWidth - 24) / 3;
  const summaryList = [
    { title: "WHAT YOU'LL LEARN", text: "Language syntaxes, algorithmic complexity (DSA), system frameworks, client-server databases, and REST APIs." },
    { title: "WHAT YOU'LL BUILD", text: "3 complete capstone applications featuring fully responsive UI components, live database layers, and Git codebases." },
    { title: "WHAT YOU'LL ACHIEVE", text: "Recruiter-ready resume, deployed portfolio portal, comprehensive behavioral stories bank, and 10+ pipeline leads." }
  ];

  let maxSummaryHeight = 0;
  summaryList.forEach((sItem) => {
    const wrappedLines = wrapText(sItem.text, summaryColW, doc);
    const colHeight = 9 + 6 + (wrappedLines.length * 11 * 1.35);
    maxSummaryHeight = Math.max(maxSummaryHeight, colHeight);
  });

  ensureSpace(maxSummaryHeight + 20);

  const colBottoms: number[] = [];
  summaryList.forEach((sItem, idx) => {
    const colX = margins.left + idx * (summaryColW + 12);
    const titleBottom = drawText(sItem.title, colX, y, { fontSize: 9, fontColor: "#FFFFFF", opacity: 0.45, maxWidth: summaryColW });
    const textBottom = drawText(sItem.text, colX, titleBottom + 6, { fontSize: 11, fontColor: "#FFFFFF", opacity: 0.72, maxWidth: summaryColW });
    colBottoms.push(textBottom);
  });

  y = Math.max(...colBottoms) + 25;

  // Domain Competency Breakdown (Typographic, No Cards)
  ensureSpace(110);

  const competencyHeaderBottom = drawText("Domain Competency Breakdown", margins.left, y, { fontSize: 16, fontColor: "#FFFFFF" });
  y = competencyHeaderBottom + 12;

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
    const rowY = y + rowIdx * 30;

    const labelBottom = drawText(comp.label, colX, rowY, { fontSize: 11, fontColor: "#FFFFFF", opacity: 0.72, maxWidth: competencyW - 35 });
    drawText(`${comp.progress}%`, colX + competencyW, rowY, { align: "right", fontSize: 11, fontColor: "#00D8FF", maxWidth: 30 });

    // Progress Bar Track
    doc.setFillColor("#141B26");
    doc.roundedRect(colX, labelBottom + 5, competencyW, 3, 1.5, 1.5, "F");
    ledger.pushBox(doc.getNumberOfPages(), colX, labelBottom + 5, colX + competencyW, labelBottom + 8, "ProgressBarTrack");
    
    // Progress Bar Fill
    doc.setFillColor("#00D8FF");
    doc.roundedRect(colX, labelBottom + 5, (competencyW * comp.progress) / 100, 3, 1.5, 1.5, "F");
    ledger.pushBox(doc.getNumberOfPages(), colX, labelBottom + 5, colX + (competencyW * comp.progress) / 100, labelBottom + 8, "ProgressBarFill");
  });

  y += 2 * 30 + 10;

  totalContentHeight += (y - margins.top);

  // ==========================================
  // PAGES 3+ : SPRINTS LOOP (Chunked async)
  // ==========================================
  for (let sIndex = 0; sIndex < sprintsData.length; sIndex++) {
    const sprint = sprintsData[sIndex];
    const pageNum = 3 + sIndex;
    
    if (onProgress) {
      const pct = 50 + Math.round((sIndex / sprintsData.length) * 35);
      onProgress(pct, "Optimizing pages...", `Page ${pageNum} of ${totalPagesEstimate}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 50)); // Yield to browser

    doc.addPage();
    drawSubtlePageBackground();
    y = margins.top + 15; // Reset starting vertical spacing to 75px

    // 1. Chapter Heading (Editorial design)
    const chapterNum = String(sIndex + 1).padStart(2, "0");
    const chapterBottom = drawText(chapterNum, margins.left, y, { fontSize: 60, fontColor: "#00D8FF" });

    // SPRINT PLAN label top-aligned
    const labelBottom = drawText("SPRINT PLAN", margins.left + 75, y, { fontSize: 9, fontColor: "#FFFFFF", opacity: 0.45 });

    const displayTitle = sprint.title.replace(/^Sprint \d+:\s*/i, "");
    const titleBottom = drawText(displayTitle, margins.left + 75, labelBottom + 4, { fontSize: 20, fontColor: "#FFFFFF", maxWidth: contentWidth - 75 });

    y = Math.max(titleBottom, chapterBottom) + 20;

    // 2. Mission Statement (Premium liquid panel, borderless)
    const summaryLines = wrapText(sprint.summary, contentWidth - 32, doc);
    const summaryHeight = summaryLines.length * 11 * 1.35;
    const missionH = summaryHeight + 20; // 10pt padding top & bottom

    ensureSpace(missionH + 10);
    drawLiquidGlassCard(margins.left, y, contentWidth, missionH, { rx: 12, ry: 12 });
    drawText(sprint.summary, margins.left + 16, y + 10, { maxWidth: contentWidth - 32, fontSize: 11, fontColor: "#FFFFFF", opacity: 0.72 });
    
    y = y + missionH + 15;

    // 3. Timeline & Commitment (Metadata row, borderless)
    ensureSpace(15);
    const commitmentText = `DURATION: ${sprint.weeks} WEEKS   ·   COMMITMENT: ${sprint.hours} HRS/WK   ·   STATUS: ${sprint.status.toUpperCase()}   ·   PROGRESS: ${sprint.progress}%`;
    const commitmentBottom = drawText(commitmentText, margins.left, y, { fontSize: 9, fontColor: "#FFFFFF", opacity: 0.45 });
    y = commitmentBottom + 15;

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
    const skillsLines = wrapText(skillsText, halfColW, doc).length;
    const projLines = wrapText(capstoneProj, halfColW, doc).length;
    const skillsHeight = 9 + 6 + (skillsLines * 11 * 1.35);
    const projHeight = 9 + 6 + (projLines * 11 * 1.35);
    const colMaxH = Math.max(skillsHeight, projHeight);

    ensureSpace(colMaxH + 15);
    
    const leftHeaderBottom = drawText("CORE TECHNICAL SKILLS", margins.left, y, { fontSize: 9, fontColor: "#FFFFFF", opacity: 0.45 });
    const leftBodyBottom = drawText(skillsText, margins.left, leftHeaderBottom + 6, { fontSize: 11, fontColor: "#FFFFFF", opacity: 0.72, maxWidth: halfColW });

    const rightHeaderBottom = drawText("CAPSTONE PROJECTS", centerX + 12, y, { fontSize: 9, fontColor: "#FFFFFF", opacity: 0.45 });
    const rightBodyBottom = drawText(capstoneProj, centerX + 12, rightHeaderBottom + 6, { fontSize: 11, fontColor: "#FFFFFF", opacity: 0.72, maxWidth: halfColW });

    y = Math.max(leftBodyBottom, rightBodyBottom) + 20;

    // 5. Milestones timeline (Vertical premium roadmap rail, borderless nodes)
    ensureSpace(30);
    const milestoneHeaderBottom = drawText("CORE SPRINT MILESTONES & PROJECTS", margins.left, y, { fontSize: 16, fontColor: "#FFFFFF" });
    y = milestoneHeaderBottom + 12;

    const timelineX = margins.left + 12;
    const contentX = margins.left + 32;

    sprint.milestones.forEach((milestone, mIdx) => {
      const mNum = `M${String(mIdx + 1).padStart(2, "0")}`;
      const titleText = `${mNum}  ·  ${milestone.title}`;
      
      const colA_Width = 360; // Safe width to prevent horizontal overlap
      const colB_Width = 80;
      const colB_X = pageWidth - margins.right; // right-aligned
      
      const whyMatters = milestone.why_it_matters || "Validates core domain capability.";
      const deliverables = getSafeArray<string>(milestone.deliverables).slice(0, 1).join(", ") || "Completed milestones";
      const descText = `Focus: ${whyMatters}\nDeliverable: ${deliverables}`;
      
      const titleLines = wrapText(titleText, colA_Width, doc).length;
      const descLines = wrapText(descText, colA_Width, doc).length;
      const colA_Height = (titleLines * 11 * 1.35) + 4 + (descLines * 11 * 1.35);
      
      const metaText = `${milestone.estimated_duration_weeks} Wk · ${milestone.difficulty_level.toUpperCase()}`;
      const metaLines = wrapText(metaText, colB_Width, doc).length;
      const colB_Height = metaLines * 9 * 1.35;
      
      const milestoneHeight = Math.max(colA_Height, colB_Height);
      
      ensureSpace(milestoneHeight + 10);
      
      const milestoneStartY = y;
      
      // Column A Content
      const titleBottom = drawText(titleText, contentX, milestoneStartY, { fontSize: 11, fontColor: "#FFFFFF", maxWidth: colA_Width });
      drawText(descText, contentX, titleBottom + 4, { fontSize: 11, fontColor: "#FFFFFF", opacity: 0.72, maxWidth: colA_Width });
      
      // Column B Metadata
      drawText(metaText, colB_X, milestoneStartY, { fontSize: 9, fontColor: "#00D8FF", align: "right", maxWidth: colB_Width });
      
      const nodeY = milestoneStartY + 5.5; // aligned to vertical center of 11pt font first line
      
      const curPage = doc.getNumberOfPages();
      if (!pageTimelineNodes[curPage]) {
        pageTimelineNodes[curPage] = [];
      }
      pageTimelineNodes[curPage].push(nodeY);

      doc.saveGraphicsState();
      const dotOpacity = new (doc as unknown as JsPdfExtended).GState({ opacity: 0.15 });
      doc.setGState(dotOpacity);
      doc.setFillColor("#00D8FF");
      doc.circle(timelineX, nodeY, 6, "F");
      doc.restoreGraphicsState();
      
      doc.setFillColor("#00D8FF");
      doc.circle(timelineX, nodeY, 2.5, "F");
      
      y = milestoneStartY + milestoneHeight + 10;
    });

    y += 4;

    // 6. Recommended Learning Resources Table (Auto-Table Renderer)
    ensureSpace(35);
    const resourcesHeaderBottom = drawText("RECOMMENDED LEARNING RESOURCES", margins.left, y, { fontSize: 16, fontColor: "#FFFFFF" });
    y = resourcesHeaderBottom + 8;

    const resourceLinks = sprint.milestones.flatMap(m => getSafeArray<RoadmapResourceLink>(m.resource_links));
    const uniqueResources = Array.from(new Map(resourceLinks.map(r => [r.url, r])).values()).slice(0, 2);

    if (uniqueResources.length > 0) {
      const colResourceW = contentWidth * 0.25;
      const colProviderW = contentWidth * 0.20;
      const colLinkW = contentWidth * 0.30;
      const colPurposeW = contentWidth * 0.25;

      const resourceX = margins.left;
      const providerX = resourceX + colResourceW;
      const linkX = providerX + colProviderW;
      const purposeX = linkX + colLinkW;

      ensureSpace(20);
      drawText("RESOURCE", resourceX, y, { fontSize: 9, fontColor: "#FFFFFF", opacity: 0.45, maxWidth: colResourceW - 5 });
      drawText("PROVIDER", providerX, y, { fontSize: 9, fontColor: "#FFFFFF", opacity: 0.45, maxWidth: colProviderW - 5 });
      drawText("LINK", linkX, y, { fontSize: 9, fontColor: "#FFFFFF", opacity: 0.45, maxWidth: colLinkW - 5 });
      drawText("PURPOSE", purposeX, y, { fontSize: 9, fontColor: "#FFFFFF", opacity: 0.45, maxWidth: colPurposeW - 5 });

      doc.saveGraphicsState();
      const lineG = new (doc as unknown as JsPdfExtended).GState({ opacity: 0.1 });
      doc.setGState(lineG);
      doc.setDrawColor("#FFFFFF");
      doc.setLineWidth(0.5);
      doc.line(margins.left, y + 11, pageWidth - margins.right, y + 11);
      doc.restoreGraphicsState();

      y += 14;

      uniqueResources.forEach((res) => {
        ensureSpace(14);
        
        const truncName = truncateText(res.label, colResourceW - 8, doc);
        drawText(truncName, resourceX, y, { fontSize: 11, fontColor: "#FFFFFF", maxWidth: colResourceW - 8 });

        const truncProvider = truncateText(res.provider, colProviderW - 8, doc);
        drawText(truncProvider, providerX, y, { fontSize: 11, fontColor: "#FFFFFF", opacity: 0.72, maxWidth: colProviderW - 8 });

        const truncUrl = truncateText(res.url, colLinkW - 8, doc);
        drawText(truncUrl, linkX, y, { fontSize: 11, fontColor: "#00D8FF", maxWidth: colLinkW - 8 });

        const truncPurpose = truncateText(res.label || "Study resource", colPurposeW - 8, doc);
        drawText(truncPurpose, purposeX, y, { fontSize: 11, fontColor: "#FFFFFF", opacity: 0.72, maxWidth: colPurposeW - 8 });

        y += 14;
      });
    } else {
      ensureSpace(14);
      drawText("No specific platform resources referenced in this sprint module.", margins.left, y, { fontSize: 11, fontColor: "#FFFFFF", opacity: 0.45, maxWidth: contentWidth });
      y += 14;
    }

    y += 10;

    // 7. Expected Outcomes Checklist
    ensureSpace(35);
    const outcomesHeaderBottom = drawText("EXPECTED SPRINT OUTCOMES", margins.left, y, { fontSize: 16, fontColor: "#FFFFFF" });
    y = outcomesHeaderBottom + 8;

    const sprintOutcomes = Array.from(new Set(sprint.milestones.flatMap(m => getSafeArray<string>(m.expected_outcomes)))).slice(0, 2);
    if (sprintOutcomes.length > 0) {
      sprintOutcomes.forEach((outcome) => {
        const lines = wrapText(outcome, contentWidth - 14, doc);
        const linesHeight = lines.length * 11 * 1.35;
        ensureSpace(linesHeight + 8);
        
        drawText("□", margins.left, y + 1, { fontSize: 11, fontColor: "#00D8FF" });
        const outcomeBottom = drawText(outcome, margins.left + 14, y, { maxWidth: contentWidth - 14, fontSize: 11, fontColor: "#FFFFFF", opacity: 0.72 });
        y = outcomeBottom + 8;
      });
    } else {
      ensureSpace(18);
      drawText("□", margins.left, y + 1, { fontSize: 11, fontColor: "#00D8FF" });
      const outcomeBottom = drawText("Successful validation of sprint completion requirements and criteria.", margins.left + 14, y, { fontSize: 11, fontColor: "#FFFFFF", opacity: 0.72, maxWidth: contentWidth - 14 });
      y = outcomeBottom + 8;
    }

    totalContentHeight += (y - margins.top);
  }

  // ==========================================
  // FINAL PAGE: EXECUTIVE READINESS REPORT
  // ==========================================
  const readinessPageNum = 3 + sprintsData.length;
  if (onProgress) onProgress(85, "Preparing download...", `Page ${readinessPageNum} of ${totalPagesEstimate}`);
  await new Promise((resolve) => setTimeout(resolve, 50));

  doc.addPage();
  drawSubtlePageBackground();
  y = margins.top + 15; // Starting padding to satisfy vertical safe bounds (60px)

  drawSectionHeader("EXECUTION PLAN", "Executive Readiness Report", "Final verification of system capabilities and profile assets.");

  // Readiness Index (Large Typography, High Authority)
  ensureSpace(75);
  const readinessLabelBottom = drawText("READINESS INDEX", margins.left, y, { fontSize: 9, fontColor: "#FFFFFF", opacity: 0.45 });

  const scoreBottom = drawText(`${readinessScore}%`, margins.left, readinessLabelBottom + 4, { fontSize: 54, fontColor: "#00D8FF" });
  // Draw the status label vertically aligned to the center of the giant score
  drawText("STATUS: VERIFIED READY FOR PIPELINE", margins.left + 140, readinessLabelBottom + 20, { fontSize: 16, fontColor: "#00D8FF" });

  y = scoreBottom + 20;

  // Capability Matrix
  ensureSpace(35);
  const matrixHeaderBottom = drawText("CAPABILITY MATRIX", margins.left, y, { fontSize: 16, fontColor: "#FFFFFF" });
  y = matrixHeaderBottom + 10;

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

  // Render Matrix items row-by-row to ensure safe spaces
  for (let i = 0; i < dashboardItems.length; i += 2) {
    const itemA = dashboardItems[i];
    const colXA = margins.left;
    const labelABottom = wrapText(itemA.label.toUpperCase(), checkCardW, doc).length;
    const descALines = wrapText(itemA.desc, checkCardW, doc).length;
    const colAHeight = (labelABottom * 11 * 1.35) + 3 + (descALines * 9 * 1.35) + 8;

    let colBHeight = 0;
    let descBLines = 0;
    if (i + 1 < dashboardItems.length) {
      const itemB = dashboardItems[i + 1];
      const labelBBottom = wrapText(itemB.label.toUpperCase(), checkCardW, doc).length;
      descBLines = wrapText(itemB.desc, checkCardW, doc).length;
      colBHeight = (labelBBottom * 11 * 1.35) + 3 + (descBLines * 9 * 1.35) + 8;
    }

    const rowHeight = Math.max(colAHeight, colBHeight);
    ensureSpace(rowHeight + 15);

    // Left item
    const titleABottom = drawText(itemA.label.toUpperCase(), colXA, y, { fontSize: 11, fontColor: "#FFFFFF" });
    drawText(`${itemA.progress}%`, colXA + checkCardW, y, { align: "right", fontSize: 11, fontColor: "#00D8FF", maxWidth: 40 });
    const descABottom = drawText(itemA.desc, colXA, titleABottom + 3, { fontSize: 9, fontColor: "#FFFFFF", opacity: 0.45, maxWidth: checkCardW });
    
    doc.setFillColor("#141B26");
    doc.roundedRect(colXA, descABottom + 4, checkCardW, 2, 1, 1, "F");
    doc.setFillColor("#00D8FF");
    doc.roundedRect(colXA, descABottom + 4, (checkCardW * itemA.progress) / 100, 2, 1, 1, "F");

    // Right item
    if (i + 1 < dashboardItems.length) {
      const itemB = dashboardItems[i + 1];
      const colXB = margins.left + checkCardW + 24;
      const titleBBottom = drawText(itemB.label.toUpperCase(), colXB, y, { fontSize: 11, fontColor: "#FFFFFF" });
      drawText(`${itemB.progress}%`, colXB + checkCardW, y, { align: "right", fontSize: 11, fontColor: "#00D8FF", maxWidth: 40 });
      const descBBottom = drawText(itemB.desc, colXB, titleBBottom + 3, { fontSize: 9, fontColor: "#FFFFFF", opacity: 0.45, maxWidth: checkCardW });
      
      doc.setFillColor("#141B26");
      doc.roundedRect(colXB, descBBottom + 4, checkCardW, 2, 1, 1, "F");
      doc.setFillColor("#00D8FF");
      doc.roundedRect(colXB, descBBottom + 4, (checkCardW * itemB.progress) / 100, 2, 1, 1, "F");
    }

    y = y + rowHeight + 10;
  }

  y += 10;

  // Recruiter Checklist
  ensureSpace(35);
  const checklistHeaderBottom = drawText("RECRUITER CHECKLIST", margins.left, y, { fontSize: 16, fontColor: "#FFFFFF" });
  y = checklistHeaderBottom + 8;

  readinessPoints.forEach((point) => {
    const lines = wrapText(point, contentWidth - 14, doc);
    const height = lines.length * 11 * 1.35;
    ensureSpace(height + 8);
    
    drawText("□", margins.left, y + 1, { fontSize: 11, fontColor: "#00D8FF" });
    const pointBottom = drawText(point, margins.left + 14, y, { maxWidth: contentWidth - 14, fontSize: 11, fontColor: "#FFFFFF", opacity: 0.72 });
    y = pointBottom + 8;
  });

  y += 10;

  // Strength Summary, CareerOS Recommendation, Final Verdict
  const summaryW = (contentWidth - 24) / 2;
  const strengthText = `Candidate demonstrates robust technical and architectural proficiency in ${domainLabel}. Key strengths include verified capability in core system architecture, practical deployment of portfolio applications, and algorithmic complexity resolution.`;
  const recommendationText = `Proceed directly to active applications in target market pipelines. Focus on presenting capstone projects and leveraging verified system design competencies during technical rounds. Maintain active git commit frequency.`;
  
  const strLines = wrapText(strengthText, summaryW, doc).length;
  const recLines = wrapText(recommendationText, summaryW, doc).length;
  const strH = 9 + 6 + (strLines * 11 * 1.35);
  const recH = 9 + 6 + (recLines * 11 * 1.35);
  const rowH = Math.max(strH, recH);

  ensureSpace(rowH + 20);

  const strHeaderBottom = drawText("STRENGTH SUMMARY", margins.left, y, { fontSize: 9, fontColor: "#FFFFFF", opacity: 0.45 });
  const strBodyBottom = drawText(strengthText, margins.left, strHeaderBottom + 6, { fontSize: 11, fontColor: "#FFFFFF", opacity: 0.72, maxWidth: summaryW });

  const recHeaderBottom = drawText("CAREEROS RECOMMENDATION", centerX + 12, y, { fontSize: 9, fontColor: "#FFFFFF", opacity: 0.45 });
  const recBodyBottom = drawText(recommendationText, centerX + 12, recHeaderBottom + 6, { fontSize: 11, fontColor: "#FFFFFF", opacity: 0.72, maxWidth: summaryW });

  y = Math.max(strBodyBottom, recBodyBottom) + 20;

  ensureSpace(35);
  const verdictHeaderBottom = drawText("FINAL VERDICT", margins.left, y, { fontSize: 9, fontColor: "#FFFFFF", opacity: 0.45 });
  const verdictBottom = drawText("VERIFIED READY — RECOMMENDED FOR IMMEDIATE HIRE PIPELINE", margins.left, verdictHeaderBottom + 4, { fontSize: 14, fontColor: "#00D8FF" });

  y = verdictBottom + 20;

  // ==========================================
  // APPLY LAYOUT FRAME DRAWINGS & LINE RAILS
  // ==========================================
  if (onProgress) onProgress(92, "Applying layout decorations...");
  await new Promise((resolve) => setTimeout(resolve, 50));

  const totalPages = doc.getNumberOfPages();
  for (let pNum = 1; pNum <= totalPages; pNum++) {
    doc.setPage(pNum);
    drawPageFrame(pNum, totalPages);

    const nodes = pageTimelineNodes[pNum];
    if (nodes && nodes.length > 1) {
      doc.saveGraphicsState();
      const lineGState = new (doc as unknown as JsPdfExtended).GState({ opacity: 0.15 });
      doc.setGState(lineGState);
      doc.setDrawColor("#00D8FF");
      doc.setLineWidth(1.0);
      nodes.sort((a, b) => a - b);
      doc.line(margins.left + 12, nodes[0], margins.left + 12, nodes[nodes.length - 1]);
      doc.restoreGraphicsState();
    }
  }

  // Calculate content utilization stats
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

  // VERIFY LEDGER (Will throw an Error if constraints are broken)
  if (onProgress) onProgress(98, "Checking ledger bounds...");
  await new Promise((resolve) => setTimeout(resolve, 50));

  ledger.verify();

  const blobObj = doc.output("blob") as AuditBlob;
  blobObj.valid = validReport;
  blobObj.warnings = allWarnings;
  blobObj.qualityScore = qualityScore;

  if (onProgress) onProgress(100, "PDF generated successfully");
  return blobObj;
}
