import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getCommunityResources, SEEDED_RESOURCES, CommunityResource } from "@/lib/community-db";
import type { UserProfileRecord } from "@/lib/supabase/types";

/**
 * High-fidelity rule-based matching engine for fallback matching.
 */
function calculateFallbackMatches(resources: CommunityResource[], profile: UserProfileRecord) {
  return resources.map((res) => {
    let score = 50; // base score
    const reasons: string[] = [];
    const missing: string[] = [];
    let eligibilityStatus: "Fully Eligible" | "Partially Eligible" | "Ineligible" = "Fully Eligible";

    // Detected need
    let detectedNeed = "Career Readiness & Community Placement";
    if (res.type === "wellness") {
      detectedNeed = "Mental Wellness & Student Counseling Support";
    } else if (res.type === "scholarship" || res.type === "scheme") {
      detectedNeed = "Financial Aid & Scholarship Schemes";
    } else if (res.type === "certification") {
      detectedNeed = "Technical Skill Certification & Learning";
    }

    // Goal alignment
    const goal = (profile.goal || "").toLowerCase();
    if (goal.includes("software") || goal.includes("developer") || goal.includes("engineer") || goal.includes("sde")) {
      if (res.tags && Array.isArray(res.tags) && res.tags.some((t: string) => ["technical", "coding", "aws", "ibm", "google", "tech"].includes(t.toLowerCase()))) {
        score += 25;
        reasons.push("Aligns directly with your software engineering career objectives.");
      }
    }

    // Budget alignment
    const budget = (profile.budget || "").toLowerCase();
    if (budget.includes("free") || budget.includes("low")) {
      if (res.description.toLowerCase().includes("free") || (res.tags && Array.isArray(res.tags) && res.tags.some((t: string) => ["scholarship", "need-based", "free"].includes(t.toLowerCase())))) {
        score += 20;
        reasons.push("Matches your budget requirements by providing free access or funding.");
      } else if (res.eligibility && res.eligibility.need_based) {
        eligibilityStatus = "Partially Eligible";
        missing.push("Requires financial need assessment documents validation.");
      }
    }

    // Gender check mock
    if (res.eligibility && res.eligibility.gender === "Female" && profile.full_name && !profile.full_name.toLowerCase().includes("girl") && !profile.full_name.toLowerCase().includes("female")) {
      // Rule threshold checks
      eligibilityStatus = "Partially Eligible";
      missing.push("Requires verification of female applicant criteria.");
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

    // Urgency
    let urgency: "High" | "Medium" | "Low" = "Low";
    const deadline = res.deadline || "";
    if (deadline.includes("2026-07") || deadline.includes("2026-08")) {
      urgency = "High";
    } else if (deadline.includes("2026-09") || deadline.includes("2026-10")) {
      urgency = "Medium";
    }

    // Cap score at 98
    const finalScore = Math.min(98, score);
    const reason = reasons.length > 0 
      ? reasons.join(" ") 
      : `Tailored support match corresponding to your target track as a ${profile.goal || "professional"}.`;

    return {
      resourceId: res.id,
      score: finalScore,
      detectedNeed,
      whyMatch: reason,
      urgency,
      eligibilityStatus,
      missingRequirements: missing,
      actionPlan: res.application_steps || [
        "Check official portal eligibility guidelines",
        "Prepare identity and qualifications proof certificates",
        "Submit online application form with personal context statement"
      ]
    };
  }).sort((a: { score: number }, b: { score: number }) => b.score - a.score).slice(0, 5);
}

export async function POST(req: Request) {
  let profileContext: UserProfileRecord | null = null;
  try {
    const body = (await req.json().catch(() => ({}))) as { profile?: UserProfileRecord };
    const { profile } = body;
    profileContext = profile || null;

    if (!profile) {
      return NextResponse.json({ error: "Profile context is required." }, { status: 400 });
    }

    const supabase = await getSupabaseServerClient().catch(() => null);
    const resources = await getCommunityResources(supabase, {});

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.log("[Match API] OpenAI API Key is missing. Invoking fallback matching.");
      const fallbackMatches = calculateFallbackMatches(resources, profile);
      return NextResponse.json({
        success: false,
        reason: "OpenAI API Key is missing.",
        matches: fallbackMatches,
        fallbackMatches
      });
    }

    // Call OpenAI GPT API for premium matching
    const systemPrompt = `You are a Community Support Intelligence matching system for CareerOS.
Analyze the user profile and matched resources list, and return a JSON payload indicating the best opportunities.
Return ONLY a valid JSON object matching this schema, without markdown formatting:
{
  "matches": [
    {
      "resourceId": "string-matching-exact-resource-id",
      "score": number (Confidence score from 0 to 100),
      "detectedNeed": "specific detected user need statement matching their obstacles",
      "whyMatch": "detailed custom explainable matching rationale linking user profile parameters to this opportunity",
      "urgency": "High" | "Medium" | "Low",
      "eligibilityStatus": "Fully Eligible" | "Partially Eligible" | "Ineligible",
      "missingRequirements": ["list of profile attributes that conflict or are missing relative to the rules"],
      "actionPlan": ["Step 1", "Step 2", "Step 3 tailored application steps"]
    }
  ]
}
Do not return any extra explanation or backticks.`;

    const userPrompt = `
User Profile:
- Name: ${profile.full_name || "Applicant"}
- Goal: ${profile.goal || "Not specified"}
- Experience Level: ${profile.experience_level || "Not specified"}
- Skills: ${JSON.stringify(profile.skills || [])}
- Budget: ${profile.budget || "Not specified"}
- Obstacles: ${JSON.stringify(profile.obstacles || [])}

Available Resources:
${resources.map(r => `- ID: ${r.id}, Name: ${r.name}, Type: ${r.type}, Description: ${r.description}, Eligibility: ${JSON.stringify(r.eligibility)}, Deadline: ${r.deadline || "None"}, Strict Requirements: ${JSON.stringify(r.strict_requirements || [])}, Application Steps: ${JSON.stringify(r.application_steps || [])}`).join("\n")}
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
      throw new Error(`OpenAI API match call failed with status ${response.status}`);
    }

    const data = await response.json();
    const resultText = data.choices?.[0]?.message?.content || "{}";
    const resultJson = JSON.parse(resultText);

    return NextResponse.json({
      success: true,
      matches: resultJson.matches || []
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Failed to process matches";
    console.error("Match API error encountered. Redirecting pipeline to fallback algorithm:", err);

    let fallbackMatches: ReturnType<typeof calculateFallbackMatches> = [];
    try {
      const supabase = await getSupabaseServerClient().catch(() => null);
      const resources = await getCommunityResources(supabase, {});
      fallbackMatches = calculateFallbackMatches(resources, profileContext || {} as UserProfileRecord);
    } catch (fallbackErr) {
      console.error("Fatal failure in fallback matching resolution:", fallbackErr);
      fallbackMatches = calculateFallbackMatches(SEEDED_RESOURCES, profileContext || {} as UserProfileRecord);
    }

    return NextResponse.json({
      success: false,
      reason: errorMsg,
      matches: fallbackMatches,
      fallbackMatches
    });
  }
}
