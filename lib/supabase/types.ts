export type ExperienceLevel = "Student" | "Junior" | "Mid" | "Senior" | "Switcher";
export type RoadmapStatus = "Planned" | "Active" | "Done";
export type RoadmapDifficulty = "Beginner" | "Intermediate" | "Advanced";
export type AiProviderName = "openai" | "gemini";

export type AiProviderStatusRecord = {
  provider: AiProviderName;
  connected: boolean;
  masked_key: string | null;
  created_at: string | null;
  updated_at: string | null;
  active: boolean;
};

export type RoadmapResourceLink = {
  label: string;
  url: string;
  provider: string;
};

export type RoadmapMilestoneRecord = {
  title: string;
  why_it_matters: string;
  estimated_duration_weeks: number;
  difficulty_level: RoadmapDifficulty;
  completion_criteria: string[];
  resource_links: RoadmapResourceLink[];
  projects: string[];
  project_tasks: string[];
  deliverables: string[];
  expected_outcomes: string[];
  notes?: string;
};

export type UserProfileRecord = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  goal: string | null;
  readiness_score: number;
  experience_level: ExperienceLevel | null;
  skills: string[];
  learning_style: string | null;
  budget: string | null;
  time_availability: string | null;
  weaknesses: string[];
  obstacles: string[];
  onboarding_complete: boolean;
  updated_at: string;
};

export type RoadmapRecord = {
  id: string;
  title: string;
  status: RoadmapStatus;
  summary: string;
  description?: string;
  owner: string;
  progress: number;
  career_domain: string;
  career_demand_score: number;
  demand_score?: number;
  market_outlook: string;
  salary_range: string;
  automation_risk: string;
  roadmap_version: number;
  generated_at: string;
  ai_reasoning: string;
  weekly_schedule: string[];
  learning_outcomes: string[];
  total_duration_weeks: number;
  duration_weeks?: number;
  weekly_hours: number;
  estimated_completion_date: string;
  resource_links: RoadmapResourceLink[];
  project_tasks: string[];
  expected_outcomes: string[];
  milestones: RoadmapMilestoneRecord[];
  updated_at: string;
};

export type RoadmapVersionRecord = {
  id: string;
  user_id: string;
  roadmap_version: number;
  career_goal: string;
  career_domain: string;
  generated_at: string;
  ai_reasoning: string;
  roadmaps: RoadmapRecord[];
  progress: number;
  updated_at: string;
};

export type ProgressRecord = {
  id: string;
  label: string;
  value: number;
  date: string;
  note: string;
};

export type NoteRecord = {
  id: string;
  title: string;
  content: string;
  tag: string;
  created_at: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "mentor";
  content: string;
  created_at: string;
};

export type ChatThread = {
  id: string;
  title: string;
  topic: string;
  updated_at: string;
  messages: ChatMessage[];
};

export type WorkspaceSnapshotRecord = {
  user_id: string;
  roadmaps: RoadmapRecord[];
  progress: ProgressRecord[];
  notes: NoteRecord[];
  ai_chats: ChatThread[];
  updated_at: string;
};

export type AppData = {
  profile: UserProfileRecord | null;
  workspace: WorkspaceSnapshotRecord | null;
  roadmapHistory: RoadmapVersionRecord[];
  roadmapAudit?: RoadmapAuditReport;
};

export type RoadmapAuditReport = {
  sources: {
    roadmapsTable: RoadmapAuditSourceReport;
    workspaceState: RoadmapAuditSourceReport;
    roadmapVersions: RoadmapAuditSourceReport;
  };
  legacyRoadmapCount: number;
  migratedRoadmapCount: number;
  invalidRoadmapCount: number;
  qualityScore: number;
};

export type RoadmapAuditSourceReport = {
  total: number;
  legacy: number;
  migrated: number;
  invalid: number;
  qualityScore: number;
};
