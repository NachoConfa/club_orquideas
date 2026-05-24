import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';

export const SUPABASE_AUTH_STORAGE_KEY = 'club-orquideas-supabase-auth';
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
        storageKey: SUPABASE_AUTH_STORAGE_KEY,
      },
    })
  : null;

export const getSupabaseConfigMessage = () =>
  'Faltan VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en el archivo .env.';
