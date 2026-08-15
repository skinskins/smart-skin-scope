import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FREE_WINDOW_MS = 24 * 60 * 60 * 1000;
// Plafond technique non exposé en UI, pour éviter l'abus de la fenêtre gratuite 24h
// (ex. appel direct de l'edge function hors app à des fins de scraping). Valeur choisie
// arbitrairement en l'absence de trancheé produit — cf. section 3 du spec crédits, à ajuster si besoin.
const SOFT_CAP_24H = 50;

// La fenêtre gratuite + les crédits protègent un userId : on ne peut donc pas faire confiance
// au user_id envoyé dans le body (contrairement à inci-analysis/generate-advice-batch, qui le
// font mais qui ne gèrent aucune ressource limitée). On dérive l'identité du JWT de session quand
// il y en a un ; l'appel pendant l'onboarding (avant création de compte, cf. Signup.tsx) n'a pas
// de session — dans ce cas on reste sur le comportement historique (scan libre, pas de gating).
async function resolveAuthenticatedUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  if (!SUPABASE_URL || !ANON_KEY) return null;

  const authClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data, error } = await authClient.auth.getUser();
  if (error || !data?.user) return null;
  return data.user.id;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "Image requise" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authenticatedUserId = await resolveAuthenticatedUserId(req);

    let withinFreeWindow = false;
    let creditConsumed = false;
    let scanCreditsRemaining: number | null = null;
    let supabase: ReturnType<typeof createClient> | null = null;

    if (authenticatedUserId) {
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
      const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (!SUPABASE_URL || !SERVICE_KEY) {
        throw new Error("Env vars manquantes : SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY");
      }
      supabase = createClient(SUPABASE_URL, SERVICE_KEY);

      const { data: profile } = await supabase
        .from("profiles")
        .select("created_at, scan_credits_remaining")
        .eq("id", authenticatedUserId)
        .single();

      // Profil pas encore créé (ex. race pendant le signup) : on laisse passer sans gating
      // plutôt que de faire échouer un scan légitime.
      if (profile) {
        withinFreeWindow = Date.now() - new Date(profile.created_at).getTime() < FREE_WINDOW_MS;

        if (withinFreeWindow) {
          const since = new Date(Date.now() - FREE_WINDOW_MS).toISOString();
          const { count } = await supabase
            .from("product_scans")
            .select("id", { count: "exact", head: true })
            .eq("user_id", authenticatedUserId)
            .gte("scanned_at", since);

          if ((count ?? 0) >= SOFT_CAP_24H) {
            return new Response(
              JSON.stringify({ error: "Trop de scans en peu de temps, réessaie plus tard" }),
              { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } else if ((profile.scan_credits_remaining ?? 0) <= 0) {
          // Vérif en lecture seule avant l'appel payant à Claude. Le décompte atomique
          // définitif n'a lieu qu'après une reconnaissance réussie (cf. plus bas), pour
          // ne pas brûler un crédit sur un scan qui échoue (erreur API, JSON invalide...).
          return new Response(
            JSON.stringify({
              error: "Crédits de scan épuisés — reviens après ta prochaine recommandation hebdomadaire",
              scan_credits_remaining: 0,
            }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    const prompt = `Tu es un expert en produits cosmétiques. Regarde cette photo de packaging et identifie le produit.

Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ni après :
{
  "recognized": true,
  "product_name": "<nom exact du produit tel qu'il apparaît sur le packaging>",
  "brand": "<marque>",
  "product_type": "<nettoyant|sérum|hydratant|spf|contour-yeux|masque|tonique|huile|baume|gommage|autre>",
  "ingredients": "<liste INCI en texte brut, uniquement si clairement lisible, sinon null>"
}

Si le packaging n'est pas visible, illisible ou s'il ne s'agit pas d'un produit cosmétique, renvoie :
{ "recognized": false }

Le nom et la marque sont les informations les plus importantes — concentre-toi sur ce qui est écrit sur le produit.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: "image/jpeg", data: imageBase64 },
              },
              { type: "text", text: prompt },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[product-scan] Anthropic status:", response.status);
      console.error("[product-scan] Anthropic body:", errText);
      throw new Error(`Anthropic API error: ${response.status} ${errText}`);
    }

    console.log("[product-scan] Anthropic status:", response.status);
    const aiData = await response.json();
    console.log("[product-scan] Anthropic full response:", JSON.stringify(aiData, null, 2));
    const rawContent = aiData.content?.[0]?.text;
    if (!rawContent) throw new Error("Réponse IA vide");

    let jsonStr = rawContent.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const result = JSON.parse(jsonStr);

    if (authenticatedUserId && supabase && !withinFreeWindow) {
      // Décompte atomique effectué seulement maintenant que la reconnaissance a réussi —
      // le scan est vraiment "consommé" à ce stade, pas de crédit perdu sur un échec API.
      const { data: remaining, error: rpcError } = await supabase.rpc(
        "decrement_scan_credit",
        { p_user_id: authenticatedUserId }
      );
      if (rpcError) throw new Error(`decrement_scan_credit: ${rpcError.message}`);

      if (remaining === null) {
        // Course rare : un scan concurrent a pris le dernier crédit entre la vérification
        // et maintenant. Le scan a déjà été payé auprès de Claude, donc on ne pénalise pas
        // l'utilisatrice pour un résultat déjà obtenu.
        scanCreditsRemaining = 0;
      } else {
        creditConsumed = true;
        scanCreditsRemaining = remaining as number;
      }
    }

    if (authenticatedUserId && supabase) {
      const { error: logError } = await supabase.from("product_scans").insert({
        user_id: authenticatedUserId,
        within_free_window: withinFreeWindow,
        credit_consumed: creditConsumed,
      });
      if (logError) console.warn("[product-scan] product_scans insert warning:", logError.message);
    }

    if (!result.recognized || !result.product_name) {
      return new Response(
        JSON.stringify({ status: "unrecognized", scan_credits_remaining: scanCreditsRemaining }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Recherche Open Beauty Facts pour récupérer la photo produit
    let photo_url: string | null = null;
    try {
      const searchTerm = [result.brand, result.product_name].filter(Boolean).join(" ");
      const obfRes = await fetch(
        `https://world.openbeautyfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(searchTerm)}&search_simple=1&action=process&json=1&page_size=3`,
        { signal: AbortSignal.timeout(4000) }
      );
      if (obfRes.ok) {
        const obfData = await obfRes.json();
        const first = obfData.products?.[0];
        photo_url = first?.image_front_url ?? first?.image_url ?? null;
      }
    } catch {
      // OBF lookup non bloquant — on continue sans photo
    }

    return new Response(
      JSON.stringify({
        status: "ok",
        product_name: result.product_name,
        brand: result.brand ?? null,
        product_type: result.product_type ?? null,
        ingredients: result.ingredients ?? null,
        photo_url,
        scan_credits_remaining: scanCreditsRemaining,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("product-scan error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
