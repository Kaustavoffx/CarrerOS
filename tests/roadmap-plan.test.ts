import assert from "node:assert/strict";
import test from "node:test";
import { auditRoadmapQuality, buildRoadmapPlanDetails, resolveDomainProfile, validateRoadmapDomainConsistency } from "../lib/roadmap-plan";

const domainCases = [
  {
    goal: "Software Development Engineer I",
    expectedDomain: "Software Engineering",
    allowedProviders: ["CS50", "freeCodeCamp", "Roadmap.sh", "MDN", "React", "TypeScript", "GitHub", "LeetCode", "GeeksForGeeks", "Official Documentation", "Node.js", "PostgreSQL", "Microsoft"],
    requiredPhaseTitles: [
      "Programming Fundamentals",
      "Data Structures & Algorithms",
      "Git & GitHub",
      "HTML/CSS/JavaScript",
      "React & APIs",
      "Backend Development",
      "Databases & SQL",
      "Projects & Portfolio",
      "System Design Basics",
      "Interview Preparation"
    ]
  },
  {
    goal: "Data Science",
    expectedDomain: "AI and Machine Learning"
  },
  {
    goal: "Cybersecurity Analyst",
    expectedDomain: "Cybersecurity"
  },
  {
    goal: "UI/UX Designer",
    expectedDomain: "Design and UX"
  },
  {
    goal: "Product Manager",
    expectedDomain: "Product Management"
  },
  {
    goal: "Digital Marketing Specialist",
    expectedDomain: "Marketing and Growth"
  }
] as const;

function getAllowedProviders(goal: string) {
  const profile = resolveDomainProfile(goal);
  return new Set(profile.resources.map((resource) => resource.provider));
}

test("roadmap planner stays aligned to the selected career goal across core domains", () => {
  for (const scenario of domainCases) {
    const plan = buildRoadmapPlanDetails({
      goal: scenario.goal,
      experience: "Junior",
      weeklyHours: 12,
      readinessScore: 58
    });

    assert.equal(plan.career_domain, scenario.expectedDomain);
    assert.ok(plan.roadmaps.length > 0, `${scenario.goal} should generate at least one roadmap`);

    for (const roadmap of plan.roadmaps) {
      validateRoadmapDomainConsistency(roadmap, scenario.goal);
      assert.equal(roadmap.career_domain, scenario.expectedDomain);
    }

    const audit = auditRoadmapQuality(plan.roadmaps, scenario.goal);
    assert.ok(audit.qualityScore >= 85, `${scenario.goal} quality score too low: ${audit.qualityScore}`);

    const allowedProviders = scenario.goal === "Software Development Engineer I"
      ? new Set([...getAllowedProviders(scenario.goal), "CS50", "freeCodeCamp", "LeetCode", "GeeksForGeeks", "Official Documentation"])
      : getAllowedProviders(scenario.goal);

    for (const roadmap of plan.roadmaps) {
      for (const resource of roadmap.resource_links) {
        assert.ok(allowedProviders.has(resource.provider), `${scenario.goal} used disallowed provider ${resource.provider}`);
      }
    }
  }
});

test("Software Engineering roadmap uses the required SDE-I phases only", () => {
  const plan = buildRoadmapPlanDetails({
    goal: "Software Development Engineer I",
    experience: "Junior",
    weeklyHours: 12,
    readinessScore: 54
  });

  assert.equal(plan.career_domain, "Software Engineering");
  assert.equal(plan.roadmaps.length, 1);

  const roadmap = plan.roadmaps[0];
  const milestoneTitles = roadmap.milestones.map((milestone) => milestone.title);

  assert.deepEqual(milestoneTitles, [
    "Programming Fundamentals",
    "Data Structures & Algorithms",
    "Git & GitHub",
    "HTML/CSS/JavaScript",
    "React & APIs",
    "Backend Development",
    "Databases & SQL",
    "Projects & Portfolio",
    "System Design Basics",
    "Interview Preparation"
  ]);

  const audit = auditRoadmapQuality(plan.roadmaps, "Software Development Engineer I");
  assert.ok(audit.qualityScore >= 85, `SDE-I quality score too low: ${audit.qualityScore}`);

  const allResources = roadmap.resource_links.map((resource) => resource.provider);
  assert.ok(allResources.every((provider) => ["CS50", "freeCodeCamp", "Roadmap.sh", "MDN", "GitHub", "LeetCode", "GeeksForGeeks", "Official Documentation", "Node.js", "PostgreSQL", "React", "TypeScript", "Microsoft"].includes(provider)));
});

test("domain consistency validator rejects cross-domain roadmap rows", () => {
  assert.throws(() => validateRoadmapDomainConsistency({ career_domain: "Operations and Strategy" }, "Software Development Engineer I"), /Roadmap domain mismatch/);
});
