import { jsPDF } from "jspdf";
import type { RoadmapMilestoneRecord, RoadmapRecord, RoadmapResourceLink } from "./supabase/types";

export type RoadmapExportBundle = {
  json: string;
  markdown: string;
  pdf: {
    filename: string;
    html: string;
  };
};

function safeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatResourceLinks(roadmap: RoadmapRecord) {
  return safeArray<RoadmapResourceLink>(roadmap.resource_links)
    .map((resource) => `- [${resource.label}](${resource.url}) - ${resource.provider}`)
    .join("\n");
}

function formatList(items: string[]) {
  const safeItems = safeArray<string>(items);
  return safeItems.length ? safeItems.map((item) => `- ${item}`).join("\n") : "- None";
}

function formatMilestonesMarkdown(roadmap: RoadmapRecord) {
  return safeArray<RoadmapMilestoneRecord>(roadmap.milestones)
    .map((milestone) => {
      const resources = safeArray<RoadmapResourceLink>(milestone.resource_links).map((resource) => `  - [${resource.label}](${resource.url}) - ${resource.provider}`).join("\n");
      const projects = safeArray<string>(milestone.projects).map((project) => `  - ${project}`).join("\n");
      const tasks = safeArray<string>(milestone.project_tasks).map((task) => `  - ${task}`).join("\n");
      const outcomes = safeArray<string>(milestone.expected_outcomes).map((outcome) => `  - ${outcome}`).join("\n");
      const criteria = safeArray<string>(milestone.completion_criteria).map((item) => `  - ${item}`).join("\n");

      return [
        `### ${milestone.title}`,
        `Why it matters: ${milestone.why_it_matters}`,
        `Estimated duration: ${milestone.estimated_duration_weeks} week(s)`,
        `Difficulty: ${milestone.difficulty_level}`,
        `Completion criteria:\n${criteria}`,
        `Resources:\n${resources}`,
        `Projects:\n${projects}`,
        `Project tasks:\n${tasks}`,
        `Deliverables:\n${safeArray<string>(milestone.deliverables).map((item) => `  - ${item}`).join("\n")}`,
        `Expected outcomes:\n${outcomes}`
      ].join("\n\n");
    })
    .join("\n\n");
}

function formatRoadmapText(roadmap: RoadmapRecord) {
  return [
    `Title: ${roadmap.title}`,
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
    `Weekly structure: ${safeArray<string>(roadmap.weekly_schedule).join(", ") || "None"}`,
    `Learning outcomes: ${safeArray<string>(roadmap.learning_outcomes).join(", ") || "None"}`,
    `Resources:`,
    ...safeArray<RoadmapResourceLink>(roadmap.resource_links).map((resource) => `- ${resource.label} (${resource.provider}): ${resource.url}`),
    `Milestones:`,
    ...safeArray<RoadmapMilestoneRecord>(roadmap.milestones).flatMap((milestone) => [
      `- ${milestone.title}`,
      `  Why it matters: ${milestone.why_it_matters}`,
      `  Duration: ${milestone.estimated_duration_weeks} week(s)`,
      `  Difficulty: ${milestone.difficulty_level}`,
      `  Completion criteria: ${safeArray<string>(milestone.completion_criteria).join("; ") || "None"}`,
      `  Projects: ${safeArray<string>(milestone.projects).join("; ") || "None"}`,
      `  Project tasks: ${safeArray<string>(milestone.project_tasks).join("; ") || "None"}`,
      `  Deliverables: ${safeArray<string>(milestone.deliverables).join("; ") || "None"}`,
      `  Expected outcomes: ${safeArray<string>(milestone.expected_outcomes).join("; ") || "None"}`
    ])
  ];
}

export function downloadRoadmapPdf(roadmaps: RoadmapRecord[], title = "CareerOS Roadmap") {
  const safeRoadmaps = safeArray<RoadmapRecord>(roadmaps);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  let cursorY = margin;

  function ensureSpace(requiredHeight: number) {
    if (cursorY + requiredHeight > pageHeight - margin) {
      doc.addPage();
      cursorY = margin;
    }
  }

  function addTextBlock(text: string, fontSize = 11, spacingAfter = 10) {
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, contentWidth) as string[];
    ensureSpace(lines.length * (fontSize + 2) + spacingAfter);
    doc.text(lines, margin, cursorY);
    cursorY += lines.length * (fontSize + 2) + spacingAfter;
  }

  doc.setFontSize(20);
  doc.text(title, margin, cursorY);
  cursorY += 26;
  addTextBlock(`Exported at: ${new Date().toISOString()}`, 10, 18);

  safeRoadmaps.forEach((roadmap, index) => {
    if (index > 0) {
      doc.addPage();
      cursorY = margin;
    }

    doc.setFontSize(16);
    doc.text(roadmap.title, margin, cursorY);
    cursorY += 22;

    formatRoadmapText(roadmap).forEach((line) => {
      addTextBlock(line, line.startsWith("- ") ? 10 : 11, line === "Milestones:" || line === "Resources:" ? 12 : 8);
    });
  });

  const filename = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "careeros-roadmap"}.pdf`;
  doc.save(filename);
}

export function buildRoadmapExportBundle(roadmaps: RoadmapRecord[], title = "CareerOS Roadmap"): RoadmapExportBundle {
  const safeRoadmaps = safeArray<RoadmapRecord>(roadmaps);
  const json = JSON.stringify(
    {
      title,
      exported_at: new Date().toISOString(),
      roadmaps: safeRoadmaps
    },
    null,
    2
  );

  const markdown = [
    `# ${title}`,
    ``,
    `Exported at: ${new Date().toISOString()}`,
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
      ...safeArray<string>(roadmap.expected_outcomes).map((outcome) => `- ${outcome}`),
      ``
    ])
  ].join("\n");

  const pdfHtml = `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      body { font-family: Inter, Arial, sans-serif; margin: 32px; color: #0f172a; }
      h1, h2, h3 { margin: 0 0 12px; }
      h1 { font-size: 28px; }
      h2 { font-size: 22px; margin-top: 28px; }
      h3 { font-size: 18px; margin-top: 20px; }
      p, li { line-height: 1.6; }
      .card { border: 1px solid #cbd5e1; border-radius: 16px; padding: 18px; margin-bottom: 18px; }
      .meta { color: #475569; font-size: 14px; }
      ul { margin: 8px 0 16px 20px; }
      a { color: #0369a1; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(title)}</h1>
    <p class="meta">Exported at ${escapeHtml(new Date().toISOString())}</p>
    ${safeRoadmaps
      .map(
        (roadmap) => `
          <div class="card">
            <h2>${escapeHtml(roadmap.title)}</h2>
            <p><strong>Status:</strong> ${escapeHtml(roadmap.status)}</p>
            <p><strong>Summary:</strong> ${escapeHtml(roadmap.summary)}</p>
            <p><strong>Domain:</strong> ${escapeHtml(roadmap.career_domain)}</p>
            <p><strong>Demand score:</strong> ${roadmap.career_demand_score}/100</p>
            <p><strong>Market outlook:</strong> ${escapeHtml(roadmap.market_outlook)}</p>
            <p><strong>Salary range:</strong> ${escapeHtml(roadmap.salary_range)}</p>
            <p><strong>Automation risk:</strong> ${escapeHtml(roadmap.automation_risk)}</p>
            <p><strong>Version:</strong> ${roadmap.roadmap_version}</p>
            <p><strong>AI reasoning:</strong> ${escapeHtml(roadmap.ai_reasoning)}</p>
            <p><strong>Total duration:</strong> ${roadmap.total_duration_weeks} week(s)</p>
            <p><strong>Weekly hours:</strong> ${roadmap.weekly_hours}</p>
            <p><strong>Estimated completion:</strong> ${escapeHtml(roadmap.estimated_completion_date)}</p>
            <p><strong>Weekly structure:</strong> ${escapeHtml(safeArray<string>(roadmap.weekly_schedule).join(", "))}</p>
            <p><strong>Learning outcomes:</strong> ${escapeHtml(safeArray<string>(roadmap.learning_outcomes).join(", "))}</p>
            <h3>Resources</h3>
            <ul>${safeArray<RoadmapResourceLink>(roadmap.resource_links)
              .map((resource) => `<li><a href="${escapeHtml(resource.url)}" target="_blank" rel="noreferrer">${escapeHtml(resource.label)}</a> - ${escapeHtml(resource.provider)}</li>`)
              .join("")}</ul>
            <h3>Milestones</h3>
            ${safeArray<RoadmapMilestoneRecord>(roadmap.milestones)
              .map(
                (milestone) => `
                  <div class="card">
                    <h3>${escapeHtml(milestone.title)}</h3>
                    <p><strong>Why it matters:</strong> ${escapeHtml(milestone.why_it_matters)}</p>
                    <p><strong>Estimated duration:</strong> ${milestone.estimated_duration_weeks} week(s)</p>
                    <p><strong>Difficulty:</strong> ${escapeHtml(milestone.difficulty_level)}</p>
                    <p><strong>Completion criteria:</strong></p>
                    <ul>${safeArray<string>(milestone.completion_criteria).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
                    <p><strong>Projects:</strong> ${escapeHtml(safeArray<string>(milestone.projects).join(", "))}</p>
                    <p><strong>Project tasks:</strong> ${escapeHtml(safeArray<string>(milestone.project_tasks).join(", "))}</p>
                    <p><strong>Deliverables:</strong> ${escapeHtml(safeArray<string>(milestone.deliverables).join(", "))}</p>
                    <p><strong>Expected outcomes:</strong> ${escapeHtml(safeArray<string>(milestone.expected_outcomes).join(", "))}</p>
                  </div>
                `
              )
              .join("")}
          </div>
        `
      )
      .join("")}
  </body>
</html>`;

  return {
    json,
    markdown,
    pdf: {
      filename: `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "careeros-roadmap"}.html`,
      html: pdfHtml
    }
  };
}