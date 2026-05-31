import crypto from "crypto";
import type {
  ExperienceLevel,
  RoadmapDifficulty,
  RoadmapMilestoneRecord,
  RoadmapRecord,
  RoadmapResourceLink,
  RoadmapStatus
} from "./supabase/types";

function toArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export type RoadmapPlanInput = {
  goal: string;
  experience: ExperienceLevel;
  weeklyHours?: number | string;
  budget?: string;
  skills?: string[];
  weaknesses?: string[];
  obstacles?: string[];
  referenceDate?: Date;
};

export type RoadmapPlanPayload = {
  roadmaps: RoadmapRecord[];
  career_domain: string;
  career_demand_score: number;
  market_outlook: string;
  salary_range: string;
  automation_risk: string;
  ai_reasoning: string;
};

type ResourceDef = RoadmapResourceLink & { topic: string };

type DomainProfile = {
  label: string;
  aliases: string[];
  marketOutlook: string;
  salaryRange: string;
  automationRisk: string;
  demandScore: number;
  foundationTopics: string[];
  projectIdeas: string[];
  proofArtifacts: string[];
  resources: ResourceDef[];
};

type MilestoneDraft = Omit<RoadmapMilestoneRecord, "resource_links"> & { resource_links: RoadmapResourceLink[] };

const RESOURCE_CATALOG = {
  roadmap: { label: "Roadmap.sh", url: "https://roadmap.sh/", provider: "Roadmap.sh" },
  mdn: { label: "MDN Web Docs", url: "https://developer.mozilla.org/", provider: "MDN" },
  react: { label: "React Docs", url: "https://react.dev/learn", provider: "React" },
  typescript: { label: "TypeScript Docs", url: "https://www.typescriptlang.org/docs/", provider: "TypeScript" },
  githubSkills: { label: "GitHub Skills", url: "https://skills.github.com/", provider: "GitHub" },
  postgres: { label: "PostgreSQL Docs", url: "https://www.postgresql.org/docs/", provider: "PostgreSQL" },
  node: { label: "Node.js Docs", url: "https://nodejs.org/en/learn", provider: "Node.js" },
  microsoftLearn: { label: "Microsoft Learn", url: "https://learn.microsoft.com/", provider: "Microsoft" },
  awsSkillBuilder: { label: "AWS Skill Builder", url: "https://skillbuilder.aws/", provider: "AWS" },
  googleCloud: { label: "Google Cloud Skills Boost", url: "https://www.cloudskillsboost.google/", provider: "Google Cloud" },
  coursera: { label: "Coursera", url: "https://www.coursera.org/", provider: "Coursera" },
  edx: { label: "edX", url: "https://www.edx.org/", provider: "edX" },
  hubspot: { label: "HubSpot Academy", url: "https://academy.hubspot.com/", provider: "HubSpot" },
  salesforce: { label: "Salesforce Trailhead", url: "https://trailhead.salesforce.com/", provider: "Salesforce" },
  cma: { label: "IMA CMA Resources", url: "https://www.imanet.org/cma-certification", provider: "IMA" },
  icai: { label: "ICAI", url: "https://www.icai.org/", provider: "ICAI" },
  iiba: { label: "IIBA", url: "https://www.iiba.org/", provider: "IIBA" },
  hrci: { label: "HRCI", url: "https://www.hrci.org/", provider: "HRCI" },
  scrum: { label: "Scrum Guide", url: "https://scrumguides.org/", provider: "Scrum Guides" },
  nist: { label: "NIST", url: "https://www.nist.gov/", provider: "NIST" },
  cdc: { label: "CDC Training", url: "https://www.cdc.gov/training/", provider: "CDC" },
  ncbi: { label: "NCBI", url: "https://www.ncbi.nlm.nih.gov/", provider: "NCBI" },
  who: { label: "WHO", url: "https://www.who.int/", provider: "WHO" },
  unesco: { label: "UNESCO", url: "https://www.unesco.org/", provider: "UNESCO" },
  harvard: { label: "Harvard Business School Online", url: "https://online.hbs.edu/", provider: "Harvard Business School" },
  investopedia: { label: "Investopedia", url: "https://www.investopedia.com/", provider: "Investopedia" },
  ted: { label: "TED", url: "https://www.ted.com/", provider: "TED" }
} as const;

const DOMAIN_LIBRARY: DomainProfile[] = [
  {
    label: "Software Engineering",
    aliases: ["software", "frontend", "backend", "full stack", "fullstack", "developer", "engineering", "react", "node", "python", "web"],
    marketOutlook: "Strong demand across startups, product teams, and enterprise modernization efforts.",
    salaryRange: "$80k-$180k+ depending on region and specialization",
    automationRisk: "Moderate. Routine coding is automating, but system design and debugging remain durable.",
    demandScore: 92,
    foundationTopics: ["computer systems", "JavaScript or Python fluency", "version control", "testing", "APIs"],
    projectIdeas: ["customer portal", "operations dashboard", "task automation tool", "collaboration app"],
    proofArtifacts: ["deployed app", "README with architecture notes", "bug triage log"],
    resources: [
      { ...RESOURCE_CATALOG.roadmap, topic: "career path" },
      { ...RESOURCE_CATALOG.react, topic: "frontend fundamentals" },
      { ...RESOURCE_CATALOG.typescript, topic: "type safety" },
      { ...RESOURCE_CATALOG.node, topic: "backend systems" },
      { ...RESOURCE_CATALOG.postgres, topic: "data modeling" }
    ]
  },
  {
    label: "Data and Analytics",
    aliases: ["data", "analytics", "bi", "business intelligence", "reporting", "dashboard", "sql", "tableau", "power bi", "excel"],
    marketOutlook: "Strong demand in operations, product analytics, finance, and strategy teams.",
    salaryRange: "$70k-$160k+ depending on seniority and stack",
    automationRisk: "Moderate. Basic reporting is automating, but insight synthesis remains valuable.",
    demandScore: 88,
    foundationTopics: ["SQL", "data storytelling", "statistics", "dashboard design", "metric definition"],
    projectIdeas: ["retention dashboard", "sales funnel analysis", "cohort study", "forecasting workbook"],
    proofArtifacts: ["analysis notebook", "interactive dashboard", "executive summary"],
    resources: [
      { ...RESOURCE_CATALOG.postgres, topic: "SQL" },
      { ...RESOURCE_CATALOG.microsoftLearn, topic: "Power BI" },
      { ...RESOURCE_CATALOG.coursera, topic: "analytics" },
      { ...RESOURCE_CATALOG.roadmap, topic: "analytics" }
    ]
  },
  {
    label: "AI and Machine Learning",
    aliases: ["ai", "ml", "machine learning", "data science", "llm", "rag", "model", "nlp"],
    marketOutlook: "High demand in applied AI, especially for productized assistants and automation.",
    salaryRange: "$90k-$220k+ with strong variance by experience and research depth",
    automationRisk: "Low to moderate. Tooling accelerates work, but modeling and evaluation stay human-led.",
    demandScore: 90,
    foundationTopics: ["statistics", "feature engineering", "evaluation", "prompting", "retrieval"],
    projectIdeas: ["document assistant", "forecasting model", "classification pipeline", "recommendation prototype"],
    proofArtifacts: ["model card", "evaluation report", "demo video"],
    resources: [
      { ...RESOURCE_CATALOG.coursera, topic: "machine learning" },
      { ...RESOURCE_CATALOG.edx, topic: "AI" },
      { ...RESOURCE_CATALOG.googleCloud, topic: "MLOps" },
      { ...RESOURCE_CATALOG.nist, topic: "model risk" }
    ]
  },
  {
    label: "Product Management",
    aliases: ["product", "pm", "product manager", "roadmap", "feature", "discovery"],
    marketOutlook: "Stable demand in SaaS, consumer apps, and enterprise product orgs.",
    salaryRange: "$90k-$190k+ depending on scope and org size",
    automationRisk: "Low. Strategy, prioritization, and stakeholder alignment are hard to automate.",
    demandScore: 84,
    foundationTopics: ["customer discovery", "prioritization", "metrics", "PRDs", "experimentation"],
    projectIdeas: ["product brief", "feature prioritization model", "experiment plan", "launch tracker"],
    proofArtifacts: ["case study", "PRD sample", "roadmap artifact"],
    resources: [
      { ...RESOURCE_CATALOG.scrum, topic: "delivery" },
      { ...RESOURCE_CATALOG.iiba, topic: "requirements" },
      { ...RESOURCE_CATALOG.harvard, topic: "strategy" },
      { ...RESOURCE_CATALOG.ted, topic: "storytelling" }
    ]
  },
  {
    label: "Design and UX",
    aliases: ["design", "ux", "ui", "product design", "interaction design", "experience design"],
    marketOutlook: "Demand remains strong for designers who can connect research, systems, and product outcomes.",
    salaryRange: "$75k-$170k+ depending on craft and scope",
    automationRisk: "Moderate. Asset generation is automating, but research and systems still matter.",
    demandScore: 86,
    foundationTopics: ["information architecture", "accessibility", "visual systems", "user research", "prototyping"],
    projectIdeas: ["app redesign", "design system", "prototype flow", "usability report"],
    proofArtifacts: ["Figma case study", "research notes", "component library"],
    resources: [
      { ...RESOURCE_CATALOG.mdn, topic: "accessibility" },
      { ...RESOURCE_CATALOG.roadmap, topic: "ux" },
      { ...RESOURCE_CATALOG.githubSkills, topic: "portfolio" }
    ]
  },
  {
    label: "Marketing and Growth",
    aliases: ["marketing", "growth", "seo", "content marketing", "brand", "campaign"],
    marketOutlook: "Strong demand in growth-stage companies, B2B SaaS, and creator-led businesses.",
    salaryRange: "$60k-$150k+ with meaningful upside in growth roles",
    automationRisk: "Moderate. Content generation is easier, but positioning and experimentation remain human-led.",
    demandScore: 82,
    foundationTopics: ["positioning", "funnel design", "SEO", "copywriting", "analytics"],
    projectIdeas: ["campaign plan", "SEO content system", "email funnel", "landing page test"],
    proofArtifacts: ["campaign report", "portfolio samples", "growth dashboard"],
    resources: [
      { ...RESOURCE_CATALOG.hubspot, topic: "inbound" },
      { ...RESOURCE_CATALOG.googleCloud, topic: "analytics" },
      { ...RESOURCE_CATALOG.roadmap, topic: "marketing" }
    ]
  },
  {
    label: "Finance and Accounting",
    aliases: ["finance", "accounting", "cpa", "cma", "fp&a", "budget", "controller", "audit"],
    marketOutlook: "Reliable demand in every sector for analysts, accountants, and planning professionals.",
    salaryRange: "$65k-$170k+ depending on credentials and specialization",
    automationRisk: "Moderate. Reconciliation is automating, but judgment and planning remain durable.",
    demandScore: 87,
    foundationTopics: ["financial statements", "forecasting", "controls", "variance analysis", "Excel modeling"],
    projectIdeas: ["budget model", "cost analysis workbook", "cash flow tracker", "close checklist"],
    proofArtifacts: ["model workbook", "analysis memo", "controls checklist"],
    resources: [
      { ...RESOURCE_CATALOG.investopedia, topic: "finance basics" },
      { ...RESOURCE_CATALOG.cma, topic: "CMA" },
      { ...RESOURCE_CATALOG.icai, topic: "accounting" },
      { ...RESOURCE_CATALOG.hubspot, topic: "operations" }
    ]
  },
  {
    label: "Operations and Strategy",
    aliases: ["operations", "ops", "supply chain", "strategy", "program", "project management"],
    marketOutlook: "Strong demand where execution, cross-functional planning, and process improvement matter.",
    salaryRange: "$70k-$165k+ depending on scale and specialization",
    automationRisk: "Low to moderate. Coordinating humans, systems, and priorities remains difficult to automate.",
    demandScore: 83,
    foundationTopics: ["process mapping", "risk analysis", "OKRs", "stakeholder management", "delivery cadence"],
    projectIdeas: ["operations dashboard", "SOP library", "launch tracker", "capacity planner"],
    proofArtifacts: ["process map", "runbook", "improvement case study"],
    resources: [
      { ...RESOURCE_CATALOG.scrum, topic: "delivery" },
      { ...RESOURCE_CATALOG.microsoftLearn, topic: "operations" },
      { ...RESOURCE_CATALOG.roadmap, topic: "project management" }
    ]
  },
  {
    label: "Cybersecurity",
    aliases: ["security", "cyber", "infosec", "incident response", "soc", "grc", "pentest"],
    marketOutlook: "High demand across regulated industries, infrastructure, and cloud-heavy organizations.",
    salaryRange: "$80k-$190k+ depending on specialization and clearances",
    automationRisk: "Low. Threats evolve quickly and defenders still need judgment and architecture skills.",
    demandScore: 91,
    foundationTopics: ["threat modeling", "identity", "logging", "hardening", "incident response"],
    projectIdeas: ["vulnerability audit", "secure login flow", "threat detection lab", "policy checklist"],
    proofArtifacts: ["security report", "lab notes", "control matrix"],
    resources: [
      { ...RESOURCE_CATALOG.nist, topic: "frameworks" },
      { ...RESOURCE_CATALOG.microsoftLearn, topic: "identity" },
      { ...RESOURCE_CATALOG.awsSkillBuilder, topic: "cloud security" },
      { ...RESOURCE_CATALOG.roadmap, topic: "security" }
    ]
  },
  {
    label: "Education and Training",
    aliases: ["teaching", "education", "trainer", "instructional design", "curriculum", "learning"],
    marketOutlook: "Consistent demand in schools, corporate learning, and independent education businesses.",
    salaryRange: "$45k-$120k+ depending on institution and specialization",
    automationRisk: "Moderate. Content generation is easier, but facilitation and adaptation remain human-driven.",
    demandScore: 75,
    foundationTopics: ["curriculum design", "assessment", "inclusive teaching", "feedback", "facilitation"],
    projectIdeas: ["lesson plan sequence", "training workshop", "micro-course", "assessment rubric"],
    proofArtifacts: ["lesson deck", "teacher notes", "student feedback loop"],
    resources: [
      { ...RESOURCE_CATALOG.unesco, topic: "education" },
      { ...RESOURCE_CATALOG.edx, topic: "pedagogy" },
      { ...RESOURCE_CATALOG.ted, topic: "presentation" }
    ]
  },
  {
    label: "Healthcare and Public Health",
    aliases: ["healthcare", "health", "medical", "public health", "clinical", "nursing", "pharma"],
    marketOutlook: "Very stable demand, especially for people who can combine care, systems, and compliance.",
    salaryRange: "$55k-$200k+ depending on role, credentialing, and setting",
    automationRisk: "Low to moderate. Admin tasks are automating, but clinical judgment and human care stay central.",
    demandScore: 89,
    foundationTopics: ["patient workflows", "documentation", "regulation", "quality improvement", "outreach"],
    projectIdeas: ["care workflow map", "patient education guide", "quality audit", "resource directory"],
    proofArtifacts: ["workflow diagram", "briefing memo", "outreach plan"],
    resources: [
      { ...RESOURCE_CATALOG.who, topic: "global health" },
      { ...RESOURCE_CATALOG.cdc, topic: "public health training" },
      { ...RESOURCE_CATALOG.edx, topic: "healthcare" }
    ]
  },
  {
    label: "Law and Compliance",
    aliases: ["law", "legal", "compliance", "policy", "paralegal", "regulatory"],
    marketOutlook: "Stable demand across firms, in-house teams, and regulated industries.",
    salaryRange: "$60k-$200k+ depending on jurisdiction and practice area",
    automationRisk: "Moderate. Document review is automating, but interpretation and counseling stay human-led.",
    demandScore: 85,
    foundationTopics: ["issue spotting", "research", "brief writing", "risk analysis", "regulatory literacy"],
    projectIdeas: ["case brief tracker", "compliance checklist", "policy memo", "contract review log"],
    proofArtifacts: ["legal memo", "research digest", "risk matrix"],
    resources: [
      { ...RESOURCE_CATALOG.nist, topic: "risk" },
      { ...RESOURCE_CATALOG.hubspot, topic: "governance" },
      { ...RESOURCE_CATALOG.roadmap, topic: "compliance" }
    ]
  },
  {
    label: "Entrepreneurship and Freelancing",
    aliases: ["entrepreneur", "startup", "freelance", "solopreneur", "agency", "side hustle"],
    marketOutlook: "Unbounded upside if you can ship, sell, and retain customers consistently.",
    salaryRange: "Highly variable with no ceiling; cash flow matters more than salary",
    automationRisk: "Low. The hardest parts are positioning, trust, sales, and adaptation.",
    demandScore: 86,
    foundationTopics: ["customer discovery", "pricing", "offer design", "delivery systems", "sales"],
    projectIdeas: ["validation sprint", "service landing page", "client intake system", "proposal template"],
    proofArtifacts: ["offer page", "case studies", "pipeline tracker"],
    resources: [
      { ...RESOURCE_CATALOG.hubspot, topic: "sales" },
      { ...RESOURCE_CATALOG.harvard, topic: "business" },
      { ...RESOURCE_CATALOG.ted, topic: "pitching" },
      { ...RESOURCE_CATALOG.salesforce, topic: "crm" }
    ]
  },
  {
    label: "Human Resources and Talent",
    aliases: ["hr", "human resources", "talent", "recruiting", "people ops", "people"],
    marketOutlook: "Stable demand in growing companies, especially where hiring and retention are pressure points.",
    salaryRange: "$60k-$155k+ depending on specialization and org size",
    automationRisk: "Moderate. Screening is automating, but trust-building, coaching, and judgment remain central.",
    demandScore: 80,
    foundationTopics: ["hiring process", "employee relations", "compensation", "onboarding", "performance"],
    projectIdeas: ["hiring scorecard", "onboarding flow", "engagement survey", "people analytics dashboard"],
    proofArtifacts: ["talent playbook", "interview kit", "people ops template"],
    resources: [
      { ...RESOURCE_CATALOG.hrci, topic: "certification" },
      { ...RESOURCE_CATALOG.hubspot, topic: "people operations" },
      { ...RESOURCE_CATALOG.roadmap, topic: "hr" }
    ]
  },
  {
    label: "Research and Academia",
    aliases: ["research", "academic", "phd", "lab", "scientist", "scholar"],
    marketOutlook: "Competitive but durable for people who can produce rigorous analysis and communicate clearly.",
    salaryRange: "$50k-$180k+ depending on sector and institution",
    automationRisk: "Moderate. Summarization is automating, but original inquiry and interpretation stay valuable.",
    demandScore: 79,
    foundationTopics: ["literature review", "methodology", "research design", "writing", "presentation"],
    projectIdeas: ["literature map", "small study", "research poster", "knowledge base"],
    proofArtifacts: ["paper draft", "methods note", "conference slide deck"],
    resources: [
      { ...RESOURCE_CATALOG.edx, topic: "research methods" },
      { ...RESOURCE_CATALOG.ncbi, topic: "literature" },
      { ...RESOURCE_CATALOG.unesco, topic: "education" }
    ]
  }
];

function parseWeeklyHours(rawValue?: number | string) {
  if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
    return Math.max(4, Math.min(40, Math.round(rawValue)));
  }

  if (typeof rawValue === "string") {
    const match = rawValue.match(/\d+/);
    if (match) {
      return Math.max(4, Math.min(40, Number(match[0])));
    }
  }

  return 10;
}

function addWeeks(date: Date, weeks: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + weeks * 7);
  return next;
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function hashSeed(...parts: string[]) {
  return crypto.createHash("sha256").update(parts.join("|")).digest("hex");
}

function pickDomain(goal: string) {
  const normalized = goal.toLowerCase();
  return DOMAIN_LIBRARY.find((profile) => profile.aliases.some((alias) => normalized.includes(alias))) ?? DOMAIN_LIBRARY[0];
}

function pickFromSeed<T>(items: T[], seed: string, offset = 0) {
  const safeItems = toArray<T>(items);
  if (!safeItems.length) {
    throw new Error("Cannot pick from an empty list.");
  }

  const index = Number.parseInt(seed.slice(offset, offset + 8), 16) % safeItems.length;
  return safeItems[index];
}

function resourceLinksFor(profile: DomainProfile, topic: string) {
  const resources = toArray<ResourceDef>(profile.resources);
  const filtered = resources.filter((resource) => resource.topic.toLowerCase().includes(topic.toLowerCase()) || topic.toLowerCase().includes(resource.topic.toLowerCase()));
  return (filtered.length ? filtered : resources).slice(0, 3).map((resourceDef) => ({
    label: resourceDef.label,
    url: resourceDef.url,
    provider: resourceDef.provider
  }));
}

function chooseDifficulty(experience: ExperienceLevel, phase: number): RoadmapDifficulty {
  if (experience === "Senior") {
    return phase === 3 ? "Advanced" : "Intermediate";
  }

  if (experience === "Mid" || experience === "Switcher") {
    return phase === 1 ? "Beginner" : "Intermediate";
  }

  return phase === 3 ? "Intermediate" : "Beginner";
}

function statusForProgress(progress: number): RoadmapStatus {
  if (progress >= 70) {
    return "Done";
  }

  if (progress >= 25) {
    return "Active";
  }

  return "Planned";
}

function makeMilestone(params: {
  title: string;
  whyItMatters: string;
  estimatedDurationWeeks: number;
  difficultyLevel: RoadmapDifficulty;
  completionCriteria: string[];
  resourceLinks: RoadmapResourceLink[];
  projects: string[];
  projectTasks: string[];
  deliverables: string[];
  expectedOutcomes: string[];
}): MilestoneDraft {
  return {
    title: params.title,
    why_it_matters: params.whyItMatters,
    estimated_duration_weeks: params.estimatedDurationWeeks,
    difficulty_level: params.difficultyLevel,
    completion_criteria: params.completionCriteria,
    resource_links: params.resourceLinks,
    projects: params.projects,
    project_tasks: params.projectTasks,
    deliverables: params.deliverables,
    expected_outcomes: params.expectedOutcomes
  };
}

function buildRoadmapCard(params: {
  goal: string;
  profile: DomainProfile;
  experience: ExperienceLevel;
  weeklyHours: number;
  referenceDate: Date;
  version: number;
  variant: string;
  title: string;
  summary: string;
  progress: number;
  phaseLabel: string;
  phase1Topic: string;
  phase2Topic: string;
  phase3Topic: string;
  projectFocus: string;
}): RoadmapRecord {
  const seed = hashSeed(params.goal, params.profile.label, params.variant);
  const phase1Weeks = Math.max(2, Math.round(params.weeklyHours / 3));
  const phase2Weeks = Math.max(3, Math.round(params.weeklyHours / 2));
  const phase3Weeks = Math.max(2, Math.round(params.weeklyHours / 4));

  const phase1 = makeMilestone({
    title: `${params.phaseLabel}: Map the gap`,
    whyItMatters: `This turns ${params.goal} into a concrete skill map for ${params.profile.label.toLowerCase()}.`,
    estimatedDurationWeeks: phase1Weeks,
    difficultyLevel: chooseDifficulty(params.experience, 1),
    completionCriteria: [
      `List the core skills for ${params.profile.label.toLowerCase()}`,
      "Write a gap analysis against the target role",
      "Set a weekly learning cadence"
    ],
    resourceLinks: resourceLinksFor(params.profile, params.phase1Topic),
    projects: [`${params.profile.label} skill map`],
    projectTasks: [
      `Review 5 current role descriptions for ${params.profile.label.toLowerCase()}`,
      `Rank your current strengths against the target role`,
      "Create a 4-week execution plan"
    ],
    deliverables: ["skill map", "execution plan"],
    expectedOutcomes: ["clarity on the target role", "a realistic weekly practice loop"]
  });

  const projectName = pickFromSeed(params.profile.projectIdeas, seed);
  const phase2 = makeMilestone({
    title: `${params.phaseLabel}: Build proof of work`,
    whyItMatters: `A real artifact proves you can apply ${params.profile.label.toLowerCase()} skills under constraints.`,
    estimatedDurationWeeks: phase2Weeks,
    difficultyLevel: chooseDifficulty(params.experience, 2),
    completionCriteria: [
      "A scoped project is shipped",
      "The artifact is documented and shareable",
      "You can explain decisions, tradeoffs, and results"
    ],
    resourceLinks: resourceLinksFor(params.profile, params.phase2Topic),
    projects: [projectName],
    projectTasks: [
      `Define a one-page scope for ${projectName}`,
      "Ship the smallest useful version first",
      "Collect one piece of feedback and iterate once"
    ],
    deliverables: ["live project", "case study"],
    expectedOutcomes: ["portfolio proof", "a concrete story for interviews"]
  });

  const phase3 = makeMilestone({
    title: `${params.phaseLabel}: Package and launch`,
    whyItMatters: "Career progress depends on proof, positioning, and visible momentum.",
    estimatedDurationWeeks: phase3Weeks,
    difficultyLevel: chooseDifficulty(params.experience, 3),
    completionCriteria: [
      "Resume, portfolio, or profile is updated",
      "At least 10 targeted opportunities or leads are tracked",
      "You can present the project in under 3 minutes"
    ],
    resourceLinks: resourceLinksFor(params.profile, params.phase3Topic),
    projects: [params.projectFocus],
    projectTasks: [
      "Write a strong role-specific summary",
      "Prepare interview answers and a project demo",
      "Track outreach, interviews, or applications"
    ],
    deliverables: ["portfolio refresh", "application tracker", "interview story bank"],
    expectedOutcomes: ["more confident outreach", "clearer role positioning"]
  });

  const milestones = [phase1, phase2, phase3];
  const safeMilestones = toArray<RoadmapMilestoneRecord>(milestones);
  const totalDuration = safeMilestones.reduce((sum, milestone) => sum + milestone.estimated_duration_weeks, 0);
  const weeklySchedule = [
    `${Math.max(2, Math.round(params.weeklyHours * 0.35))}h focused practice`,
    `${Math.max(1, Math.round(params.weeklyHours * 0.25))}h project work`,
    `${Math.max(1, Math.round(params.weeklyHours * 0.15))}h review and notes`
  ];

  const combinedResources = Array.from(new Map(safeMilestones.flatMap((milestone) => milestone.resource_links).map((resource) => [resource.url, resource])).values());
  const projectTasks = Array.from(new Set(safeMilestones.flatMap((milestone) => milestone.project_tasks)));
  const expectedOutcomes = Array.from(new Set(safeMilestones.flatMap((milestone) => milestone.expected_outcomes)));
  const learningOutcomes = Array.from(new Set([
    `Operate confidently in ${params.profile.label.toLowerCase()}`,
    `Bridge your current background into ${params.goal}`,
    ...params.profile.foundationTopics.slice(0, 2)
  ]));
  const completionDate = addWeeks(params.referenceDate, Math.max(1, totalDuration));

  return {
    id: crypto.randomUUID(),
    title: params.title,
    status: statusForProgress(params.progress),
    summary: params.summary,
    description: params.summary,
    owner: "You",
    progress: params.progress,
    career_domain: params.profile.label,
    career_demand_score: params.profile.demandScore,
    demand_score: params.profile.demandScore,
    market_outlook: params.profile.marketOutlook,
    salary_range: params.profile.salaryRange,
    automation_risk: params.profile.automationRisk,
    roadmap_version: params.version,
    generated_at: params.referenceDate.toISOString(),
    ai_reasoning: `${params.goal} was mapped into ${params.profile.label.toLowerCase()} through your experience level, weekly capacity, and current skill gaps.`,
    weekly_schedule: weeklySchedule,
    learning_outcomes: learningOutcomes,
    total_duration_weeks: totalDuration,
    duration_weeks: totalDuration,
    weekly_hours: params.weeklyHours,
    estimated_completion_date: toIsoDate(completionDate),
    resource_links: combinedResources,
    project_tasks: projectTasks,
    expected_outcomes: expectedOutcomes,
    milestones: milestones as RoadmapMilestoneRecord[],
    updated_at: params.referenceDate.toISOString()
  };
}

export function buildRoadmapPlan(input: RoadmapPlanInput): RoadmapRecord[] {
  return buildRoadmapPlanDetails(input).roadmaps;
}

export function buildRoadmapPlanDetails(input: RoadmapPlanInput): RoadmapPlanPayload {
  const weeklyHours = parseWeeklyHours(input.weeklyHours);
  const referenceDate = input.referenceDate ?? new Date();
  const profile = pickDomain(input.goal);
  const seed = hashSeed(input.goal, input.experience, String(weeklyHours), input.skills?.join(",") ?? "");
  const foundationTopics = toArray<string>(profile.foundationTopics);
  const projectIdeas = toArray<string>(profile.projectIdeas);
  const proofArtifacts = toArray<string>(profile.proofArtifacts);

  const roadmaps = [
    buildRoadmapCard({
      goal: input.goal,
      profile,
      experience: input.experience,
      weeklyHours,
      referenceDate,
      version: 1,
      variant: "primary",
      title: `${profile.label}: foundation plan`,
      summary: `Build role clarity and the baseline skills needed to move into ${input.goal}.`,
      progress: Math.min(65, input.experience === "Senior" ? 55 : input.experience === "Mid" || input.experience === "Switcher" ? 38 : 22),
      phaseLabel: "Foundation",
      phase1Topic: foundationTopics[0],
      phase2Topic: projectIdeas[0],
      phase3Topic: proofArtifacts[0],
      projectFocus: proofArtifacts[0]
    }),
    buildRoadmapCard({
      goal: input.goal,
      profile,
      experience: input.experience,
      weeklyHours,
      referenceDate,
      version: 1,
      variant: seed.slice(0, 10),
      title: `${profile.label}: portfolio plan`,
      summary: `Turn the target role into visible proof through one substantial project and clear case studies.`,
      progress: Math.min(70, input.experience === "Senior" ? 50 : 30),
      phaseLabel: "Portfolio",
      phase1Topic: foundationTopics[1] ?? foundationTopics[0],
      phase2Topic: projectIdeas[1] ?? projectIdeas[0],
      phase3Topic: proofArtifacts[1] ?? proofArtifacts[0],
      projectFocus: projectIdeas[0]
    }),
    buildRoadmapCard({
      goal: input.goal,
      profile,
      experience: input.experience,
      weeklyHours,
      referenceDate,
      version: 1,
      variant: seed.slice(10, 20),
      title: `${profile.label}: launch plan`,
      summary: `Package the story, prove readiness, and move into applications, outreach, or client acquisition.`,
      progress: Math.min(80, input.experience === "Senior" ? 70 : 35),
      phaseLabel: "Launch",
      phase1Topic: foundationTopics[2] ?? foundationTopics[0],
      phase2Topic: projectIdeas[2] ?? projectIdeas[0],
      phase3Topic: proofArtifacts[2] ?? proofArtifacts[0],
      projectFocus: proofArtifacts[0]
    })
  ];

  return {
    roadmaps,
    career_domain: profile.label,
    career_demand_score: profile.demandScore,
    market_outlook: profile.marketOutlook,
    salary_range: profile.salaryRange,
    automation_risk: profile.automationRisk,
    ai_reasoning: `The plan was personalized for ${input.goal} by matching the goal to ${profile.label.toLowerCase()}, experience level, available time, and real project proof.`,
  };
}

export function buildRoadmapPlanPrompt(input: RoadmapPlanInput) {
  const profile = pickDomain(input.goal);
  const weeklyHours = parseWeeklyHours(input.weeklyHours);

  return {
    system: "You are CareerOS, a career roadmap engine. Return only valid JSON.",
    user: {
      goal: input.goal,
      experience: input.experience,
      weekly_hours: weeklyHours,
      budget: input.budget ?? "unspecified",
      skills: input.skills ?? [],
      weaknesses: input.weaknesses ?? [],
      obstacles: input.obstacles ?? [],
      career_domain_hint: profile.label,
      resource_catalog: toArray<ResourceDef>(profile.resources).map((resourceDef) => ({
        label: resourceDef.label,
        url: resourceDef.url,
        provider: resourceDef.provider
      })),
      required_shape: {
        career_domain: "string",
        career_demand_score: "number",
        market_outlook: "string",
        salary_range: "string",
        automation_risk: "string",
        ai_reasoning: "string",
        roadmaps: [
          {
            id: "string",
            title: "string",
            status: "Planned|Active|Done",
            summary: "string",
            owner: "string",
            progress: "number",
            career_domain: "string",
            career_demand_score: "number",
            market_outlook: "string",
            salary_range: "string",
            automation_risk: "string",
            roadmap_version: "number",
            generated_at: "ISO string",
            ai_reasoning: "string",
            weekly_schedule: ["string"],
            learning_outcomes: ["string"],
            total_duration_weeks: "number",
            weekly_hours: "number",
            estimated_completion_date: "YYYY-MM-DD",
            resource_links: [
              {
                label: "string",
                url: "string",
                provider: "string"
              }
            ],
            project_tasks: ["string"],
            expected_outcomes: ["string"],
            milestones: [
              {
                title: "string",
                why_it_matters: "string",
                estimated_duration_weeks: "number",
                difficulty_level: "Beginner|Intermediate|Advanced",
                completion_criteria: ["string"],
                resource_links: [
                  {
                    label: "string",
                    url: "string",
                    provider: "string"
                  }
                ],
                projects: ["string"],
                project_tasks: ["string"],
                deliverables: ["string"],
                expected_outcomes: ["string"]
              }
            ]
          }
        ]
      }
    }
  };
}
