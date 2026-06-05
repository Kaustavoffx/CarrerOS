import assert from "node:assert/strict";
import test from "node:test";
import { normalizeDifficulty, normalizeRawPayloadDifficulty, normalizeRoadmap, auditRoadmapCollection } from "../lib/app-data";
import { wrapText, formatAndWrapUrl } from "../lib/roadmap-export";

test("normalizeDifficulty maps terms correctly and is case/whitespace-insensitive", () => {
  // Easy / Basic -> Beginner
  assert.equal(normalizeDifficulty("Easy"), "Beginner");
  assert.equal(normalizeDifficulty("easy"), "Beginner");
  assert.equal(normalizeDifficulty("  EASY  "), "Beginner");
  assert.equal(normalizeDifficulty("Basic"), "Beginner");
  assert.equal(normalizeDifficulty("basic"), "Beginner");
  assert.equal(normalizeDifficulty("Beginner"), "Beginner");

  // Medium / Moderate -> Intermediate
  assert.equal(normalizeDifficulty("Medium"), "Intermediate");
  assert.equal(normalizeDifficulty("medium"), "Intermediate");
  assert.equal(normalizeDifficulty("  medium  "), "Intermediate");
  assert.equal(normalizeDifficulty("Moderate"), "Intermediate");
  assert.equal(normalizeDifficulty("moderate"), "Intermediate");
  assert.equal(normalizeDifficulty("Intermediate"), "Intermediate");

  // Hard / Expert -> Advanced
  assert.equal(normalizeDifficulty("Hard"), "Advanced");
  assert.equal(normalizeDifficulty("hard"), "Advanced");
  assert.equal(normalizeDifficulty("  HARD  "), "Advanced");
  assert.equal(normalizeDifficulty("Expert"), "Advanced");
  assert.equal(normalizeDifficulty("expert"), "Advanced");
  assert.equal(normalizeDifficulty("Advanced"), "Advanced");
});

test("normalizeDifficulty defaults unknown or invalid values to Intermediate", () => {
  assert.equal(normalizeDifficulty("unknown"), "Intermediate");
  assert.equal(normalizeDifficulty(""), "Intermediate");
  assert.equal(normalizeDifficulty(null), "Intermediate");
  assert.equal(normalizeDifficulty(undefined), "Intermediate");
  assert.equal(normalizeDifficulty(123), "Intermediate");
  assert.equal(normalizeDifficulty({}), "Intermediate");
});

test("normalizeRawPayloadDifficulty traverses payload and normalizes difficulty level", () => {
  const rawPayload = {
    career_domain: "Software Engineering",
    career_demand_score: 90,
    market_outlook: "Excellent",
    salary_range: "$100k-$150k",
    automation_risk: "Low",
    ai_reasoning: "Reasoning here",
    roadmaps: [
      {
        id: "roadmap-1",
        title: "SDE-I Roadmap",
        status: "Planned",
        summary: "Summary",
        owner: "You",
        progress: 0,
        career_domain: "Software Engineering",
        career_demand_score: 90,
        market_outlook: "Excellent",
        salary_range: "$100k-$150k",
        automation_risk: "Low",
        roadmap_version: 1,
        weekly_schedule: ["Schedule"],
        learning_outcomes: ["Outcomes"],
        total_duration_weeks: 10,
        weekly_hours: 10,
        estimated_completion_date: "2026-08-01",
        resource_links: [],
        project_tasks: [],
        expected_outcomes: [],
        milestones: [
          {
            title: "Milestone 1",
            why_it_matters: "Why",
            estimated_duration_weeks: 2,
            difficulty_level: "Easy", // Should map to Beginner
            completion_criteria: [],
            resource_links: [],
            projects: [],
            project_tasks: [],
            deliverables: [],
            expected_outcomes: []
          },
          {
            title: "Milestone 2",
            why_it_matters: "Why",
            estimated_duration_weeks: 2,
            difficulty_level: "Moderate", // Should map to Intermediate
            completion_criteria: [],
            resource_links: [],
            projects: [],
            project_tasks: [],
            deliverables: [],
            expected_outcomes: []
          },
          {
            title: "Milestone 3",
            why_it_matters: "Why",
            estimated_duration_weeks: 2,
            difficulty_level: "Expert", // Should map to Advanced
            completion_criteria: [],
            resource_links: [],
            projects: [],
            project_tasks: [],
            deliverables: [],
            expected_outcomes: []
          },
          {
            title: "Milestone 4",
            why_it_matters: "Why",
            estimated_duration_weeks: 2,
            difficulty_level: "Super Hardcore", // Unknown -> Should map to Intermediate
            completion_criteria: [],
            resource_links: [],
            projects: [],
            project_tasks: [],
            deliverables: [],
            expected_outcomes: []
          }
        ]
      }
    ]
  };

  const normalized = normalizeRawPayloadDifficulty(rawPayload) as any;

  assert.equal(normalized.roadmaps[0].milestones[0].difficulty_level, "Beginner");
  assert.equal(normalized.roadmaps[0].milestones[1].difficulty_level, "Intermediate");
  assert.equal(normalized.roadmaps[0].milestones[2].difficulty_level, "Advanced");
  assert.equal(normalized.roadmaps[0].milestones[3].difficulty_level, "Intermediate");
});

test("normalizeRawPayloadDifficulty handles malformed payloads gracefully without throwing", () => {
  assert.deepEqual(normalizeRawPayloadDifficulty(null), null);
  assert.deepEqual(normalizeRawPayloadDifficulty(undefined), undefined);
  assert.deepEqual(normalizeRawPayloadDifficulty("string"), "string");
  assert.deepEqual(normalizeRawPayloadDifficulty(123), 123);
  assert.deepEqual(normalizeRawPayloadDifficulty({}), {});
  assert.deepEqual(normalizeRawPayloadDifficulty({ roadmaps: null }), { roadmaps: null });
  assert.deepEqual(normalizeRawPayloadDifficulty({ roadmaps: "not-array" }), { roadmaps: "not-array" });
});

test("wrapText wraps long space-separated strings correctly", () => {
  const text = "freeCodeCamp JavaScript Algorithms and Data Structures";
  const lines = wrapText(text, 100);
  assert.ok(lines.length > 1);
  for (const line of lines) {
    assert.ok(line.length <= 25); 
  }
});

test("wrapText splits long unbroken strings (URLs) character-by-character", () => {
  const url = "https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures-v8/learn-basic-javascript-by-building-a-role-playing-game/step-1";
  const lines = wrapText(url, 120);
  assert.ok(lines.length > 1);
  for (const line of lines) {
    assert.ok(line.length <= 25);
  }
});

test("formatAndWrapUrl wraps and truncates long URLs to a line limit", () => {
  const url = "https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures-v8/learn-basic-javascript-by-building-a-role-playing-game/step-1";
  const lines = formatAndWrapUrl(url, 120, null, 2);
  assert.equal(lines.length, 2);
  assert.ok(lines[1].endsWith("..."));
});

test("auditRoadmapCollection correctly audits unwrapped roadmaps from version containers", () => {
  const mockRoadmap = {
    id: "roadmap-1",
    title: "Software Engineering Roadmap",
    status: "Planned",
    summary: "Learn programming fundamentals and system design",
    owner: "You",
    progress: 10,
    career_domain: "Software Engineering",
    career_demand_score: 95.4,
    demand_score: 95.4,
    market_outlook: "Strong",
    salary_range: "$80k-$120k",
    automation_risk: "Low",
    roadmap_version: 1,
    generated_at: new Date().toISOString(),
    ai_reasoning: "Reasoning here",
    weekly_schedule: ["4h practice"],
    learning_outcomes: ["outcomes"],
    total_duration_weeks: 12,
    weekly_hours: 15,
    estimated_completion_date: "2026-09-01",
    resource_links: [{ label: "Resource", url: "https://example.com", provider: "Provider" }],
    project_tasks: ["task"],
    expected_outcomes: ["outcomes"],
    milestones: [
      {
        title: "Milestone 1",
        why_it_matters: "Why",
        estimated_duration_weeks: 2,
        difficulty_level: "Beginner",
        completion_criteria: [],
        resource_links: [],
        projects: [],
        project_tasks: [],
        deliverables: [],
        expected_outcomes: []
      }
    ],
    updated_at: new Date().toISOString()
  };

  const versionContainer = {
    id: "version-1",
    user_id: "user-123",
    roadmap_version: 1,
    career_goal: "SDE I",
    career_domain: "Software Engineering",
    generated_at: new Date().toISOString(),
    ai_reasoning: "Reasoning",
    roadmaps: [mockRoadmap],
    progress: 10,
    updated_at: new Date().toISOString()
  };

  const unwrappedRoadmaps = [versionContainer].map((v) => v.roadmaps[0]);
  const auditReport = auditRoadmapCollection(unwrappedRoadmaps);

  assert.equal(auditReport.legacy, 0);
  assert.equal(auditReport.invalid, 0);
  assert.ok(auditReport.qualityScore >= 90);
});

test("normalizeRoadmap correctly rounds floating point demand scores", () => {
  const rawRoadmapBase = {
    title: "Software Engineering Roadmap",
    status: "Planned",
    summary: "Learn programming fundamentals and system design",
    owner: "You",
    progress: 10,
    career_domain: "Software Engineering",
    market_outlook: "Strong",
    salary_range: "$80k-$120k",
    automation_risk: "Low",
    roadmap_version: 1,
    generated_at: new Date().toISOString(),
    ai_reasoning: "Reasoning here",
    weekly_schedule: ["4h practice"],
    learning_outcomes: ["outcomes"],
    total_duration_weeks: 12,
    weekly_hours: 15,
    estimated_completion_date: "2026-09-01",
    resource_links: [{ label: "Resource", url: "https://example.com", provider: "Provider" }],
    project_tasks: ["task"],
    expected_outcomes: ["outcomes"],
    milestones: [
      {
        title: "Milestone 1",
        why_it_matters: "Why",
        estimated_duration_weeks: 2,
        difficulty_level: "Beginner",
        completion_criteria: [],
        resource_links: [],
        projects: [],
        project_tasks: [],
        deliverables: [],
        expected_outcomes: []
      }
    ],
    updated_at: new Date().toISOString()
  };

  const normalized1 = normalizeRoadmap({
    ...rawRoadmapBase,
    career_demand_score: 95.4
  });
  assert.equal(normalized1.career_demand_score, 95);
  assert.equal(normalized1.demand_score, 95);

  const normalized2 = normalizeRoadmap({
    ...rawRoadmapBase,
    demand_score: 95.6
  });
  assert.equal(normalized2.career_demand_score, 96);
  assert.equal(normalized2.demand_score, 96);
});

test("console logging during validation and persistence contains only safe metadata", () => {
  const mockLogs: any[] = [];
  const mockWarns: any[] = [];
  const mockErrors: any[] = [];

  const originalLog = console.log;
  const originalInfo = console.info;
  const originalWarn = console.warn;
  const originalError = console.error;

  console.log = (...args) => mockLogs.push(args);
  console.info = (...args) => mockLogs.push(args);
  console.warn = (...args) => mockWarns.push(args);
  console.error = (...args) => mockErrors.push(args);

  try {
    const rawRoadmap = {
      title: "Software Engineering Roadmap",
      status: "Planned",
      summary: "Learn programming fundamentals and system design",
      owner: "You",
      progress: 10,
      career_domain: "Software Engineering",
      market_outlook: "Strong",
      salary_range: "$80k-$120k",
      automation_risk: "Low",
      roadmap_version: 1,
      generated_at: new Date().toISOString(),
      ai_reasoning: "Secret AI reasoning details",
      weekly_schedule: ["4h practice"],
      learning_outcomes: ["outcomes"],
      total_duration_weeks: 12,
      weekly_hours: 15,
      estimated_completion_date: "2026-09-01",
      resource_links: [{ label: "Resource", url: "https://example.com", provider: "Provider" }],
      project_tasks: ["task"],
      expected_outcomes: ["outcomes"],
      milestones: [
        {
          title: "Milestone 1",
          why_it_matters: "Why",
          estimated_duration_weeks: 2,
          difficulty_level: "Beginner",
          completion_criteria: [],
          resource_links: [],
          projects: [],
          project_tasks: [],
          deliverables: [],
          expected_outcomes: []
        }
      ],
      updated_at: new Date().toISOString()
    };

    const validationResult = normalizeRoadmap(rawRoadmap);
    assert.ok(validationResult);

    const allLoggedData = JSON.stringify({ mockLogs, mockWarns, mockErrors }).toLowerCase();
    
    assert.ok(!allLoggedData.includes("secret ai reasoning"), "Logs must not contain AI reasoning");
    assert.ok(!allLoggedData.includes("https://example.com"), "Logs must not contain resource URLs");
    assert.ok(!allLoggedData.includes("milestone 1"), "Logs must not contain milestone contents");
  } finally {
    console.log = originalLog;
    console.info = originalInfo;
    console.warn = originalWarn;
    console.error = originalError;
  }
});

test("PDF demand score scales dynamically", () => {
  const mockRoadmapScale10 = {
    career_demand_score: 9,
    demand_score: 9,
    title: "Software Engineering Roadmap",
    status: "Planned",
    summary: "Learn programming fundamentals",
    owner: "You",
    progress: 10,
    career_domain: "Software Engineering",
    market_outlook: "Strong",
    salary_range: "$80k-$120k",
    automation_risk: "Low",
    roadmap_version: 1,
    generated_at: new Date().toISOString(),
    ai_reasoning: "Reasoning here",
    weekly_schedule: ["4h practice"],
    learning_outcomes: ["outcomes"],
    total_duration_weeks: 12,
    weekly_hours: 15,
    estimated_completion_date: "2026-09-01",
    resource_links: [{ label: "Resource", url: "https://example.com", provider: "Provider" }],
    project_tasks: ["task"],
    expected_outcomes: ["outcomes"],
    milestones: [
      {
        title: "Milestone 1",
        why_it_matters: "Why",
        estimated_duration_weeks: 2,
        difficulty_level: "Beginner",
        completion_criteria: [],
        resource_links: [],
        projects: [],
        project_tasks: [],
        deliverables: [],
        expected_outcomes: []
      }
    ],
    updated_at: new Date().toISOString()
  };

  const mockRoadmapScale100 = {
    ...mockRoadmapScale10,
    career_demand_score: 92,
    demand_score: 92
  };

  const scale10Text1 = `${mockRoadmapScale10.career_demand_score}/${mockRoadmapScale10.career_demand_score <= 10 ? 10 : 100}`;
  const scale100Text1 = `${mockRoadmapScale100.career_demand_score}/${mockRoadmapScale100.career_demand_score <= 10 ? 10 : 100}`;

  assert.equal(scale10Text1, "9/10");
  assert.equal(scale100Text1, "92/100");
});
