import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { NeedCategory, NeedUrgency } from "@/lib/supabase/types";

// ── City geocode lookup (static — avoids external API calls) ─────────────────
const CITY_GEOCODES: Record<string, { lat: number; lng: number }> = {
  "Bangalore":  { lat: 12.9716, lng: 77.5946 },
  "New Delhi":  { lat: 28.6139, lng: 77.2090 },
  "Mumbai":     { lat: 19.0760, lng: 72.8777 },
  "Kolkata":    { lat: 22.5726, lng: 88.3639 },
  "Jaipur":     { lat: 26.9124, lng: 75.7873 },
  "Pune":       { lat: 18.5204, lng: 73.8567 },
  "Ahmedabad":  { lat: 23.0225, lng: 72.5714 },
  "Hyderabad":  { lat: 17.3850, lng: 78.4867 },
  "Chennai":    { lat: 13.0827, lng: 80.2707 },
  "Lucknow":    { lat: 26.8467, lng: 80.9462 },
};

const CATEGORY_LABELS: Record<NeedCategory, string> = {
  career_mentorship: "Career Mentorship",
  housing:           "Housing Support",
  food:              "Food & Nutrition",
  mental_health:     "Mental Health",
  scholarship:       "Scholarship",
  internship:        "Internship",
  other:             "Other Support",
};

// Available resources per category (seeded baseline)
const BASELINE_AVAILABLE: Record<NeedCategory, number> = {
  career_mentorship: 21,
  housing:           8,
  food:              5,
  mental_health:     12,
  scholarship:       38,
  internship:        19,
  other:             4,
};

/* ─────────────────────────────────────────────────────────────
   GET — Fetch aggregated need stats + recent reports
───────────────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    if (!supabase) throw new Error("Database client unavailable");

    const url   = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") ?? "20");

    const { data: rawReports, error: aggError } = await supabase
      .from("community_need_reports")
      .select("category, urgency, city, created_at, status, id")
      .order("created_at", { ascending: false })
      .limit(200);

    if (aggError) throw aggError;

    const countByCategory: Record<string, number> = {};
    const reports = rawReports ?? [];

    for (const row of reports) {
      const cat = row.category as string;
      countByCategory[cat] = (countByCategory[cat] ?? 0) + 1;
    }

    const CATEGORIES: NeedCategory[] = [
      "career_mentorship", "housing", "food", "mental_health",
      "scholarship", "internship", "other",
    ];

    const needStats = CATEGORIES.map((cat) => {
      const requests  = countByCategory[cat] ?? 0;
      const available = BASELINE_AVAILABLE[cat] ?? 1;
      const gapScore  = Math.min(100, Math.round((requests / (available + 1)) * 100));

      let trend: "crisis" | "increasing" | "stable" | "declining" = "stable";
      if (gapScore >= 80)      trend = "crisis";
      else if (gapScore >= 50) trend = "increasing";
      else if (gapScore < 20)  trend = "declining";

      return {
        category: cat,
        label:    CATEGORY_LABELS[cat],
        requests,
        available,
        gapScore,
        trend,
      };
    });

    const recentReports = reports.slice(0, limit);

    return NextResponse.json({ needStats, recentReports, total: reports.length });
  } catch (err) {
    console.error("[needs GET]", err);
    return NextResponse.json({ needStats: [], recentReports: [], total: 0 });
  }
}

/* ─────────────────────────────────────────────────────────────
   POST — Submit a new community need report
───────────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database client unavailable" }, { status: 503 });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json() as {
      category:     NeedCategory;
      urgency:      NeedUrgency;
      description?: string;
      city?:        string;
      district?:    string;
      state?:       string;
      country?:     string;
    };

    if (!body.category) {
      return NextResponse.json({ error: "category is required" }, { status: 400 });
    }

    const geo = body.city ? (CITY_GEOCODES[body.city] ?? null) : null;

    const { data: report, error: insertError } = await supabase
      .from("community_need_reports")
      .insert({
        user_id:     user.id,
        category:    body.category,
        urgency:     body.urgency ?? "medium",
        description: body.description ?? null,
        city:        body.city     ?? null,
        district:    body.district ?? null,
        state:       body.state    ?? null,
        country:     body.country  ?? "India",
        lat:         geo?.lat ?? null,
        lng:         geo?.lng ?? null,
        status:      "open",
      })
      .select()
      .single();

    if (insertError) throw insertError;

    if (geo && report) {
      const urgencyIntensity: Record<NeedUrgency, number> = {
        low: 0.4, medium: 0.7, high: 1.0, critical: 1.5,
      };
      await supabase.from("community_heatmap_points").insert({
        report_id: report.id,
        category:  body.category,
        city:      body.city ?? null,
        lat:       geo.lat,
        lng:       geo.lng,
        intensity: urgencyIntensity[body.urgency ?? "medium"],
      });
    }

    return NextResponse.json({ success: true, report });
  } catch (err) {
    console.error("[needs POST]", err);
    const msg = err instanceof Error ? err.message : "Failed to submit report";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
