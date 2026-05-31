import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { hasSupabaseEnv } from "@/lib/supabase";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export default async function SignupPage() {
  if (hasSupabaseEnv()) {
    const supabase = await getSupabaseServerClient();

    if (supabase) {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (user) {
        redirect("/dashboard");
      }
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-6 py-10 sm:px-8 lg:px-10">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-7xl items-center gap-8 lg:grid-cols-[1.02fr_0.98fr]">
        <div>
          <p className="caption text-cyan-200">CareerOS access</p>
          <h1 className="mt-4 max-w-3xl heading-hero text-white">Create your account and start onboarding.</h1>
          <p className="mt-5 max-w-2xl body text-slate-300">
            Signup uses Supabase Auth with Google, GitHub, and email magic links.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 small text-slate-300">
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2">Secure auth</span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2">Persistent session</span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2">Cloud state</span>
          </div>
          <div className="mt-8 rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-5 small leading-7 text-slate-300 backdrop-blur-2xl">
            <p className="text-white">Already have an account?</p>
            <Link href="/login" className="mt-2 inline-flex text-cyan-200 underline decoration-cyan-200/40 underline-offset-4">Go to login</Link>
          </div>
        </div>

        <AuthForm mode="signup" />
      </div>
    </main>
  );
}
