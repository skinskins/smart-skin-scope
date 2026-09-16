import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSessionUserId } from "@/hooks/useSessionUserId";

export type RoutineProduct = {
  id: string;
  product_name: string;
  brand: string;
  product_type: string | null;
  photo_url: string | null;
  morning_use?: boolean | null;
  evening_use?: boolean | null;
  frequency: string | null;
  frequency_days?: number | null;
  ingredients: string | null;
  added_at?: string | null;
};

const fetchRoutineProducts = async (userId: string): Promise<RoutineProduct[]> => {
  const { data } = await (supabase as any)
    .from("user_products")
    .select("id, product_name, brand, product_type, photo_url, morning_use, evening_use, frequency, frequency_days, ingredients, added_at")
    .eq("user_id", userId)
    .eq("is_active", true);
  return data ?? [];
};

export const useRoutineProducts = () => {
  const queryClient = useQueryClient();

  const { data: userId = null } = useSessionUserId();

  // Cached by userId: switching tabs and coming back re-renders the already-fetched
  // products instantly instead of flashing an empty list while it refetches.
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["routine-products", userId],
    queryFn: () => fetchRoutineProducts(userId as string),
    enabled: !!userId,
    staleTime: 60_000,
  });

  const loading = !!userId && isLoading;

  const morning = useMemo(() => products.filter((p) => p.morning_use), [products]);
  const evening = useMemo(() => products.filter((p) => p.evening_use), [products]);

  const refetch = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["routine-products", userId] });
  }, [queryClient, userId]);

  return { products, morning, evening, loading, refetch };
};
