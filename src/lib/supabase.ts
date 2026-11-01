import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** .env faylida VITE_SUPABASE_URL va VITE_SUPABASE_ANON_KEY to'ldirilganmi? */
export const isSupabaseConfigured = Boolean(url && key);

export const supabase = createClient(
  url || "https://not-configured.supabase.co",
  key || "not-configured",
);
