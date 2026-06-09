import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getCommunityResources } from "@/lib/community-db";

export async function POST(req: Request) {
  try {
    const { profile } = await req.json();
    if (!profile) {
      return NextResponse.json({ error: "Profile context is required." }, { status: 400 });
    }

    const supabase = await getSupabaseServerClient();
    const resources = await getCommunityResources(supabase, {});

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      // Rule-based high-fidelity fallback algorithm
      const matches = resources.map((res) => {
        let score = 50; // base score
        const reasons: string[] = [];

        // Goal alignment
        const goal = (profile.goal || "").toLowerCase();
        if (goal.includes("software") || goal.includes("developer") || goal.includes("engineer") || goal.includes("sde")) {
          if (res.tags.some(t => ["technical", "coding", "aws", "ibm", "google", "tech"].includes(t.toLowerCase()))) {
            score += 25;
            reasons.push("Aligns directly with your software engineering career objectives.");
          }
        }

        // Budget alignment
        const budget = (profile.budget || "").toLowerCase();
        if (budget.includes("free") || budget.includes("low")) {
          if (res.description.toLowerCase().includes("free") || res.tags.some(t => ["scholarship", "need-based", "free"].includes(t.toLowerCase()))) {
            score += 20;
            reasons.push("Matches your budget requirements by providing free access or funding.");
          }
        }

        // Obstacles alignment
        if (profile.obstacles && Array.isArray(profile.obstacles)) {
          const obsStr = profile.obstacles.join(" ").toLowerCase();
          if (obsStr.includes("financial") || obsStr.includes("money") || obsStr.includes("fee")) {
            if (res.type === "scholarship" || res.type === "scheme") {
              score += 15;
              reasons.push("Provides financial support to mitigate your listed financial challenges.");
            }
          }
        }

        // Cap score at 98
        const finalScore = Math.min(98, score);
        const reason = reasons.length > 0 
          ? reasons.join(" ") 
          : `Tailored support match corresponding to your target track as a ${profile.goal || "professional"}.`;

        return {
          resourceId: res.id,
          score: finalScore,
          reasoning: reason
        };
      }).sort((a, b) => b.score - a.score).slice(0, 5);

      return NextResponse.json({ matches });
    }

    // Call OpenAI GPT API for premium matching
    const systemPrompt = `You are a Community Support Intelligence matching system for CareerOS.
Analyze the user profile and matched resources list, and return a JSON payload indicating the best opportunities.
Return ONLY a valid JSON object matching this schema, without markdown formatting:
{
  "matches": [
    {
      "resourceId": "string-matching-exact-resource-id",
      "score": number (0 to 100),
      "reasoning": "precise custom 2-sentence rationale connecting profile variables to this opportunity"
    }
  ]
}
Do not return any extra explanation or backticks.`;

    const userPrompt = `
User Profile:
- Goal: ${profile.goal || "Not specified"}
- Experience Level: ${profile.experience_level || "Not specified"}
- Skills: ${JSON.stringify(profile.skills || [])}
- Budget: ${profile.budget || "Not specified"}
- Obstacles: ${JSON.stringify(profile.obstacles || [])}

Available Resources:
${resources.map(r => `- ID: ${r.id}, Name: ${r.name}, Type: ${r.type}, Description: ${r.description}, Tags: ${JSON.stringify(r.tags)}`).join("\n")}
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.2,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      throw new Error("OpenAI API match call failed");
    }

    const data = await response.json();
    const resultText = data.choices?.[0]?.message?.content || "{}";
    const resultJson = JSON.parse(resultText);

    return NextResponse.json(resultJson);
  } catch (err: any) {
    console.error("Match API error:", err);
    return NextResponse.json({ error: err.message || "Failed to process matches" }, { status: 500 });
  }
}
