import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseConfig, hasSupabaseEnv } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const nextPath = url.searchParams.get("next") ?? "/dashboard";

  if (!hasSupabaseEnv()) {
    return NextResponse.redirect(new URL("/login?error=supabase-missing", url.origin));
  }

  const { url: supabaseUrl, anonKey } = getSupabaseConfig();
  const nextUrl = (() => {
    try {
      const candidate = new URL(nextPath, url.origin);
      return candidate.origin === url.origin ? `${candidate.pathname}${candidate.search}` : "/dashboard";
    } catch {
      return "/dashboard";
    }
  })();

  const response = NextResponse.redirect(new URL(nextUrl, url.origin));
  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      }
    }
  });

  const code = url.searchParams.get("code");
  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  return response;
}
