import type {
  ExperienceLevel,
  RoadmapDifficulty,
  RoadmapMilestoneRecord,
  RoadmapRecord,
  RoadmapResourceLink,
  RoadmapStatus
} from "./supabase/types";
import { generateId } from "./id";

function toArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export type RoadmapPlanInput = {
  goal: string;
  experience: ExperienceLevel;
  weeklyHours?: number | string;
  readinessScore?: number;
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
  cs50: { label: "CS50", url: "https://cs50.harvard.edu/x/", provider: "CS50" },
  freeCodeCamp: { label: "freeCodeCamp", url: "https://www.freecodecamp.org/learn/", provider: "freeCodeCamp" },
  mdn: { label: "MDN Web Docs", url: "https://developer.mozilla.org/", provider: "MDN" },
  react: { label: "React Docs", url: "https://react.dev/learn", provider: "React" },
  typescript: { label: "TypeScript Docs", url: "https://www.typescriptlang.org/docs/", provider: "TypeScript" },
  githubSkills: { label: "GitHub Skills", url: "https://skills.github.com/", provider: "GitHub" },
  leetcode: { label: "LeetCode", url: "https://leetcode.com/", provider: "LeetCode" },
  geeksForGeeks: { label: "GeeksForGeeks", url: "https://www.geeksforgeeks.org/", provider: "GeeksForGeeks" },
  officialDocs: { label: "Official Documentation", url: "https://developer.mozilla.org/", provider: "Official Documentation" },
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
  ted: { label: "TED", url: "https://www.ted.com/", provider: "TED" },
  figma: { label: "Figma Help Docs", url: "https://help.figma.com/", provider: "Figma" },
  nng: { label: "Nielsen Norman Group Articles", url: "https://www.nngroup.com/articles/", provider: "Nielsen Norman Group" },
  material: { label: "Material Design Guidelines", url: "https://m3.material.io/", provider: "Material Design" },
  kaggle: { label: "Kaggle Learn", url: "https://www.kaggle.com/learn", provider: "Kaggle" },
  datacamp: { label: "DataCamp Courses", url: "https://www.datacamp.com/", provider: "DataCamp" }
} as const;

const DOMAIN_LIBRARY: DomainProfile[] = [
  {
    label: "Software Engineering",
    aliases: ["software", "frontend", "backend", "full stack", "fullstack", "developer", "engineering", "react", "node", "python", "web", "sde", "sde-i", "sde-ii", "sde-iii", "swe", "computer science", "software engineer", "software development engineer"],
    marketOutlook: "Strong demand across startups, product teams, and enterprise modernization efforts.",
    salaryRange: "$80k-$180k+ depending on region and specialization",
    automationRisk: "Moderate. Routine coding is automating, but system design and debugging remain durable.",
    demandScore: 92,
    foundationTopics: ["computer systems", "JavaScript or Python fluency", "version control", "testing", "APIs"],
    projectIdeas: ["customer portal", "operations dashboard", "task automation tool", "collaboration app"],
    proofArtifacts: ["deployed app", "README with architecture notes", "bug triage log"],
    resources: [
      { ...RESOURCE_CATALOG.cs50, topic: "programming fundamentals" },
      { ...RESOURCE_CATALOG.freeCodeCamp, topic: "web development" },
      { ...RESOURCE_CATALOG.roadmap, topic: "career path" },
      { ...RESOURCE_CATALOG.mdn, topic: "web fundamentals" },
      { ...RESOURCE_CATALOG.react, topic: "frontend fundamentals" },
      { ...RESOURCE_CATALOG.typescript, topic: "type safety" },
      { ...RESOURCE_CATALOG.githubSkills, topic: "git and github" },
      { ...RESOURCE_CATALOG.leetcode, topic: "algorithms" },
      { ...RESOURCE_CATALOG.geeksForGeeks, topic: "data structures" },
      { ...RESOURCE_CATALOG.officialDocs, topic: "official documentation" },
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
      { ...RESOURCE_CATALOG.roadmap, topic: "analytics" },
      { ...RESOURCE_CATALOG.kaggle, topic: "SQL" },
      { ...RESOURCE_CATALOG.datacamp, topic: "analytics" }
    ]
  },
  {
    label: "AI and Machine Learning",
    aliases: ["ai", "ml", "machine learning", "data science", "llm", "rag", "model", "nlp"],
    marketOutlook: "High demand in applied AI, especially for productized assistants and automation.",
    salaryRange: "$90k-$220k+ with strong variance by experience and specialization depth",
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
      { ...RESOURCE_CATALOG.githubSkills, topic: "portfolio" },
      { ...RESOURCE_CATALOG.figma, topic: "ux" },
      { ...RESOURCE_CATALOG.nng, topic: "ux" },
      { ...RESOURCE_CATALOG.material, topic: "ux" }
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

export class RoadmapQualityGateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RoadmapQualityGateError";
  }
}

export const DOMAIN_DISALLOWED_KEYWORDS: Record<string, string[]> = {
  "Software Engineering": [
    "operations", "ops", "academia", "product design", "experience design", "ux design", "ux", 
    "ui design", "figma", "user research", "wireframing", "design systems", "marketing", 
    "operations strategy", "research papers", "academic journals"
  ],
  "Design and UX": [
    "dsa", "algorithms", "system design", "competitive programming", "leet code", "leetcode",
    "cryptography", "pen testing", "penetration testing", "cybersecurity", "security policies",
    "cma", "accounting", "clinical diagnosis"
  ],
  "Data and Analytics": [
    "figma", "wireframe", "wireframing", "ux design", "ux", "ui design", "pen testing", 
    "penetration testing", "cma", "accounting", "nursing", "pedagogy"
  ],
  "Cybersecurity": [
    "figma", "wireframe", "wireframing", "ux design", "ux", "ui design", "marketing", 
    "campaign funnel", "operations strategy", "cma", "accounting", "nursing"
  ]
};

export type ContaminationIssue = {
  roadmapId: string;
  userId: string;
  reason: string;
};

export function scanRoadmapContamination(
  roadmaps: RoadmapRecord[],
  goal: string
): ContaminationIssue[] {
  const profile = pickDomain(goal);
  const disallowedKeywords = DOMAIN_DISALLOWED_KEYWORDS[profile.label];
  if (!disallowedKeywords) return [];

  const issues: ContaminationIssue[] = [];

  roadmaps.forEach((roadmap) => {
    const milestones = toArray<RoadmapMilestoneRecord>(roadmap.milestones);
    const textToCheck = [
      roadmap.title || "",
      roadmap.summary || "",
      ...toArray<string>(roadmap.learning_outcomes),
      ...toArray<string>(roadmap.project_tasks),
      ...toArray<string>(roadmap.expected_outcomes),
      ...milestones.flatMap((m) => [
        m.title || "",
        m.why_it_matters || "",
        ...toArray<string>(m.completion_criteria),
        ...toArray<string>(m.projects),
        ...toArray<string>(m.project_tasks),
        ...toArray<string>(m.deliverables),
        ...toArray<string>(m.expected_outcomes)
      ])
    ].join(" ").toLowerCase();

    disallowedKeywords.forEach((keyword) => {
      const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`(^|\\W)${escaped}(\\W|$)`, "i");
      if (regex.test(textToCheck)) {
        if (keyword === "management") {
          const cleanText = textToCheck
            .replace(/project management/g, "")
            .replace(/management tool/g, "")
            .replace(/state management/g, "")
            .replace(/package management/g, "");
          if (!regex.test(cleanText)) {
            return;
          }
        }
        if (keyword === "system design") {
          const cleanText = textToCheck.replace(/design systems?/g, "");
          if (!regex.test(cleanText)) {
            return;
          }
        }
        issues.push({
          roadmapId: roadmap.id || "unknown",
          userId: roadmap.owner || "unknown",
          reason: `Roadmap contains disallowed keyword for ${profile.label}: '${keyword}'`
        });
      }
    });
  });

  return issues;
}

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
  const input = parts.join("|");
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

function pickDomain(goal: string) {
  const normalized = goal.toLowerCase();
  const rankedMatches = DOMAIN_LIBRARY.map((profile, index) => {
    const matchingAliases = profile.aliases.filter((alias) => normalized.includes(alias));
    const bestAliasLength = matchingAliases.length ? Math.max(...matchingAliases.map((alias) => alias.length)) : 0;
    return { profile, index, bestAliasLength };
  })
    .filter((match) => match.bestAliasLength > 0)
    .sort((left, right) => right.bestAliasLength - left.bestAliasLength || left.index - right.index);

  return rankedMatches[0]?.profile ?? DOMAIN_LIBRARY[0];
}

function normalizeText(value: string) {
  return value.toLowerCase();
}

function getDomainKeywords(profile: DomainProfile) {
  return Array.from(
    new Set([
      profile.label,
      ...profile.aliases,
      ...profile.foundationTopics,
      ...profile.projectIdeas,
      ...profile.proofArtifacts
    ].map(normalizeText))
  );
}

function getDisallowedKeywords(profile: DomainProfile) {
  const blockedTerms = [
    "operations",
    "ops",
    "academia",
    "product design",
    "experience design",
    "finance",
    "accounting",
    "healthcare",
    "medical",
    "legal",
    "compliance",
    "education",
    "teaching",
    "hr",
    "recruiting",
    "talent"
  ];

  const lowerLabel = profile.label.toLowerCase();

  if (lowerLabel.includes("software")) {
    blockedTerms.push("research", "ux design", "ux", "ui design");
  }

  return blockedTerms
    .map(normalizeText)
    .filter((term) => {
      if (lowerLabel.includes("software")) {
        return true;
      }
      if (lowerLabel.includes("design") && term.includes("design")) {
        return false;
      }
      if (lowerLabel.includes("operations") && term.includes("operations")) {
        return false;
      }
      return true;
    });
}

function getAllowedProviders(profile: DomainProfile) {
  const base = new Set(profile.resources.map((resource) => resource.provider));

  if (profile.label === "Software Engineering") {
    [
      RESOURCE_CATALOG.cs50.provider,
      RESOURCE_CATALOG.freeCodeCamp.provider,
      RESOURCE_CATALOG.leetcode.provider,
      RESOURCE_CATALOG.geeksForGeeks.provider,
      RESOURCE_CATALOG.officialDocs.provider
    ].forEach((provider) => base.add(provider));
  }

  return base;
}

function textContainsAny(text: string, keywords: string[]) {
  const normalized = normalizeText(text);
  return keywords.some((keyword) => normalized.includes(keyword));
}

function textContainsAnyNegative(text: string, keywords: string[]) {
  const normalized = normalizeText(text);
  return keywords.some((keyword) => {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(^|\\W)${escaped}(\\W|$)`, "i");
    return regex.test(normalized);
  });
}

function roadmapTextBlob(roadmap: RoadmapRecord) {
  const milestones = toArray<RoadmapMilestoneRecord>(roadmap.milestones);
  const resourceLinks = toArray<RoadmapResourceLink>(roadmap.resource_links);
  const weekly_schedule = toArray<string>(roadmap.weekly_schedule);
  const learning_outcomes = toArray<string>(roadmap.learning_outcomes);
  const project_tasks = toArray<string>(roadmap.project_tasks);
  const expected_outcomes = toArray<string>(roadmap.expected_outcomes);

  return [
    roadmap.career_domain || "",
    roadmap.title || "",
    roadmap.summary || "",
    roadmap.ai_reasoning || "",
    roadmap.market_outlook || "",
    roadmap.salary_range || "",
    roadmap.automation_risk || "",
    weekly_schedule.join(" "),
    learning_outcomes.join(" "),
    project_tasks.join(" "),
    expected_outcomes.join(" "),
    resourceLinks.map((resource) => `${resource.label || ""} ${resource.provider || ""}`).join(" "),
    milestones.flatMap((milestone) => [
      milestone.title || "",
      milestone.why_it_matters || "",
      toArray<string>(milestone.completion_criteria).join(" "),
      toArray<string>(milestone.projects).join(" "),
      toArray<string>(milestone.project_tasks).join(" "),
      toArray<string>(milestone.deliverables).join(" "),
      toArray<string>(milestone.expected_outcomes).join(" "),
      toArray<RoadmapResourceLink>(milestone.resource_links).map((resource) => `${resource.label || ""} ${resource.provider || ""}`).join(" ")
    ]).join(" ")
  ].join(" ");
}

export function resolveDomainProfile(goal: string) {
  return pickDomain(goal);
}

interface DomainKnowledgeMap {
  allowedTopics: string[];
  allowedSkills: string[];
  allowedSprintThemes: string[];
  allowedProjectCategories: string[];
}

export const DOMAIN_KNOWLEDGE_MAPS: Record<string, DomainKnowledgeMap> = {
  "Software Engineering": {
    allowedTopics: [
      "programming", "problem solving", "dsa", "algorithms", "data structures", "git", "github", 
      "version control", "software design", "system design", "apis", "backend", "frontend", 
      "web development", "databases", "cloud", "testing", "ci/cd", "devops basics", "projects", 
      "portfolio", "interview preparation", "javascript", "python", "typescript", "react", "html", "css",
      "node", "sql", "coding", "software engineering fundamentals", "full stack"
    ],
    allowedSkills: [
      "coding", "debugging", "architecture", "database design", "api design", "testing", 
      "version control", "refactoring", "problem solving", "data structures", "algorithms"
    ],
    allowedSprintThemes: [
      "core foundations", "sprint 01", "sprint 02", "sprint 03", "portfolio", "interview",
      "fundamentals", "setup", "frontend", "backend", "full stack", "advanced systems"
    ],
    allowedProjectCategories: [
      "web app", "calculator", "todo app", "weather app", "blog platform", "expense tracker", 
      "chat application", "project management tool", "saas", "full stack"
    ]
  },
  "Data Science": {
    allowedTopics: [
      "python", "data analysis", "statistics", "machine learning", "pandas", "numpy", "jupyter", 
      "scikit-learn", "data visualization", "sql", "r", "data cleaning", "feature engineering", 
      "model evaluation", "data pipelines", "notebook", "math", "linear algebra", "probability",
      "analytics", "big data", "tableau", "power bi"
    ],
    allowedSkills: [
      "data cleaning", "model building", "statistical testing", "predictive modeling", "data storytelling",
      "sql querying", "exploratory data analysis", "eda"
    ],
    allowedSprintThemes: [
      "statistics", "data prep", "modeling", "analytics", "data pipelines", "evaluation", "storytelling"
    ],
    allowedProjectCategories: [
      "predictive model", "analysis notebook", "visualization board", "forecasting workbook", "eda report"
    ]
  },
  "Product Management": {
    allowedTopics: [
      "product management", "roadmap", "discovery", "prioritization", "metrics", "prds", "experimentation", 
      "agile", "scrum", "user research", "stakeholder management", "strategy", "competitor analysis", 
      "launch plan", "analytics", "market research", "customer interviews", "okrs"
    ],
    allowedSkills: [
      "prioritization", "roadmap creation", "storytelling", "casing", "metrics definition", 
      "writing specs", "user empathy", "agile orchestration"
    ],
    allowedSprintThemes: [
      "strategy", "discovery", "prioritization", "metrics", "experimentation", "launch", "delivery"
    ],
    allowedProjectCategories: [
      "product brief", "prd", "feature roadmap", "experiment plan", "launch tracker", "case study"
    ]
  },
  "UI/UX Design": {
    allowedTopics: [
      "design principles", "user research", "wireframing", "figma", "prototyping", "design systems", 
      "accessibility", "typography", "layout systems", "information architecture", "user journeys", 
      "personas", "usability testing", "wcag", "interface design", "user experience", "visual design",
      "interaction design", "color theory", "micro-interactions"
    ],
    allowedSkills: [
      "wireframing", "prototyping", "visual hierarchy", "user interviewing", "usability testing", 
      "component design", "information architecture", "figma craft"
    ],
    allowedSprintThemes: [
      "visuals", "research", "wireframes", "prototypes", "systems", "portfolio", "figma layouts"
    ],
    allowedProjectCategories: [
      "figma case study", "research notes", "component library", "app redesign", "design system", "prototype flow"
    ]
  },
  "Cybersecurity": {
    allowedTopics: [
      "threat modeling", "identity", "access management", "logging", "monitoring", "hardening", 
      "incident response", "security", "cyber", "infosec", "soc", "grc", 
      "pentest", "vulnerability", "networking", "siem", "least-privilege", "compliance", "nist",
      "firewall", "encryption", "cryptography"
    ],
    allowedSkills: [
      "threat analysis", "iam configuration", "siem rules writing", "system hardening", 
      "incident handling", "network audit", "vulnerability patching"
    ],
    allowedSprintThemes: [
      "threats", "identity", "logging", "hardening", "response", "defense", "auditing"
    ],
    allowedProjectCategories: [
      "vulnerability audit", "secure login flow", "threat detection lab", "policy checklist", 
      "iam controls matrix", "incident response playbook"
    ]
  },
  "Cloud Engineering": {
    allowedTopics: [
      "cloud", "aws", "azure", "gcp", "infrastructure", "kubernetes", "docker", "containers", 
      "terraform", "iac", "serverless", "cloud architecture", "virtualization", "networking", 
      "load balancing", "vpc", "iam", "cloud security", "monitoring", "scaling"
    ],
    allowedSkills: [
      "cloud provisioning", "infrastructure deployment", "container orchestration", 
      "architecture designing", "cost optimization"
    ],
    allowedSprintThemes: [
      "infrastructure", "containers", "orchestration", "deployment", "scaling", "iac"
    ],
    allowedProjectCategories: [
      "cloud architecture diagram", "iac deployment script", "highly available cluster", "migration plan"
    ]
  },
  "DevOps": {
    allowedTopics: [
      "devops", "ci/cd", "pipelines", "jenkins", "github actions", "gitlab", "docker", "kubernetes", 
      "ansible", "terraform", "monitoring", "prometheus", "grafana", "linux", "bash", "shell scripting", 
      "configuration management", "site reliability", "sre", "gitops"
    ],
    allowedSkills: [
      "pipeline building", "automation scripting", "monitoring setup", "configuration automation", 
      "incident remediation"
    ],
    allowedSprintThemes: [
      "ci/cd", "automation", "infrastructure", "monitoring", "reliability", "pipelines"
    ],
    allowedProjectCategories: [
      "ci/cd pipeline", "monitoring dashboard", "infrastructure playbook", "kubernetes deployment"
    ]
  },
  "AI/ML": {
    allowedTopics: [
      "ai", "ml", "machine learning", "artificial intelligence", "deep learning", "neural networks", 
      "llms", "large language models", "nlp", "natural language processing", "computer vision", 
      "rag", "prompt engineering", "model training", "fine-tuning", "vector databases", 
      "tensorflow", "pytorch", "transformers", "reinforcement learning"
    ],
    allowedSkills: [
      "model training", "fine-tuning", "prompt tuning", "rag orchestration", 
      "deep learning modeling", "neural network designing"
    ],
    allowedSprintThemes: [
      "modeling", "deep learning", "nlp", "llms", "applied ai", "evaluation", "vector db"
    ],
    allowedProjectCategories: [
      "document assistant", "model card", "evaluation report", "rag chatbot", "fine-tuned model"
    ]
  },
  "Business Analysis": {
    allowedTopics: [
      "business analysis", "requirements gathering", "process mapping", "stakeholder communication", 
      "use cases", "user stories", "gap analysis", "functional specs", "sql", "excel", "data analysis", 
      "business intelligence", "agile", "scrum", "jira", "metrics", "kpis"
    ],
    allowedSkills: [
      "requirements elicitation", "process mapping", "gap analysis", "user story writing", 
      "data analysis", "visual reports creation"
    ],
    allowedSprintThemes: [
      "elicitation", "process mapping", "gap analysis", "requirements specification", "testing", "agile"
    ],
    allowedProjectCategories: [
      "requirements document", "process map diagram", "gap analysis workbook", "business report"
    ]
  },
  "Digital Marketing": {
    allowedTopics: [
      "marketing", "growth", "seo", "search engine optimization", "sem", "content marketing", "brand", 
      "campaigns", "email marketing", "copywriting", "analytics", "google analytics", "hubspot", 
      "acquisition funnels", "social media", "a/b testing", "conversion rates", "ppc", "advertising"
    ],
    allowedSkills: [
      "seo copywriting", "campaign setup", "funnel design", "metrics analysis", 
      "a/b test setup", "ads optimization"
    ],
    allowedSprintThemes: [
      "seo content", "campaigns planning", "copywriting assets", "funnels analysis", "a/b testing"
    ],
    allowedProjectCategories: [
      "campaign plan", "seo content system", "email funnel", "landing page test", "growth dashboard"
    ]
  }
};

export function getDomainKnowledgeMapKey(goal: string, domainLabel: string): string {
  const normalizedGoal = goal.toLowerCase();
  const normalizedDomain = domainLabel.toLowerCase();

  if (
    normalizedGoal.includes("data scientist") || 
    normalizedGoal.includes("data science") || 
    (normalizedDomain.includes("data") && normalizedGoal.includes("science"))
  ) {
    return "Data Science";
  }

  if (
    normalizedDomain.includes("software") || 
    normalizedDomain.includes("developer") || 
    normalizedDomain.includes("engineering") ||
    ["sde", "swe", "programming", "frontend", "backend", "full stack", "fullstack", "web"].some(term => normalizedGoal.includes(term))
  ) {
    return "Software Engineering";
  }

  if (
    normalizedDomain.includes("devops") || 
    normalizedGoal.includes("devops") || 
    normalizedGoal.includes("site reliability") || 
    normalizedGoal.includes("sre")
  ) {
    return "DevOps";
  }

  if (
    normalizedDomain.includes("cloud") || 
    normalizedGoal.includes("cloud") || 
    normalizedGoal.includes("aws") || 
    normalizedGoal.includes("azure") || 
    normalizedGoal.includes("gcp")
  ) {
    return "Cloud Engineering";
  }

  if (
    normalizedDomain.includes("ai") || 
    normalizedDomain.includes("machine learning") || 
    ["ai", "ml", "machine learning", "nlp", "llm", "rag", "neural", "deep learning"].some(term => normalizedGoal.includes(term))
  ) {
    return "AI/ML";
  }

  if (
    normalizedDomain.includes("design") || 
    normalizedDomain.includes("ux") || 
    normalizedDomain.includes("ui") ||
    ["design", "ux", "ui", "interaction", "experience"].some(term => normalizedGoal.includes(term))
  ) {
    return "UI/UX Design";
  }

  if (
    normalizedDomain.includes("product") || 
    ["product", "pm", "roadmap", "discovery"].some(term => normalizedGoal.includes(term))
  ) {
    return "Product Management";
  }

  if (
    normalizedDomain.includes("security") || 
    normalizedDomain.includes("cyber") || 
    ["security", "cyber", "infosec", "pentest", "soc"].some(term => normalizedGoal.includes(term))
  ) {
    return "Cybersecurity";
  }

  if (
    normalizedGoal.includes("business analyst") || 
    normalizedGoal.includes("business analysis") || 
    normalizedGoal.includes("requirements")
  ) {
    return "Business Analysis";
  }

  if (
    normalizedDomain.includes("marketing") || 
    normalizedDomain.includes("growth") ||
    ["marketing", "growth", "seo", "campaign"].some(term => normalizedGoal.includes(term))
  ) {
    return "Digital Marketing";
  }

  if (normalizedDomain.includes("data") || normalizedDomain.includes("analytics")) {
    return "Business Analysis";
  }

  return "Software Engineering";
}

export function isTextAlignedWithDomain(text: string, domainKey: string): boolean {
  const normalizedText = text.toLowerCase();
  const map = DOMAIN_KNOWLEDGE_MAPS[domainKey];
  if (!map) return true;

  // Domain key containment (e.g. "Software Engineering" matches "software engineering")
  if (normalizedText.includes(domainKey.toLowerCase())) return true;
  
  // Specific cross-domain boundary leniency to prevent false-positives
  if (domainKey === "Software Engineering" && (normalizedText.includes("software") || normalizedText.includes("developer") || normalizedText.includes("engineering") || normalizedText.includes("sde") || normalizedText.includes("swe") || normalizedText.includes("coding"))) return true;
  if (domainKey === "Data Science" && (normalizedText.includes("data") || normalizedText.includes("analytics") || normalizedText.includes("science") || normalizedText.includes("analysis") || normalizedText.includes("statistics"))) return true;
  if (domainKey === "AI/ML" && (normalizedText.includes("ai") || normalizedText.includes("ml") || normalizedText.includes("machine learning") || normalizedText.includes("intelligence") || normalizedText.includes("data"))) return true;
  if (domainKey === "Business Analysis" && (normalizedText.includes("business") || normalizedText.includes("analyst") || normalizedText.includes("analysis") || normalizedText.includes("data") || normalizedText.includes("analytics") || normalizedText.includes("bi") || normalizedText.includes("requirements"))) return true;
  if (domainKey === "UI/UX Design" && (normalizedText.includes("design") || normalizedText.includes("ux") || normalizedText.includes("ui") || normalizedText.includes("interaction") || normalizedText.includes("experience"))) return true;
  if (domainKey === "Product Management" && (normalizedText.includes("product") || normalizedText.includes("pm") || normalizedText.includes("roadmap") || normalizedText.includes("feature"))) return true;
  if (domainKey === "Cybersecurity" && (normalizedText.includes("security") || normalizedText.includes("cyber") || normalizedText.includes("infosec") || normalizedText.includes("protect"))) return true;
  if (domainKey === "Cloud Engineering" && (normalizedText.includes("cloud") || normalizedText.includes("aws") || normalizedText.includes("azure") || normalizedText.includes("gcp") || normalizedText.includes("infrastructure"))) return true;
  if (domainKey === "DevOps" && (normalizedText.includes("devops") || normalizedText.includes("ci/cd") || normalizedText.includes("pipeline") || normalizedText.includes("automation") || normalizedText.includes("sre"))) return true;
  if (domainKey === "Digital Marketing" && (normalizedText.includes("marketing") || normalizedText.includes("growth") || normalizedText.includes("seo") || normalizedText.includes("social") || normalizedText.includes("brand"))) return true;

  const checkMatch = (item: string) => {
    if (item.length <= 2) {
      const escaped = item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`(^|\\W)${escaped}(\\W|$)`, "i");
      return regex.test(normalizedText);
    }
    return normalizedText.includes(item);
  };

  const matchTopic = map.allowedTopics.some(checkMatch);
  if (matchTopic) return true;

  const matchSkill = map.allowedSkills.some(checkMatch);
  if (matchSkill) return true;

  const matchTheme = map.allowedSprintThemes.some(checkMatch);
  if (matchTheme) return true;

  const matchCategory = map.allowedProjectCategories.some(checkMatch);
  if (matchCategory) return true;

  return false;
}

export function validateRoadmapDomainConsistency(
  roadmap: RoadmapRecord,
  goalOrProfile: string | DomainProfile,
  options: { throwOnError?: boolean } = { throwOnError: true }
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  // Separate metadata validation from semantic validation.
  if (!roadmap.title || !roadmap.title.trim()) {
    const errMsg = "Missing roadmap title";
    if (options.throwOnError) {
      throw new MissingRoadmapTitleError(errMsg);
    } else {
      warnings.push(errMsg);
      return { valid: false, warnings };
    }
  }

  if (!roadmap.career_domain || !roadmap.career_domain.trim()) {
    const errMsg = "Missing roadmap metadata: career_domain is empty";
    if (options.throwOnError) {
      throw new MissingRoadmapMetadataError(errMsg);
    } else {
      warnings.push(errMsg);
      return { valid: false, warnings };
    }
  }

  if (
    !roadmap.summary || !roadmap.summary.trim() || 
    !roadmap.milestones || !Array.isArray(roadmap.milestones) || roadmap.milestones.length === 0
  ) {
    const errMsg = "Incomplete roadmap record";
    if (options.throwOnError) {
      throw new IncompleteRoadmapRecordError(errMsg);
    } else {
      warnings.push(errMsg);
      return { valid: false, warnings };
    }
  }

  const profile = typeof goalOrProfile === "string" ? pickDomain(goalOrProfile) : goalOrProfile;
  const goalStr = typeof goalOrProfile === "string" ? goalOrProfile : profile.label;
  const roadmapDomain = normalizeText(roadmap.career_domain || "");
  const expectedDomain = normalizeText(profile.label);
  const aliasAllowed = profile.aliases.some((alias) => normalizeText(alias) === roadmapDomain);

  const domainKey = getDomainKnowledgeMapKey(goalStr, profile.label);
  const isDomainOk = 
    roadmapDomain === expectedDomain ||
    aliasAllowed ||
    isTextAlignedWithDomain(roadmapDomain, domainKey) ||
    isTextAlignedWithDomain(roadmap.title || "", domainKey);

  if (!isDomainOk) {
    const errorDetails = {
      roadmapTitle: roadmap.title,
      careerDomain: profile.label,
      mismatchReason: `Critical domain mismatch: '${roadmapDomain || roadmap.title}' does not align with allowed topics for ${profile.label}`,
      severity: "critical"
    };
    const errMsg = `Roadmap domain mismatch: ${JSON.stringify(errorDetails)}`;
    if (options.throwOnError) {
      throw new Error(errMsg);
    } else {
      warnings.push(errMsg);
    }
  }

  // Check if title is semantically aligned with the domain
  const isTitleOk = isTextAlignedWithDomain(roadmap.title || "", domainKey);
  if (!isTitleOk) {
    const errorDetails = {
      roadmapTitle: roadmap.title,
      careerDomain: profile.label,
      mismatchReason: `Semantic Mismatch: Roadmap title '${roadmap.title}' does not align with allowed topics for ${profile.label}`,
      severity: "warning"
    };
    const errMsg = `Roadmap domain mismatch: ${JSON.stringify(errorDetails)}`;
    if (options.throwOnError) {
      throw new Error(errMsg);
    } else {
      warnings.push(errMsg);
    }
  }

  const textBlob = roadmapTextBlob(roadmap).toLowerCase();

  // Multi-domain strict consistency checks using generalized keyword dictionaries
  const disallowedKeywords = DOMAIN_DISALLOWED_KEYWORDS[profile.label];
  if (disallowedKeywords) {
    const matched = disallowedKeywords.filter((keyword) => {
      const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`(^|\\W)${escaped}(\\W|$)`, "i");
      if (regex.test(textBlob)) {
        if (keyword === "management") {
          const cleanText = textBlob
            .replace(/project management/g, "")
            .replace(/management tool/g, "")
            .replace(/state management/g, "")
            .replace(/package management/g, "");
          return regex.test(cleanText);
        }
        if (keyword === "system design") {
          const cleanText = textBlob.replace(/design systems?/g, "");
          return regex.test(cleanText);
        }
        return true;
      }
      return false;
    });

    if (matched.length > 0) {
      const errorDetails = {
        roadmapTitle: roadmap.title,
        careerDomain: profile.label,
        mismatchReason: `Critical domain mismatch: ${profile.label} roadmaps must not contain disallowed keyword '${matched[0]}'.`,
        severity: "critical"
      };
      const errMsg = `Roadmap domain mismatch: ${JSON.stringify(errorDetails)}`;
      if (options.throwOnError) {
        throw new Error(errMsg);
      } else {
        warnings.push(errMsg);
      }
    }
  }
  
  if (textContainsAny(textBlob, ["programming fundamentals"])) {
    if (["operations and strategy", "marketing and growth", "design and ux", "research and academia"].includes(expectedDomain)) {
      const errorDetails = {
        roadmapTitle: roadmap.title,
        careerDomain: profile.label,
        mismatchReason: `Semantic Mismatch: 'Programming Fundamentals' cannot map to ${profile.label}`,
        severity: "warning"
      };
      const errMsg = `Roadmap domain mismatch: ${JSON.stringify(errorDetails)}`;
      if (options.throwOnError) {
        throw new Error(errMsg);
      } else {
        warnings.push(errMsg);
      }
    }
  }

  if (textContainsAny(textBlob, ["git & github", "git and github"])) {
    if (["research and academia", "design and ux", "marketing and growth"].includes(expectedDomain)) {
      const errorDetails = {
        roadmapTitle: roadmap.title,
        careerDomain: profile.label,
        mismatchReason: `Semantic Mismatch: 'Git & GitHub' cannot map to ${profile.label}`,
        severity: "warning"
      };
      const errMsg = `Roadmap domain mismatch: ${JSON.stringify(errorDetails)}`;
      if (options.throwOnError) {
        throw new Error(errMsg);
      } else {
        warnings.push(errMsg);
      }
    }
  }

  if (textContainsAny(textBlob, ["ui design"])) {
    if (textContainsAny(textBlob, ["backend development", "backend systems", "database", "sql"])) {
      const errorDetails = {
        roadmapTitle: roadmap.title,
        careerDomain: profile.label,
        mismatchReason: `Semantic Mismatch: 'UI Design' cannot map to Backend Engineering`,
        severity: "warning"
      };
      const errMsg = `Roadmap domain mismatch: ${JSON.stringify(errorDetails)}`;
      if (options.throwOnError) {
        throw new Error(errMsg);
      } else {
        warnings.push(errMsg);
      }
    }
  }

  if (textContainsAny(textBlob, ["sql analytics"])) {
    if (["design and ux"].includes(expectedDomain)) {
      const errorDetails = {
        roadmapTitle: roadmap.title,
        careerDomain: profile.label,
        mismatchReason: `Semantic Mismatch: 'SQL Analytics' cannot map to ${profile.label}`,
        severity: "warning"
      };
      const errMsg = `Roadmap domain mismatch: ${JSON.stringify(errorDetails)}`;
      if (options.throwOnError) {
        throw new Error(errMsg);
      } else {
        warnings.push(errMsg);
      }
    }
  }

  return {
    valid: warnings.length === 0,
    warnings
  };
}

export class MissingRoadmapTitleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MissingRoadmapTitleError";
  }
}

export class MissingRoadmapMetadataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MissingRoadmapMetadataError";
  }
}

export class IncompleteRoadmapRecordError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IncompleteRoadmapRecordError";
  }
}

export class DomainMismatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainMismatchError";
  }
}

export function validateRoadmapDomain(roadmap: RoadmapRecord, goal: string): void {
  // 1. Separate metadata validation from semantic validation.
  if (!roadmap.title || !roadmap.title.trim()) {
    throw new MissingRoadmapTitleError("Missing roadmap title");
  }
  if (!roadmap.career_domain || !roadmap.career_domain.trim()) {
    throw new MissingRoadmapMetadataError("Missing roadmap metadata: career_domain is empty");
  }
  if (
    !roadmap.summary || !roadmap.summary.trim() || 
    !roadmap.milestones || !Array.isArray(roadmap.milestones) || roadmap.milestones.length === 0
  ) {
    throw new IncompleteRoadmapRecordError("Incomplete roadmap record");
  }

  const profile = pickDomain(goal);
  
  // 2. Strict Domain Locking: Every sprint must inherit roadmap.career_domain
  if (roadmap.career_domain !== profile.label) {
    throw new DomainMismatchError(
      `Critical domain mismatch: Roadmap domain '${roadmap.career_domain}' does not match career goal domain '${profile.label}'`
    );
  }

  const milestones = toArray<RoadmapMilestoneRecord>(roadmap.milestones);
  const resourceLinks = toArray<RoadmapResourceLink>(roadmap.resource_links);
  const learningOutcomes = toArray<string>(roadmap.learning_outcomes);
  const expectedOutcomes = toArray<string>(roadmap.expected_outcomes);

  // 3. Roadmap Quality Gate checks
  if (learningOutcomes.length === 0 && expectedOutcomes.length === 0) {
    throw new RoadmapQualityGateError("Roadmap is missing outcomes");
  }

  const allResources = [
    ...resourceLinks,
    ...milestones.flatMap((m) => toArray<RoadmapResourceLink>(m.resource_links))
  ];
  if (allResources.length === 0) {
    throw new RoadmapQualityGateError("Roadmap is missing resource links");
  }

  // Scan title, summary, outcomes, tasks
  const textToCheck = [
    roadmap.title || "",
    roadmap.summary || "",
    ...learningOutcomes,
    ...toArray<string>(roadmap.project_tasks),
    ...expectedOutcomes,
    ...milestones.flatMap((m) => [
      m.title || "",
      m.why_it_matters || "",
      ...toArray<string>(m.completion_criteria),
      ...toArray<string>(m.projects),
      ...toArray<string>(m.project_tasks),
      ...toArray<string>(m.deliverables),
      ...toArray<string>(m.expected_outcomes)
    ])
  ].join(" ").toLowerCase();

  // Multi-domain semantic validation using keyword dictionaries
  const disallowedKeywords = DOMAIN_DISALLOWED_KEYWORDS[profile.label];
  if (disallowedKeywords) {
    disallowedKeywords.forEach((keyword) => {
      const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`(^|\\W)${escaped}(\\W|$)`, "i");
      if (regex.test(textToCheck)) {
        if (keyword === "management") {
          const cleanText = textToCheck
            .replace(/project management/g, "")
            .replace(/management tool/g, "")
            .replace(/state management/g, "")
            .replace(/package management/g, "");
          if (!regex.test(cleanText)) {
            return;
          }
        }
        if (keyword === "system design") {
          const cleanText = textToCheck.replace(/design systems?/g, "");
          if (!regex.test(cleanText)) {
            return;
          }
        }
        throw new DomainMismatchError(`${profile.label} roadmap contains disallowed keyword: '${keyword}'`);
      }
    });
  }

  // SDE Allowed and Disallowed resource providers check
  if (profile.label === "Software Engineering") {
    const allowedProviders = new Set([
      "MDN", "Roadmap.sh", "freeCodeCamp", "Microsoft Learn", "Node.js", "React", 
      "TypeScript", "GitHub", "LeetCode", "GeeksForGeeks", "NeetCode", "CS50", "Official Documentation", "PostgreSQL", "Microsoft"
    ]);

    const blockedResourceProviders = ["NCBI", "Research Papers", "Academic Journals", "UX Resources", "Figma Resources"];

    allResources.forEach((res) => {
      const providerLower = (res.provider || "").toLowerCase();
      const labelLower = (res.label || "").toLowerCase();
      
      blockedResourceProviders.forEach((blocked) => {
        if (providerLower.includes(blocked.toLowerCase()) || labelLower.includes(blocked.toLowerCase())) {
          throw new DomainMismatchError(`Software Engineering roadmap contains blocked resource provider/label: '${res.provider}'`);
        }
      });

      if (!allowedProviders.has(res.provider || "")) {
        throw new DomainMismatchError(`Software Engineering roadmap contains disallowed resource provider: '${res.provider}'`);
      }
    });
  }
}

export function validateGeneratedRoadmap(
  roadmap: RoadmapRecord,
  goal: string,
  options: { throwOnError?: boolean } = { throwOnError: false }
): { valid: boolean; warnings: string[] } {
  const profile = pickDomain(goal);
  const domainKey = getDomainKnowledgeMapKey(goal, profile.label);
  const warnings: string[] = [];

  const addWarning = (mismatchReason: string) => {
    const errorDetails = {
      roadmapTitle: roadmap.title,
      careerDomain: profile.label,
      mismatchReason,
      severity: "warning"
    };
    const errMsg = `Roadmap domain mismatch: ${JSON.stringify(errorDetails)}`;
    warnings.push(errMsg);
  };

  const roadmapDomain = roadmap.career_domain || "";
  const roadmapTitle = roadmap.title || "";
  const isDomainOk = 
    normalizeText(roadmapDomain) === normalizeText(profile.label) ||
    profile.aliases.some(alias => normalizeText(alias) === roadmapDomain) ||
    isTextAlignedWithDomain(roadmapDomain, domainKey) ||
    isTextAlignedWithDomain(roadmapTitle, domainKey);

  if (!isDomainOk) {
    addWarning(`Roadmap title/domain '${roadmapDomain || roadmapTitle}' does not align with allowed skills for ${profile.label}`);
  }

  const milestones = toArray<RoadmapMilestoneRecord>(roadmap.milestones);
  milestones.forEach((milestone, idx) => {
    if (!isTextAlignedWithDomain(milestone.title, domainKey)) {
      addWarning(`Milestone ${idx + 1} title '${milestone.title}' does not align with allowed skills for ${profile.label}`);
    }
  });

  milestones.forEach((milestone, idx) => {
    const outcomes = toArray<string>(milestone.expected_outcomes);
    outcomes.forEach((outcome) => {
      if (!isTextAlignedWithDomain(outcome, domainKey)) {
        addWarning(`Milestone ${idx + 1} expected outcome '${outcome}' does not align with allowed skills for ${profile.label}`);
      }
    });
  });

  const learningOutcomes = toArray<string>(roadmap.learning_outcomes);
  learningOutcomes.forEach((outcome) => {
    if (!isTextAlignedWithDomain(outcome, domainKey)) {
      addWarning(`Learning outcome '${outcome}' does not align with allowed skills for ${profile.label}`);
    }
  });

  const projectTasks = toArray<string>(roadmap.project_tasks);
  projectTasks.forEach((task) => {
    if (!isTextAlignedWithDomain(task, domainKey)) {
      addWarning(`Project task '${task}' does not align with allowed skills for ${profile.label}`);
    }
  });

  if (warnings.length > 0 && options.throwOnError) {
    throw new Error(warnings[0]);
  }

  return {
    valid: warnings.length === 0,
    warnings
  };
}

export function auditRoadmapQuality(roadmaps: unknown, goalOrProfile: string | DomainProfile) {
  const profile = typeof goalOrProfile === "string" ? pickDomain(goalOrProfile) : goalOrProfile;
  const safeRoadmaps = toArray<RoadmapRecord>(roadmaps);
  const domainKeywords = getDomainKeywords(profile);
  const disallowedKeywords = getDisallowedKeywords(profile);
  const allowedProviders = getAllowedProviders(profile);

  if (!safeRoadmaps.length) {
    return { qualityScore: 0, isValid: false, reasons: ["No roadmaps generated"] };
  }

  let score = 100;
  const reasons: string[] = [];

  safeRoadmaps.forEach((roadmap) => {
    try {
      validateRoadmapDomainConsistency(roadmap, profile);
    } catch {
      score -= 40;
      reasons.push(`Domain mismatch: ${roadmap.career_domain}`);
    }

    const roadmapResources = Array.isArray(roadmap.resource_links) ? roadmap.resource_links : [];
    roadmapResources.forEach((resource) => {
      if (!allowedProviders.has(resource.provider)) {
        score -= 8;
        reasons.push(`Disallowed resource provider: ${resource.provider}`);
      }
    });

    const textBlob = roadmapTextBlob(roadmap);
    if (textContainsAnyNegative(textBlob, disallowedKeywords)) {
      score -= 18;
      reasons.push(`Cross-domain contamination in roadmap: ${roadmap.title}`);
    }

    if (!textContainsAny(textBlob, domainKeywords)) {
      score -= 10;
      reasons.push(`Weak domain alignment in roadmap: ${roadmap.title}`);
    }
  });

  const qualityScore = Math.max(0, Math.min(100, Math.round(score)));
  return {
    qualityScore,
    isValid: qualityScore >= 85,
    reasons
  };
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
    id: generateId(),
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

function buildSoftwareEngineeringRoadmap(params: {
  goal: string;
  profile: DomainProfile;
  experience: ExperienceLevel;
  weeklyHours: number;
  readinessScore?: number;
  referenceDate: Date;
  version: number;
}) : RoadmapRecord {
  const readinessScore = typeof params.readinessScore === "number"
    ? Math.max(0, Math.min(100, params.readinessScore))
    : params.experience === "Senior"
      ? 82
      : params.experience === "Mid"
        ? 68
        : params.experience === "Switcher"
          ? 58
          : 46;
  const phaseConfigs = [
    {
      title: "Programming Fundamentals",
      why: "Build the core logic skills required to solve coding problems with confidence.",
      duration: Math.max(2, Math.round(params.weeklyHours * 0.12)),
      difficulty: chooseDifficulty(params.experience, 1),
      resources: resourceLinksFor(params.profile, "programming"),
      projects: ["Calculator", "Todo App"],
      tasks: ["Practice variables, loops, functions, and control flow", "Ship a calculator with clean input handling", "Build a todo app with persistent state"],
      deliverables: ["calculator", "todo app"],
      outcomes: ["write basic programs independently", "understand core programming patterns"]
    },
    {
      title: "Data Structures & Algorithms",
      why: "Strengthen problem-solving and interview readiness through structured practice.",
      duration: Math.max(2, Math.round(params.weeklyHours * 0.12)),
      difficulty: chooseDifficulty(params.experience, 2),
      resources: resourceLinksFor(params.profile, "algorithms"),
      projects: ["LeetCode practice set", "Algorithm notebook"],
      tasks: ["Solve arrays, strings, recursion, and hash map problems", "Review time and space complexity", "Document patterns and mistakes"],
      deliverables: ["problem-solving log", "complexity notes"],
      outcomes: ["solve common interview problems", "explain tradeoffs clearly"]
    },
    {
      title: "Git & GitHub",
      why: "Version control is required to collaborate and ship reliably as a software engineer.",
      duration: Math.max(1, Math.round(params.weeklyHours * 0.08)),
      difficulty: chooseDifficulty(params.experience, 1),
      resources: resourceLinksFor(params.profile, "git"),
      projects: ["Portfolio repository", "Git workflow cheat sheet"],
      tasks: ["Create branches and pull requests", "Practice commits, merges, and rebases", "Document a clean Git workflow"],
      deliverables: ["GitHub repo", "workflow cheat sheet"],
      outcomes: ["use Git confidently", "collaborate through pull requests"]
    },
    {
      title: "HTML/CSS/JavaScript",
      why: "Frontend fundamentals are the base for building usable web interfaces.",
      duration: Math.max(2, Math.round(params.weeklyHours * 0.12)),
      difficulty: chooseDifficulty(params.experience, 1),
      resources: resourceLinksFor(params.profile, "javascript"),
      projects: ["Portfolio Website"],
      tasks: ["Build responsive pages with semantic HTML", "Style layouts with modern CSS", "Add interactive JavaScript behavior"],
      deliverables: ["portfolio website", "responsive layout"],
      outcomes: ["build accessible static pages", "ship responsive UI"]
    },
    {
      title: "React & APIs",
      why: "Modern software engineering roles expect you to compose UI with data fetching.",
      duration: Math.max(2, Math.round(params.weeklyHours * 0.14)),
      difficulty: chooseDifficulty(params.experience, 2),
      resources: resourceLinksFor(params.profile, "react"),
      projects: ["Weather App"],
      tasks: ["Build components and reusable hooks", "Fetch and display API data", "Handle loading, error, and empty states"],
      deliverables: ["weather app", "API integration notes"],
      outcomes: ["build React interfaces", "consume APIs safely"]
    },
    {
      title: "Backend Development",
      why: "A strong engineer can build the server layer that supports product features.",
      duration: Math.max(2, Math.round(params.weeklyHours * 0.14)),
      difficulty: chooseDifficulty(params.experience, 2),
      resources: resourceLinksFor(params.profile, "backend"),
      projects: ["Blog Platform"],
      tasks: ["Create routes and controllers", "Add authentication and validation", "Design reusable server logic"],
      deliverables: ["backend API", "blog platform"],
      outcomes: ["design a server API", "structure backend code"]
    },
    {
      title: "Databases & SQL",
      why: "Persisted data is the backbone of real products and professional engineering work.",
      duration: Math.max(2, Math.round(params.weeklyHours * 0.12)),
      difficulty: chooseDifficulty(params.experience, 2),
      resources: resourceLinksFor(params.profile, "sql"),
      projects: ["Expense Tracker"],
      tasks: ["Model relational data", "Write queries and joins", "Connect an app to a database"],
      deliverables: ["database schema", "SQL query set"],
      outcomes: ["store and query data", "design relational schemas"]
    },
    {
      title: "Projects & Portfolio",
      why: "Portfolio projects prove your ability to ship complete software.",
      duration: Math.max(2, Math.round(params.weeklyHours * 0.14)),
      difficulty: chooseDifficulty(params.experience, 3),
      resources: resourceLinksFor(params.profile, "portfolio"),
      projects: ["Chat Application", "Project Management Tool"],
      tasks: ["Package your best project into a case study", "Improve README, demos, and screenshots", "Show architecture and tradeoffs"],
      deliverables: ["portfolio case study", "project demo"],
      outcomes: ["present a strong portfolio", "explain engineering decisions"]
    },
    {
      title: "System Design Basics",
      why: "System thinking helps you reason about scale, reliability, and maintainability.",
      duration: Math.max(1, Math.round(params.weeklyHours * 0.09)),
      difficulty: chooseDifficulty(params.experience, 3),
      resources: resourceLinksFor(params.profile, "system design"),
      projects: ["Full Stack SaaS"],
      tasks: ["Learn client-server, caching, and queues", "Sketch a simple architecture", "Identify bottlenecks and tradeoffs"],
      deliverables: ["system design notes", "architecture diagram"],
      outcomes: ["reason about scalable systems", "describe tradeoffs clearly"]
    },
    {
      title: "Interview Preparation",
      why: "The final step is converting skills into an interview-ready narrative.",
      duration: Math.max(1, Math.round(params.weeklyHours * 0.05)),
      difficulty: chooseDifficulty(params.experience, 3),
      resources: resourceLinksFor(params.profile, "interview"),
      projects: ["Mock interview packet"],
      tasks: ["Practice behavioral and technical interview answers", "Review core algorithms and project stories", "Run mock interviews and refine responses"],
      deliverables: ["interview packet", "mock interview notes"],
      outcomes: ["communicate clearly in interviews", "convert projects into compelling stories"]
    }
  ];

  const milestones = phaseConfigs.map((phase) => makeMilestone({
    title: phase.title,
    whyItMatters: phase.why,
    estimatedDurationWeeks: phase.duration,
    difficultyLevel: phase.difficulty,
    completionCriteria: [
      `Complete the ${phase.title.toLowerCase()} checklist`,
      `Demonstrate a concrete artifact for ${phase.title.toLowerCase()}`,
      `Explain the learning outcome in your own words`
    ],
    resourceLinks: phase.resources,
    projects: phase.projects,
    projectTasks: phase.tasks,
    deliverables: phase.deliverables,
    expectedOutcomes: phase.outcomes
  }));

  const totalDuration = milestones.reduce((sum, milestone) => sum + milestone.estimated_duration_weeks, 0);
  const allResources = Array.from(new Map(milestones.flatMap((milestone) => milestone.resource_links).map((resource) => [resource.url, resource])).values());
  const projectTasks = Array.from(new Set(milestones.flatMap((milestone) => milestone.project_tasks)));
  const expectedOutcomes = Array.from(new Set(milestones.flatMap((milestone) => milestone.expected_outcomes)));
  const learningOutcomes = phaseConfigs.map((phase) => phase.outcomes[0]);

  return {
    id: generateId(),
    title: "Software Engineering: SDE-I roadmap",
    status: statusForProgress(Math.min(55, Math.max(25, Math.round(readinessScore * 0.55)))),
    summary: `A role-specific plan for ${params.goal} with software engineering foundations, projects, and interview prep.`,
    owner: "You",
    progress: Math.min(55, Math.max(25, Math.round(readinessScore * 0.55))),
    career_domain: "Software Engineering",
    career_demand_score: params.profile.demandScore,
    market_outlook: params.profile.marketOutlook,
    salary_range: params.profile.salaryRange,
    automation_risk: params.profile.automationRisk,
    roadmap_version: params.version,
    generated_at: params.referenceDate.toISOString(),
    ai_reasoning: `The selected career goal of ${params.goal} is locked to Software Engineering, so this roadmap stays in software engineering fundamentals, projects, and interview preparation only.`,
    weekly_schedule: [
      `${Math.max(2, Math.round(params.weeklyHours * 0.4))}h coding practice`,
      `${Math.max(1, Math.round(params.weeklyHours * 0.3))}h project work`,
      `${Math.max(1, Math.round(params.weeklyHours * 0.2))}h review and interview prep`
    ],
    learning_outcomes: learningOutcomes,
    total_duration_weeks: totalDuration,
    duration_weeks: totalDuration,
    weekly_hours: params.weeklyHours,
    estimated_completion_date: toIsoDate(addWeeks(params.referenceDate, Math.max(1, totalDuration))),
    resource_links: allResources,
    project_tasks: projectTasks,
    expected_outcomes: expectedOutcomes,
    milestones,
    updated_at: params.referenceDate.toISOString()
  };
}

function buildDataAnalyticsRoadmap(params: {
  goal: string;
  profile: DomainProfile;
  experience: ExperienceLevel;
  weeklyHours: number;
  readinessScore?: number;
  referenceDate: Date;
  version: number;
}) : RoadmapRecord {
  const readinessScore = typeof params.readinessScore === "number"
    ? Math.max(0, Math.min(100, params.readinessScore))
    : 50;

  const phaseConfigs = [
    {
      title: "Excel Foundations",
      why: "Master spreadsheets for business analytics and metric calculations.",
      duration: Math.max(2, Math.round(params.weeklyHours * 0.12)),
      difficulty: chooseDifficulty(params.experience, 1),
      resources: resourceLinksFor(params.profile, "analytics"),
      projects: ["Business Intelligence Report"],
      tasks: ["Practice pivot tables, lookup formulas, and nested conditions", "Clean raw CSV sales data and format it into tables"],
      deliverables: ["excel workbook"],
      outcomes: ["apply formulas and lookups", "synthesize business metrics"]
    },
    {
      title: "SQL Analytics",
      why: "Learn SQL for relational database queries and cohort metrics.",
      duration: Math.max(2, Math.round(params.weeklyHours * 0.14)),
      difficulty: chooseDifficulty(params.experience, 2),
      resources: resourceLinksFor(params.profile, "SQL"),
      projects: ["Customer Analytics", "Sales Dashboard"],
      tasks: ["Write SQL queries using joins, groupings, and filters", "Build query set for cohort customer churn analysis"],
      deliverables: ["sql script query set"],
      outcomes: ["query database metrics", "design relational lookups"]
    },
    {
      title: "Statistics Fundamentals",
      why: "Learn metrics distribution, standard deviation, and metrics synthesis.",
      duration: Math.max(2, Math.round(params.weeklyHours * 0.12)),
      difficulty: chooseDifficulty(params.experience, 1),
      resources: resourceLinksFor(params.profile, "analytics"),
      projects: ["Descriptive Stats Workbook"],
      tasks: ["Learn normal distribution, averages, and outliers", "Verify metric correlation coefficient for sales"],
      deliverables: ["stats sheet"],
      outcomes: ["apply statistical tools", "verify metric correlations"]
    },
    {
      title: "Power BI Dashboards",
      why: "Create interactive visual reports to communicate metrics.",
      duration: Math.max(2, Math.round(params.weeklyHours * 0.18)),
      difficulty: chooseDifficulty(params.experience, 2),
      resources: resourceLinksFor(params.profile, "Power BI"),
      projects: ["Sales Dashboard"],
      tasks: ["Import SQL dataset into Power BI", "Design responsive visual reports for metrics tracking"],
      deliverables: ["power bi dashboard file"],
      outcomes: ["build interactive dashboards", "design visual metrics flows"]
    },
    {
      title: "Python for Analytics",
      why: "Learn Python syntax, pandas, and data manipulation.",
      duration: Math.max(2, Math.round(params.weeklyHours * 0.14)),
      difficulty: chooseDifficulty(params.experience, 2),
      resources: resourceLinksFor(params.profile, "analytics"),
      projects: ["Customer Analytics Script"],
      tasks: ["Clean datasets using Pandas dataframes", "Build pipeline to automate CSV extraction and summary statistics"],
      deliverables: ["jupyter notebook"],
      outcomes: ["write basic python tools", "process pandas dataframes"]
    },
    {
      title: "Dashboard Building",
      why: "Learn advanced visualizations and business report publishing.",
      duration: Math.max(2, Math.round(params.weeklyHours * 0.15)),
      difficulty: chooseDifficulty(params.experience, 2),
      resources: resourceLinksFor(params.profile, "Power BI"),
      projects: ["Business Intelligence Report"],
      tasks: ["Design executive KPIs and interactive summary drilldowns", "Formulate data dictionary for corporate metrics"],
      deliverables: ["BI dashboard package"],
      outcomes: ["deploy actionable dashboards", "synthesize business trends"]
    },
    {
      title: "Interview Preparation",
      why: "Translate project deliverables into a job-market narrative.",
      duration: Math.max(2, Math.round(params.weeklyHours * 0.15)),
      difficulty: chooseDifficulty(params.experience, 3),
      resources: resourceLinksFor(params.profile, "analytics"),
      projects: ["Mock Interview Case Packet"],
      tasks: ["Review mock interview cases and analytical questions", "Package project artifacts into recruiter-ready case studies"],
      deliverables: ["interview narrative packet", "behavioral stories"],
      outcomes: ["explain technical tradeoffs", "present metrics analysis confidently"]
    }
  ];

  const milestones = phaseConfigs.map((phase) => makeMilestone({
    title: phase.title,
    whyItMatters: phase.why,
    estimatedDurationWeeks: phase.duration,
    difficultyLevel: phase.difficulty,
    completionCriteria: [
      `Complete the ${phase.title.toLowerCase()} checklist`,
      `Demonstrate a concrete artifact for ${phase.title.toLowerCase()}`,
      `Explain the learning outcome in your own words`
    ],
    resourceLinks: phase.resources,
    projects: phase.projects,
    projectTasks: phase.tasks,
    deliverables: phase.deliverables,
    expectedOutcomes: phase.outcomes
  }));

  const totalDuration = milestones.reduce((sum, milestone) => sum + milestone.estimated_duration_weeks, 0);
  const allResources = Array.from(new Map(milestones.flatMap((milestone) => milestone.resource_links).map((resource) => [resource.url, resource])).values());
  const projectTasks = Array.from(new Set(milestones.flatMap((milestone) => milestone.project_tasks)));
  const expectedOutcomes = Array.from(new Set(milestones.flatMap((milestone) => milestone.expected_outcomes)));
  const learningOutcomes = phaseConfigs.map((phase) => phase.outcomes[0]);

  return {
    id: generateId(),
    title: "Data and Analytics: Data Analyst roadmap",
    status: statusForProgress(Math.min(55, Math.max(25, Math.round(readinessScore * 0.55)))),
    summary: `A role-specific plan for ${params.goal} with data foundations, SQL, Excel, and dashboard building.`,
    owner: "You",
    progress: Math.min(55, Math.max(25, Math.round(readinessScore * 0.55))),
    career_domain: "Data and Analytics",
    career_demand_score: params.profile.demandScore,
    market_outlook: params.profile.marketOutlook,
    salary_range: params.profile.salaryRange,
    automation_risk: params.profile.automationRisk,
    roadmap_version: params.version,
    generated_at: params.referenceDate.toISOString(),
    ai_reasoning: `The selected career goal of ${params.goal} maps to Data and Analytics. This roadmap focuses strictly on business intelligence, statistics, SQL, Excel, and Power BI dashboards.`,
    weekly_schedule: [
      `${Math.max(2, Math.round(params.weeklyHours * 0.4))}h SQL and analytics practice`,
      `${Math.max(1, Math.round(params.weeklyHours * 0.3))}h dashboard work`,
      `${Math.max(1, Math.round(params.weeklyHours * 0.2))}h review and case prep`
    ],
    learning_outcomes: learningOutcomes,
    total_duration_weeks: totalDuration,
    duration_weeks: totalDuration,
    weekly_hours: params.weeklyHours,
    estimated_completion_date: toIsoDate(addWeeks(params.referenceDate, Math.max(1, totalDuration))),
    resource_links: allResources,
    project_tasks: projectTasks,
    expected_outcomes: expectedOutcomes,
    milestones,
    updated_at: params.referenceDate.toISOString()
  };
}

function buildDesignUxRoadmap(params: {
  goal: string;
  profile: DomainProfile;
  experience: ExperienceLevel;
  weeklyHours: number;
  readinessScore?: number;
  referenceDate: Date;
  version: number;
}) : RoadmapRecord {
  const readinessScore = typeof params.readinessScore === "number"
    ? Math.max(0, Math.min(100, params.readinessScore))
    : 50;

  const phaseConfigs = [
    {
      title: "Design Principles",
      why: "Understand contrast, alignment, typography, and visual systems.",
      duration: Math.max(2, Math.round(params.weeklyHours * 0.12)),
      difficulty: chooseDifficulty(params.experience, 1),
      resources: resourceLinksFor(params.profile, "ux"),
      projects: ["Visual Hierarchy Exercise"],
      tasks: ["Practice visual hierarchy, color theory, and type choices", "Analyze 3 popular app interfaces for layout systems"],
      deliverables: ["mobile app redesign case study"],
      outcomes: ["apply visual design principles", "compose design sheets"]
    },
    {
      title: "User Research",
      why: "Gather user insights to solve actual usability problems.",
      duration: Math.max(2, Math.round(params.weeklyHours * 0.14)),
      difficulty: chooseDifficulty(params.experience, 1),
      resources: resourceLinksFor(params.profile, "ux"),
      projects: ["UX Case Study"],
      tasks: ["Create 3 user personas", "Run 2 usability mock tests on a product prototype"],
      deliverables: ["user persona pack", "usability test log"],
      outcomes: ["conduct interviews", "document user journeys"]
    },
    {
      title: "Wireframing",
      why: "Translate user research into structured low-fidelity blueprints.",
      duration: Math.max(2, Math.round(params.weeklyHours * 0.12)),
      difficulty: chooseDifficulty(params.experience, 1),
      resources: resourceLinksFor(params.profile, "ux"),
      projects: ["Mobile App Redesign"],
      tasks: ["Sketch low-fidelity interface wires for 5 core screens", "Create information architecture hierarchy flows"],
      deliverables: ["low-fidelity wireframes"],
      outcomes: ["design clean screen blueprints", "organize application hierarchy"]
    },
    {
      title: "Figma",
      why: "Master high-fidelity interface design and advanced typography grids.",
      duration: Math.max(2, Math.round(params.weeklyHours * 0.18)),
      difficulty: chooseDifficulty(params.experience, 2),
      resources: resourceLinksFor(params.profile, "ux"),
      projects: ["Mobile App Redesign"],
      tasks: ["Practice autolayout, components, and responsive constraints", "Design pixel-perfect interfaces for 5 application screens"],
      deliverables: ["high-fidelity Figma designs"],
      outcomes: ["compose high-fidelity interfaces", "design semantic components"]
    },
    {
      title: "Prototyping",
      why: "Add interactive flow connections and animated transitions in Figma.",
      duration: Math.max(2, Math.round(params.weeklyHours * 0.14)),
      difficulty: chooseDifficulty(params.experience, 2),
      resources: resourceLinksFor(params.profile, "ux"),
      projects: ["High-Fi Interactive Prototype"],
      tasks: ["Build screen-to-screen interactive hotspots and custom animations", "Run visual walk-throughs to verify user flow transitions"],
      deliverables: ["interactive proto link"],
      outcomes: ["build interactive figma prototypes", "animate micro-interactions"]
    },
    {
      title: "Design Systems",
      why: "Learn components, accessibility, and visual guidelines.",
      duration: Math.max(2, Math.round(params.weeklyHours * 0.15)),
      difficulty: chooseDifficulty(params.experience, 3),
      resources: resourceLinksFor(params.profile, "accessibility"),
      projects: ["Design System"],
      tasks: ["Design 10 foundational UI components following Material guidelines", "Audit component visual standards for WCAG accessibility"],
      deliverables: ["reusable UI library"],
      outcomes: ["build accessible design systems", "create component libraries"]
    },
    {
      title: "Portfolio Development",
      why: "Convert case studies into an interview ready portfolio.",
      duration: Math.max(2, Math.round(params.weeklyHours * 0.15)),
      difficulty: chooseDifficulty(params.experience, 3),
      resources: resourceLinksFor(params.profile, "ux"),
      projects: ["UX Case Study"],
      tasks: ["Write 2 comprehensive case studies highlighting research and design decisions", "Format and launch personal portfolio showcase"],
      deliverables: ["portfolio website", "interview story deck"],
      outcomes: ["present UX case studies", "describe design decisions clearly"]
    }
  ];

  const milestones = phaseConfigs.map((phase) => makeMilestone({
    title: phase.title,
    whyItMatters: phase.why,
    estimatedDurationWeeks: phase.duration,
    difficultyLevel: phase.difficulty,
    completionCriteria: [
      `Complete the ${phase.title.toLowerCase()} checklist`,
      `Demonstrate a concrete artifact for ${phase.title.toLowerCase()}`,
      `Explain the learning outcome in your own words`
    ],
    resourceLinks: phase.resources,
    projects: phase.projects,
    projectTasks: phase.tasks,
    deliverables: phase.deliverables,
    expectedOutcomes: phase.outcomes
  }));

  const totalDuration = milestones.reduce((sum, milestone) => sum + milestone.estimated_duration_weeks, 0);
  const allResources = Array.from(new Map(milestones.flatMap((milestone) => milestone.resource_links).map((resource) => [resource.url, resource])).values());
  const projectTasks = Array.from(new Set(milestones.flatMap((milestone) => milestone.project_tasks)));
  const expectedOutcomes = Array.from(new Set(milestones.flatMap((milestone) => milestone.expected_outcomes)));
  const learningOutcomes = phaseConfigs.map((phase) => phase.outcomes[0]);

  return {
    id: generateId(),
    title: "Design and UX: UI/UX Designer roadmap",
    status: statusForProgress(Math.min(55, Math.max(25, Math.round(readinessScore * 0.55)))),
    summary: `A role-specific plan for ${params.goal} with visual design, Figma, prototyping, and UX case studies.`,
    owner: "You",
    progress: Math.min(55, Math.max(25, Math.round(readinessScore * 0.55))),
    career_domain: "Design and UX",
    career_demand_score: params.profile.demandScore,
    market_outlook: params.profile.marketOutlook,
    salary_range: params.profile.salaryRange,
    automation_risk: params.profile.automationRisk,
    roadmap_version: params.version,
    generated_at: params.referenceDate.toISOString(),
    ai_reasoning: `The selected career goal of ${params.goal} maps to Design and UX. This roadmap focuses on typography, layout systems, Figma prototyping, usability testing, and design systems.`,
    weekly_schedule: [
      `${Math.max(2, Math.round(params.weeklyHours * 0.4))}h Figma craft and layouts`,
      `${Math.max(1, Math.round(params.weeklyHours * 0.3))}h prototype systems`,
      `${Math.max(1, Math.round(params.weeklyHours * 0.2))}h case study writing`
    ],
    learning_outcomes: learningOutcomes,
    total_duration_weeks: totalDuration,
    duration_weeks: totalDuration,
    weekly_hours: params.weeklyHours,
    estimated_completion_date: toIsoDate(addWeeks(params.referenceDate, Math.max(1, totalDuration))),
    resource_links: allResources,
    project_tasks: projectTasks,
    expected_outcomes: expectedOutcomes,
    milestones,
    updated_at: params.referenceDate.toISOString()
  };
}

function buildCybersecurityRoadmap(params: {
  goal: string;
  profile: DomainProfile;
  experience: ExperienceLevel;
  weeklyHours: number;
  readinessScore?: number;
  referenceDate: Date;
  version: number;
}) : RoadmapRecord {
  const readinessScore = typeof params.readinessScore === "number"
    ? Math.max(0, Math.min(100, params.readinessScore))
    : 50;

  const phaseConfigs = [
    {
      title: "Threat Modeling",
      why: "Learn to identify vulnerabilities and assess infrastructure risk.",
      duration: Math.max(2, Math.round(params.weeklyHours * 0.20)),
      difficulty: chooseDifficulty(params.experience, 1),
      resources: resourceLinksFor(params.profile, "frameworks"),
      projects: ["Threat Model Diagram"],
      tasks: ["Sketch full architecture flow and list entry-points", "Document potential attack surface based on standard models"],
      deliverables: ["threat model report"],
      outcomes: ["identify security bottlenecks", "apply threat models"]
    },
    {
      title: "Identity & Access Management",
      why: "Enforce strict authentication and authorization systems.",
      duration: Math.max(2, Math.round(params.weeklyHours * 0.20)),
      difficulty: chooseDifficulty(params.experience, 1),
      resources: resourceLinksFor(params.profile, "identity"),
      projects: ["IAM Policy Schema"],
      tasks: ["Build role-based access schema for database models", "Write IAM policies following least-privilege guidelines"],
      deliverables: ["IAM controls matrix"],
      outcomes: ["configure secure access systems", "enforce least-privilege rules"]
    },
    {
      title: "Logging & Monitoring",
      why: "Configure event logs and audit systems to detect threats.",
      duration: Math.max(2, Math.round(params.weeklyHours * 0.20)),
      difficulty: chooseDifficulty(params.experience, 2),
      resources: resourceLinksFor(params.profile, "security"),
      projects: ["SIEM Alert Log Set"],
      tasks: ["Write alerting rules for SIEM event logs", "Audit database connections and transaction histories"],
      deliverables: ["siem alert rule set"],
      outcomes: ["design system logging rules", "detect threat behaviors"]
    },
    {
      title: "Hardening Systems",
      why: "Secure OS configurations, networking, and server ports.",
      duration: Math.max(2, Math.round(params.weeklyHours * 0.20)),
      difficulty: chooseDifficulty(params.experience, 2),
      resources: resourceLinksFor(params.profile, "cloud security"),
      projects: ["Secure Server Config Checklist"],
      tasks: ["Harden Linux server configuration settings", "Disable inactive services, open ports, and root logons"],
      deliverables: ["system hardening checklist"],
      outcomes: ["harden infrastructure security", "verify configurations"]
    },
    {
      title: "Incident Response",
      why: "Establish robust runbooks to isolate and mitigate security breaches.",
      duration: Math.max(2, Math.round(params.weeklyHours * 0.20)),
      difficulty: chooseDifficulty(params.experience, 3),
      resources: resourceLinksFor(params.profile, "security"),
      projects: ["Incident Playbook"],
      tasks: ["Write containment runbook for ransomware scenarios", "Document post-incident reporting templates and review checklists"],
      deliverables: ["incident response playbook"],
      outcomes: ["create threat response plans", "mitigate active breaches"]
    }
  ];

  const milestones = phaseConfigs.map((phase) => makeMilestone({
    title: phase.title,
    whyItMatters: phase.why,
    estimatedDurationWeeks: phase.duration,
    difficultyLevel: phase.difficulty,
    completionCriteria: [
      `Complete the ${phase.title.toLowerCase()} checklist`,
      `Demonstrate a concrete artifact for ${phase.title.toLowerCase()}`,
      `Explain the learning outcome in your own words`
    ],
    resourceLinks: phase.resources,
    projects: phase.projects,
    projectTasks: phase.tasks,
    deliverables: phase.deliverables,
    expectedOutcomes: phase.outcomes
  }));

  const totalDuration = milestones.reduce((sum, milestone) => sum + milestone.estimated_duration_weeks, 0);
  const allResources = Array.from(new Map(milestones.flatMap((milestone) => milestone.resource_links).map((resource) => [resource.url, resource])).values());
  const projectTasks = Array.from(new Set(milestones.flatMap((milestone) => milestone.project_tasks)));
  const expectedOutcomes = Array.from(new Set(milestones.flatMap((milestone) => milestone.expected_outcomes)));
  const learningOutcomes = phaseConfigs.map((phase) => phase.outcomes[0]);

  return {
    id: generateId(),
    title: "Cybersecurity: Security Analyst roadmap",
    status: statusForProgress(Math.min(55, Math.max(25, Math.round(readinessScore * 0.55)))),
    summary: `A role-specific plan for ${params.goal} with threat modeling, secure networking, SIEM logging, and infrastructure hardening.`,
    owner: "You",
    progress: Math.min(55, Math.max(25, Math.round(readinessScore * 0.55))),
    career_domain: "Cybersecurity",
    career_demand_score: params.profile.demandScore,
    market_outlook: params.profile.marketOutlook,
    salary_range: params.profile.salaryRange,
    automation_risk: params.profile.automationRisk,
    roadmap_version: params.version,
    generated_at: params.referenceDate.toISOString(),
    ai_reasoning: `The selected career goal of ${params.goal} maps to Cybersecurity. This roadmap focuses on threat defense, logging metrics, network audit, and NIST configurations.`,
    weekly_schedule: [
      `${Math.max(2, Math.round(params.weeklyHours * 0.4))}h secure network exercises`,
      `${Math.max(1, Math.round(params.weeklyHours * 0.3))}h SIEM logs configuration`,
      `${Math.max(1, Math.round(params.weeklyHours * 0.2))}h incident walkthroughs`
    ],
    learning_outcomes: learningOutcomes,
    total_duration_weeks: totalDuration,
    duration_weeks: totalDuration,
    weekly_hours: params.weeklyHours,
    estimated_completion_date: toIsoDate(addWeeks(params.referenceDate, Math.max(1, totalDuration))),
    resource_links: allResources,
    project_tasks: projectTasks,
    expected_outcomes: expectedOutcomes,
    milestones,
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

  if (profile.label === "Software Engineering") {
    const roadmap = buildSoftwareEngineeringRoadmap({
      goal: input.goal,
      profile,
      experience: input.experience,
      weeklyHours,
      readinessScore: input.readinessScore,
      referenceDate,
      version: 1
    });

    return {
      roadmaps: [roadmap],
      career_domain: profile.label,
      career_demand_score: profile.demandScore,
      market_outlook: profile.marketOutlook,
      salary_range: profile.salaryRange,
      automation_risk: profile.automationRisk,
      ai_reasoning: `The selected career goal of ${input.goal} maps to Software Engineering, so the roadmap stays locked to software engineering milestones, projects, and interview prep.`,
    };
  }

  if (profile.label === "Data and Analytics") {
    const roadmap = buildDataAnalyticsRoadmap({
      goal: input.goal,
      profile,
      experience: input.experience,
      weeklyHours,
      readinessScore: input.readinessScore,
      referenceDate,
      version: 1
    });

    return {
      roadmaps: [roadmap],
      career_domain: profile.label,
      career_demand_score: profile.demandScore,
      market_outlook: profile.marketOutlook,
      salary_range: profile.salaryRange,
      automation_risk: profile.automationRisk,
      ai_reasoning: `The selected career goal of ${input.goal} maps to Data and Analytics, locked strictly to business intelligence, SQL analytics, statistics, Power BI, and Python.`,
    };
  }

  if (profile.label === "Design and UX") {
    const roadmap = buildDesignUxRoadmap({
      goal: input.goal,
      profile,
      experience: input.experience,
      weeklyHours,
      readinessScore: input.readinessScore,
      referenceDate,
      version: 1
    });

    return {
      roadmaps: [roadmap],
      career_domain: profile.label,
      career_demand_score: profile.demandScore,
      market_outlook: profile.marketOutlook,
      salary_range: profile.salaryRange,
      automation_risk: profile.automationRisk,
      ai_reasoning: `The selected career goal of ${input.goal} maps to Design and UX, locked to user research, wireframing, Figma layouts, prototyping, and component UI design systems.`,
    };
  }

  if (profile.label === "Cybersecurity") {
    const roadmap = buildCybersecurityRoadmap({
      goal: input.goal,
      profile,
      experience: input.experience,
      weeklyHours,
      readinessScore: input.readinessScore,
      referenceDate,
      version: 1
    });

    return {
      roadmaps: [roadmap],
      career_domain: profile.label,
      career_demand_score: profile.demandScore,
      market_outlook: profile.marketOutlook,
      salary_range: profile.salaryRange,
      automation_risk: profile.automationRisk,
      ai_reasoning: `The selected career goal of ${input.goal} maps to Cybersecurity, locked to threat modeling, IAM permissions, SIEM logging, secure configurations, and incident response playbooks.`,
    };
  }

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
  const domainBlueprint = profile.label === "Software Engineering"
    ? [
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
    : [];

  return {
    system: "You are CareerOS, a professional career roadmap engine. Return only valid JSON. You MUST strictly respect all 'domain_constraints' specified in the user payload, including 'allowed_resources', 'allowed_phases', and 'disallowed_topics'. For example, if 'locked_career_domain' is 'Software Engineering', you must never include topics like Operations, Marketing, Business, Design, UI/UX (e.g., Figma, user research, wireframing, design systems), or Research/Academia (e.g., academic journals, research papers), and you must strictly adhere to the allowed phases and allowed resources list.",
    user: {
      goal: input.goal,
      experience: input.experience,
      weekly_hours: weeklyHours,
      readiness_score: input.readinessScore ?? null,
      locked_career_domain: profile.label,
      budget: input.budget ?? "unspecified",
      skills: input.skills ?? [],
      weaknesses: input.weaknesses ?? [],
      obstacles: input.obstacles ?? [],
      career_domain_hint: profile.label,
      domain_constraints: profile.label === "Software Engineering"
        ? {
            allowed_resources: [
              "CS50",
              "freeCodeCamp",
              "Roadmap.sh",
              "MDN",
              "GitHub",
              "React",
              "TypeScript",
              "LeetCode",
              "GeeksForGeeks",
              "Official Documentation",
              "Node.js",
              "PostgreSQL",
              "Microsoft"
            ],
            allowed_phases: domainBlueprint,
            disallowed_topics: ["operations", "research", "academia", "ux", "design", "marketing", "finance"]
          }
        : undefined,
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
