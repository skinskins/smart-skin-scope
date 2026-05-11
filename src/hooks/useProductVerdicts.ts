import { useEffect, useState } from 'react';
import { supabase } from "@/integrations/supabase/client";

export type ProductVerdict = {
  product_id: string;
  verdict: 'recommended' | 'avoid' | 'neutral';
  reason: string | null;
}

export function useProductVerdicts() {
  const [verdicts, setVerdicts] = useState<ProductVerdict[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setLoading(false);
          return;
        }

        const userId = session.user.id;
        const today = new Date().toISOString().split('T')[0];

        const [productsRes, symptomsRes, checkinRes] = await Promise.all([
          supabase
            .from('user_products')
            .select('id, product_name, brand, product_type, ingredients, morning_use, evening_use')
            .or(`user_id.eq.${userId},user_id.is.null`)
            .eq('is_active', true),
          supabase
            .from('symptom_tracking')
            .select('symptom, trend')
            .eq('user_id', userId)
            .eq('date', today)
            .eq('period', 'daily'),
          supabase
            .from('daily_checkins')
            .select('stress_level')
            .eq('user_id', userId)
            .eq('date', today)
            .maybeSingle()
        ]);

        const products = productsRes.data || [];
        const symptoms = symptomsRes.data || [];
        const stressLevel = checkinRes.data?.stress_level || 0;

        const newVerdicts: ProductVerdict[] = products.map(product => {
          const ingredients = (product.ingredients || '').toLowerCase();
          let verdict: 'recommended' | 'avoid' | 'neutral' = 'neutral';
          let reason: string | null = null;

          // Symptom checks
          const hasRednessPlus = symptoms.some(s => s.symptom === 'rougeurs' && s.trend === 'plus');
          const hasDryness = symptoms.some(s => s.symptom === 'sécheresse');

          // Règle 1 — avoid si rougeurs trend plus ET ingredients contient : Glycolic Acid, Salicylic Acid, Lactic Acid, Tartaric Acid, ou LHA
          const acids = ['glycolic acid', 'salicylic acid', 'lactic acid', 'tartaric acid', 'lha'];
          const hasAcids = acids.some(acid => ingredients.includes(acid));

          if (hasRednessPlus && hasAcids) {
            verdict = 'avoid';
            reason = "Tes rougeurs s'aggravent — les acides peuvent irriter davantage";
          }

          // Règle 2 — recommended si rougeurs trend plus ET ingredients contient : Niacinamide
          // Priorité : avoid gagne toujours sur recommended
          if (verdict !== 'avoid' && hasRednessPlus && ingredients.includes('niacinamide')) {
            verdict = 'recommended';
            reason = "La niacinamide aide à calmer les rougeurs";
          }

          // Règle 3 — avoid si stress_level >= 7 ET symptom sécheresse présent ET ingredients contient : Alcohol Denat ou Denatured Alcohol
          const alcohols = ['alcohol denat', 'denatured alcohol'];
          const hasAlcohol = alcohols.some(alc => ingredients.includes(alc));

          if (stressLevel >= 7 && hasDryness && hasAlcohol) {
            verdict = 'avoid';
            reason = "Stress élevé + sécheresse — l'alcool assèche encore plus";
          }

          return {
            product_id: product.id,
            verdict,
            reason
          };
        });

        setVerdicts(newVerdicts);

        // --- PERSISTENCE: INCI Verdicts ---
        const nonNeutralVerdicts = newVerdicts.filter(v => v.verdict !== 'neutral');
        console.log("[useProductVerdicts] Calculated verdicts. Non-neutral count:", nonNeutralVerdicts.length);

        if (nonNeutralVerdicts.length > 0) {
          const { data: existing, error: checkError } = await supabase
            .from("daily_inci_verdicts")
            .select("id")
            .eq("user_id", userId)
            .eq("date", today)
            .limit(1);

          if (checkError) console.error("[useProductVerdicts] Check existing error:", checkError);

          if (!existing || existing.length === 0) {
            const rows = nonNeutralVerdicts.map(v => {
              const product = products.find(p => p.id === v.product_id);
              return {
                user_id: userId,
                date: today,
                product_id: v.product_id,
                product_name: product?.product_name || 'Inconnu',
                verdict: v.verdict,
                reason: v.reason,
                rule_id: v.reason?.includes("acides") ? "rule_acids_redness" : (v.reason?.includes("niacinamide") ? "rule_niacinamide_redness" : "rule_stress_alcohol")
              };
            });

            console.log("[useProductVerdicts] Upserting verdicts rows:", rows.length);
            const { error } = await supabase.from("daily_inci_verdicts").upsert(rows, { onConflict: 'user_id,date,product_id' });
            if (error) {
              console.error("[useProductVerdicts] Upsert error:", error);
            } else {
              console.log("[useProductVerdicts] Verdicts persisted successfully");
            }
          } else {
            console.log("[useProductVerdicts] Verdicts already exist for today");
          }
        }
      } catch (error) {
        console.error('Error fetching product verdicts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { verdicts, loading };
}
