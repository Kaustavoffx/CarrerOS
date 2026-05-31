import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const { message, profile, threadHistory } = await req.json();

    const role = profile?.goal || "Frontend Engineer";
    const experience = profile?.experience_level || "Junior";
    const name = profile?.full_name || "Builder";

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

    if (!apiKey) {
      // Dynamic tailored fallback if OpenAI key is not configured in local environment
      const q = message.toLowerCase();
      let reply = `Hello ${name}! As your AI mentor guiding you on the "${role}" track, I've analyzed your context. \n\n`;

      if (q.includes("portfolio") || q.includes("project") || q.includes("show")) {
        reply += `For a ${experience}-level role, your portfolio proof of work is critical. I suggest building one highly polished project that clearly outlines your problem-solving process. Instead of simple clone apps, focus on documenting tradeoffs (like performance wins, Framer Motion transitions, or SQL optimization indexes). This immediately elevates you in evaluations.`;
      } else if (q.includes("time") || q.includes("schedule") || q.includes("replan") || q.includes("busy")) {
        reply += `Time commitment is a common bottleneck. Let's calibrate: if the current 12-hour sprint feels too heavy, let's execute a minor replan on your dashboard roadmaps. We can aim for a 'Focused Pacing' of 4 hours this week, targeting only 1 core milestone rather than overloading. Click the **Adaptive AI Replan** button on your Roadmaps page to let the engine recheck bounds.`;
      } else {
        reply += `To make your technical capabilities launch-ready for this track, we must establish a strong competency base. I see TypeScript and Next.js are in your core scope. Let's focus on setting up a solid unit-testing pattern with Playwright and postgres migrations. \n\nWhat specific code structure or technical tradeoff are you currently stuck on? Give me details so I can calibrate our upcoming adaptive roadmap milestones!`;
      }

      return NextResponse.json({ reply });
    }

    // Direct OpenAI fetch call (lightweight, zero package dependencies)
    const messages = [
      {
        role: "system",
        content: `You are an expert AI Career Mentor for CareerOS. The user is ${name}, a ${experience} level professional working toward becoming a "${role}". Tone: Direct, Linear/Stripe-style focus, tactical, professional, highly encouraging but realistic. Focus on actionable advice, code milestones, and portfolio proof of work.`
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
