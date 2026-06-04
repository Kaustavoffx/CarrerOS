"use client";

import { useState } from "react";
import { CheckCircle2, Clock3, Shield, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import type { AiProviderStatusRecord } from "@/lib/supabase/types";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { MagneticButton } from "./magnetic-button";

function formatDateTime(dateString: string) {
  return new Date(dateString).toISOString().replace("T", " ").slice(0, 19);
}

type ProviderFormState = Record<string, string>;

type AiProvidersPanelProps = {
  providers: AiProviderStatusRecord[];
};

const providerLabels: Record<AiProviderStatusRecord["provider"], string> = {
  openai: "OpenAI API Key",
  gemini: "Gemini API Key"
};

const providerHints: Record<AiProviderStatusRecord["provider"], string> = {
  openai: "Used first after your free generations are exhausted.",
  gemini: "Used when OpenAI is not configured or not preferred."
};

export function AiProvidersPanel({ providers }: AiProvidersPanelProps) {
  const router = useRouter();
  const [values, setValues] = useState<ProviderFormState>({ openai: "", gemini: "" });
  const [savingProvider, setSavingProvider] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [localProviders, setLocalProviders] = useState(providers);

  async function handleSave(provider: AiProviderStatusRecord["provider"]) {
    const apiKey = values[provider].trim();
    if (!apiKey) {
      setStatusMessage("Enter a provider key before saving.");
      return;
    }

    setSavingProvider(provider);
    setStatusMessage(null);

    try {
      const supabase = getSupabaseBrowserClient();
      let session = null;
      let user = null;

      if (supabase) {
        const { data } = await supabase.auth.getSession();
        session = data.session;
        user = data.session?.user ?? null;
      }

      console.log("SESSION", session);
      console.log("USER", user);

      if (!session) {
        router.push("/login");
        return;
      }

      const response = await fetch("/api/ai-providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Unable to save provider.");
      }

      if (Array.isArray(data?.providers)) {
        setLocalProviders(data.providers);
      }

      setValues((current) => ({ ...current, [provider]: "" }));
      setStatusMessage(`${providerLabels[provider]} saved securely.`);
      router.refresh();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to save provider.");
    } finally {
      setSavingProvider(null);
    }
  }

  return (
    <section id="ai-providers" className="liquid-panel rounded-[24px] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.42)]">
      <div className="relative z-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-xs uppercase tracking-[0.35em] text-cyan-200">
          <Sparkles className="h-3.5 w-3.5" />
          AI Providers
        </div>
        <h2 className="mt-5 heading-dashboard text-white">Bring your own AI key.</h2>
        <p className="mt-3 max-w-2xl body text-slate-300">
          Keys are encrypted on the server only. The browser never sees the stored secret, and we only show a masked preview plus the last update time.
        </p>

        {statusMessage ? (
          <div className="mt-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
            {statusMessage}
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {localProviders.map((provider) => (
            <article key={provider.provider} className="liquid-card rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="caption text-slate-400">{provider.provider === "openai" ? "OpenAI" : "Gemini"}</p>
                  <h3 className="mt-2 heading-card text-white">{providerLabels[provider.provider]}</h3>
                  <p className="mt-2 small text-slate-400">{providerHints[provider.provider]}</p>
                </div>
                <div className={`rounded-full px-3 py-1 text-xs font-semibold ${provider.connected ? "bg-emerald-400/10 text-emerald-200" : "bg-white/5 text-slate-400"}`}>
                  {provider.connected ? "Connected" : "Not connected"}
                </div>
              </div>

              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <div className="rounded-xl border border-white/8 bg-black/20 px-4 py-3">
                  <p className="caption text-slate-500">Masked key</p>
                  <p className="mt-1 font-semibold text-white">{provider.masked_key ?? "Not saved yet"}</p>
                </div>
                <div className="rounded-xl border border-white/8 bg-black/20 px-4 py-3">
                  <p className="caption text-slate-500">Last updated</p>
                  <p className="mt-1 flex items-center gap-2 font-semibold text-white">
                    <Clock3 className="h-4 w-4 text-cyan-300" />
                    {provider.updated_at ? formatDateTime(provider.updated_at) : "Not connected"}
                  </p>
                </div>
                {provider.active ? (
                  <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-cyan-100">
                    <p className="flex items-center gap-2 font-semibold"><Shield className="h-4 w-4" /> Priority provider</p>
                    <p className="mt-1 text-xs text-cyan-100/80">This provider is used first for roadmap generation.</p>
                  </div>
                ) : null}
              </div>

              <label className="mt-5 block">
                <span className="caption text-slate-400">{providerLabels[provider.provider]}</span>
                <input
                  type="password"
                  autoComplete="off"
                  value={values[provider.provider]}
                  onChange={(event) => setValues((current) => ({ ...current, [provider.provider]: event.target.value }))}
                  placeholder={`Paste your ${provider.provider === "openai" ? "OpenAI" : "Gemini"} API key`}
                  className="mt-2 carved-input w-full rounded-xl px-4 py-2 text-white placeholder:text-slate-500 focus:border-cyan-400/60"
                />
              </label>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <MagneticButton
                  type="button"
                  onClick={() => void handleSave(provider.provider)}
                  disabled={savingProvider === provider.provider}
                  className="tactile-btn tactile-btn-primary inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
                >
                  {savingProvider === provider.provider ? <span className="loading-spinner mr-1.5" /> : <CheckCircle2 className="h-4 w-4" />}
                  Save
                </MagneticButton>
                <p className="small text-slate-500">Never stored in localStorage or sessionStorage.</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
