import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const missingEnv = !supabaseUrl || !supabaseAnonKey;
const missingEnvMessage =
  'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.';

const missingSupabase = new Proxy(() => undefined, {
  get: () => missingSupabase,
  apply: () => {
    throw new Error(missingEnvMessage);
  },
});

if (missingEnv) {
  console.warn(missingEnvMessage);
}

export const supabase = missingEnv
  ? missingSupabase
  : createClient(supabaseUrl, supabaseAnonKey);
