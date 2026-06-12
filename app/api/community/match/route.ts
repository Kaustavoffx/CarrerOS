import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getCommunityResources, SEEDED_RESOURCES, CommunityResource } from "@/lib/community-db";
import type { UserProfileRecord } from "@/lib/supabase/types";

/**
 * High-fidelity rule-based matching engine for fallback matching.
 */
function calculateFallbackMatches(resources: CommunityResource[], profile: UserProfileRecord) {
  return resources.map((res) => {
    let eligibilityScore = 60;
    let impactScore = 50;
    let successProbability = 40;
    const missing: string[] = [];
    let eligibilityStatus: "Fully Eligible" | "Partially Eligible" | "Ineligible" = "Fully Eligible";

    // Detected need
    let detectedNeed = "Career Readiness & Community Placement";
    if (res.type === "wellness") detectedNeed = "Mental Wellness Support";
    else if (res.type === "scholarship" || res.type === "scheme") detectedNeed = "Financial Aid & Scholarships";

    // Goal alignment (Impact)
    const goal = (profile.goal || "").toLowerCase();
    if (goal.includes("software") || goal.includes("developer")) {
      if (res.tags && res.tags.some(t => t.toLowerCase().includes("tech") || t.toLowerCase().includes("coding"))) {
        impactScore += 35;
      }
    }

    // Budget alignment (Eligibility & Impact)
    const budget = (profile.budget || "").toLowerCase();
    if (budget.includes("free") || budget.includes("low")) {
      if (res.description.toLowerCase().includes("free") || res.tags?.some(t => t.toLowerCase().includes("free"))) {
        impactScore += 20;
        eligibilityScore += 20;
      } else if (res.eligibility?.need_based) {
        eligibilityStatus = "Partially Eligible";
        missing.push("Requires financial need assessment documents validation.");
      }
    }

    // Gender check
    if (res.eligibility?.gender === "Female" && profile.full_name && !profile.full_name.toLowerCase().includes("girl")) {
      eligibilityStatus = "Partially Eligible";
      eligibilityScore -= 30;
      missing.push("Requires verification of female applicant criteria.");
    }

    // Experience/Skills (Success Probability)
    if (profile.skills && profile.skills.length > 0) {
      successProbability += 30;
    }

    // Urgency
    let urgency: "High" | "Medium" | "Low" = "Low";
    const deadline = res.deadline || "";
    if (deadline.includes("2026-07") || deadline.includes("2026-08")) urgency = "High";
    else if (deadline.includes("2026-09") || deadline.includes("2026-10")) urgency = "Medium";

    eligibilityScore = Math.max(0, Math.min(100, eligibilityScore));
    impactScore = Math.max(0, Math.min(100, impactScore));
    successProbability = Math.max(0, Math.min(100, successProbability));

    const finalScore = Math.round((eligibilityScore * 0.4) + (impactScore * 0.3) + (successProbability * 0.3));

    return {
      resourceId: res.id,
      score: finalScore,
      eligibilityScore,
      impactScore,
      successProbability,
      urgency,
      detectedNeed,
      whyMatch: "Tailored fallback match based on your core profile metrics.",
      eligibilityStatus,
      missingRequirements: missing,
      actionPlan: res.application_steps || ["Check official portal guidelines", "Prepare required identity documents", "Submit online application"],
      explainabilityData: {
        matchedCriteria: {
          goals: profile.goal ? [profile.goal] : ["General Growth"],
          constraints: profile.budget ? [profile.budget] : [],
          skills: profile.skills || [],
          location: res.city || "Online"
        },
        confidenceScore: finalScore,
        rankingReason: "Highest aggregate score balancing eligibility, potential career impact, and success probability.",
        alternativeRecommendations: ["General Career Counseling", "Online Mentorship Portal"],
        missingInformation: missing,
        potentialRisks: ["Program capacity may fill up before the deadline.", "Eligibility criteria might change."]
      }
    };
  }).sort((a, b) => b.score - a.score).slice(0, 5);
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
    const systemPrompt = `You are a world-class Opportunity Matching Engine for CareerOS.
Analyze the user profile and matched resources list, and return a JSON payload indicating the best opportunities.
Return ONLY a valid JSON object matching this schema, without markdown formatting:
{
  "matches": [
    {
      "resourceId": "string-matching-exact-resource-id",
      "score": number (Overall ranking composite score from 0 to 100),
      "eligibilityScore": number (0-100 based on strict requirements),
      "impactScore": number (0-100 based on potential career/life impact),
      "successProbability": number (0-100 based on skills and experience),
      "urgency": "High" | "Medium" | "Low",
      "detectedNeed": "specific detected user need statement",
      "whyMatch": "detailed custom explainable rationale",
      "eligibilityStatus": "Fully Eligible" | "Partially Eligible" | "Ineligible",
      "missingRequirements": ["list of conflicting profile attributes"],
      "actionPlan": ["Step 1", "Step 2", "Step 3 tailored application steps"],
      "explainabilityData": {
        "matchedCriteria": {
          "skills": ["Skill 1", "Skill 2"],
          "interests": ["Interest 1"],
          "goals": ["Goal 1"],
          "location": "Location Name",
          "constraints": ["Constraint 1"]
        },
        "confidenceScore": number (same as score),
        "rankingReason": "Why this was ranked at its current position vs alternative opportunities",
        "alternativeRecommendations": ["Name of an alternative program"],
        "missingInformation": ["Information that would improve matching confidence"],
        "potentialRisks": ["Why this might not work out"]
      }
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
