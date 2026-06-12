import type { AppData } from "./supabase/types";

export const getDemoRoniData = (): AppData => {
  const now = new Date().toISOString();
  
  return {
    profile: {
      id: "demo-roni-judge-id",
      full_name: "Roni",
      avatar_url: null,
      goal: "Software Engineering",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      experience_level: "Entry Level" as any,
      readiness_score: 45,
      onboarding_complete: true,
      updated_at: now,
      skills: [],
      learning_style: "Visual",
      budget: "Low",
      time_availability: "Part-Time",
      weaknesses: [],
      obstacles: []
    },
    workspace: {
      user_id: "demo-roni-judge-id",
      roadmaps: [{
        id: "mock-roadmap-1",
        title: "Software Engineer Fast-Track",
        summary: "A focused path from small-town student to junior developer.",
        description: "A comprehensive journey designed for entry-level developers focusing on web technologies and cloud architecture.",
        owner: "Roni",
        progress: 25,
        status: "Active",
        career_domain: "Software Engineering",
        career_demand_score: 95,
        demand_score: 95,
        market_outlook: "High Growth",
        salary_range: "$65k - $95k (Entry Level)",
        automation_risk: "Low",
        roadmap_version: 1,
        generated_at: now,
        ai_reasoning: "Generated based on strong aptitude for logic and regional demand for React developers.",
        weekly_schedule: ["Mon: Core TS", "Wed: React", "Sat: Projects"],
        learning_outcomes: ["Build full-stack web apps", "Understand cloud deployments"],
        total_duration_weeks: 12,
        duration_weeks: 12,
        weekly_hours: 15,
        estimated_completion_date: "2026-09-01T00:00:00Z",
        resource_links: [
          { label: "React Docs", url: "#", provider: "Meta" },
          { label: "AWS Free Tier", url: "#", provider: "Amazon" }
        ],
        project_tasks: ["Build a portfolio", "Deploy to Vercel"],
        expected_outcomes: ["Job ready for Junior Front-End Role"],
        milestones: [
          {
            title: "HTML/CSS Foundations",
            why_it_matters: "Core building blocks of the web.",
            estimated_duration_weeks: 2,
            difficulty_level: "Beginner",
            completion_criteria: ["Build a landing page"],
            resource_links: [],
            projects: [],
            project_tasks: [],
            deliverables: [],
            expected_outcomes: ["Can style basic pages"],
            status: "completed",
            completed_tasks: [],
            completed_deliverables: []
          },
          {
            title: "Advanced JavaScript & TypeScript",
            why_it_matters: "Modern enterprise applications demand type safety.",
            estimated_duration_weeks: 4,
            difficulty_level: "Intermediate",
            completion_criteria: ["Write a typed API consumer"],
            resource_links: [],
            projects: [],
            project_tasks: [],
            deliverables: [],
            expected_outcomes: ["TypeScript proficiency"],
            status: "inprogress",
            completed_tasks: [],
            completed_deliverables: []
          }
        ],
        updated_at: now
      }],
      progress: [],
      notes: [],
      ai_chats: [
        {
          id: "chat-1",
          topic: "Cloud Architecture Gap",
          updated_at: now,
          messages: [
            { id: "m1", role: "user", content: "I feel stuck. I don't know cloud architecture.", created_at: now },
            { id: "m2", role: "mentor", content: "That's a common gap for early engineers. The Learning Agent suggests we add AWS Fundamentals to your roadmap. Would you like me to update it?", created_at: now }
          ],
          title: "Cloud Architecture Gap",
        }
      ],
      updated_at: now
    },
    communityNeeds: [
      {
        id: "need-1",
        user_id: "demo-roni-judge-id",
        category: "career_mentorship",
        description: "Small town student needs guidance on modern tech stacks.",
        urgency: "medium",
        city: "Remote",
        district: null,
        state: null,
        country: "USA",
        lat: null,
        lng: null,
        status: "open",
        created_at: now
      },
      {
        id: "need-2",
        user_id: "demo-roni-judge-id",
        category: "scholarship",
        description: "Looking for scholarships or grants to cover a full-stack bootcamp.",
        urgency: "high",
        city: "Remote",
        district: null,
        state: null,
        country: "USA",
        lat: null,
        lng: null,
        status: "resolved",
        created_at: now
      }
    ],
    roadmapHistory: [],
    roadmapAudit: {
      sources: {
        roadmapsTable: { total: 1, legacy: 0, migrated: 0, invalid: 0, qualityScore: 100 },
        workspaceState: { total: 1, legacy: 0, migrated: 0, invalid: 0, qualityScore: 100 },
        roadmapVersions: { total: 0, legacy: 0, migrated: 0, invalid: 0, qualityScore: 100 }
      },
      legacyRoadmapCount: 0,
      migratedRoadmapCount: 0,
      invalidRoadmapCount: 0,
      qualityScore: 100
    }
  };
};
