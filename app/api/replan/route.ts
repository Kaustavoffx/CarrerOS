import { NextResponse } from "next/server";
import { z } from "zod";
import { FREE_GENERATIONS } from "@/lib/config";
import { resolveUserAiProviderForGeneration } from "@/lib/ai-provider-store";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { auditRoadmapQuality, buildRoadmapPlanDetails, buildRoadmapPlanPrompt, resolveDomainProfile, validateRoadmapDomainConsistency, validateRoadmapDomain } from "@/lib/roadmap-plan";
import type { RoadmapRecord } from "@/lib/supabase/types";

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
  generated_at: z.string().nullable().optional(),
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
  updated_at: z.string().nullable().optional()
});

const ProfileSchema = z.object({
  id: z.string().optional(),
  full_name: z.string().nullable().optional(),
  goal: z.string().nullable().optional(),
  experience_level: z.string().nullable().optional(),
  readiness_score: z.number().int().min(0).max(100).optional(),
  avatar_url: z.string().nullable().optional(),
  onboarding_complete: z.boolean().optional()
});

const RequestSchema = z.object({
  profile: ProfileSchema.optional().nullable(),
  currentRoadmaps: z.array(RoadmapSchema).optional().nullable()
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

async function generateWithOpenAI(prompt: ReturnType<typeof buildRoadmapPlanPrompt>, apiKey: string) {
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

async function generateWithGemini(prompt: ReturnType<typeof buildRoadmapPlanPrompt>, apiKey: string) {
  if (!apiKey) {
    return null;
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: prompt.system }]
        },
        contents: [
          {
            role: "user",
            parts: [{ text: JSON.stringify(prompt.user) }]
          }
        ],
        generationConfig: {
          temperature: 0.4,
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) {
      const responseText = await response.text().catch(() => "<unavailable>");
      console.error("GEMINI ROADMAP GENERATION FAILED", {
        status: response.status,
        statusText: response.statusText,
        responseText
      });
      return null;
    }

    const payload = await response.json();
    const content = payload?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? "").join("");

    if (typeof content !== "string" || !content.trim().length) {
      console.error("GEMINI ROADMAP GENERATION FAILED", { reason: "missing_content", payload });
      return null;
    }

    return JSON.parse(content) as unknown;
  } catch (error) {
    console.error("GEMINI ROADMAP GENERATION FAILED", error);
    return null;
  }
}

async function resolveGenerationSource(userId: string, freeGenerationsUsed: number) {
  if (freeGenerationsUsed < FREE_GENERATIONS) {
    return {
      source: "platform-openai" as const,
      provider: "openai" as const,
      apiKey: process.env.OPENAI_API_KEY ?? null,
      providerPrompt: false
    };
  }

  const { provider, apiKey } = await resolveUserAiProviderForGeneration(userId);
  if (provider && apiKey) {
    return {
      source: provider === "openai" ? ("user-openai" as const) : ("user-gemini" as const),
      provider,
      apiKey,
      providerPrompt: false
    };
  }

  return {
    source: "local" as const,
    provider: null,
    apiKey: null,
    providerPrompt: true
  };
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.json();
    const parsedInput = RequestSchema.safeParse(rawBody);

    if (!parsedInput.success) {
      return NextResponse.json(
        { error: "Invalid request payload schema", details: parsedInput.error.issues },
        { status: 400 }
      );
    }

    const { profile, currentRoadmaps } = parsedInput.data;
    let goal = profile?.goal || "Frontend Engineer";

    // Strict Domain Locking: Once a roadmap is generated, career_goal and career_domain must become immutable context.
    if (currentRoadmaps && currentRoadmaps.length > 0) {
      const lockedDomain = currentRoadmaps[0].career_domain;
      const testProfile = resolveDomainProfile(goal);
      
      const isSde = 
        goal.toLowerCase() === "software engineering" || 
        testProfile.label === "Software Engineering" ||
        ["software", "frontend", "backend", "full stack", "fullstack", "developer", "engineering", "sde", "swe", "coding"].some(term => goal.toLowerCase().includes(term));

      if (isSde && ["Operations and Strategy", "Research and Academia", "Design and UX"].includes(lockedDomain)) {
        // Break the contaminated lock and force Software Engineering!
        goal = "Software Engineering";
      } else if (testProfile.label !== lockedDomain) {
        goal = lockedDomain;
      }
    }

    const level = (profile?.experience_level || "Junior") as "Student" | "Junior" | "Mid" | "Senior" | "Switcher";
    const timeCommit = currentRoadmaps?.[0]?.weekly_hours || "10 hours / week";
    const readinessScore = profile?.readiness_score ?? 0;
    const domainProfile = resolveDomainProfile(goal);
    console.log("STEP 1 GOAL:", goal);
    console.log("STEP 2 PROFILE:", domainProfile);
    console.log("STEP 3 DOMAIN:", domainProfile.label);

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
    const generationSource = await resolveGenerationSource(user.id, freeGenerationsUsed);

    if (freeGenerationsUsed < FREE_GENERATIONS) {
      await supabase.from("user_usage").upsert(
        {
          user_id: user.id,
          free_generations_used: freeGenerationsUsed + 1,
          updated_at: new Date().toISOString()
        },
        { onConflict: "user_id" }
      );
    }

    const roadmapInput = {
      goal,
      experience: level,
      weeklyHours: timeCommit,
      readinessScore,
      budget: "Free / Low-cost",
      skills: [],
      weaknesses: [],
      obstacles: []
    };

    if (generationSource.source === "local") {
      const fallback = buildRoadmapPlanDetails(roadmapInput);
      fallback.roadmaps.forEach((roadmap) => {
        validateRoadmapDomain(roadmap, goal);
        validateRoadmapDomainConsistency(roadmap, domainProfile);
      });
      const fallbackAudit = auditRoadmapQuality(fallback.roadmaps, domainProfile);
      if (fallbackAudit.qualityScore < 85) {
        throw new Error(`Fallback roadmap quality below threshold: ${fallbackAudit.qualityScore}`);
      }
      return NextResponse.json({
        ...fallback,
        roadmaps: fallback.roadmaps,
        generation_source: generationSource.source,
        provider_prompt: generationSource.providerPrompt,
        provider_prompt_message: generationSource.providerPrompt ? "Your free generations are exhausted. Connect your own AI provider to continue." : null
      });
    }

    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const prompt = buildRoadmapPlanPrompt(roadmapInput);
        console.log("STEP 4 PROMPT:", prompt);
        console.log("LOG 2: Domain sent to AI:", prompt.user.locked_career_domain);
        const aiPayload = generationSource.source === "platform-openai" || generationSource.source === "user-openai"
          ? await generateWithOpenAI(prompt, generationSource.apiKey ?? "")
          : generationSource.source === "user-gemini"
            ? await generateWithGemini(prompt, generationSource.apiKey ?? "")
            : null;

        if (!aiPayload) {
          throw new Error("AI provider returned empty response");
        }

        console.log("STEP 5 AI RESPONSE:", aiPayload);
        console.log("LOG 3: Raw AI response:", JSON.stringify(aiPayload));

        const validated = ResponseSchema.safeParse(aiPayload);
        if (!validated.success) {
          throw new Error(`Zod validation failed: ${JSON.stringify(validated.error.issues)}`);
        }

        let validatedData = validated.data;

        // --- SELF-HEALING DOMAIN RECONCILIATION FOR BYOK CONTAMINATION ---
        const isSdeGoal = 
          goal.toLowerCase() === "software engineering" || 
          domainProfile.label === "Software Engineering" ||
          ["software", "frontend", "backend", "full stack", "fullstack", "developer", "engineering", "sde", "swe", "coding"].some(term => goal.toLowerCase().includes(term));

        const hasOperationsContamination = 
          validatedData.career_domain === "Operations and Strategy" ||
          validatedData.roadmaps.some(r => 
            String(r.career_domain).toLowerCase().includes("operations") || 
            String(r.title).toLowerCase().includes("operations") ||
            String(r.title).toLowerCase().includes("scrum") ||
            String(r.title).toLowerCase().includes("business process")
          );

        if (isSdeGoal && hasOperationsContamination) {
          console.warn("SELF-HEALING TRIGGERED: OpenAI returned contaminated Operations roadmap under SDE I goal. Intercepting and replacing with clean Software Engineering fallback.");
          const cleanFallback = buildRoadmapPlanDetails(roadmapInput);
          validatedData = {
            career_domain: cleanFallback.career_domain,
            career_demand_score: cleanFallback.career_demand_score,
            market_outlook: cleanFallback.market_outlook,
            salary_range: cleanFallback.salary_range,
            automation_risk: cleanFallback.automation_risk,
            ai_reasoning: cleanFallback.ai_reasoning,
            roadmaps: cleanFallback.roadmaps as unknown as z.infer<typeof RoadmapSchema>[]
          };
        }
        // -----------------------------------------------------------------

        const normalizedRoadmaps: RoadmapRecord[] = validatedData.roadmaps.map((roadmap) => ({
          ...roadmap,
          generated_at: roadmap.generated_at ?? new Date().toISOString(),
          updated_at: roadmap.updated_at ?? new Date().toISOString()
        })) as unknown as RoadmapRecord[];

        normalizedRoadmaps.forEach((roadmap) => {
          console.log("LOG 4: Parsed roadmap title:", roadmap.title);
          console.log("LOG 5: Parsed roadmap domain:", roadmap.career_domain);
        });

        // Validate each generated roadmap using BOTH validation systems and quality gates
        normalizedRoadmaps.forEach((roadmap) => {
          validateRoadmapDomain(roadmap, goal);
          validateRoadmapDomainConsistency(roadmap, domainProfile);
        });

        const audit = auditRoadmapQuality(normalizedRoadmaps, domainProfile);
        if (audit.qualityScore < 85) {
          throw new Error(`AI roadmap quality below threshold: ${audit.qualityScore}. Reasons: ${audit.reasons.join(", ")}`);
        }

        return NextResponse.json({
          ...validatedData,
          roadmaps: normalizedRoadmaps,
          generation_source: generationSource.source,
          provider_prompt: generationSource.providerPrompt,
          provider_prompt_message: generationSource.providerPrompt ? "Your free generations are exhausted. Connect your own AI provider to continue." : null
        });

      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.error(`AI roadmap generation attempt ${attempt} failed:`, errMsg);
        lastError = error instanceof Error ? error : new Error(errMsg);
      }
    }

    // If we reach here, AI generation failed all 3 retries
    return NextResponse.json(
      { error: "Roadmap generation failed.", details: lastError?.message || "Invalid roadmap generated across 3 attempts" },
      { status: 500 }
    );
  } catch (error) {
    console.error("ROADMAP REPLAN FAILED", error);
    return NextResponse.json({ error: "Roadmap generation failed." }, { status: 500 });
  }
}
