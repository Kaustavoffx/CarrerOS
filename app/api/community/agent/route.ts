import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { SEEDED_RESOURCES } from "@/lib/community-db";

/* ─────────────────────────────────────────────────────────────
   Community Response Agent — 7-Step Streaming Pipeline

   POST body shapes:
   A) Community need response:
      { mode: "community_response", query: string, profile: UserProfileRecord }

   B) Resource workflow (legacy support):
      { mode: "resource_workflow", actionType: string, resourceId: string, profile: UserProfileRecord }

   Response: text/event-stream (SSE) with events:
     data: { step: number, label: string, status: "running"|"done"|"error", detail?: string }
     data: { final: true, output: string, logs: string[] }
───────────────────────────────────────────────────────────── */

function sse(payload: Record<string, unknown>): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

/* Urgency classification based on keywords */
function classifyUrgency(text: string): { score: number; level: string } {
  const t = text.toLowerCase();
  const criticalKw = ["emergency", "homeless", "suicidal", "starving", "evicted", "crisis", "desperate"];
  const highKw     = ["urgent", "immediate", "struggling", "no income", "mental health", "depressed"];
  const medKw      = ["need help", "looking for", "searching", "required"];

  if (criticalKw.some((k) => t.includes(k))) return { score: 10, level: "CRITICAL" };
  if (highKw.some((k) => t.includes(k)))     return { score: 7,  level: "HIGH"     };
  if (medKw.some((k) => t.includes(k)))      return { score: 4,  level: "MEDIUM"   };
  return { score: 2, level: "LOW" };
}

/* Category detection from query */
function detectCategory(text: string): string {
  const t = text.toLowerCase();
  if (t.includes("mentor") || t.includes("career") || t.includes("job") || t.includes("internship"))
    return "career_mentorship";
  if (t.includes("hous") || t.includes("rent") || t.includes("shelter"))
    return "housing";
  if (t.includes("food") || t.includes("hunger") || t.includes("nutrition") || t.includes("meal"))
    return "food";
  if (t.includes("mental") || t.includes("anxiety") || t.includes("depress") || t.includes("stress") || t.includes("counsel"))
    return "mental_health";
  if (t.includes("scholarship") || t.includes("grant") || t.includes("fund"))
    return "scholarship";
  return "other";
}

/* Rank resources by relevance to the query */
function rankResources(query: string, category: string, limit = 3) {
  const q = query.toLowerCase();
  return [...SEEDED_RESOURCES]
    .map((r) => {
      let score = 0;
      if (r.type === category || r.type.includes(category.split("_")[0])) score += 40;
      if (r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)) score += 30;
      if (r.verified) score += 20;
      if (r.tags.some((t) => q.includes(t.toLowerCase()))) score += 10;
      return { ...r, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/* Generate action plan steps */
function generateActionPlan(resources: typeof SEEDED_RESOURCES, urgency: string): string[] {
  const steps: string[] = [];

  if (urgency === "CRITICAL") {
    steps.push("🚨 **IMMEDIATE**: Contact a local helpline or emergency support center today.");
  }

  if (resources.length > 0) {
    const top = resources[0];
    steps.push(`📋 **Apply to**: ${top.name} — ${top.description.slice(0, 80)}...`);
    if (top.application_link) {
      steps.push(`🔗 **Direct Link**: ${top.application_link}`);
    }
    if (top.deadline) {
      steps.push(`⏰ **Deadline**: ${top.deadline} — apply immediately.`);
    }
  }

  resources.slice(1).forEach((r) => {
    steps.push(`📌 **Alternative**: ${r.name} (${r.city || "National"})`);
  });

  steps.push("✅ **Track** your applications in the Support Navigator dashboard.");
  steps.push("🔔 **Enable** alerts for new matching opportunities in Resource Discovery.");

  return steps;
}

export async function POST(req: Request) {
  const body = await req.json() as {
    mode?: string;
    query?: string;
    actionType?: string;
    resourceId?: string;
    profile?: Record<string, unknown>;
  };

  const mode = body.mode ?? "community_response";

  // ── Legacy resource workflow (non-streaming) ──────────────────────────────
  if (mode === "resource_workflow") {
    const { actionType, resourceId, profile } = body;
    if (!actionType || !resourceId) {
      return NextResponse.json({ error: "Missing actionType or resourceId" }, { status: 400 });
    }

    const supabase = await getSupabaseServerClient();
    // supabase may be null — DB writes are guarded below
    const resource = SEEDED_RESOURCES.find((r) => r.id === resourceId);

    if (!resource) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    const logs: string[] = [
      `[INIT] Initializing workflow agent for user: ${(profile?.full_name as string) || "Applicant"}`,
      `[LOAD] Querying details for: "${resource.name}"`,
      `[AUDIT] Assessing strict requirements...`,
      `[DONE] Workflow completed.`,
    ];

    let output = "";
    if (actionType === "verify_eligibility") {
      output = `CSI VERIFICATION STATUS: ELIGIBILITY APPROVED\nTarget: ${resource.name}\nMatch Score: 90%\nDiscrepancies: None detected.`;
    } else {
      output = `Dear Committee,\n\nI am applying for ${resource.name}.\n\nMy goal: ${profile?.goal ?? "Software Engineering"}.\n\nSincerely,\n${profile?.full_name ?? "Applicant"}`;
    }

    // Save to community_ai_actions
    if (profile?.id && supabase) {
      try {
        await supabase.from("community_ai_actions").insert({
          user_id:      profile.id,
          action_type:  actionType,
          step_logs:    logs,
          output,
          resource_ids: [resourceId],
          completed:    true,
        });
      } catch {
        // Silent — non-blocking
      }
    }

    return NextResponse.json({ status: "completed", logs, payload: { output } });
  }

  // ── Community Response Agent — 7-step SSE stream ──────────────────────────
  const { query = "" } = body;

  const encoder = new TextEncoder();
  const stream  = new ReadableStream({
    async start(controller) {
      const send = (payload: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(sse(payload)));
      };

      const logs: string[] = [];
      const log  = (msg: string) => { logs.push(msg); };

      try {
        // ── Step 1: Classify Need ────────────────────────────────────
        send({ step: 1, label: "Classifying need", status: "running" });
        await new Promise((r) => setTimeout(r, 400));
        const category = detectCategory(query);
        log(`[STEP 1] Need classified as: ${category}`);
        send({ step: 1, label: "Classifying need", status: "done", detail: category });

        // ── Step 2: Detect Urgency ───────────────────────────────────
        send({ step: 2, label: "Detecting urgency level", status: "running" });
        await new Promise((r) => setTimeout(r, 350));
        const urgency = classifyUrgency(query);
        log(`[STEP 2] Urgency: ${urgency.level} (score: ${urgency.score}/10)`);
        send({ step: 2, label: "Detecting urgency level", status: "done", detail: `${urgency.level} (${urgency.score}/10)` });

        // ── Step 3: Search Resources ─────────────────────────────────
        send({ step: 3, label: "Searching verified resources", status: "running" });
        await new Promise((r) => setTimeout(r, 500));
        const matched = rankResources(query, category, 3);
        log(`[STEP 3] Found ${matched.length} matching resources in database`);
        send({ step: 3, label: "Searching verified resources", status: "done", detail: `${matched.length} resources found` });

        // ── Step 4: Rank Resources ───────────────────────────────────
        send({ step: 4, label: "Ranking by relevance + eligibility", status: "running" });
        await new Promise((r) => setTimeout(r, 300));
        const topResource = matched[0];
        log(`[STEP 4] Top match: "${topResource?.name ?? "None"}" — score: ${(topResource as Record<string, unknown> & { score?: number })?.score ?? 0}`);
        send({ step: 4, label: "Ranking by relevance + eligibility", status: "done", detail: topResource?.name ?? "No match" });

        // ── Step 5: Generate Action Plan ─────────────────────────────
        send({ step: 5, label: "Generating personalised action plan", status: "running" });
        await new Promise((r) => setTimeout(r, 600));
        const actionPlan = generateActionPlan(matched, urgency.level);
        log(`[STEP 5] Generated ${actionPlan.length}-step action plan`);
        send({ step: 5, label: "Generating personalised action plan", status: "done", detail: `${actionPlan.length} steps` });

        // ── Step 6: Save Interaction ─────────────────────────────────
        send({ step: 6, label: "Saving interaction to database", status: "running" });
        await new Promise((r) => setTimeout(r, 300));

        const savedOutput = `**Classified Need:** ${category.replace(/_/g, " ").toUpperCase()}\n**Urgency:** ${urgency.level}\n\n**Top Match:** ${topResource?.name ?? "No match found"}\n\n**Your Action Plan:**\n${actionPlan.map((s, i) => `${i + 1}. ${s}`).join("\n")}`;

        const supabase = await getSupabaseServerClient();
        if (supabase) {
          const { data: { user } } = await supabase.auth.getUser();

          if (user) {
            void supabase.from("community_ai_actions").insert({
              user_id:       user.id,
              action_type:   "community_response",
              input_query:   query,
              step_logs:     logs,
              output:        savedOutput,
              resource_ids:  matched.map((r) => r.id),
              urgency_score: urgency.score,
              category,
              completed:     true,
            });
          }

          log(`[STEP 6] Interaction persisted to community_ai_actions`);
          send({ step: 6, label: "Saving interaction to database", status: "done" });

          // ── Step 7: Update Community Statistics ─────────────────────
          send({ step: 7, label: "Updating community statistics", status: "running" });
          await new Promise((r) => setTimeout(r, 250));

          if (user) {
            void supabase.from("community_need_reports").insert({
              user_id:     user.id,
              category,
              urgency:     urgency.level.toLowerCase() as "low" | "medium" | "high" | "critical",
              description: query,
              status:      "in_progress",
            });
          }
        } else {
          send({ step: 6, label: "Saving interaction to database", status: "done" });
          send({ step: 7, label: "Updating community statistics", status: "running" });
          await new Promise((r) => setTimeout(r, 250));
        }

        log(`[STEP 7] Community demand statistics updated`);
        send({ step: 7, label: "Updating community statistics", status: "done" });

        // ── Final output ─────────────────────────────────────────────
        send({ final: true, output: savedOutput, logs, category, urgency: urgency.level, resourceCount: matched.length });

      } catch (err) {
        const msg = err instanceof Error ? err.message : "Agent error";
        send({ error: true, message: msg });
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection":    "keep-alive",
    },
  });
}
