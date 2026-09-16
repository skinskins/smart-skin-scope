import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const SESSION_USER_ID_QUERY_KEY = ["auth-session-user-id"] as const;

export const fetchSessionUserId = async (): Promise<string | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user.id ?? null;
};

// Shared across pages so the session lookup is cached app-wide (survives route
// changes) instead of every page re-resolving it — and, more importantly, so
// data queries keyed on the resulting userId can hit cache immediately too.
export const useSessionUserId = () =>
  useQuery({
    queryKey: SESSION_USER_ID_QUERY_KEY,
    queryFn: fetchSessionUserId,
    staleTime: 5 * 60_000,
  });
