import { createClient, type User } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

export const backendConfigured = Boolean(supabaseUrl && supabaseKey);

export const supabase = backendConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    })
  : null;

export function githubName(user: User | null) {
  if (!user) return "";
  const metadata = user.user_metadata ?? {};
  return (
    metadata.user_name ||
    metadata.preferred_username ||
    metadata.name ||
    user.email?.split("@")[0] ||
    "Account"
  );
}

export function githubAvatar(user: User | null) {
  if (!user) return "";
  return user.user_metadata?.avatar_url || user.user_metadata?.picture || "";
}

export function initials(name: string) {
  const parts = name.trim().split(/[\s_-]+/).filter(Boolean);
  if (!parts.length) return "?";
  return parts.slice(0, 2).map((part) => part[0].toUpperCase()).join("");
}

export function authRedirectUrl() {
  return `${window.location.origin}${window.location.pathname}`;
}
