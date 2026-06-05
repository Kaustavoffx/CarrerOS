import assert from "node:assert/strict";
import test from "node:test";
import { normalizeDifficulty, normalizeRawPayloadDifficulty } from "../lib/app-data";
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
