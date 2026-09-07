import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Categories a EXCLURE clairement (maquillage, corps, cheveux, hygiene non-visage)
// Logique : on garde TOUT sauf ce qui matche un de ces mots-cles.
const EXCLUDE_KEYWORDS = [
  "make-up", "makeup", "maquillage",
  "lipstick", "lip-stick", "rouge-a-levres", "rouge à lèvres", "levres", "lèvres", "lip-",
  "mascara", "eyeliner", "eye-liner",
  "foundation", "fond-de-teint", "fond de teint",
  "concealer",
  "eyeshadow", "eye-shadow", "fard", "blush", "bronzer", "highlighter", "enlumineur",
  "nail", "vernis", "ongle", "manucure",
  "shampoo", "shampooing", "shampoing", "conditioner", "apres-shampoing", "après-shampoing",
  "hair-", "cheveux", "capillaire", "coiffant", "coiffure",
  "body-lotion", "body-wash", "body-cream", "lait-corps", "lait corporel", "corps",
  "shower", "douche", "gel-douche", "bain",
  "deodorant", "déodorant", "antiperspirant", "anti-transpirant",
  "toothpaste", "dentifrice", "oral-care", "bouche",
  "perfume", "perfumes", "parfum", "parfums", "fragrance", "fragrances",
  "eau-de-toilette", "eau de toilette", "eau-de-parfum", "eau de parfum",
  "eau-de-cologne", "cologne", "eaux-de-toilette", "eaux-de-parfum",
  "scented", "body-mist", "brume", "perfumery",
  "hand-cream", "creme-mains", "crème mains", "mains",
  "foot-", "pied", "pieds",
  "soap", "savon",
  "shaving", "rasage", "after-shave",
  "sun-body", "solaire-corps",
];

function guessType(categories: string, name: string): string | null {
  const c = ((categories || "") + " " + (name || "")).toLowerCase();
  if (c.includes("serum") || c.includes("sérum")) return "serum";
  if (c.includes("cleanser") || c.includes("nettoyant") || c.includes("gel nettoyant") || c.includes("demaquillant") || c.includes("démaquillant")) return "nettoyant";
  if (c.includes("sunscreen") || c.includes("spf") || c.includes("solaire") || c.includes("uv")) return "spf";
  if (c.includes("mask") || c.includes("masque")) return "masque";
  if (c.includes("toner") || c.includes("tonique") || c.includes("lotion")) return "lotion";
  if (c.includes("exfoliant") || c.includes("peeling") || c.includes("gommage")) return "exfoliant";
  if (c.includes("eye") || c.includes("contour") || c.includes("yeux")) return "contour_yeux";
  if (c.includes("oil") || c.includes("huile")) return "huile";
  if (c.includes("moisturizer") || c.includes("creme") || c.includes("crème") || c.includes("hydratant") || c.includes("soin")) return "creme";
  return null;
}

// On garde le produit SAUF s'il matche un mot-cle d'exclusion
function isExcluded(categories: string, name: string): boolean {
  const c = ((categories || "") + " " + (name || "")).toLowerCase();
  for (const kw of EXCLUDE_KEYWORDS) {
    if (c.includes(kw)) return true;
  }
  return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    if (!query || query.trim().length < 2) {
      return new Response(JSON.stringify({ products: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = `https://world.openbeautyfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=40`;

    const obfRes = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!obfRes.ok) {
      throw new Error(`OBF error: ${obfRes.status}`);
    }

    const obfData = await obfRes.json();
    const rawProducts = obfData.products ?? [];

    const products = rawProducts
      .map((p: Record<string, unknown>) => {
        const name = (p.product_name_fr as string) || (p.product_name as string) || "";
        const brand = ((p.brands as string) || "").split(",")[0]?.trim() || null;
        const categories = (p.categories as string) || "";
        const ingredients = (p.ingredients_text_fr as string) || (p.ingredients_text as string) || null;
        const photo = (p.image_front_url as string) || (p.image_url as string) || null;
        return {
          product_name: name.trim(),
          brand,
          product_type: guessType(categories, name),
          // INCI non-obligatoire : beaucoup de produits cosmetiques sont mal renseignes sur
          // Open Beauty Facts (contrairement a Open Food Facts). Exiger une liste d'ingredients
          // ecartait silencieusement une grande partie des resultats reels ("le produit existe
          // sur OBF mais n'apparait jamais dans la recherche"). Le reste du pipeline (inci-analysis,
          // generate-advice-batch, ajout manuel via product-scan) gere deja ingredients: null.
          ingredients,
          photo_url: photo,
          open_beauty_facts_id: (p.code as string) || null,
          _categories: categories,
          _name: name,
        };
      })
      .filter((p: { product_name: string; _categories: string; _name: string }) => {
        if (p.product_name.length <= 1) return false;
        if (isExcluded(p._categories, p._name)) return false;
        return true;
      });

    // Dedup + retirer les champs internes
    const seen = new Set<string>();
    const deduped = products
      .filter((p: { product_name: string; brand: string | null }) => {
        const key = `${p.product_name}|${p.brand ?? ""}`.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((p: Record<string, unknown>) => {
        const { _categories, _name, ...rest } = p;
        return rest;
      });

    return new Response(JSON.stringify({ products: deduped.slice(0, 15) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[product-search] error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue", products: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
