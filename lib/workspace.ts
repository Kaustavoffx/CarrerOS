import type {
  ChatMessage,
  ChatThread,
  ExperienceLevel,
  NoteRecord,
  ProgressRecord,
  UserProfileRecord,
  WorkspaceSnapshotRecord
} from "./supabase/types";
import { buildRoadmapPlan } from "./roadmap-plan";

const now = new Date().toISOString();
const newId = () => crypto.randomUUID();

function buildReadinessScore(experience: ExperienceLevel) {
  switch (experience) {
    case "Senior":
      return 88;
    case "Mid":
      return 78;
    case "Junior":
      return 68;
    case "Switcher":
      return 61;
    default:
      return 58;
  }
}

export function createStarterWorkspace(goal: string, experience: ExperienceLevel) {
  const baseScore = buildReadinessScore(experience);
  const roadmaps = buildRoadmapPlan({
    goal,
    experience,
    weeklyHours: 10,
    referenceDate: new Date(now)
  }).map((roadmap) => ({
    ...roadmap,
    id: roadmap.id || newId()
  }));

  const progress: ProgressRecord[] = [
    {
      id: newId(),
      label: "Readiness",
      value: baseScore,
      date: "This week",
      note: "Current career momentum score from your onboarding choices."
    },
    {
      id: newId(),
      label: "Portfolio",
      value: Math.max(52, baseScore - 8),
      date: "This week",
      note: "Proof-of-work visibility and case study clarity."
    },
    {
      id: newId(),
      label: "Applications",
      value: Math.max(48, baseScore - 5),
      date: "This week",
      note: "A steady pipeline that can be improved over time."
    }
  ];

  const notes: NoteRecord[] = [
    {
      id: newId(),
      title: "First focus",
      content: `Lead with ${goal.toLowerCase()} and keep the story outcome-first.`,
      tag: "Strategy",
      created_at: now
    },
    {
      id: newId(),
      title: "Portfolio signal",
      content: "Use one strong project, one concise narrative, and one clean call to action.",
      tag: "Portfolio",
      created_at: now
    }
  ];

  const messages: ChatMessage[] = [
    {
      id: newId(),
      role: "mentor",
      content: `Welcome. Your first strategy draft is ready for ${goal.toLowerCase()}.`,
      created_at: now
    },
    {
      id: newId(),
      role: "user",
      content: "Keep it focused and easy to execute this week.",
      created_at: now
    },
    {
      id: newId(),
      role: "mentor",
      content: `Good. Start with the first roadmap sprint and use the milestone checklist as your operating rhythm.`,
      created_at: now
    }
  ];

  const chats: ChatThread[] = [
    {
      id: newId(),
      title: "Welcome thread",
      topic: goal,
      updated_at: now,
      messages
    }
  ];

  return {
    profile: {
      id: newId(),
      full_name: null,
      avatar_url: null,
      goal,
      readiness_score: baseScore,
      experience_level: experience,
      skills: [],
      learning_style: null,
      budget: null,
      time_availability: null,
      weaknesses: [],
      obstacles: [],
      onboarding_complete: true,
      updated_at: now
    } satisfies UserProfileRecord,
    workspace: {
      user_id: newId(),
      roadmaps,
      progress,
      notes,
      ai_chats: chats,
      updated_at: now
    } satisfies WorkspaceSnapshotRecord
  };
}
