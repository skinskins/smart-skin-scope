// Table de correspondance : format renvoyé par l'IA (skin-analysis) → slug attendu
// par la contrainte CHECK de la colonne profiles.carnation
export const CARNATION_AI_TO_SLUG: Record<string, string> = {
  "très claire": "très_claire",
  "claire": "claire",
  "beige dorée": "beige_doré",
  "olive-caramel": "olive_caramel",
  "foncée": "foncée",
  "ébène": "ébène",
};

export function normalizeCarnation(value?: string | null): string | null {
  if (!value) return null;
  const key = value.trim().toLowerCase();
  return CARNATION_AI_TO_SLUG[key] ?? null;
}
