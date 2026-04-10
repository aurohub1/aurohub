"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client.
 * Uses @supabase/ssr so a sessão fica em cookies (legível pelo middleware).
 * API idêntica ao @supabase/supabase-js — os imports existentes continuam funcionando.
 */
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
