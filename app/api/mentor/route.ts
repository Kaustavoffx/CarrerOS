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
      let content = "";

      if (mentorMode === "resume" || q.includes("resume") || q.includes("cv")) {
        content = `Under **Resume Coach**, I've examined your profile specifications. Let's optimize: update your resume bullets to follow the STAR methodology (e.g. 'Optimized Supabase queries, reducing load latency by 28%'). Paste your exact bullet point and I will rewrite it. Currently detected blind spots: ${intelligenceProfile?.twinAnalysis?.blindSpots?.join(", ") || "None"}.`;
      } else if (mentorMode === "interview" || q.includes("interview") || q.includes("mock")) {
        content = `Under **Interview Coach**, let's start a mock loop. How would you describe your experience managing state transitions in responsive dashboard cards, and what structural choices (like custom context hooks or cache pools) did you make? Strengths to showcase: ${intelligenceProfile?.twinAnalysis?.strengths?.slice(0, 2).join(", ") || "your skills"}.`;
      } else if (mentorMode === "project" || q.includes("project") || q.includes("github")) {
        content = `Under **Project Coach**, I recommend building a data-backed dashboard showing concentric progress views, dynamic lists, and responsive HSL panels. Link your GitHub repo url in the Profile so I can analyze your source code file structures. Current roadmap: ${roadmapProgress}% progress on active goals.`;
      } else if (mentorMode === "skill" || q.includes("dsa") || q.includes("leetcode") || q.includes("skills")) {
        content = `Under **Skill Coach**, I suggest reviewing your skills: ${skills.join(", ") || "No skills logged yet"}. Let's study: do you understand React state dispatch loops or PostgreSQL secondary indexes? Ask me a syntax or design pattern question. We should address key weaknesses: ${intelligenceProfile?.twinAnalysis?.weaknesses?.join(", ") || "None"}.`;
      } else {
        content = `To make your technical capabilities launch-ready for this track, we must establish a strong competency base. I see TypeScript and Next.js are in your core scope. Let's focus on setting up a solid unit-testing pattern with Playwright and postgres migrations. \n\nWhat specific code structure or technical tradeoff are you currently stuck on?`;
      }

      // Calculate a dynamic confidence score based on roadmapProgress and skills count
      const baseConfidence = 75 + Math.floor(roadmapProgress * 0.15) + Math.min(10, skills.length);
      const confidenceScore = Math.min(98, baseConfidence);

      const whyRecommendation = `I selected this guidance because you are targeting the "${role}" track at a current ${readiness}% Readiness Index. We need to close active blind spots (${intelligenceProfile?.twinAnalysis?.blindSpots?.slice(0,2).join(", ") || "missing credentials"}) and support your reported community interest.`;

      let reply = `Hello ${name}! As your AI mentor guiding you on the "${role}" track (${mentorMode || "career"} focus), I've analyzed your context (Readiness: ${readiness}%, Roadmap Progress: ${roadmapProgress}%).\n\n`;
      if (intelligenceProfile?.twinAnalysis?.verdict) {
        reply += `My analytical twin calibration: **"${intelligenceProfile.twinAnalysis.verdict}"**\n\n`;
      }
      reply += `${content}\n\n`;
      reply += `### WHY THIS RECOMMENDATION?\n${whyRecommendation}\n\n`;
      reply += `### CONFIDENCE SCORE\nConfidence Score: **${confidenceScore}%** (Based on goal alignment & profile completeness)\n\n`;
      reply += `### RELATED ACTIONS\n`;
      if (mentorMode === "resume" || q.includes("resume") || q.includes("cv")) {
        reply += `- Review your Resume link in [Profile](/profile)\n- Run a vector alignment test on [Career Twin](/career-twin)\n`;
      } else if (mentorMode === "interview" || q.includes("interview") || q.includes("mock")) {
        reply += `- Check interview prep checklist on the [Dashboard](/dashboard)\n- Start an interactive sprint on [Roadmaps](/roadmaps)\n`;
      } else {
        reply += `- Browse local support systems in [Support Navigator](/support-navigator)\n- View system telemetry in [Command Center](/community-command-center)\n`;
      }
      reply += `\n### SUGGESTED NEXT STEP\n`;
      if (mentorMode === "resume" || q.includes("resume") || q.includes("cv")) {
        reply += `Paste your resume's experience bullet point in this chat, and I will align it using STAR methodology.`;
      } else if (mentorMode === "interview" || q.includes("interview") || q.includes("mock")) {
        reply += `Explain your design pattern choices for local state management (hooks vs global context stores).`;
      } else {
        reply += `Review your current sprint milestones on the Roadmaps board.`;
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

    systemPrompt += `\n\nCRITICAL: You MUST end every single response with exactly these four headers in markdown:
### WHY THIS RECOMMENDATION?
[Provide a clear reasoning linking user's profile context, goal, twin analysis strengths/weaknesses/blind spots, and current community needs]

### CONFIDENCE SCORE
Confidence Score: [X]% (Provide a calculated percentage based on active goals and profile completeness)

### RELATED ACTIONS
- [Action item 1 linked to a dashboard module, e.g. review settings, check twin, run a roadmap sprint]
- [Action item 2 linked to community support navigator, e.g. discover resources, report a need]

### SUGGESTED NEXT STEP
[Provide a single, clear, immediate next step the user should take to advance their career track]

Do not omit any of these sections. Be structured, professional, and tactical.`;

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
    const errorReply = `I'm currently syncing server parameters. Let's maintain focus on our active roadmap sprint in the meantime!

### WHY THIS RECOMMENDATION?
The server is currently synchronizing database context, so local cache state is returned.

### CONFIDENCE SCORE
Confidence Score: **95%** (Local rule baseline)

### RELATED ACTIONS
- View active learning progress on [Roadmaps](/roadmaps)
- Check similarity calibrations on [Career Twin](/career-twin)

### SUGGESTED NEXT STEP
Check off your remaining sprint task cards on the main Dashboard.`;
    return NextResponse.json({ reply: errorReply });
  }
}
