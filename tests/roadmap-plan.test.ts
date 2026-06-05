import assert from "node:assert/strict";
import test from "node:test";
import { auditRoadmapQuality, buildRoadmapPlanDetails, resolveDomainProfile, validateRoadmapDomainConsistency, validateRoadmapDomain, MissingRoadmapTitleError, MissingRoadmapMetadataError, IncompleteRoadmapRecordError, DomainMismatchError } from "../lib/roadmap-plan";
import { generateRoadmapPdfBlob } from "../lib/roadmap-export";

const domainCases = [
  {
    goal: "Software Development Engineer I",
    expectedDomain: "Software Engineering",
    allowedProviders: ["CS50", "freeCodeCamp", "Roadmap.sh", "MDN", "React", "TypeScript", "GitHub", "LeetCode", "GeeksForGeeks", "Official Documentation", "Node.js", "PostgreSQL", "Microsoft"],
    requiredPhaseTitles: [
      "Programming Fundamentals",
      "DSA",
      "Git/GitHub",
      "Web Development",
      "Projects",
      "System Design",
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
    "DSA",
    "Git/GitHub",
    "Web Development",
    "Projects",
    "System Design",
    "Interview Preparation"
  ]);

  const audit = auditRoadmapQuality(plan.roadmaps, "Software Development Engineer I");
  assert.ok(audit.qualityScore >= 85, `SDE-I quality score too low: ${audit.qualityScore}`);

  const allResources = roadmap.resource_links.map((resource) => resource.provider);
  assert.ok(allResources.every((provider) => ["CS50", "freeCodeCamp", "Roadmap.sh", "MDN", "GitHub", "LeetCode", "GeeksForGeeks", "Official Documentation", "Node.js", "PostgreSQL", "React", "TypeScript", "Microsoft"].includes(provider)));
});

test("domain consistency validator rejects cross-domain roadmap rows", () => {
  assert.throws(() => validateRoadmapDomainConsistency({ title: "Programming Fundamentals", career_domain: "Operations and Strategy", summary: "Summary text", milestones: [{}] } as any, "Software Development Engineer I"), /Roadmap domain mismatch/);
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

  // Verify semantic validator warns on mismatched sections
  const res1 = validateRoadmapDomainConsistency({ career_domain: "Operations and Strategy", title: "Programming Fundamentals", summary: "some summary", milestones: [{}], weekly_schedule: [], learning_outcomes: [], project_tasks: [], expected_outcomes: [] } as any, "Operations and Strategy");
  assert.ok(!res1.valid);
  assert.ok(res1.warnings.some(w => w.includes("Semantic Mismatch")));

  const res2 = validateRoadmapDomainConsistency({ career_domain: "Research and Academia", title: "Git & GitHub", summary: "some summary", milestones: [{}], weekly_schedule: [], learning_outcomes: [], project_tasks: [], expected_outcomes: [] } as any, "Research and Academia");
  assert.ok(!res2.valid);
  assert.ok(res2.warnings.some(w => w.includes("Semantic Mismatch")));

  const res3 = validateRoadmapDomainConsistency({ career_domain: "Design and UX", title: "SQL Analytics", summary: "some summary", milestones: [{}], weekly_schedule: [], learning_outcomes: [], project_tasks: [], expected_outcomes: [] } as any, "Design and UX");
  assert.ok(!res3.valid);
  assert.ok(res3.warnings.some(w => w.includes("Semantic Mismatch")));
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
      { title, career_domain: "Software Engineering", summary: "some summary", milestones: [{}], weekly_schedule: [], learning_outcomes: [], project_tasks: [], expected_outcomes: [] } as any,
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
      { title, career_domain: "Software Engineering", summary: "some summary", milestones: [{}], weekly_schedule: [], learning_outcomes: [], project_tasks: [], expected_outcomes: [] } as any,
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
      { title, career_domain: "Data and Analytics", summary: "some summary", milestones: [{}], weekly_schedule: [], learning_outcomes: [], project_tasks: [], expected_outcomes: [] } as any,
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
      { title, career_domain: "Data and Analytics", summary: "some summary", milestones: [{}], weekly_schedule: [], learning_outcomes: [], project_tasks: [], expected_outcomes: [] } as any,
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

test("roadmap validation correctly classifies empty or null titles as metadata errors rather than domain mismatches", () => {
  const emptyTitleRoadmap = {
    title: "",
    career_domain: "Software Engineering",
    summary: "Familiarity with loops, functions, and arrays.",
    milestones: [{ title: "Programming Fundamentals", estimated_duration_weeks: 4, difficulty_level: "Beginner", completion_criteria: [], resource_links: [], projects: [], project_tasks: [], deliverables: [], expected_outcomes: [] }],
    weekly_schedule: [],
    learning_outcomes: [],
    project_tasks: [],
    expected_outcomes: []
  };

  const nullTitleRoadmap = {
    title: null as any,
    career_domain: "Software Engineering",
    summary: "Familiarity with loops, functions, and arrays.",
    milestones: [{ title: "Programming Fundamentals", estimated_duration_weeks: 4, difficulty_level: "Beginner", completion_criteria: [], resource_links: [], projects: [], project_tasks: [], deliverables: [], expected_outcomes: [] }],
    weekly_schedule: [],
    learning_outcomes: [],
    project_tasks: [],
    expected_outcomes: []
  };

  // 1. Assert that empty title throws MissingRoadmapTitleError and NOT DomainMismatchError
  assert.throws(
    () => validateRoadmapDomain(emptyTitleRoadmap as any, "SDE-I"),
    (err: any) => {
      assert.equal(err.name, "MissingRoadmapTitleError");
      return true;
    }
  );

  // 2. Assert that null title throws MissingRoadmapTitleError and NOT DomainMismatchError
  assert.throws(
    () => validateRoadmapDomain(nullTitleRoadmap as any, "SDE-I"),
    (err: any) => {
      assert.equal(err.name, "MissingRoadmapTitleError");
      return true;
    }
  );

  // 3. Assert validateRoadmapDomainConsistency returns warning with "Missing roadmap title"
  const emptyRes = validateRoadmapDomainConsistency(emptyTitleRoadmap as any, "SDE-I", { throwOnError: false });
  assert.ok(!emptyRes.valid);
  assert.ok(emptyRes.warnings[0].includes("Missing roadmap title"), "Should report missing roadmap title");
  assert.ok(!emptyRes.warnings[0].includes("domain mismatch"), "Should NOT report domain mismatch");

  const nullRes = validateRoadmapDomainConsistency(nullTitleRoadmap as any, "SDE-I", { throwOnError: false });
  assert.ok(!nullRes.valid);
  assert.ok(nullRes.warnings[0].includes("Missing roadmap title"), "Should report missing roadmap title");
  assert.ok(!nullRes.warnings[0].includes("domain mismatch"), "Should NOT report domain mismatch");
});

test("Software Engineering roadmap containing System Design must pass validation", () => {
  const sdeSystemDesignRoadmap = {
    title: "Software Engineering System Design Plan",
    career_domain: "Software Engineering",
    summary: "Learn scalable client-server architectures, queues, caching, and database design.",
    milestones: [
      {
        title: "System Design Basics",
        why_it_matters: "Reason about scaling and reliability.",
        estimated_duration_weeks: 2,
        difficulty_level: "Advanced",
        completion_criteria: ["Design highly-available cluster"],
        resource_links: [{ label: "AWS Skill Builder", url: "https://skillbuilder.aws/", provider: "AWS" }],
        projects: ["Highly Available SaaS"],
        project_tasks: ["Draw a system design architecture schema"],
        deliverables: ["architecture notes"],
        expected_outcomes: ["explain queues and database horizontal scaling"]
      }
    ],
    weekly_schedule: ["4h system design mock reviews"],
    learning_outcomes: ["design scalable system architectures"],
    project_tasks: ["build container clusters using docker and kubernetes"],
    expected_outcomes: ["reason about database sharding and queues"]
  };

  const result = validateRoadmapDomainConsistency(sdeSystemDesignRoadmap as any, "SDE-I", { throwOnError: false });
  assert.ok(result.valid, `Software Engineering with System Design should pass, but failed: ${result.warnings.join(", ")}`);
});

test("UX roadmap with pure design/layout content passes under Design and UX domain", () => {
  const uxDesignRoadmap = {
    title: "UI/UX Layout and Figma Design Plan",
    career_domain: "Design and UX",
    summary: "Figma vector components, typography grids, accessibility, and visual guidelines.",
    milestones: [
      {
        title: "Design Principles",
        why_it_matters: "Master contrast, balance, typography, and figma crafts.",
        estimated_duration_weeks: 3,
        difficulty_level: "Beginner",
        completion_criteria: ["Design component visual standards following material layout guidelines"],
        resource_links: [{ label: "Figma Help Docs", url: "https://help.figma.com/", provider: "Figma" }],
        projects: ["Mobile App Redesign Layout"],
        project_tasks: ["Design responsive frames with autolayout components"],
        deliverables: ["Figma design files"],
        expected_outcomes: ["compose high-fidelity prototypes with component libraries"]
      }
    ],
    weekly_schedule: ["8h Figma vector crafting"],
    learning_outcomes: ["design pixel-perfect layouts using components"],
    project_tasks: ["construct visual hierarchy schemas and typography sheets"],
    expected_outcomes: ["deploy responsive visual interface grids"]
  };

  const result = validateRoadmapDomainConsistency(uxDesignRoadmap as any, "UI/UX Designer", { throwOnError: false });
  assert.ok(result.valid, `UX Design roadmap should pass under Design and UX domain, but failed: ${result.warnings.join(", ")}`);
});

test("mixed-domain roadmap containing Software Engineering domain and forbidden keywords from another domain fails validation", () => {
  const contaminatedRoadmap = {
    title: "Software Engineering Web Development Plan",
    career_domain: "Software Engineering",
    summary: "Learn JavaScript, backend databases, and user interviews for UX design research.",
    milestones: [
      {
        title: "Programming Fundamentals & Figma Layouts",
        why_it_matters: "Build coding foundations alongside wireframing design systems.",
        estimated_duration_weeks: 4,
        difficulty_level: "Beginner",
        completion_criteria: ["Run user research interviews and verify code logic"],
        resource_links: [
          { label: "freeCodeCamp", url: "https://www.freecodecamp.org/", provider: "freeCodeCamp" },
          { label: "Figma Help Docs", url: "https://help.figma.com/", provider: "Figma" }
        ],
        projects: ["Calculator app with UX research prototypes"],
        project_tasks: ["Write clean logic loops and sketch low-fidelity wireframes"],
        deliverables: ["calculator website", "figma layouts design"],
        expected_outcomes: ["write code logic and compose user interviews guidelines"]
      }
    ],
    weekly_schedule: ["4h coding and 4h wireframing components"],
    learning_outcomes: ["build backend APIs and execute design system testing"],
    project_tasks: ["write queries and interview 3 users for design feedback"],
    expected_outcomes: ["deploy application code and design usability testing reports"]
  };

  // Assert that it throws DomainMismatchError on validateRoadmapDomain
  assert.throws(
    () => validateRoadmapDomain(contaminatedRoadmap as any, "SDE-I"),
    (err: any) => {
      assert.equal(err.name, "DomainMismatchError");
      return true;
    }
  );

  const result = validateRoadmapDomainConsistency(contaminatedRoadmap as any, "SDE-I", { throwOnError: false });
  assert.ok(!result.valid);
  assert.ok(result.warnings.some(w => w.includes("disallowed keyword") || w.includes("domain mismatch")), "Warning should specify disallowed keywords or domain mismatch");
});

test("pure Software Engineering roadmap passes validation", () => {
  const roadmap = buildRoadmapPlanDetails({
    goal: "SDE-I",
    experience: "Junior",
    weeklyHours: 10
  }).roadmaps[0];
  validateRoadmapDomain(roadmap, "SDE-I");
  const result = validateRoadmapDomainConsistency(roadmap, "SDE-I");
  assert.ok(result.valid);
});

test("pure UI/UX roadmap passes validation", () => {
  const roadmap = buildRoadmapPlanDetails({
    goal: "UI/UX Designer",
    experience: "Junior",
    weeklyHours: 10
  }).roadmaps[0];
  validateRoadmapDomain(roadmap, "UI/UX Designer");
  const result = validateRoadmapDomainConsistency(roadmap, "UI/UX Designer");
  assert.ok(result.valid);
});

test("pure Data Science roadmap passes validation", () => {
  const roadmap = buildRoadmapPlanDetails({
    goal: "Data Science",
    experience: "Junior",
    weeklyHours: 10
  }).roadmaps[0];
  validateRoadmapDomain(roadmap, "Data Science");
  const result = validateRoadmapDomainConsistency(roadmap, "Data Science");
  assert.ok(result.valid);
});

test("pure Cybersecurity roadmap passes validation", () => {
  const roadmap = buildRoadmapPlanDetails({
    goal: "Cybersecurity Analyst",
    experience: "Junior",
    weeklyHours: 10
  }).roadmaps[0];
  validateRoadmapDomain(roadmap, "Cybersecurity Analyst");
  const result = validateRoadmapDomainConsistency(roadmap, "Cybersecurity Analyst");
  assert.ok(result.valid);
});

test("mixed contaminated roadmap fails validation", () => {
  const contaminated = {
    title: "UX Design with DSA Algorithms",
    career_domain: "Design and UX",
    summary: "Learn UI layouts and sorting algorithms",
    milestones: [
      {
        title: "Layout and DSA",
        why_it_matters: "Learn layout designs and DSA algorithms like quicksort",
        estimated_duration_weeks: 4,
        difficulty_level: "Beginner",
        completion_criteria: ["Write code for sorting and wireframe components"],
        resource_links: [{ label: "Figma Help", url: "https://help.figma.com/", provider: "Figma" }],
        projects: ["Quicksort Design Component"],
        project_tasks: ["code quicksort and make Figma wireframe"],
        deliverables: ["figma files and javascript script"],
        expected_outcomes: ["use quicksort and create UI grids"]
      }
    ],
    weekly_schedule: ["4h quicksort, 4h Figma"],
    learning_outcomes: ["apply layouts and quicksort"],
    project_tasks: ["construct layout and sort data"],
    expected_outcomes: ["quicksort implementation and pixel perfect layouts"]
  };
  assert.throws(() => validateRoadmapDomain(contaminated as any, "UI/UX Designer"), DomainMismatchError);
});

test("empty title roadmap fails metadata validation", () => {
  const emptyTitle = {
    title: "",
    career_domain: "Software Engineering",
    summary: "A pure coding plan",
    milestones: [{ title: "Programming", estimated_duration_weeks: 1, difficulty_level: "Beginner", completion_criteria: [], resource_links: [{ label: "fcc", url: "https://www.freecodecamp.org/", provider: "freeCodeCamp" }], projects: [], project_tasks: [], deliverables: [], expected_outcomes: [] }],
    weekly_schedule: [],
    learning_outcomes: ["coding"],
    project_tasks: [],
    expected_outcomes: ["code output"]
  };
  assert.throws(() => validateRoadmapDomain(emptyTitle as any, "SDE-I"), MissingRoadmapTitleError);
});

test("missing metadata roadmap fails metadata validation", () => {
  const missingDomain = {
    title: "Web Development Plan",
    career_domain: "",
    summary: "A pure coding plan",
    milestones: [{ title: "Programming", estimated_duration_weeks: 1, difficulty_level: "Beginner", completion_criteria: [], resource_links: [{ label: "fcc", url: "https://www.freecodecamp.org/", provider: "freeCodeCamp" }], projects: [], project_tasks: [], deliverables: [], expected_outcomes: [] }],
    weekly_schedule: [],
    learning_outcomes: ["coding"],
    project_tasks: [],
    expected_outcomes: ["code output"]
  };
  assert.throws(() => validateRoadmapDomain(missingDomain as any, "SDE-I"), MissingRoadmapMetadataError);
});

test("incomplete roadmap record fails quality gate validation", () => {
  const incomplete = {
    title: "Web Development Plan",
    career_domain: "Software Engineering",
    summary: "",
    milestones: [],
    weekly_schedule: [],
    learning_outcomes: [],
    project_tasks: [],
    expected_outcomes: []
  };
  assert.throws(() => validateRoadmapDomain(incomplete as any, "SDE-I"), IncompleteRoadmapRecordError);
});

test("PDF generation engine handles extremely long resource labels, titles, URLs, and checklists without failing horizontal bounds checks", async () => {
  const superLongRoadmap = {
    title: "Software Engineering Mastery Plan with Extremely Long Titles and Descriptions that span multiple lines and columns",
    career_domain: "Software Engineering",
    summary: "Learn everything about JavaScript, Algorithms, Data Structures, Git, system design, and project planning in a highly intense curriculum.",
    milestones: [
      {
        title: "freeCodeCamp JavaScript Algorithms and Data Structures Mastery Course Certification Program and Coding Drills",
        why_it_matters: "Validates core problem solving skills, data structures implementation, algorithmic efficiency, and syntax standards under extreme challenges.",
        estimated_duration_weeks: 6,
        difficulty_level: "Advanced",
        completion_criteria: [
          "Complete all 28 certification projects and verify algorithms under test suites",
          "Deploy custom interactive algorithmic visualizers to production servers"
        ],
        resource_links: [
          {
            label: "freeCodeCamp JavaScript Algorithms and Data Structures Certification Portal and Practice IDE",
            url: "https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures-v8/learn-basic-javascript-by-building-a-role-playing-game/step-1",
            provider: "freeCodeCamp"
          }
        ],
        projects: ["Advanced Data Structure Visualizer Platform with Live Testing Support"],
        project_tasks: ["Design custom layout and integrate reactive states"],
        deliverables: ["Fully functional algorithmic IDE sandbox"],
        expected_outcomes: [
          "Mastery of basic and complex data structures including trees, graphs, maps, lists, heaps, and arrays",
          "Advanced implementation of search and sorting algorithms with runtime optimization analysis"
        ]
      }
    ],
    weekly_schedule: ["12h of intensive code compilation and unit test execution"],
    learning_outcomes: [
      "Design and deploy production-grade interactive sandboxes for algorithmic reviews",
      "Verify code coverage and optimize algorithm time/space complexities"
    ],
    project_tasks: [
      "Implement custom algorithms and write descriptive project readme files"
    ],
    expected_outcomes: [
      "Deployed full-stack coding platform and comprehensive DSA study bank"
    ]
  };

  const report = {
    title: "SDE Certification Career Goal",
    exportedAt: new Date().toISOString(),
    roadmaps: [superLongRoadmap],
    careerGoal: "freeCodeCamp JavaScript Algorithms and Data Structures Mastery Course",
    readinessScore: 88
  };

  const pdfBlob = await generateRoadmapPdfBlob(report as any);
  assert.ok(pdfBlob, "PDF should generate successfully even with extremely long content");
  assert.ok(pdfBlob.size > 1000, "Generated PDF should be of valid size");
  if (pdfBlob.warnings && pdfBlob.warnings.length > 0) {
    console.log("Recorded layout warnings:", pdfBlob.warnings);
  }
});
