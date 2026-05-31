import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "./supabase-admin";
import type { AiProviderBundle, AiProviderName } from "./ai-provider-vault";
import {
  createEmptyAiProviderBundle,
  decryptAiProviderBundle,
  encryptAiProviderBundle,
  getProviderCredentials,
  maskApiKey,
  normalizeAiProviderName,
  resolvePreferredProvider,
  upsertProviderIntoBundle
} from "./ai-provider-vault";

export type AiProviderStatusRecord = {
  provider: AiProviderName;
  connected: boolean;
  masked_key: string | null;
  created_at: string | null;
  updated_at: string | null;
  active: boolean;
};

type AiProviderRow = {
  user_id: string;
  provider: string;
  encrypted_key: string;
  created_at: string;
  updated_at: string;
};

function defaultStatuses(): AiProviderStatusRecord[] {
  return [
    { provider: "openai", connected: false, masked_key: null, created_at: null, updated_at: null, active: false },
    { provider: "gemini", connected: false, masked_key: null, created_at: null, updated_at: null, active: false }
  ];
}

async function readUserAiProviderRow(client: SupabaseClient, userId: string) {
  const { data, error } = await client
    .from("user_ai_keys")
    .select("user_id, provider, encrypted_key, created_at, updated_at")
    .eq("user_id", userId)
    .maybeSingle<AiProviderRow>();

  if (error) {
    throw error;
  }

  return data ?? null;
}

function bundleToStatuses(bundle: AiProviderBundle, row?: Pick<AiProviderRow, "created_at" | "updated_at" | "provider"> | null): AiProviderStatusRecord[] {
  return (["openai", "gemini"] as AiProviderName[]).map((provider) => {
    const record = bundle.providers[provider];
    return {
      provider,
      connected: Boolean(record?.apiKey),
      masked_key: record?.maskedKey ?? null,
      created_at: record?.createdAt ?? row?.created_at ?? null,
      updated_at: record?.updatedAt ?? row?.updated_at ?? null,
      active: bundle.activeProvider === provider || (!bundle.activeProvider && row?.provider === provider)
    };
  });
}

export async function loadAiProviderStatuses(userId: string): Promise<AiProviderStatusRecord[]> {
  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return defaultStatuses();
  }

  const row = await readUserAiProviderRow(adminClient, userId);
  if (!row?.encrypted_key) {
    return defaultStatuses();
  }

  try {
    const bundle = decryptAiProviderBundle(row.encrypted_key);
    return bundleToStatuses(bundle, row);
  } catch {
    return defaultStatuses();
  }
}

export async function loadAiProviderBundle(userId: string) {
  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return { row: null, bundle: createEmptyAiProviderBundle() };
  }

  const row = await readUserAiProviderRow(adminClient, userId);
  if (!row?.encrypted_key) {
    return { row: row ?? null, bundle: createEmptyAiProviderBundle() };
  }

  try {
    return {
      row,
      bundle: decryptAiProviderBundle(row.encrypted_key)
    };
  } catch {
    return { row, bundle: createEmptyAiProviderBundle() };
  }
}

export async function saveAiProviderKey(userId: string, provider: string, apiKey: string) {
  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    throw new Error("Supabase service role key is missing.");
  }

  const normalizedProvider = normalizeAiProviderName(provider);
  const timestamp = new Date().toISOString();
  const current = await loadAiProviderBundle(userId);
  const nextBundle = upsertProviderIntoBundle(current.bundle ?? createEmptyAiProviderBundle(), normalizedProvider, apiKey, timestamp);
  const encrypted_key = encryptAiProviderBundle(nextBundle);
  const activeProvider = resolvePreferredProvider(nextBundle) ?? normalizedProvider;

  const { error } = await adminClient.from("user_ai_keys").upsert(
    {
      user_id: userId,
      provider: activeProvider,
      encrypted_key,
      created_at: current.row?.created_at ?? timestamp,
      updated_at: timestamp
    },
    { onConflict: "user_id" }
  );

  if (error) {
    throw error;
  }

  return bundleToStatuses(nextBundle, { created_at: current.row?.created_at ?? timestamp, updated_at: timestamp, provider: activeProvider });
}

export async function resolveUserAiProviderForGeneration(userId: string) {
  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return { provider: null as AiProviderName | null, apiKey: null as string | null };
  }

  const current = await loadAiProviderBundle(userId);
  const preferred = resolvePreferredProvider(current.bundle);
  if (!preferred) {
    return { provider: null, apiKey: null };
  }

  return {
    provider: preferred,
    apiKey: getProviderCredentials(current.bundle, preferred)
  };
}

export function maskProviderKey(provider: AiProviderName, apiKey: string) {
  return maskApiKey(provider, apiKey);
}
