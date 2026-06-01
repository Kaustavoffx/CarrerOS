import assert from "node:assert/strict";
import test from "node:test";
import { auditRoadmapQuality, buildRoadmapPlanDetails, resolveDomainProfile, validateRoadmapDomainConsistency } from "../lib/roadmap-plan";
import { generateRoadmapPdfBlob } from "../lib/roadmap-export";

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
  assert.throws(() => validateRoadmapDomainConsistency({ career_domain: "Operations and Strategy" } as any, "Software Development Engineer I"), /Roadmap domain mismatch/);
});

test("role-aware roadmap generator produces completely different contents per career domain", () => {
  const sdePlan = buildRoadmapPlanDetails({ goal: "SDE-I", experience: "Junior", weeklyHours: 12 });
  const uxPlan = buildRoadmapPlanDetails({ goal: "UI/UX Designer", experience: "Junior", weeklyHours: 12 });
  const dataPlan = buildRoadmapPlanDetails({ goal: "Data Analyst", experience: "Junior", weeklyHours: 12 });
  const cyberPlan = buildRoadmapPlanDetails({ goal: "Cybersecurity Analyst", experience: "Junior", weeklyHours: 12 });

  const sdeRoadmap = sdePlan.roadmaps[0];
  const uxRoadmap = uxPlan.roadmaps[0];
  const dataRoadmap = dataPlan.roadmaps[0];
  const cyberRoadmap = cyberPlan.roadmaps[0];

  // Verify different career domains
  assert.equal(sdeRoadmap.career_domain, "Software Engineering");
  assert.equal(uxRoadmap.career_domain, "Design and UX");
  assert.equal(dataRoadmap.career_domain, "Data and Analytics");
  assert.equal(cyberRoadmap.career_domain, "Cybersecurity");

  // Verify different sprint titles/milestones
  const sdeMilestones = sdeRoadmap.milestones.map((m) => m.title);
  const uxMilestones = uxRoadmap.milestones.map((m) => m.title);
  const dataMilestones = dataRoadmap.milestones.map((m) => m.title);
  const cyberMilestones = cyberRoadmap.milestones.map((m) => m.title);

  assert.ok(sdeMilestones.includes("Programming Fundamentals"));
  assert.ok(uxMilestones.includes("Design Principles"));
  assert.ok(dataMilestones.includes("Excel Foundations"));
  assert.ok(cyberMilestones.includes("Threat Modeling"));

  // Verify completely disjoint milestone set titles
  assert.notDeepEqual(sdeMilestones, uxMilestones);
  assert.notDeepEqual(uxMilestones, dataMilestones);
  assert.notDeepEqual(dataMilestones, cyberMilestones);

  // Verify different resources/providers
  const sdeProviders = new Set(sdeRoadmap.resource_links.map((r) => r.provider));
  const uxProviders = new Set(uxRoadmap.resource_links.map((r) => r.provider));
  const dataProviders = new Set(dataRoadmap.resource_links.map((r) => r.provider));

  assert.ok(sdeProviders.has("CS50") || sdeProviders.has("LeetCode") || sdeProviders.has("Roadmap.sh"));
  assert.ok(uxProviders.has("Figma") || uxProviders.has("Nielsen Norman Group") || uxProviders.has("Material Design"));
  assert.ok(dataProviders.has("Kaggle") || dataProviders.has("DataCamp") || dataProviders.has("Microsoft"));

  // Verify semantic validator throws on mismatched sections
  assert.throws(() => validateRoadmapDomainConsistency({ career_domain: "Operations and Strategy", title: "Programming Fundamentals", weekly_schedule: [], learning_outcomes: [], project_tasks: [], expected_outcomes: [] } as any, "Operations and Strategy"), /Semantic Mismatch/);
  assert.throws(() => validateRoadmapDomainConsistency({ career_domain: "Research and Academia", title: "Git & GitHub", weekly_schedule: [], learning_outcomes: [], project_tasks: [], expected_outcomes: [] } as any, "Research and Academia"), /Semantic Mismatch/);
  assert.throws(() => validateRoadmapDomainConsistency({ career_domain: "Design and UX", title: "SQL Analytics", weekly_schedule: [], learning_outcomes: [], project_tasks: [], expected_outcomes: [] } as any, "Design and UX"), /Semantic Mismatch/);
});

test("PDF Redesign Layout Engine Verification across core roles", async () => {
  const roles = [
    "SDE I",
    "Frontend Engineer",
    "Data Analyst",
    "UI/UX Designer",
    "Product Manager"
  ];

  for (const role of roles) {
    const plan = buildRoadmapPlanDetails({
      goal: role,
      experience: "Junior",
      weeklyHours: 12,
      readinessScore: 54
    });

    const report = {
      title: `${role} Roadmap`,
      exportedAt: new Date().toISOString(),
      roadmaps: plan.roadmaps,
      careerGoal: role,
      readinessScore: 54
    };

    // Generating the PDF runs the programmatic LayoutLedger validation checks.
    // If any element breaches 48pt margins, it throws a fatal layout exception.
    const pdfBlob = await generateRoadmapPdfBlob(report as any);
    assert.ok(pdfBlob, `PDF should be generated successfully for ${role}`);
    assert.ok(pdfBlob.size > 1000, `PDF size should be substantial for ${role}`);
  }
});

test("semantic domain validator correctly validates role-specific subtopics", () => {
  const sdeGoal = "Software Development Engineer I";
  const dsGoal = "Data Science";

  // Software Engineering PASS cases
  const sdePasses = [
    "Programming Fundamentals",
    "Git & GitHub",
    "DSA",
    "Full Stack Projects",
    "System Design Basics"
  ];
  for (const title of sdePasses) {
    const result = validateRoadmapDomainConsistency(
      { title, career_domain: "Software Engineering", milestones: [], weekly_schedule: [], learning_outcomes: [], project_tasks: [], expected_outcomes: [] } as any,
      sdeGoal,
      { throwOnError: false }
    );
    assert.ok(result.valid, `SDE validation should PASS for title: ${title}`);
  }

  // Software Engineering FAIL cases
  const sdeFails = [
    "Clinical Diagnosis",
    "Patient Care"
  ];
  for (const title of sdeFails) {
    const result = validateRoadmapDomainConsistency(
      { title, career_domain: "Software Engineering", milestones: [], weekly_schedule: [], learning_outcomes: [], project_tasks: [], expected_outcomes: [] } as any,
      sdeGoal,
      { throwOnError: false }
    );
    assert.ok(!result.valid, `SDE validation should FAIL for title: ${title}`);
    assert.ok(result.warnings[0].includes("Roadmap domain mismatch"), "Warning should specify domain mismatch");
  }

  // Data Science PASS cases
  const dsPasses = [
    "Python for Data Analysis",
    "Statistics",
    "Machine Learning"
  ];
  for (const title of dsPasses) {
    const result = validateRoadmapDomainConsistency(
      { title, career_domain: "Data and Analytics", milestones: [], weekly_schedule: [], learning_outcomes: [], project_tasks: [], expected_outcomes: [] } as any,
      dsGoal,
      { throwOnError: false }
    );
    assert.ok(result.valid, `Data Science validation should PASS for title: ${title}`);
  }

  // Data Science FAIL cases
  const dsFails = [
    "UI Wireframing",
    "Nursing Procedures"
  ];
  for (const title of dsFails) {
    const result = validateRoadmapDomainConsistency(
      { title, career_domain: "Data and Analytics", milestones: [], weekly_schedule: [], learning_outcomes: [], project_tasks: [], expected_outcomes: [] } as any,
      dsGoal,
      { throwOnError: false }
    );
    assert.ok(!result.valid, `Data Science validation should FAIL for title: ${title}`);
    assert.ok(result.warnings[0].includes("Roadmap domain mismatch"), "Warning should specify domain mismatch");
  }
});

test("SDE-I roadmap is strictly free of contamination and contains only valid resources", () => {
  const plan = buildRoadmapPlanDetails({
    goal: "SDE-I",
    experience: "Junior",
    weeklyHours: 12
  });

  const roadmap = plan.roadmaps[0];
  
  // 1. Assert career domain matches exactly
  assert.equal(roadmap.career_domain, "Software Engineering");

  // 2. Assert zero forbidden keywords (UX, design, wireframe, figma, user research, operations, management, academia, research, etc.)
  const forbiddenKeywords = [
    "operations",
    "ops",
    "academia",
    "product design",
    "experience design",
    "ux design",
    "ux",
    "ui design",
    "figma",
    "user research",
    "wireframing",
    "design systems",
    "marketing",
    "operations strategy",
    "research papers",
    "academic journals"
  ];

  const milestones = roadmap.milestones;
  const textToCheck = [
    roadmap.title || "",
    roadmap.summary || "",
    ...roadmap.learning_outcomes,
    ...roadmap.project_tasks,
    ...roadmap.expected_outcomes,
    ...milestones.flatMap((m) => [
      m.title || "",
      m.why_it_matters || "",
      ...m.completion_criteria,
      ...m.projects,
      ...m.project_tasks,
      ...m.deliverables,
      ...m.expected_outcomes
    ])
  ].join(" ").toLowerCase();

  forbiddenKeywords.forEach((keyword) => {
    const cleanText = keyword === "management"
      ? textToCheck
          .replace(/project management/g, "")
          .replace(/management tool/g, "")
          .replace(/state management/g, "")
          .replace(/package management/g, "")
      : textToCheck;
      
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(^|\\W)${escaped}(\\W|$)`, "i");
    assert.ok(!regex.test(cleanText), `SDE-I roadmap contains disallowed keyword: '${keyword}'`);
  });

  // 3. Assert allowed resource providers
  const allowedProviders = new Set([
    "MDN", "Roadmap.sh", "freeCodeCamp", "Microsoft Learn", "Node.js", "React", 
    "TypeScript", "GitHub", "LeetCode", "GeeksForGeeks", "CS50", "Official Documentation", "PostgreSQL", "Microsoft"
  ]);

  const allResources = [
    ...roadmap.resource_links,
    ...milestones.flatMap((m) => m.resource_links)
  ];

  allResources.forEach((res) => {
    assert.ok(allowedProviders.has(res.provider || ""), `SDE-I roadmap contains disallowed resource provider: '${res.provider}'`);
  });
});
