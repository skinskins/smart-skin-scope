import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Pause de saisie avant de lancer la recherche (évite un appel réseau par frappe). */
export const PRODUCT_SEARCH_DEBOUNCE_MS = 400;
const MIN_QUERY_LENGTH = 2;

export interface ProductSearchResult {
  id: string;
  product_name: string;
  brand: string | null;
  product_type: string | null;
  ingredients: string | null;
  photo_url: string | null;
  open_beauty_facts_id: string | null;
}

export type ProductSearchStatus = "idle" | "loading" | "success" | "no-results" | "error";

/**
 * Recherche produit (onboarding + vanity) via l'edge function "product-search".
 * Debounce la saisie et annule (AbortController) toute requête encore en vol
 * dès qu'une nouvelle recherche démarre, pour éviter qu'une réponse obsolète
 * n'écrase des résultats plus récents.
 */
export function useProductSearch(query: string) {
  const [results, setResults] = useState<ProductSearchResult[]>([]);
  const [status, setStatus] = useState<ProductSearchStatus>("idle");

  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setStatus("idle");
      return;
    }

    const controller = new AbortController();
    setStatus("loading");

    const timer = setTimeout(async () => {
      const { data, error } = await supabase.functions.invoke("product-search", {
        body: { query: trimmed },
        signal: controller.signal,
      });

      // Une recherche plus récente a démarré entre-temps : on ignore cette réponse.
      if (controller.signal.aborted) return;

      if (!error && data?.products) {
        const mapped: ProductSearchResult[] = data.products.map((p: Record<string, unknown>, i: number) => ({
          id: (p.open_beauty_facts_id as string) || `${p.product_name}-${p.brand ?? ""}-${i}`,
          product_name: p.product_name as string,
          brand: (p.brand as string) ?? null,
          product_type: (p.product_type as string) ?? null,
          ingredients: (p.ingredients as string) ?? null,
          photo_url: (p.photo_url as string) ?? null,
          open_beauty_facts_id: (p.open_beauty_facts_id as string) ?? null,
        }));
        setResults(mapped);
        setStatus(mapped.length > 0 ? "success" : "no-results");
      } else {
        setResults([]);
        setStatus("error");
      }
    }, PRODUCT_SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return { results, status };
}
