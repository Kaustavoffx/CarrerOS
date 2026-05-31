import { getSupabaseConfig, hasSupabaseEnv } from "../supabase";

export function hasSupabaseConfig() {
  return hasSupabaseEnv();
}

export function getSupabaseUrl() {
  return getSupabaseConfig().url;
}

export function getSupabaseAnonKey() {
  return getSupabaseConfig().anonKey;
}
