import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const OBF_USER_AGENT = "SmartSkinScope/1.0 (contact@smartskinscope.app)";

function significantWords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s\-_,./()]+/)
    .filter((w) => w.length >= 3);
}

function sharesSignificantWord(a: string, b: string): boolean {
  const wordsA = new Set(significantWords(a));
  return significantWords(b).some((w) => wordsA.has(w));
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

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    const prompt = `Analyse cette photo de produit cosmétique et extrais les informations suivantes.
Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ni après :
{
  "product_name": "<nom exact du produit>",
  "brand": "<marque>",
  "product_type": "<nettoyant|sérum|hydratant|spf|contour-yeux|masque|tonique|huile|autre>",
  "ingredients": ["<ingrédient INCI 1>", "<ingrédient INCI 2>"]
}
Si une information n'est pas visible sur la photo, utilise null.
Les ingredients ne sont à extraire que s'ils sont clairement lisibles sur le packaging.`;

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

    const claudeIngredients = Array.isArray(result.ingredients) && result.ingredients.length > 0
      ? result.ingredients.join(", ")
      : null;

    const fallback = {
      status: "active",
      product_name: result.product_name,
      brand: result.brand,
      product_type: result.product_type,
      ingredients: claudeIngredients,
      open_beauty_facts_id: null,
      photo_url: null,
    };

    // ── Recherche Open Beauty Facts ─────────────────────────────────────────
    let filtered: any[] = [];
    if (result.product_name) {
      const searchTerms = [result.brand, result.product_name].filter(Boolean).join(" ");
      try {
        const obfRes = await fetch(
          `https://world.openbeautyfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(searchTerms)}&search_simple=1&action=process&json=1&page_size=5`,
          { headers: { "User-Agent": OBF_USER_AGENT } }
        );
        if (obfRes.ok) {
          const obfData = await obfRes.json();
          const obfProducts = Array.isArray(obfData.products) ? obfData.products : [];
          filtered = obfProducts.filter((p: any) =>
            sharesSignificantWord(result.product_name, p.product_name ?? "")
          );
          console.log("[product-scan] OBF candidates:", obfProducts.length, "→ filtrés:", filtered.length);
        } else {
          console.error("[product-scan] OBF status:", obfRes.status);
        }
      } catch (e) {
        console.error("[product-scan] OBF error:", e);
      }
    }

    if (filtered.length === 1) {
      const match = filtered[0];
      return new Response(
        JSON.stringify({
          status: "active",
          product_name: result.product_name,
          brand: result.brand,
          product_type: result.product_type,
          ingredients: match.ingredients_text_fr || match.ingredients_text || claudeIngredients,
          open_beauty_facts_id: match.code ?? null,
          photo_url: match.image_url ?? match.image_front_url ?? null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (filtered.length >= 2) {
      return new Response(
        JSON.stringify({
          status: "to_confirm",
          fallback: {
            product_name: result.product_name,
            brand: result.brand,
            product_type: result.product_type,
            ingredients: claudeIngredients,
          },
          candidates: filtered.map((p: any) => ({
            product_name: p.product_name ?? null,
            brand: p.brands ?? null,
            ingredients: p.ingredients_text_fr || p.ingredients_text || null,
            open_beauty_facts_id: p.code ?? null,
            photo_url: p.image_url ?? p.image_front_url ?? null,
          })),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 0 candidat OBF retenu → on garde les infos extraites par Claude
    return new Response(JSON.stringify(fallback), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("product-scan error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
