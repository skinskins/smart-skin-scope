import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type RoutineProduct = {
  id: string;
  product_name: string;
  brand: string;
  product_type: string | null;
  photo_url: string | null;
  morning_use?: boolean | null;
  evening_use?: boolean | null;
  frequency: string | null;
  ingredients: string | null;
};

export const useRoutineProducts = () => {
  const [products, setProducts] = useState<RoutineProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }
    const { data } = await (supabase as any)
      .from("user_products")
      .select("id, product_name, brand, product_type, photo_url, morning_use, evening_use, frequency, ingredients")
      .eq("user_id", session.user.id)
      .eq("is_active", true);
    setProducts(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const morning = useMemo(() => products.filter(p => p.morning_use), [products]);
  const evening = useMemo(() => products.filter(p => p.evening_use), [products]);

  return { products, morning, evening, loading, refetch: load };
};
