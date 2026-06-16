export const PRESET_DEVICES = [
  { emoji: "💎", label: "Masque LED" },
  { emoji: "⚡", label: "Medicube Age-R / Booster Pro" },
  { emoji: "🌿", label: "Roller jade/quartz" },
  { emoji: "🔵", label: "Cryo globes" },
  { emoji: "🌊", label: "Brosse nettoyante (Foreo...)" },
  { emoji: "✨", label: "Appareil micro-courants (NuFace...)" },
  { emoji: "💆", label: "Gua sha" },
  { emoji: "🔬", label: "Dermapen / micro-needling" },
] as const;

export type PresetDevice = (typeof PRESET_DEVICES)[number];
