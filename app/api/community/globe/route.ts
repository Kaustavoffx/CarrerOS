import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { NeedCategory } from "@/lib/supabase/types";

export type GlobeDataPoint = {
  lat: number;
  lng: number;
  size: number;
  color: string;
  city: string;
  dominantCategory: string;
};

export type CommunityNeedMetrics = {
  supportDemand: number;
  scholarshipDemand: number;
  mentorshipDemand: number;
  careerGuidanceDemand: number;
  learningSupportDemand: number;
  underservedCommunities: string[];
  aiInsights: string[];
  globeData: GlobeDataPoint[];
};

const CATEGORY_COLORS: Record<string, string> = {
  "Support Demand": "#ec4899", // pink
  "Scholarship Demand": "#f59e0b", // amber
  "Mentorship Demand": "#6366f1", // indigo
  "Career Guidance Demand": "#06b6d4", // cyan
  "Learning Support Demand": "#10b981", // emerald
};

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database client unavailable" }, { status: 503 });
    }

    const { data: reports, error } = await supabase
      .from("community_need_reports")
      .select("category, city, lat, lng, created_at, description");

    if (error) {
      throw error;
    }

    let supportDemand = 0;
    let scholarshipDemand = 0;
    let mentorshipDemand = 0;
    let careerGuidanceDemand = 0;
    let learningSupportDemand = 0;

    // We will group by city coordinates to render pillars on the globe
    const cityMap: Record<string, { lat: number; lng: number; categories: Record<string, number>; total: number }> = {};

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    reports?.forEach((report: any) => {
      const cat = report.category as NeedCategory;
      let mappedCategory = "Support Demand";

      if (cat === "scholarship") {
        scholarshipDemand++;
        mappedCategory = "Scholarship Demand";
      } else if (cat === "internship") {
        learningSupportDemand++;
        mappedCategory = "Learning Support Demand";
      } else if (cat === "career_mentorship") {
        // Split mentorship and career guidance somewhat arbitrarily if no other data exists
        // E.g. if description contains 'career' -> Career Guidance Demand
        if (report.description?.toLowerCase().includes("career")) {
          careerGuidanceDemand++;
          mappedCategory = "Career Guidance Demand";
        } else {
          mentorshipDemand++;
          mappedCategory = "Mentorship Demand";
        }
      } else {
        supportDemand++;
        mappedCategory = "Support Demand";
      }

      if (report.city && report.lat && report.lng) {
        if (!cityMap[report.city]) {
          cityMap[report.city] = {
            lat: report.lat,
            lng: report.lng,
            categories: {},
            total: 0
          };
        }
        cityMap[report.city].total++;
        cityMap[report.city].categories[mappedCategory] = (cityMap[report.city].categories[mappedCategory] || 0) + 1;
      }
    });

    const globeData: GlobeDataPoint[] = [];
    const underservedCommunities: string[] = [];

    // Process cities into globe points
    Object.entries(cityMap).forEach(([city, data]) => {
      // Find dominant category for coloring
      let dominantCategory = "Support Demand";
      let maxCount = 0;
      Object.entries(data.categories).forEach(([category, count]) => {
        if (count > maxCount) {
          maxCount = count;
          dominantCategory = category;
        }
      });

      // Calculate size based on total needs in the city
      const size = Math.min(1.0, Math.max(0.1, data.total / 10)); // Scale to max 1.0

      globeData.push({
        lat: data.lat,
        lng: data.lng,
        size,
        color: CATEGORY_COLORS[dominantCategory] || "#ffffff",
        city,
        dominantCategory
      });

      // Simple heuristic: if total needs are high, it's underserved
      if (data.total > 5) {
        underservedCommunities.push(city);
      }
    });

    // Sort underserved communities by severity (which correlates to 'total' demands here)
    underservedCommunities.sort((a, b) => cityMap[b].total - cityMap[a].total);

    // AI Insights (Simulated if OpenAI is not available, but tailored to the data)
    let aiInsights: string[] = [];
    const apiKey = process.env.OPENAI_API_KEY;

    if (apiKey) {
      try {
        const systemPrompt = `You are an AI analyst for CareerOS.
Based on the following demand statistics, generate 3 clear, actionable insights focusing on community needs.
Return a valid JSON array of strings. Do not use markdown blocks.`;
        
        const userPrompt = `
Stats:
- Scholarship Demand: ${scholarshipDemand}
- Mentorship Demand: ${mentorshipDemand}
- Career Guidance Demand: ${careerGuidanceDemand}
- Learning Support Demand: ${learningSupportDemand}
- Support Demand: ${supportDemand}
- Most Underserved Cities: ${underservedCommunities.slice(0, 3).join(", ")}
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
            temperature: 0.3,
            response_format: { type: "json_object" }
          })
        });

        if (response.ok) {
          const data = await response.json();
          const parsed = JSON.parse(data.choices?.[0]?.message?.content || "[]");
          if (Array.isArray(parsed) && parsed.length > 0) {
            aiInsights = parsed;
          }
        }
      } catch (err) {
        console.warn("AI Insights query failed, using fallback", err);
      }
    }

    if (aiInsights.length === 0) {
      // Fallback insights dynamically generated from data
      if (careerGuidanceDemand > mentorshipDemand) {
        aiInsights.push("Career guidance demand is outpacing general mentorship requests, indicating a shift towards specific pathway planning.");
      } else {
        aiInsights.push("Mentorship demand remains high, suggesting strong community reliance on 1:1 professional relationships.");
      }

      if (learningSupportDemand > 0) {
        aiInsights.push(`Learning support and technical internship demands are surging, particularly concentrated near academic hubs.`);
      }

      if (underservedCommunities.length > 0) {
        aiInsights.push(`Critical resource shortages detected in ${underservedCommunities[0]} and ${underservedCommunities[1] || underservedCommunities[0]} across multiple need categories.`);
      } else {
        aiInsights.push("Resource deployment is generally well-distributed across monitored urban districts.");
      }
    }

    const metrics: CommunityNeedMetrics = {
      supportDemand,
      scholarshipDemand,
      mentorshipDemand,
      careerGuidanceDemand,
      learningSupportDemand,
      underservedCommunities: underservedCommunities.slice(0, 5),
      aiInsights,
      globeData
    };

    return NextResponse.json(metrics);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Internal Server Error";
    console.error("Community Globe API Error:", err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
