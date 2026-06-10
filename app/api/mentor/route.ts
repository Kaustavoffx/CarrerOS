import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const { message, profile, intelligenceProfile, threadHistory, mentorMode } = await req.json();

    const role = profile?.goal || "Frontend Engineer";
    const experience = profile?.experience_level || "Junior";
    const name = profile?.full_name || "Builder";
    const readiness = profile?.readiness_score ?? 0;
    const roadmapProgress = intelligenceProfile?.roadmapProgress ?? 0;
    const skills = intelligenceProfile?.skills ?? profile?.skills ?? [];

    const apiKey = process.env.OPENAI_API_KEY;
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

    // Prepare compressed profile summary for LLM context
    let profileContextSummary = "";
    if (intelligenceProfile) {
      const { twinAnalysis, supportNeeds } = intelligenceProfile;
      profileContextSummary = `
USER CONTEXT & INTELLIGENCE PROFILE:
- Skills: ${skills.join(", ") || "None"}
- Target Goal: ${role}
- Readiness Score: ${readiness}%
- Roadmap Progress: ${roadmapProgress}%
- Career Twin Verdict: ${twinAnalysis?.verdict || "No current verdict"}
- Strengths: ${twinAnalysis?.strengths?.join(", ") || "None"}
- Weaknesses: ${twinAnalysis?.weaknesses?.join(", ") || "None"}
- Blind Spots: ${twinAnalysis?.blindSpots?.join(", ") || "None"}
- Active Support Needs: ${supportNeeds?.map((n: { category: string; urgency: string }) => `${n.category} (${n.urgency})`).join(", ") || "None"}
`;
    }

    if (!apiKey) {
      // Dynamic tailored fallback if OpenAI key is not configured in local environment
      const q = message.toLowerCase();
      let reply = `Hello ${name}! As your AI mentor guiding you on the "${role}" track (${mentorMode || "career"} focus), I've analyzed your context (Readiness: ${readiness}%, Roadmap Progress: ${roadmapProgress}%).\n\n`;

      if (intelligenceProfile?.twinAnalysis?.verdict) {
        reply += `My analytical twin calibration: **"${intelligenceProfile.twinAnalysis.verdict}"**\n\n`;
      }

      if (intelligenceProfile?.supportNeeds && intelligenceProfile.supportNeeds.length > 0) {
        const need = intelligenceProfile.supportNeeds[0];
        reply += `⚠️ **Community Need Noted:** I see you reported a support need in category *${need.category.replace("_", " ")}* (urgency: *${need.urgency}*). I will factor this in to optimize resource allocations.\n\n`;
      }

      if (mentorMode === "resume" || q.includes("resume") || q.includes("cv")) {
        reply += `Under **Resume Coach**, I've examined your profile specifications. Let's optimize: update your resume bullets to follow the STAR methodology (e.g. 'Optimized Supabase queries, reducing load latency by 28%'). Paste your exact bullet point and I will rewrite it. Currently detected blind spots: ${intelligenceProfile?.twinAnalysis?.blindSpots?.join(", ") || "None"}.`;
      } else if (mentorMode === "interview" || q.includes("interview") || q.includes("mock")) {
        reply += `Under **Interview Coach**, let's start a mock loop. How would you describe your experience managing state transitions in responsive dashboard cards, and what structural choices (like custom context hooks or cache pools) did you make? Strengths to showcase: ${intelligenceProfile?.twinAnalysis?.strengths?.slice(0, 2).join(", ") || "your skills"}.`;
      } else if (mentorMode === "project" || q.includes("project") || q.includes("github")) {
        reply += `Under **Project Coach**, I recommend building a data-backed dashboard showing concentric progress views, dynamic lists, and responsive HSL panels. Link your GitHub repo url in the Profile so I can analyze your source code file structures. Current roadmap: ${roadmapProgress}% progress on active goals.`;
      } else if (mentorMode === "skill" || q.includes("dsa") || q.includes("leetcode") || q.includes("skills")) {
        reply += `Under **Skill Coach**, I suggest reviewing your skills: ${skills.join(", ") || "No skills logged yet"}. Let's study: do you understand React state dispatch loops or PostgreSQL secondary indexes? Ask me a syntax or design pattern question. We should address key weaknesses: ${intelligenceProfile?.twinAnalysis?.weaknesses?.join(", ") || "None"}.`;
      } else {
        reply += `To make your technical capabilities launch-ready for this track, we must establish a strong competency base. I see TypeScript and Next.js are in your core scope. Let's focus on setting up a solid unit-testing pattern with Playwright and postgres migrations. \n\nWhat specific code structure or technical tradeoff are you currently stuck on?`;
      }

      return NextResponse.json({ reply });
    }

    // Determine custom system prompt based on mentorMode
    let systemPrompt = `You are an expert AI Career Mentor for CareerOS. The user is ${name}, a ${experience} level professional working toward becoming a "${role}". Tone: Direct, Linear/Stripe-style focus, tactical, professional, highly encouraging but realistic. Focus on actionable advice, code milestones, and portfolio proof of work.`;

    if (mentorMode === "resume") {
      systemPrompt = `You are an expert AI Resume Coach for CareerOS. The user is ${name}, a ${experience} level professional working toward becoming a "${role}". Tone: Highly analytical, detail-oriented, professional. Focus on resume optimization, STAR methodology metrics, active verb rewrites, and aligning experience bullet points with employer demand.`;
    } else if (mentorMode === "interview") {
      systemPrompt = `You are an expert AI Interview Coach for CareerOS. The user is ${name}, a ${experience} level professional working toward becoming a "${role}". Tone: Conversational, challenging, evaluating. Conduct mock interviews (technical or behavioral), present realistic coding questions or situational case problems, evaluate responses, and provide structured critiques.`;
    } else if (mentorMode === "project") {
      systemPrompt = `You are an expert AI Project Coach for CareerOS. The user is ${name}, a ${experience} level professional working toward becoming a "${role}". Tone: Architectural, builder-focused, engineering-grade. Help structure project scope, select technologies, model database relations, design clean user experiences, and validate repository structures.`;
    } else if (mentorMode === "skill") {
      systemPrompt = `You are an expert AI Skill Coach for CareerOS. The user is ${name}, a ${experience} level professional working toward becoming a "${role}". Tone: Pedagogical, structured, technical. Focus on code syntax, algorithm explanations, data structures (DSA), syntax checks, resolving code errors, and optimizing algorithms.`;
    }

    if (profileContextSummary) {
      systemPrompt += `\n\nHere is the user's live CareerOS profile details to tailor your response:\n${profileContextSummary}`;
    }

    // Direct OpenAI fetch call (lightweight, zero package dependencies)
    const messages = [
      {
        role: "system",
        content: systemPrompt
      },
      ...threadHistory.map((m: { role: string; content: string }) => ({
        role: m.role === "mentor" ? "assistant" : "user",
        content: m.content
      })),
      { role: "user", content: message }
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.7,
        max_tokens: 450
      })
    });

    if (!response.ok) {
      throw new Error("OpenAI API call failed");
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "I encountered a processing issue. Let's recheck your sprint goals!";
    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json(
      { reply: "I'm currently syncing server parameters. Let's maintain focus on our active roadmap sprint in the meantime!" },
      { status: 200 } // fallback gracefully
    );
  }
}
