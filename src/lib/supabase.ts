import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { CLOUD_URL, CLOUD_KEY } from './cloud-config';

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || CLOUD_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || CLOUD_KEY;
  if (!url || !key) return null;
  if (!client) client = createClient(url, key);
  return client;
}
