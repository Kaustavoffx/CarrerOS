import type { RoadmapRecord } from "./supabase/types";

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
  const resources = getSafeArray<NonNullable<RoadmapRecord["resource_links"]>[number]>(roadmap.resource_links);
  return resources
    .map((resource) => `- [${resource.label}](${resource.url}) - ${resource.provider}`)
    .join("\n");
}

function formatList(items: string[]) {
  const safeItems = getSafeArray<string>(items);
  return safeItems.length ? safeItems.map((item) => `- ${item}`).join("\n") : "- None";
}

function formatMilestonesMarkdown(roadmap: RoadmapRecord) {
  const milestones = getSafeArray<NonNullable<RoadmapRecord["milestones"]>[number]>(roadmap.milestones);
  return milestones
    .map((milestone) => {
      const resources = Array.isArray(milestone.resource_links) ? milestone.resource_links.map((resource) => `  - [${resource.label}](${resource.url}) - ${resource.provider}`).join("\n") : "  - None";
      const projects = Array.isArray(milestone.projects) ? milestone.projects.map((project) => `  - ${project}`).join("\n") : "  - None";
      const tasks = Array.isArray(milestone.project_tasks) ? milestone.project_tasks.map((task) => `  - ${task}`).join("\n") : "  - None";
      const outcomes = Array.isArray(milestone.expected_outcomes) ? milestone.expected_outcomes.map((outcome) => `  - ${outcome}`).join("\n") : "  - None";
      const criteria = Array.isArray(milestone.completion_criteria) ? milestone.completion_criteria.map((item) => `  - ${item}`).join("\n") : "  - None";
      const deliverables = Array.isArray(milestone.deliverables) ? milestone.deliverables.map((item) => `  - ${item}`).join("\n") : "  - None";

      return [
        `### ${milestone.title}`,
        `Why it matters: ${milestone.why_it_matters}`,
        `Estimated duration: ${milestone.estimated_duration_weeks} week(s)`,
        `Difficulty: ${milestone.difficulty_level}`,
        `Completion criteria:\n${criteria}`,
        `Resources:\n${resources}`,
        `Projects:\n${projects}`,
        `Project tasks:\n${tasks}`,
        `Deliverables:\n${deliverables}`,
        `Expected outcomes:\n${outcomes}`
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
      `AI reasoning: ${roadmap.ai_reasoning}`,
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
  const margins = { top: 54, right: 54, bottom: 54, left: 54 };
  const contentWidth = pageWidth - margins.left - margins.right;
  const centerX = pageWidth / 2;
  const bodyFont = 11;
  const titleFont = 20;
  const sectionFont = 13;
  const lineHeight = 15;
  let y = margins.top;

  function ensureSpace(requiredHeight: number) {
    if (y + requiredHeight > pageHeight - margins.bottom) {
      doc.addPage();
      drawPageFrame();
      y = margins.top + 38;
    }
  }

  function drawCenteredText(text: string, fontSize: number, color: string, spacing = lineHeight, before = 0, after = 0) {
    ensureSpace(before + spacing + after);
    y += before;
    doc.setFontSize(fontSize);
    doc.setTextColor(color);
    const lines = doc.splitTextToSize(text, contentWidth);
    doc.text(lines, centerX, y, { align: "center", maxWidth: contentWidth });
    y += lines.length * spacing + after;
  }

  function drawLabelValue(label: string, value: string, valueColor = "#0f172a") {
    const labelText = `${label}: `;
    const lines = doc.splitTextToSize(value, contentWidth - 96);
    ensureSpace(lines.length * lineHeight + 6);
    doc.setFontSize(bodyFont);
    doc.setTextColor("#475569");
    doc.text(labelText, margins.left, y);
    doc.setTextColor(valueColor);
    doc.text(lines, margins.left + 76, y);
    y += lines.length * lineHeight + 6;
  }

  function drawBullets(items: string[], indent = 14) {
    const safeItems = getSafeArray<string>(items);
    const finalItems = safeItems.length ? safeItems : ["None"];

    finalItems.forEach((item) => {
      const wrapped = doc.splitTextToSize(item, contentWidth - indent - 10);
      ensureSpace(wrapped.length * lineHeight + 4);
      doc.setFontSize(bodyFont);
      doc.setTextColor("#0f172a");
      doc.text("•", margins.left + indent, y);
      doc.text(wrapped, margins.left + indent + 12, y);
      y += wrapped.length * lineHeight + 4;
    });
  }

  function drawSectionTitle(titleText: string, eyebrow?: string) {
    ensureSpace(44);
    if (eyebrow) {
      doc.setFontSize(8);
      doc.setTextColor("#0f172a");
      doc.text(eyebrow.toUpperCase(), centerX, y, { align: "center" });
      y += 10;
    }

    doc.setFontSize(sectionFont);
    doc.setTextColor("#0f172a");
    doc.text(titleText, centerX, y, { align: "center" });
    y += 12;
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.8);
    doc.line(margins.left, y, pageWidth - margins.right, y);
    y += 14;
  }

  function drawPageFrame() {
    const pageNumber = doc.getCurrentPageInfo().pageNumber;
    doc.setFont("CMGeom", "normal");
    doc.setFontSize(9);
    doc.setTextColor("#64748b");
    doc.text("CareerOS", centerX, 28, { align: "center" });
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.6);
    doc.line(margins.left, 34, pageWidth - margins.right, 34);
    doc.line(margins.left, pageHeight - 34, pageWidth - margins.right, pageHeight - 34);
    doc.text(`Page ${pageNumber}`, centerX, pageHeight - 20, { align: "center" });
  }

  drawPageFrame();
  y += 28;

  drawCenteredText(report.title, titleFont, "#0f172a", 22);
  drawCenteredText(`Generated ${new Date(report.exportedAt).toLocaleString()}`, 9, "#64748b", 12);

  report.roadmaps.forEach((roadmap, index) => {
    type RoadmapResource = NonNullable<RoadmapRecord["resource_links"]>[number];
    type RoadmapMilestone = NonNullable<RoadmapRecord["milestones"]>[number];

    if (index > 0) {
      ensureSpace(56);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(1);
      doc.line(margins.left, y, pageWidth - margins.right, y);
      y += 18;
    }

    drawSectionTitle(`Sprint ${String(index + 1).padStart(2, "0")}: ${roadmap.title}`, `Metadata`);
    drawLabelValue("Status", roadmap.status);
    drawLabelValue("Summary", roadmap.summary);
    drawLabelValue("Domain", roadmap.career_domain);
    drawLabelValue("Version", String(roadmap.roadmap_version));
    drawLabelValue("Generated", roadmap.generated_at);
    drawLabelValue("Completion", roadmap.estimated_completion_date);

    drawSectionTitle("Sprint details", "Metadata");
    drawLabelValue("Demand score", `${roadmap.career_demand_score}/100`);
    drawLabelValue("Market outlook", roadmap.market_outlook);
    drawLabelValue("Salary range", roadmap.salary_range);
    drawLabelValue("Automation risk", roadmap.automation_risk);
    drawLabelValue("Weekly hours", String(roadmap.weekly_hours));
    drawLabelValue("Total duration", `${roadmap.total_duration_weeks} week(s)`);
    drawLabelValue("AI reasoning", roadmap.ai_reasoning);

    drawSectionTitle("Resources", "Resources");
    const resourceLines = getSafeArray<RoadmapResource>(roadmap.resource_links).map((resource) => `${resource.label} - ${resource.provider}`);
    drawBullets(resourceLines);

    drawSectionTitle("Milestones", "Milestones");
    getSafeArray<RoadmapMilestone>(roadmap.milestones).forEach((milestone, milestoneIndex) => {
      ensureSpace(64);
      doc.setFontSize(11);
      doc.setTextColor("#0f172a");
      doc.text(`${milestoneIndex + 1}. ${milestone.title}`, margins.left, y);
      y += 14;
      drawLabelValue("Why it matters", milestone.why_it_matters);
      drawLabelValue("Difficulty", milestone.difficulty_level);
      drawLabelValue("Estimated duration", `${milestone.estimated_duration_weeks} week(s)`);
      drawLabelValue("Completion criteria", "");
      drawBullets(milestone.completion_criteria, 24);
      drawLabelValue("Projects", "");
      drawBullets(milestone.projects, 24);
      drawLabelValue("Project tasks", "");
      drawBullets(milestone.project_tasks, 24);
      drawLabelValue("Deliverables", "");
      drawBullets(milestone.deliverables, 24);
      drawLabelValue("Expected outcomes", "");
      drawBullets(milestone.expected_outcomes, 24);
      drawLabelValue("Milestone resources", "");
      drawBullets(getSafeArray<RoadmapResource>(milestone.resource_links).map((resource) => `${resource.label} - ${resource.provider}`), 24);
      y += 8;
    });

    drawSectionTitle("Outcomes", "Outcomes");
    drawBullets(getSafeArray(roadmap.expected_outcomes));
  });

  return doc.output("blob");
}