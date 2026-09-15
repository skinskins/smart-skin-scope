import type { ActiveCategory } from "./types";

const RETINOL_PATTERNS = [
  "rétinol", "retinol", "rétinal", "retinal", "rétinaldéhyde", "retinaldehyde",
  "rétinoïde", "retinoide", "retinoid", "trétinoïne", "tretinoine", "tretinoin",
];

const EXFOLIANT_PATTERNS = [
  "exfoliant", "exfoliant aha/bha", "aha", "bha", "aha/bha",
  "acide glycolique", "glycolic", "acide salicylique", "salicylic",
  "acide lactique", "lactic acid", "acide mandélique", "mandelic",
  "peeling", "gommage",
];

function matchesAny(text: string, patterns: string[]): boolean {
  return patterns.some((p) => text.includes(p));
}

/**
 * Classifies a product into a "strong active" category by matching its declared
 * type first, then falling back to scanning its INCI/ingredients text for generic
 * types (e.g. "sérum") that don't reveal the active on their own.
 */
export function resolveActiveCategory(
  productType?: string | null,
  ingredients?: string | null,
): ActiveCategory | null {
  const type = (productType ?? "").toLowerCase().trim();

  if (matchesAny(type, RETINOL_PATTERNS)) return "retinol";
  if (matchesAny(type, EXFOLIANT_PATTERNS)) return "exfoliant";

  const inci = (ingredients ?? "").toLowerCase();
  if (inci) {
    if (matchesAny(inci, RETINOL_PATTERNS)) return "retinol";
    if (matchesAny(inci, EXFOLIANT_PATTERNS)) return "exfoliant";
  }

  return null;
}
