import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseConfig, hasSupabaseEnv } from "@/lib/supabase";

const protectedRoutes = ["/dashboard", "/roadmaps", "/career-twin", "/mentor", "/settings", "/profile", "/onboarding"];

export async function middleware(request: NextRequest) {
  if (!hasSupabaseEnv()) {
    return NextResponse.next();
  }

  const { url, anonKey } = getSupabaseConfig();

  const response = NextResponse.next({ request: { headers: request.headers } });
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      }
    }
  });

  const { data } = await supabase.auth.getUser();
  const isProtected = protectedRoutes.some((route) => request.nextUrl.pathname.startsWith(route));

  if (!data.user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/roadmaps/:path*", "/career-twin/:path*", "/mentor/:path*", "/settings/:path*", "/profile/:path*", "/onboarding/:path*"]
};
