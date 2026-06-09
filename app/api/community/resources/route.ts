import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getCommunityResources } from "@/lib/community-db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = searchParams.get("lat") ? parseFloat(searchParams.get("lat")!) : undefined;
    const lng = searchParams.get("lng") ? parseFloat(searchParams.get("lng")!) : undefined;
    const distance = searchParams.get("distance") ? parseFloat(searchParams.get("distance")!) : undefined;
    const type = searchParams.get("type") || "all";
    const searchQuery = searchParams.get("searchQuery") || "";

    const supabase = await getSupabaseServerClient();
    const resources = await getCommunityResources(supabase, {
      lat,
      lng,
      distance,
      type,
      searchQuery
    });

    return NextResponse.json({ resources });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Failed to retrieve resources";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
