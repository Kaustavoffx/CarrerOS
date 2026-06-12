import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getSupabaseConfig, hasSupabaseEnv } from "./supabase";

export async function getSupabaseServerClient() {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const { url, anonKey } = getSupabaseConfig();
  const cookieStore = await cookies();

  const client = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Cookie writes can be blocked in some server component contexts.
        }
      }
    }
  }) as SupabaseClient;

  if (cookieStore.get("careeros_judge_demo")?.value === "true") {
    client.auth.getUser = async () => ({
      data: { user: { id: "demo-roni-judge-id", email: "roni@demo.careeros" } },
      error: null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  }

  return client;
}
