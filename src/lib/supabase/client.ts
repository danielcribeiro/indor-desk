import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

// Cliente para uso no lado do cliente (browser)
// Nota: A tipagem é desabilitada para simplificar. Em produção, use `supabase gen types`
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Factory para criar cliente com token customizado (server-side)
export function createServerClient(accessToken?: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    },
  });
}
