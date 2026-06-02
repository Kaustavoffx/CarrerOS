import type { SupabaseClient } from "@supabase/supabase-js";
import { createStarterWorkspace } from "./workspace";
import { auditRoadmapQuality, buildRoadmapPlan, resolveDomainProfile, validateRoadmapDomainConsistency, validateGeneratedRoadmap, validateRoadmapDomain } from "./roadmap-plan";
import { generateId } from "./id";
import type { AppData, ChatThread, ExperienceLevel, NoteRecord, ProgressRecord, RoadmapAuditReport, RoadmapAuditSourceReport, RoadmapDifficulty, RoadmapMilestoneRecord, RoadmapRecord, RoadmapResourceLink, RoadmapStatus, RoadmapVersionRecord, UserProfileRecord, WorkspaceSnapshotRecord } from "./supabase/types";

type ProfileWritePayload = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  goal: string | null;
  readiness_score: number;
  experience_level: ExperienceLevel | null;
  onboarding_complete: boolean;
  updated_at: string;
};

type RoadmapRow = {
  id: string;
  user_id: string;
  title: string;
  status: RoadmapStatus;
  summary: string;
  owner: string;
  progress: number;
  career_domain: string;
  career_demand_score: number;
  market_outlook: string;
  salary_range: string;
  automation_risk: string;
  roadmap_version: number;
  generated_at: string;
  ai_reasoning: string;
  weekly_schedule: string[];
  learning_outcomes: string[];
  total_duration_weeks: number;
  weekly_hours: number;
  estimated_completion_date: string;
  resource_links: RoadmapResourceLink[];
  project_tasks: string[];
  expected_outcomes: string[];
  milestones: RoadmapMilestoneRecord[];
  updated_at: string;
};

function toArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function toStringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim().length ? value : fallback;
}

function toNumberValue(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toPositiveNumber(value: unknown, fallback: number) {
  const numberValue = toNumberValue(value, fallback);
  return numberValue >= 0 ? numberValue : fallback;
}

export function auditRoadmapCollection(roadmaps: unknown): RoadmapAuditSourceReport {
  const items = toArray(roadmaps);
  let legacy = 0;
  let invalid = 0;
  let qualityScoreTotal = 0;

  items.forEach((item) => {
    const validation = validateRoadmap(item);
    qualityScoreTotal += validation.qualityScore;
    if (!validation.isValid) {
      legacy += 1;
    }

    const migrated = normalizeRoadmap(item);
    if (!validateRoadmap(migrated).isValid) {
      invalid += 1;
    }
  });

  return {
    total: items.length,
    legacy,
    migrated: legacy,
    invalid,
    qualityScore: items.length ? Math.round(qualityScoreTotal / items.length) : 100
  };
}

function normalizeStringArray(value: unknown, fallback: string[] = []) {
  const items = toArray<string>(value).map((item) => (typeof item === "string" ? item : String(item))).filter((item) => item.trim().length > 0);
  return items.length ? items : fallback;
}

function normalizeResourceLinks(value: unknown, fallback: RoadmapResourceLink[] = []) {
  const items = toArray(value).map(normalizeResourceLink);
  return items.length ? items : fallback;
}

function normalizeMilestones(value: unknown, fallback: RoadmapMilestoneRecord[] = []) {
  const items = toArray(value).map(normalizeMilestone);
  return items.length ? items : fallback;
}

type RoadmapValidationResult = {
  missingFields: string[];
  qualityScore: number;
  isValid: boolean;
};

export function validateRoadmap(roadmap: unknown): RoadmapValidationResult {
  const value = (roadmap ?? {}) as Record<string, unknown>;
  const missingFields: string[] = [];

  const requiredStringFields: Array<keyof RoadmapRecord> = [
    "title",
    "summary",
    "owner",
    "career_domain",
    "market_outlook",
    "salary_range",
    "automation_risk",
    "generated_at",
    "ai_reasoning",
    "estimated_completion_date",
    "updated_at"
  ];

  requiredStringFields.forEach((field) => {
    const raw = value[field as string];
    if (typeof raw !== "string" || !raw.trim().length) {
      missingFields.push(field);
    }
  });

  if (!Array.isArray(value.weekly_schedule) || !value.weekly_schedule.length) missingFields.push("weekly_schedule");
  if (!Array.isArray(value.resource_links) || !value.resource_links.length) missingFields.push("resource_links");
  if (!Array.isArray(value.project_tasks) || !value.project_tasks.length) missingFields.push("project_tasks");
  if (!Array.isArray(value.expected_outcomes) || !value.expected_outcomes.length) missingFields.push("expected_outcomes");
  if (!Array.isArray(value.milestones) || !value.milestones.length) missingFields.push("milestones");

  const numericChecks: Array<[string, unknown, boolean]> = [
    ["progress", value.progress, typeof value.progress === "number" && Number.isFinite(value.progress)],
    ["career_demand_score", value.career_demand_score ?? value.demand_score, typeof (value.career_demand_score ?? value.demand_score) === "number" && Number.isFinite(value.career_demand_score ?? value.demand_score)],
    ["roadmap_version", value.roadmap_version, typeof value.roadmap_version === "number" && Number.isFinite(value.roadmap_version)],
    ["total_duration_weeks", value.total_duration_weeks ?? value.duration_weeks, typeof (value.total_duration_weeks ?? value.duration_weeks) === "number" && Number.isFinite(value.total_duration_weeks ?? value.duration_weeks)],
    ["weekly_hours", value.weekly_hours, typeof value.weekly_hours === "number" && Number.isFinite(value.weekly_hours)]
  ];

  numericChecks.forEach(([field, raw, valid]) => {
    if (!valid || (typeof raw === "number" && raw <= 0 && field !== "progress")) {
      missingFields.push(field);
    }
  });

  const uniqueMissingFields = Array.from(new Set(missingFields));
  const requiredCount = requiredStringFields.length + 5;
  const qualityScore = Math.max(0, Math.round(((requiredCount - uniqueMissingFields.length) / requiredCount) * 100));

  return {
    missingFields: uniqueMissingFields,
    qualityScore,
    isValid: uniqueMissingFields.length === 0
  };
}

function buildLegacyRoadmapGoal(roadmap: Record<string, unknown>) {
  const isSde = 
    String(roadmap.career_domain || "").toLowerCase() === "software engineering" ||
    ["software", "frontend", "backend", "full stack", "fullstack", "developer", "engineering", "sde", "swe", "coding"].some(term => 
      String(roadmap.goal || "").toLowerCase().includes(term) ||
      String(roadmap.title || "").toLowerCase().includes(term) ||
      String(roadmap.summary || "").toLowerCase().includes(term)
    );

  if (isSde) {
    return "Software Engineering";
  }

  const goalSeed = [roadmap.goal, roadmap.title, roadmap.summary, roadmap.career_domain].find((item) => typeof item === "string" && item.trim().length);
  return typeof goalSeed === "string" ? goalSeed : "Career roadmap";
}

export function migrateLegacyRoadmap(roadmap: unknown): RoadmapRecord {
  const legacy = (roadmap ?? {}) as Record<string, unknown>;
  const validation = validateRoadmap(legacy);
  const generated = buildRoadmapPlan({
    goal: buildLegacyRoadmapGoal(legacy),
    experience: "Junior",
    weeklyHours: toPositiveNumber(legacy.weekly_hours ?? legacy.duration_weeks, 10),
    budget: "Free / Low-cost",
    skills: [],
    weaknesses: [],
    obstacles: [],
    referenceDate: legacy.updated_at ? new Date(String(legacy.updated_at)) : new Date()
  })[0];

  const migrated: RoadmapRecord = {
    ...generated,
    id: toStringValue(legacy.id, generated.id),
    title: toStringValue(legacy.title, generated.title),
    summary: toStringValue(legacy.summary ?? legacy.description, generated.summary),
    description: toStringValue(legacy.description ?? legacy.summary, generated.summary),
    owner: toStringValue(legacy.owner, generated.owner),
    progress: Math.min(100, Math.max(0, toPositiveNumber(legacy.progress, generated.progress))),
    career_domain: toStringValue(legacy.career_domain, generated.career_domain),
    career_demand_score: toPositiveNumber(legacy.career_demand_score ?? legacy.demand_score, generated.career_demand_score),
    demand_score: toPositiveNumber(legacy.career_demand_score ?? legacy.demand_score, generated.career_demand_score),
    market_outlook: toStringValue(legacy.market_outlook, generated.market_outlook),
    salary_range: toStringValue(legacy.salary_range, generated.salary_range),
    automation_risk: toStringValue(legacy.automation_risk, generated.automation_risk),
    roadmap_version: Math.max(1, Math.trunc(toPositiveNumber(legacy.roadmap_version, generated.roadmap_version))),
    generated_at: toStringValue(legacy.generated_at, generated.generated_at),
    ai_reasoning: toStringValue(legacy.ai_reasoning, generated.ai_reasoning),
    weekly_schedule: normalizeStringArray(legacy.weekly_schedule, generated.weekly_schedule),
    learning_outcomes: normalizeStringArray(legacy.learning_outcomes, generated.learning_outcomes),
    total_duration_weeks: toPositiveNumber(legacy.total_duration_weeks ?? legacy.duration_weeks, generated.total_duration_weeks),
    duration_weeks: toPositiveNumber(legacy.total_duration_weeks ?? legacy.duration_weeks, generated.total_duration_weeks),
    weekly_hours: Math.max(0, Math.trunc(toPositiveNumber(legacy.weekly_hours, generated.weekly_hours))),
    estimated_completion_date: toStringValue(legacy.estimated_completion_date, generated.estimated_completion_date),
    resource_links: normalizeResourceLinks(legacy.resource_links, generated.resource_links),
    project_tasks: normalizeStringArray(legacy.project_tasks, generated.project_tasks),
    expected_outcomes: normalizeStringArray(legacy.expected_outcomes, generated.expected_outcomes),
    milestones: normalizeMilestones(legacy.milestones, generated.milestones),
    updated_at: toStringValue(legacy.updated_at, generated.updated_at)
  };

  if (!validation.isValid) {
    console.error("ROADMAP MIGRATION NEEDED", {
      missingFields: validation.missingFields,
      qualityScore: validation.qualityScore,
      roadmap: legacy
    });
  }

  return migrated;
}

function normalizeResourceLink(value: unknown): RoadmapResourceLink {
  const resource = (value ?? {}) as Partial<RoadmapResourceLink>;
  return {
    label: toStringValue(resource.label, "Resource"),
    url: toStringValue(resource.url, "#"),
    provider: toStringValue(resource.provider, "CareerOS")
  };
}

function normalizeMilestone(value: unknown): RoadmapMilestoneRecord {
  const milestone = (value ?? {}) as Partial<RoadmapMilestoneRecord> & { difficulty_level?: unknown };
  const difficultyLevel = typeof milestone.difficulty_level === "string" && ["Beginner", "Intermediate", "Advanced"].includes(milestone.difficulty_level)
    ? (milestone.difficulty_level as RoadmapDifficulty)
    : "Beginner";

  return {
    title: toStringValue(milestone.title, "Untitled milestone"),
    why_it_matters: toStringValue(milestone.why_it_matters, "Not available"),
    estimated_duration_weeks: toPositiveNumber(milestone.estimated_duration_weeks, 0),
    difficulty_level: difficultyLevel,
    completion_criteria: toArray<string>(milestone.completion_criteria),
    resource_links: toArray(milestone.resource_links).map(normalizeResourceLink),
    projects: toArray<string>(milestone.projects),
    project_tasks: toArray<string>(milestone.project_tasks),
    deliverables: toArray<string>(milestone.deliverables),
    expected_outcomes: toArray<string>(milestone.expected_outcomes)
  };
}

function normalizeRoadmap(value: unknown): RoadmapRecord {
  const roadmap = (value ?? {}) as Partial<RoadmapRecord> & {
    description?: unknown;
    duration_weeks?: unknown;
    demand_score?: unknown;
  };
  const validation = validateRoadmap(roadmap);

  if (!validation.isValid) {
    return migrateLegacyRoadmap(roadmap);
  }

  return {
    id: toStringValue(roadmap.id, generateId()),
    title: toStringValue(roadmap.title, "Untitled roadmap"),
    status: typeof roadmap.status === "string" && ["Planned", "Active", "Done"].includes(roadmap.status) ? roadmap.status : "Planned",
    summary: toStringValue(roadmap.summary ?? roadmap.description, "Not available"),
    description: toStringValue(roadmap.description ?? roadmap.summary, "Not available"),
    owner: toStringValue(roadmap.owner, "You"),
    progress: Math.min(100, Math.max(0, toPositiveNumber(roadmap.progress, 0))),
    career_domain: toStringValue(roadmap.career_domain, "general"),
    career_demand_score: toPositiveNumber(roadmap.career_demand_score ?? roadmap.demand_score, 0),
    demand_score: toPositiveNumber(roadmap.career_demand_score ?? roadmap.demand_score, 0),
    market_outlook: toStringValue(roadmap.market_outlook, "Not available"),
    salary_range: toStringValue(roadmap.salary_range, "Not available"),
    automation_risk: toStringValue(roadmap.automation_risk, "Not available"),
    roadmap_version: Math.max(1, Math.trunc(toPositiveNumber(roadmap.roadmap_version, 1))),
    generated_at: toStringValue(roadmap.generated_at, new Date().toISOString()),
    ai_reasoning: toStringValue(roadmap.ai_reasoning, ""),
    weekly_schedule: toArray<string>(roadmap.weekly_schedule),
    learning_outcomes: toArray<string>(roadmap.learning_outcomes),
    total_duration_weeks: toPositiveNumber(roadmap.total_duration_weeks ?? roadmap.duration_weeks, 0),
    duration_weeks: toPositiveNumber(roadmap.total_duration_weeks ?? roadmap.duration_weeks, 0),
    weekly_hours: Math.max(0, Math.trunc(toPositiveNumber(roadmap.weekly_hours, 0))),
    estimated_completion_date: toStringValue(roadmap.estimated_completion_date, new Date().toISOString().slice(0, 10)),
    resource_links: normalizeResourceLinks(roadmap.resource_links),
    project_tasks: toArray<string>(roadmap.project_tasks),
    expected_outcomes: normalizeStringArray(roadmap.expected_outcomes, ["Not available"]),
    milestones: normalizeMilestones(roadmap.milestones),
    updated_at: toStringValue(roadmap.updated_at, new Date().toISOString())
  };
}

export function normalizeRoadmapArray(roadmaps: unknown) {
  return toArray<RoadmapRecord>(roadmaps).map((roadmap) => normalizeRoadmap(roadmap));
}

export function normalizeRoadmapVersionArray(versions: unknown) {
  return toArray<RoadmapVersionRecord>(versions).map((version) => ({
    ...version,
    roadmaps: normalizeRoadmapArray(version.roadmaps)
  }));
}

function stripUserId(roadmapRows: unknown) {
  return toArray<RoadmapRow>(roadmapRows).map((roadmapRow) => {
    const { user_id, ...roadmap } = roadmapRow;
    void user_id;
    return normalizeRoadmap(roadmap);
  });
}

function toRoadmapRow(roadmap: RoadmapRecord, userId: string): RoadmapRow {
  return {
    id: roadmap.id,
    user_id: userId,
    title: roadmap.title,
    status: roadmap.status,
    summary: roadmap.summary,
    owner: roadmap.owner,
    progress: roadmap.progress,
    career_domain: roadmap.career_domain,
    career_demand_score: roadmap.career_demand_score,
    market_outlook: roadmap.market_outlook,
    salary_range: roadmap.salary_range,
    automation_risk: roadmap.automation_risk,
    roadmap_version: roadmap.roadmap_version,
    generated_at: roadmap.generated_at,
    ai_reasoning: roadmap.ai_reasoning,
    weekly_schedule: toArray<string>(roadmap.weekly_schedule),
    learning_outcomes: toArray<string>(roadmap.learning_outcomes),
    total_duration_weeks: roadmap.total_duration_weeks,
    weekly_hours: roadmap.weekly_hours,
    estimated_completion_date: roadmap.estimated_completion_date,
    resource_links: toArray(roadmap.resource_links).map(normalizeResourceLink),
    project_tasks: toArray<string>(roadmap.project_tasks),
    expected_outcomes: toArray<string>(roadmap.expected_outcomes),
    milestones: toArray(roadmap.milestones).map(normalizeMilestone),
    updated_at: roadmap.updated_at
  };
}

async function resolveAuthenticatedUserId(client: SupabaseClient, fallbackUserId: string) {
  const { data } = await client.auth.getUser();
  const authUserId = data?.user?.id ?? fallbackUserId;
  return authUserId;
}

async function resolveCareerGoal(client: SupabaseClient, userId: string, fallbackGoal: string) {
  const { data } = await client.from("profiles").select("goal").eq("id", userId).maybeSingle<{ goal: string | null }>();
  return data?.goal || fallbackGoal;
}

async function getNextRoadmapVersion(client: SupabaseClient, userId: string) {
  const { data } = await client
    .from("roadmap_versions")
    .select("roadmap_version")
    .eq("user_id", userId)
    .order("roadmap_version", { ascending: false })
    .limit(1);

  const roadmapVersions = toArray<{ roadmap_version: number }>(data);
  return (roadmapVersions[0]?.roadmap_version ?? 0) + 1;
}

async function persistRoadmaps(client: SupabaseClient, userId: string, roadmaps: RoadmapRecord[], version: number) {
  const authUserId = await resolveAuthenticatedUserId(client, userId);
  const safeRoadmaps = normalizeRoadmapArray(roadmaps);

  if (!safeRoadmaps.length) {
    return;
  }

  const careerGoal = await resolveCareerGoal(client, authUserId, safeRoadmaps[0]?.career_domain ?? "Career roadmap");
  const domainProfile = resolveDomainProfile(careerGoal);

  safeRoadmaps.forEach((roadmap) => {
    validateRoadmapDomain(roadmap, careerGoal);
    validateRoadmapDomainConsistency(roadmap, domainProfile);
    const genCheck = validateGeneratedRoadmap(roadmap, careerGoal);
    if (!genCheck.valid) {
      console.warn("Generated Roadmap Semantic Warnings:", genCheck.warnings);
    }
  });

  const audit = auditRoadmapQuality(safeRoadmaps, domainProfile);
  console.log("ROADMAP QUALITY AUDIT", { userId: authUserId, careerGoal, qualityScore: audit.qualityScore, reasons: audit.reasons });

  if (audit.qualityScore < 85) {
    throw new Error(`Roadmap quality below threshold: ${audit.qualityScore}`);
  }

  await client.from("roadmaps").delete().eq("user_id", authUserId);

  const rows: RoadmapRow[] = safeRoadmaps.map((roadmap) => toRoadmapRow({ ...roadmap, roadmap_version: version }, authUserId));
  console.log("ROADMAP INSERT PAYLOAD", JSON.stringify(rows, null, 2));

  const { error } = await client.from("roadmaps").insert(rows);
  if (error) {
    console.error("FAILED TO PERSIST ROADMAPS", error);
    throw error;
  }
}

async function persistRoadmapVersion(client: SupabaseClient, userId: string, roadmaps: RoadmapRecord[], careerGoal: string, version: number) {
  const authUserId = await resolveAuthenticatedUserId(client, userId);
  const safeRoadmaps = normalizeRoadmapArray(roadmaps);

  if (!safeRoadmaps.length) {
    return;
  }
  const domainProfile = resolveDomainProfile(careerGoal);
  safeRoadmaps.forEach((roadmap) => {
    validateRoadmapDomain(roadmap, careerGoal);
    validateRoadmapDomainConsistency(roadmap, domainProfile);
    const genCheck = validateGeneratedRoadmap(roadmap, careerGoal);
    if (!genCheck.valid) {
      console.warn("Generated Roadmap Version Semantic Warnings:", genCheck.warnings);
    }
  });

  const audit = auditRoadmapQuality(safeRoadmaps, domainProfile);
  console.log("ROADMAP VERSION QUALITY AUDIT", { userId: authUserId, careerGoal, qualityScore: audit.qualityScore, reasons: audit.reasons });

  if (audit.qualityScore < 85) {
    throw new Error(`Roadmap quality below threshold: ${audit.qualityScore}`);
  }

  const primaryRoadmap = safeRoadmaps[0];
  const aiReasoning = primaryRoadmap.ai_reasoning || `CareerOS roadmap version ${version} generated from ${careerGoal}.`;

  const { error } = await client.from("roadmap_versions").insert({
    user_id: authUserId,
    roadmap_version: version,
    career_goal: careerGoal,
    career_domain: primaryRoadmap.career_domain,
    generated_at: new Date().toISOString(),
    ai_reasoning: aiReasoning,
    roadmaps: safeRoadmaps,
    progress: primaryRoadmap.progress,
    updated_at: new Date().toISOString()
  });

  if (error) {
    console.error("FAILED TO PERSIST ROADMAP VERSION", error);
    throw error;
  }
}

export async function loadAppData(client: SupabaseClient, userId: string): Promise<AppData> {
  const [profileResult, workspaceResult, roadmapRowsResult, roadmapHistoryResult] = await Promise.all([
    client.from("profiles").select("*").eq("id", userId).maybeSingle<UserProfileRecord>(),
    client.from("career_workspace_state").select("*").eq("user_id", userId).maybeSingle<WorkspaceSnapshotRecord>(),
    client.from("roadmaps").select("*").eq("user_id", userId).order("roadmap_version", { ascending: false }),
    client.from("roadmap_versions").select("*").eq("user_id", userId).order("roadmap_version", { ascending: false }).limit(12)
  ]);

  const roadmapRows = normalizeRoadmapArray(roadmapRowsResult.data) as RoadmapRow[];
  const roadmapHistory = normalizeRoadmapVersionArray(roadmapHistoryResult.data);
  const workspaceRoadmaps = normalizeRoadmapArray(workspaceResult.data?.roadmaps);
  const roadmapAudit: RoadmapAuditReport = {
    sources: {
      roadmapsTable: auditRoadmapCollection(roadmapRowsResult.data),
      workspaceState: auditRoadmapCollection(workspaceResult.data?.roadmaps),
      roadmapVersions: auditRoadmapCollection(roadmapHistoryResult.data)
    },
    legacyRoadmapCount: 0,
    migratedRoadmapCount: 0,
    invalidRoadmapCount: 0,
    qualityScore: 100
  };

  roadmapAudit.legacyRoadmapCount =
    roadmapAudit.sources.roadmapsTable.legacy +
    roadmapAudit.sources.workspaceState.legacy +
    roadmapAudit.sources.roadmapVersions.legacy;
  roadmapAudit.migratedRoadmapCount =
    roadmapAudit.sources.roadmapsTable.migrated +
    roadmapAudit.sources.workspaceState.migrated +
    roadmapAudit.sources.roadmapVersions.migrated;
  roadmapAudit.invalidRoadmapCount =
    roadmapAudit.sources.roadmapsTable.invalid +
    roadmapAudit.sources.workspaceState.invalid +
    roadmapAudit.sources.roadmapVersions.invalid;
  roadmapAudit.qualityScore = Math.round(
    (roadmapAudit.sources.roadmapsTable.qualityScore + roadmapAudit.sources.workspaceState.qualityScore + roadmapAudit.sources.roadmapVersions.qualityScore) / 3
  );

  console.info("ROADMAP AUDIT REPORT", roadmapAudit);
  const workspace = workspaceResult.data
    ? {
        ...workspaceResult.data,
        roadmaps: roadmapRows.length ? stripUserId(roadmapRows) : workspaceRoadmaps
      }
    : null;

  return {
    profile: profileResult.data ?? null,
    workspace,
    roadmapHistory,
    roadmapAudit
  };
}

export async function seedWorkspace(client: SupabaseClient, userId: string, fullName: string, goal: string, experience: ExperienceLevel, avatarUrl?: string | null, readinessScore?: number) {
  const seed = createStarterWorkspace(goal, experience, readinessScore);
  const normalizedRoadmaps = normalizeRoadmapArray(seed.workspace.roadmaps);

  const profile: ProfileWritePayload = {
    id: userId,
    full_name: fullName || seed.profile.full_name,
    avatar_url: avatarUrl ?? seed.profile.avatar_url,
    goal,
    readiness_score: seed.profile.readiness_score,
    experience_level: experience,
    onboarding_complete: true,
    updated_at: new Date().toISOString()
  };

  const workspace: WorkspaceSnapshotRecord = {
    ...seed.workspace,
    roadmaps: normalizedRoadmaps,
    user_id: userId,
    updated_at: new Date().toISOString()
  };

  try {
    const profileRes = await client.from("profiles").upsert(profile, { onConflict: "id" });
    const workspaceRes = await client.from("career_workspace_state").upsert(workspace, { onConflict: "user_id" });

    if (profileRes.error) {
      console.error("FAILED TO SEED PROFILE", profileRes.error);
      throw profileRes.error;
    }
    if (workspaceRes.error) {
      console.error("FAILED TO SEED WORKSPACE", workspaceRes.error);
      throw workspaceRes.error;
    }

    const version = await getNextRoadmapVersion(client, userId);
    await persistRoadmaps(client, userId, workspace.roadmaps, version);
    await persistRoadmapVersion(client, userId, workspace.roadmaps, goal, version);
  } catch (err) {
    console.error("FAILED TO SEED WORKSPACE", err);
    throw err;
  }
}

export async function updateProfile(client: SupabaseClient, userId: string, patch: Partial<Pick<UserProfileRecord, "full_name" | "avatar_url" | "goal" | "readiness_score" | "experience_level" | "onboarding_complete">>) {
  const payload = {
    id: userId,
    updated_at: new Date().toISOString(),
    ...patch
  };
  try {
    const res = await client.from("profiles").upsert(payload, { onConflict: "id" });

    if (res.error) {
      console.error("FAILED TO UPDATE PROFILE", res.error);
      throw res.error;
    }
  } catch (err) {
    console.error("FAILED TO UPDATE PROFILE", err);
    throw err;
  }
}

export async function updateWorkspace(client: SupabaseClient, userId: string, patch: Partial<WorkspaceSnapshotRecord>) {
  const { data: existing } = await client.from("career_workspace_state").select("*").eq("user_id", userId).maybeSingle<WorkspaceSnapshotRecord>();
  const existingRoadmaps = normalizeRoadmapArray(existing?.roadmaps);
  const existingProgress = toArray<ProgressRecord>(existing?.progress);
  const existingNotes = toArray<NoteRecord>(existing?.notes);
  const existingChats = toArray<ChatThread>(existing?.ai_chats);
  const nextValue: WorkspaceSnapshotRecord = {
    user_id: userId,
    roadmaps: normalizeRoadmapArray(patch.roadmaps ?? existingRoadmaps),
    progress: toArray<ProgressRecord>(patch.progress ?? existingProgress),
    notes: toArray<NoteRecord>(patch.notes ?? existingNotes),
    ai_chats: toArray<ChatThread>(patch.ai_chats ?? existingChats),
    updated_at: new Date().toISOString()
  };

  const { error } = await client.from("career_workspace_state").upsert(nextValue, { onConflict: "user_id" });
  if (error) {
    console.error("FAILED TO UPDATE WORKSPACE", error);
    throw error;
  }

  const version = await getNextRoadmapVersion(client, userId);
  await persistRoadmaps(client, userId, nextValue.roadmaps, version);
  await persistRoadmapVersion(client, userId, nextValue.roadmaps, nextValue.roadmaps[0]?.title ?? "Career roadmap", version);
}
