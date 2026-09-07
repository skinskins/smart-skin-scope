import { supabase } from "@/integrations/supabase/client";

export type GeoPermissionState = "granted" | "denied" | "unset";

// Repli utilisé uniquement en mode invité (pas de session Supabase, donc pas de ligne `profiles`).
const GUEST_KEY = "nacre_geo_permission_guest";

export async function getGeoPermissionState(): Promise<GeoPermissionState> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    try {
      const value = localStorage.getItem(GUEST_KEY);
      return value === "granted" || value === "denied" ? value : "unset";
    } catch {
      return "unset";
    }
  }

  const { data } = await (supabase as any)
    .from("profiles")
    .select("geo_permission_state")
    .eq("id", session.user.id)
    .single();

  return data?.geo_permission_state === "granted" || data?.geo_permission_state === "denied"
    ? data.geo_permission_state
    : "unset";
}

export async function setGeoPermissionState(state: GeoPermissionState): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    try {
      localStorage.setItem(GUEST_KEY, state);
    } catch {
      // ignore (e.g. private browsing storage restrictions)
    }
    return;
  }

  await (supabase as any)
    .from("profiles")
    .update({ geo_permission_state: state })
    .eq("id", session.user.id);
}
