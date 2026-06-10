import type { UserProfileRecord, WorkspaceSnapshotRecord, CommunityNeedReport } from "./supabase/types";

export interface UserIntelligencePriority {
  id: string;
  title: string;
  action: string;
  category: string;
  urgency: "low" | "medium" | "high" | "critical";
  link: string;
  whyExplain: string; // Explainable AI justification
  reasons: string[];
  confidence: number;
  sources: string[];
}

export interface UserIntelligenceProfile {
  skills: string[];
  goals: string[];
  roadmapProgress: number;
  readiness: number;
  supportNeeds: {
    id: string;
    category: string;
    urgency: string;
    description: string;
    status: string;
    createdAt: string;
  }[];
  mentorInteractionsCount: number;
  twinAnalysis: {
    strengths: string[];
    weaknesses: string[];
    blindSpots: string[];
    executionSpeed: number;
    velocityIndex: number;
    verdict: string;
  };
  priorities: UserIntelligencePriority[];
}

export function buildUserIntelligenceProfile(
  profile: UserProfileRecord | null,
  workspace: WorkspaceSnapshotRecord | null,
  communityNeeds?: CommunityNeedReport[]
): UserIntelligenceProfile {
  const skills = profile?.skills ?? [];
  const goals = profile?.goal ? [profile.goal] : [];
  const readiness = profile?.readiness_score ?? 0;

  // Resolve active roadmap
  const roadmaps = workspace?.roadmaps ?? [];
  const activeRoadmap = roadmaps.find((r) => r.status === "Active") ?? roadmaps[0] ?? null;
  const roadmapProgress = activeRoadmap?.progress ?? 0;

  // Resolve support needs
  const supportNeeds = (communityNeeds ?? []).map((need) => ({
    id: need.id,
    category: need.category,
    urgency: need.urgency,
    description: need.description || "",
    status: need.status,
    createdAt: need.created_at,
  }));

  // Resolve mentor interactions
  const mentorInteractionsCount = (workspace?.ai_chats ?? []).reduce(
    (acc, chat) => acc + (chat.messages?.length ?? 0),
    0
  );

  // Twin analysis calculations
  const strengths = skills.slice(0, 4);
  if (strengths.length === 0) {
    strengths.push("Initial profile assessment");
  }

  const weaknesses = profile?.weaknesses?.slice(0, 3) || [];
  if (weaknesses.length === 0) {
    weaknesses.push("Skill gap profiling pending");
  }

  // Check localStorage for links when running in client browser
  let resumeUrl: string | null = null;
  let portfolioUrl: string | null = null;
  let githubUrl: string | null = null;
  if (typeof window !== "undefined") {
    resumeUrl = localStorage.getItem("profile_resume_url");
    portfolioUrl = localStorage.getItem("profile_portfolio_url");
    githubUrl = localStorage.getItem("profile_github_url");
  }

  const blindSpots: string[] = [];
  if (!resumeUrl) {
    blindSpots.push("Resume lack of verified parsing");
  }
  if (!portfolioUrl) {
    blindSpots.push("No linked digital sandbox portfolio");
  }
  if (!githubUrl) {
    blindSpots.push("Missing version-control credential integration");
  }
  if (skills.length < 5) {
    blindSpots.push("Thin core skills directory");
  }
  if (blindSpots.length === 0) {
    blindSpots.push("No critical blind spots detected");
  }

  const allMilestones = activeRoadmap ? (Array.isArray(activeRoadmap.milestones) ? activeRoadmap.milestones : []) : [];
  const completedCount = activeRoadmap ? Math.floor((activeRoadmap.progress / 100) * allMilestones.length) : 0;
  const progressLogs = workspace?.progress ?? [];
  const totalCheckedEver = progressLogs.length + completedCount;

  const velocityIndex = totalCheckedEver > 0 ? Math.min(100, 65 + (totalCheckedEver * 5) % 35) : 50;
  const executionSpeed = roadmapProgress;

  let verdict = "You are making steady progress along your roadmap milestones.";
  if (activeRoadmap) {
    const domain = activeRoadmap.career_domain || profile?.goal || "your targeted career path";
    if (roadmapProgress < 45) {
      verdict = `You are behind schedule in ${domain.toLowerCase()} development.`;
    } else if (roadmapProgress > 85) {
      verdict = `You are progressing faster than average in ${domain.toLowerCase()} development.`;
    }
  }

  // Decision Engine with Explainable AI Justifications
  const priorities: UserIntelligencePriority[] = [];

  // 1. Dynamic Community Need Reports Alert
  const openNeeds = supportNeeds.filter((need) => need.status === "open" || need.status === "in_progress");
  if (openNeeds.length > 0) {
    const primaryNeed = openNeeds[0];
    const categoryLabel = primaryNeed.category.replace("_", " ");
    priorities.push({
      id: "prio_community",
      title: "Resolve Community Need Alert",
      action: `Check listings for active ${categoryLabel} support`,
      category: "Community Support",
      urgency: primaryNeed.urgency === "critical" ? "critical" : primaryNeed.urgency === "high" ? "high" : "medium",
      link: "/support", // link to support navigator / community
      whyExplain: `Prioritized as you have an unresolved community need report for ${categoryLabel} listed as '${primaryNeed.urgency}' urgency.`,
      reasons: [
        `Active unresolved community need filed for: ${categoryLabel}`,
        `Report urgency is marked as critical or high`,
        `Direct action required to maintain community support safety index`
      ],
      confidence: 90,
      sources: ["Profile", "Community Signals"]
    });
  }

  // 2. Active Roadmap Progress Recommendation
  if (activeRoadmap) {
    let urgency: "low" | "medium" | "high" | "critical" = "medium";
    let explanation = "";
    let confidence = 85;
    const reasons = [
      `Active sprint milestone pending: ${activeRoadmap.title}`,
      `Current completion is at ${roadmapProgress}%`
    ];

    if (roadmapProgress < 45) {
      urgency = "high";
      explanation = `Prioritized because your active roadmap completion is currently at ${roadmapProgress}%, placing you behind schedule for ${activeRoadmap.title}.`;
      reasons.push("Alert: Project velocity lagging behind target standard");
      confidence = 94;
    } else if (roadmapProgress >= 100) {
      urgency = "low";
      explanation = `You have completed 100% of your current roadmap. Consider initiating a new curriculum target.`;
      reasons.push("Goal milestones fully checked off");
      confidence = 70;
    } else {
      urgency = "medium";
      explanation = `Completing active tasks on your "${activeRoadmap.title}" roadmap will directly boost your readiness score from ${readiness}%.`;
      reasons.push("Incremental tasks boost overall readiness indexes");
      confidence = 88;
    }

    priorities.push({
      id: "prio_roadmap",
      title: "Advance Active Sprint Milestones",
      action: `Complete sprint tasks for ${activeRoadmap.title}`,
      category: "Roadmaps",
      urgency,
      link: "/roadmaps",
      whyExplain: explanation,
      reasons,
      confidence,
      sources: ["Roadmap", "Profile"]
    });
  } else {
    priorities.push({
      id: "prio_no_roadmap",
      title: "Initialize Learning Curriculum",
      action: "Create a tailored learning roadmap",
      category: "Roadmaps",
      urgency: "high",
      link: "/roadmaps",
      whyExplain: `Your profile does not currently list any active learning roadmaps. Initializing one is required to target readiness goals.`,
      reasons: [
        "No active educational roadmap logged",
        "Required to calculate target readiness scores",
        "Goal parameters lack structured weekly milestones"
      ],
      confidence: 95,
      sources: ["Profile", "System Rules"]
    });
  }

  // 3. Link Professional Credentials (Resume)
  if (!resumeUrl) {
    priorities.push({
      id: "prio_resume",
      title: "Complete Digital Credentials",
      action: "Link digital resume URL",
      category: "Career Twin",
      urgency: "high",
      link: "/profile",
      whyExplain: `No digital resume link is indexed. Connecting a resume activates automated parser indexing and improves Job Opportunity Match accuracy.`,
      reasons: [
        "Digital resume credential link missing",
        "Required to run automated vector parsing algorithm",
        "Improves similarity scores on the opportunity match board"
      ],
      confidence: 89,
      sources: ["Profile", "Market Indicators"]
    });
  }

  // 4. Portfolio Sandbox Link
  if (!portfolioUrl) {
    priorities.push({
      id: "prio_portfolio",
      title: "Index Proof of Work",
      action: "Connect professional portfolio link",
      category: "Career Twin",
      urgency: "medium",
      link: "/profile",
      whyExplain: `A portfolio link showcases verified proof-of-work, which is highly matching for Vercel/Linear active developer slots.`,
      reasons: [
        "No linked digital sandbox/portfolio address",
        "Proof-of-work is a high matching criteria for top tech roles",
        "Enables automated verification audits of design files"
      ],
      confidence: 81,
      sources: ["Profile", "Market Indicators"]
    });
  }

  // 5. Populate and optimize technical skill tags
  if (skills.length < 5) {
    priorities.push({
      id: "prio_skills",
      title: "Populate Technical Skill Directory",
      action: "Add 3+ technical skills to portfolio",
      category: "Career Twin",
      urgency: "medium",
      link: "/profile",
      whyExplain: `Your current skill portfolio registers only ${skills.length} skills, which triggers low confidence scores in matching market parameters.`,
      reasons: [
        `Skill portfolio registers only ${skills.length} skills`,
        "Thin skills directory triggers low confidence matching metrics",
        "Unlocks advanced roadmap course suggestions"
      ],
      confidence: 83,
      sources: ["Profile"]
    });
  }

  // 6. Engagements with AI Mentor
  if (mentorInteractionsCount < 5) {
    priorities.push({
      id: "prio_mentor",
      title: "Simulate Mock Interview Board",
      action: "Initiate system architecture chat with AI Mentor",
      category: "AI Mentor",
      urgency: "low",
      link: "/mentor",
      whyExplain: `You have limited historical interactions (${mentorInteractionsCount} messages) with the AI Mentor. Simulating mock boards highlights skill gaps.`,
      reasons: [
        `Limited historical conversations (${mentorInteractionsCount} messages) with AI Mentor`,
        "Mock architecture chat recommended to diagnose blind spots",
        "Activates context-sync conversational memory"
      ],
      confidence: 76,
      sources: ["Roadmap", "Community Signals"]
    });
  }

  return {
    skills,
    goals,
    roadmapProgress,
    readiness,
    supportNeeds,
    mentorInteractionsCount,
    twinAnalysis: {
      strengths,
      weaknesses,
      blindSpots,
      executionSpeed,
      velocityIndex,
      verdict,
    },
    priorities,
  };
}
