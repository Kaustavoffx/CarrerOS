import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadAiProviderStatuses, saveAiProviderKey } from "@/lib/ai-provider-store";

const RequestSchema = z.object({
  provider: z.enum(["openai", "gemini"]),
  apiKey: z.string().trim().min(1).max(8192)
});

export async function GET() {
  try {
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

    const providers = await loadAiProviderStatuses(user.id);
    return NextResponse.json({ providers });
  } catch (error) {
    console.error("AI PROVIDERS LOAD FAILED", error);
    return NextResponse.json({ error: "Unable to load AI providers." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
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

    const rawBody = await req.json();
    const parsed = RequestSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid provider payload.", details: parsed.error.issues }, { status: 400 });
    }

    const providers = await saveAiProviderKey(user.id, parsed.data.provider, parsed.data.apiKey);
    return NextResponse.json({ providers });
  } catch (error) {
    console.error("AI PROVIDERS SAVE FAILED", error);
    return NextResponse.json({ error: "Unable to save AI provider." }, { status: 500 });
  }
}
