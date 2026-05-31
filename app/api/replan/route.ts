import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { FREE_GENERATIONS } from "@/lib/config";
import { buildRoadmapPlanDetails, buildRoadmapPlanPrompt } from "@/lib/roadmap-plan";

const ResourceLinkSchema = z.object({
  label: z.string(),
  url: z.string().url(),
  provider: z.string()
});

const MilestoneSchema = z.object({
  title: z.string(),
  why_it_matters: z.string(),
  estimated_duration_weeks: z.number().min(1),
  difficulty_level: z.enum(["Beginner", "Intermediate", "Advanced"]),
  completion_criteria: z.array(z.string()),
  resource_links: z.array(ResourceLinkSchema),
  projects: z.array(z.string()),
  project_tasks: z.array(z.string()),
  deliverables: z.array(z.string()),
  expected_outcomes: z.array(z.string())
});

const RoadmapSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(["Planned", "Active", "Done"]),
  summary: z.string(),
  owner: z.string(),
  progress: z.number().min(0).max(100),
  career_domain: z.string(),
  career_demand_score: z.number().min(0).max(100),
  market_outlook: z.string(),
  salary_range: z.string(),
  automation_risk: z.string(),
  roadmap_version: z.number().int().min(1),
  generated_at: z.string(),
  ai_reasoning: z.string(),
  weekly_schedule: z.array(z.string()),
  learning_outcomes: z.array(z.string()),
  total_duration_weeks: z.number().int().nonnegative(),
  weekly_hours: z.number().int().nonnegative(),
  estimated_completion_date: z.string(),
  resource_links: z.array(ResourceLinkSchema),
  project_tasks: z.array(z.string()),
  expected_outcomes: z.array(z.string()),
  milestones: z.array(MilestoneSchema),
  updated_at: z.string()
});

const ProfileSchema = z.object({
  id: z.string().optional(),
  full_name: z.string().nullable().optional(),
  goal: z.string().nullable().optional(),
  experience_level: z.string().nullable().optional(),
  avatar_url: z.string().nullable().optional(),
  onboarding_complete: z.boolean().optional()
});

const RequestSchema = z.object({
  profile: ProfileSchema.optional().nullable(),
  currentRoadmaps: z.array(RoadmapSchema).optional().nullable(),
  userApiKey: z.string().optional()
});

const ResponseSchema = z.object({
  career_domain: z.string(),
  career_demand_score: z.number().min(0).max(100),
  market_outlook: z.string(),
  salary_range: z.string(),
  automation_risk: z.string(),
  ai_reasoning: z.string(),
  roadmaps: z.array(RoadmapSchema)
});

async function generateWithOpenAI(prompt: ReturnType<typeof buildRoadmapPlanPrompt>) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: prompt.system },
          {
            role: "user",
            content: JSON.stringify(prompt.user)
          }
        ]
      })
    });

    if (!response.ok) {
      const responseText = await response.text().catch(() => "<unavailable>");
      console.error("OPENAI ROADMAP GENERATION FAILED", {
        status: response.status,
        statusText: response.statusText,
        responseText
      });
      return null;
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;

    if (typeof content !== "string") {
      console.error("OPENAI ROADMAP GENERATION FAILED", { reason: "missing_message_content", payload });
      return null;
    }

    return JSON.parse(content) as unknown;
  } catch (error) {
    console.error("OPENAI ROADMAP GENERATION FAILED", error);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.json();
    console.log("REPLAN REQUEST SHAPE", {
      keys: Object.keys(rawBody ?? {}),
      profileKeys: Object.keys(rawBody?.profile ?? {}),
      currentRoadmapCount: Array.isArray(rawBody?.currentRoadmaps) ? rawBody.currentRoadmaps.length : 0
    });
    const parsedInput = RequestSchema.safeParse(rawBody);

    if (!parsedInput.success) {
      return NextResponse.json(
        { error: "Invalid request payload schema", details: parsedInput.error.issues },
        { status: 400 }
      );
    }

    const { profile, currentRoadmaps } = parsedInput.data;
    const goal = profile?.goal || "Frontend Engineer";
    const level = (profile?.experience_level || "Junior") as "Student" | "Junior" | "Mid" | "Senior" | "Switcher";
    const timeCommit = currentRoadmaps?.[0]?.weekly_hours || "10 hours / week";

    const supabase = await getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase configuration is missing." }, { status: 503 });
    }

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const { data: usageData } = await supabase
      .from("user_usage")
      .select("free_generations_used")
      .eq("user_id", user.id)
      .maybeSingle();

    const freeGenerationsUsed = usageData?.free_generations_used ?? 0;

    if (freeGenerationsUsed >= FREE_GENERATIONS) {
      return NextResponse.json(
        { error: "Free generations exhausted.", code: "LIMIT_EXHAUSTED" },
        { status: 403 }
      );
    }

    await supabase.from("user_usage").upsert(
      {
        user_id: user.id,
        free_generations_used: freeGenerationsUsed + 1,
        updated_at: new Date().toISOString()
      },
      { onConflict: "user_id" }
    );

    const roadmapInput = {
      goal,
      experience: level,
      weeklyHours: timeCommit,
      budget: "Free / Low-cost",
      skills: [],
      weaknesses: [],
      obstacles: []
    };

    const prompt = buildRoadmapPlanPrompt(roadmapInput);
    const aiPayload = await generateWithOpenAI(prompt);

    if (aiPayload) {
      const validated = ResponseSchema.safeParse(aiPayload);
      if (validated.success) {
        console.log("REPLAN RESPONSE SHAPE", {
          keys: Object.keys(validated.data),
          roadmapCount: validated.data.roadmaps.length
        });
        return NextResponse.json(validated.data);
      }

      console.error("INVALID AI ROADMAP PAYLOAD", {
        issues: validated.error.issues,
        payload: aiPayload
      });
    }

    const fallback = buildRoadmapPlanDetails(roadmapInput);
    console.log("REPLAN RESPONSE SHAPE", {
      keys: Object.keys(fallback),
      roadmapCount: fallback.roadmaps.length
    });
    return NextResponse.json({ ...fallback, roadmaps: fallback.roadmaps });
  } catch (error) {
    console.error("ROADMAP REPLAN FAILED", error);
    return NextResponse.json({ error: "Roadmap generation failed." }, { status: 500 });
  }
}
