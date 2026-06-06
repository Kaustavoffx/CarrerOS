"use client";

import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { updateProfile } from "@/lib/app-data";
import type { UserProfileRecord } from "@/lib/supabase/types";
import { MagneticButton } from "./magnetic-button";
import { CheckCircle2 } from "lucide-react";

type ProfileEditorProps = {
  userId: string;
  profile: UserProfileRecord | null;
};

export function ProfileEditor({ userId, profile }: ProfileEditorProps) {
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? "");
  const [goal, setGoal] = useState(profile?.goal ?? "");
  const [readinessScore, setReadinessScore] = useState(String(profile?.readiness_score ?? 0));
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setStatus("Set your Supabase environment variables to save profile changes.");
      return;
    }

    setSaving(true);
    try {
      await updateProfile(supabase, userId, {
        full_name: fullName.trim() || null,
        avatar_url: avatarUrl.trim() || null,
        goal: goal.trim() || null,
        readiness_score: Number(readinessScore)
      });
      setStatus("Profile saved to Supabase.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="liquid-panel space-y-6 rounded-[24px] p-6 shadow-[0_8px_24px_rgba(0,0,0,0.25)]">
      <div className="relative z-10">
        <p className="caption text-cyan-200">Profile</p>
        <h2 className="mt-2 heading-dashboard text-white">Keep your identity, goal, and readiness score in sync.</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 relative z-10">
        <label className="space-y-2 small text-slate-300">
          <span className="caption text-slate-400">Name</span>
          <input value={fullName} onChange={(event) => setFullName(event.target.value)} className="carved-input w-full rounded-xl px-4 py-2 text-white" />
        </label>
        <label className="space-y-2 small text-slate-300">
          <span className="caption text-slate-400">Avatar URL</span>
          <input value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} placeholder="https://..." className="carved-input w-full rounded-xl px-4 py-2 text-white" />
        </label>
        <label className="space-y-2 small text-slate-300 sm:col-span-2">
          <span className="caption text-slate-400">Goal</span>
          <input value={goal} onChange={(event) => setGoal(event.target.value)} className="carved-input w-full rounded-xl px-4 py-2 text-white" />
        </label>
        <label className="space-y-2 small text-slate-300">
          <span className="caption text-slate-400">Readiness score</span>
          <input value={readinessScore} onChange={(event) => setReadinessScore(event.target.value)} type="number" min="0" max="100" className="carved-input w-full rounded-xl px-4 py-2 text-white" />
        </label>
        <div className="flex items-end">
          <MagneticButton type="button" onClick={() => void handleSave()} disabled={saving} className="tactile-btn tactile-btn-primary inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-black disabled:opacity-60">
            {saving ? <span className="loading-spinner" /> : <CheckCircle2 className="h-4 w-4" />}
            Save profile
          </MagneticButton>
        </div>
      </div>

      {status ? <p className="text-sm text-cyan-200 relative z-10">{status}</p> : null}
    </div>
  );
}
