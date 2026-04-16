// ============================================================
// stravaIntensity.ts
// Calcule l'intensité d'une activité Strava sans fréquence cardiaque
// Retourne : "none" | "light" | "moderate" | "intense"
// ============================================================

export type IntensityLevel = "none" | "light" | "moderate" | "intense";

export interface StravaActivity {
  type: string;           // "Run", "Ride", "Swim", "Walk", etc.
  sport_type: string;
  distance: number;       // mètres
  moving_time: number;    // secondes
  elapsed_time: number;   // secondes
  average_speed: number;  // m/s
  total_elevation_gain: number; // mètres
  start_date: string;     // ISO 8601 UTC
}

export interface IntensityResult {
  level: IntensityLevel;  // valeur à passer dans le contexte skincare
  label: string;          // label lisible
  sport: string;          // type normalisé
  durationMin: number;    // durée en minutes
  isRecent: boolean;      // activité < 24h
  debug: Record<string, unknown>; // métriques intermédiaires pour debug
}

// ─── Seuils par sport ────────────────────────────────────────
// pace en min/km pour Run/Walk, speed en km/h pour Ride/VirtualRide
// Pour Swim : pace en min/100m
// Pour autres : durée seule

const THRESHOLDS: Record<string, {
  metric: "pace_min_km" | "speed_kmh" | "pace_min_100m" | "duration_only";
  light: number;    // en dessous = light
  intense: number;  // au dessus = intense (entre les deux = moderate)
}> = {
  // Course à pied
  Run:          { metric: "pace_min_km",   light: 7.5, intense: 5.0 },
  TrailRun:     { metric: "pace_min_km",   light: 9.0, intense: 6.5 },
  VirtualRun:   { metric: "pace_min_km",   light: 7.5, intense: 5.0 },

  // Marche
  Walk:         { metric: "pace_min_km",   light: 13.0, intense: 8.0 },
  Hike:         { metric: "pace_min_km",   light: 14.0, intense: 9.0 },

  // Vélo
  Ride:         { metric: "speed_kmh",     light: 15.0, intense: 28.0 },
  VirtualRide:  { metric: "speed_kmh",     light: 18.0, intense: 30.0 },
  MountainBike: { metric: "speed_kmh",     light: 10.0, intense: 20.0 },
  GravelRide:   { metric: "speed_kmh",     light: 14.0, intense: 25.0 },
  EBikeRide:    { metric: "speed_kmh",     light: 18.0, intense: 30.0 },

  // Natation
  Swim:         { metric: "pace_min_100m", light: 2.5,  intense: 1.5  },

  // Sports de durée uniquement (HIIT, yoga, musculation, etc.)
  WeightTraining:   { metric: "duration_only", light: 20, intense: 45 },
  Yoga:             { metric: "duration_only", light: 30, intense: 60 },
  Crossfit:         { metric: "duration_only", light: 20, intense: 35 },
  Workout:          { metric: "duration_only", light: 20, intense: 40 },
  Elliptical:       { metric: "duration_only", light: 20, intense: 45 },
  RockClimbing:     { metric: "duration_only", light: 30, intense: 60 },
  Soccer:           { metric: "duration_only", light: 30, intense: 60 },
  Tennis:           { metric: "duration_only", light: 30, intense: 60 },
  Basketball:       { metric: "duration_only", light: 30, intense: 60 },
  Rowing:           { metric: "duration_only", light: 20, intense: 40 },
  StandUpPaddling:  { metric: "duration_only", light: 20, intense: 50 },
  Surfing:          { metric: "duration_only", light: 30, intense: 60 },
  Skiing:           { metric: "duration_only", light: 30, intense: 60 },
  Snowboard:        { metric: "duration_only", light: 30, intense: 60 },
  // Fallback pour tout sport non listé
  Default:          { metric: "duration_only", light: 20, intense: 45 },
};

// ─── Normalisation des types Strava ─────────────────────────
// Strava peut renvoyer des variantes — on normalise ici
function normalizeSportType(type: string): string {
  const map: Record<string, string> = {
    "Run": "Run",
    "TrailRun": "TrailRun",
    "VirtualRun": "VirtualRun",
    "Walk": "Walk",
    "Hike": "Hike",
    "Ride": "Ride",
    "VirtualRide": "VirtualRide",
    "MountainBikeRide": "MountainBike",
    "GravelRide": "GravelRide",
    "EBikeRide": "EBikeRide",
    "Swim": "Swim",
    "WeightTraining": "WeightTraining",
    "Yoga": "Yoga",
    "Crossfit": "Crossfit",
    "Workout": "Workout",
    "Elliptical": "Elliptical",
    "RockClimbing": "RockClimbing",
    "Soccer": "Soccer",
    "Football": "Soccer",
    "Tennis": "Tennis",
    "Basketball": "Basketball",
    "Rowing": "Rowing",
    "Kayaking": "Rowing",
    "StandUpPaddling": "StandUpPaddling",
    "Surfing": "Surfing",
    "AlpineSki": "Skiing",
    "BackcountrySki": "Skiing",
    "NordicSki": "Skiing",
    "Snowboard": "Snowboard",
  };
  return map[type] ?? "Default";
}

// ─── Fonction principale ─────────────────────────────────────

export function classifyStravaIntensity(
  activity: StravaActivity | null | undefined,
  maxAgeHours = 24
): IntensityResult {

  // Pas d'activité du tout
  if (!activity) {
    return { level: "none", label: "Aucune activité", sport: "none", durationMin: 0, isRecent: false, debug: {} };
  }

  // Vérifier si l'activité est récente
  const activityDate = new Date(activity.start_date);
  const ageHours = (Date.now() - activityDate.getTime()) / 3_600_000;
  const isRecent = ageHours <= maxAgeHours;

  if (!isRecent) {
    return { level: "none", label: "Aucune activité récente", sport: "none", durationMin: 0, isRecent: false, debug: { ageHours } };
  }

  const sport = normalizeSportType(activity.sport_type ?? activity.type);
  const thresholds = THRESHOLDS[sport] ?? THRESHOLDS["Default"];
  const durationMin = activity.moving_time / 60;
  const speedKmh = activity.average_speed * 3.6;

  let mainMetric: number;
  let metricName: string;

  switch (thresholds.metric) {
    case "pace_min_km": {
      // pace = min/km. Plus le pace est BAS, plus c'est intense
      mainMetric = speedKmh > 0 ? 60 / speedKmh : 999;
      metricName = `${mainMetric.toFixed(2)} min/km`;
      break;
    }
    case "speed_kmh": {
      // vitesse = km/h. Plus c'est HAUT, plus c'est intense
      mainMetric = speedKmh;
      metricName = `${speedKmh.toFixed(1)} km/h`;
      break;
    }
    case "pace_min_100m": {
      // pace natation = min/100m
      mainMetric = speedKmh > 0 ? 6 / speedKmh : 999;
      metricName = `${mainMetric.toFixed(2)} min/100m`;
      break;
    }
    case "duration_only":
    default: {
      mainMetric = durationMin;
      metricName = `${durationMin.toFixed(0)} min`;
      break;
    }
  }

  // ── Calcul de l'intensité ──
  let level: IntensityLevel;

  if (thresholds.metric === "speed_kmh" || thresholds.metric === "duration_only") {
    // Ces métriques : plus la valeur est HAUTE = plus intense
    if (mainMetric < thresholds.light) {
      level = "light";
    } else if (mainMetric >= thresholds.intense) {
      level = "intense";
    } else {
      level = "moderate";
    }
  } else {
    // Pace (min/km, min/100m) : plus la valeur est BASSE = plus intense
    if (mainMetric > thresholds.light) {
      level = "light";
    } else if (mainMetric <= thresholds.intense) {
      level = "intense";
    } else {
      level = "moderate";
    }
  }

  // ── Ajustement dénivelé pour Trail/Hike ──
  // Un fort dénivelé élève d'un cran l'intensité
  if ((sport === "TrailRun" || sport === "Hike") && activity.total_elevation_gain > 500) {
    if (level === "light") level = "moderate";
    else if (level === "moderate") level = "intense";
  }

  const LABELS: Record<IntensityLevel, string> = {
    none:     "Aucune activité",
    light:    "Activité légère",
    moderate: "Activité modérée",
    intense:  "Activité intense",
  };

  return {
    level,
    label: LABELS[level],
    sport,
    durationMin: Math.round(durationMin),
    isRecent,
    debug: {
      sport,
      metric: metricName,
      thresholdLight: thresholds.light,
      thresholdIntense: thresholds.intense,
      ageHours: Math.round(ageHours * 10) / 10,
      durationMin: Math.round(durationMin),
    },
  };
}

// ─── Mapping vers le contexte skincare ──────────────────────
// À utiliser dans CheckinAdvice.tsx pour remplacer la saisie manuelle

export function stravaToSkincareContext(result: IntensityResult): {
  didSportToday: boolean;
  workoutIntensity: IntensityLevel;
  workoutMinutes: number;
} {
  return {
    didSportToday:    result.level !== "none",
    workoutIntensity: result.level,
    workoutMinutes:   result.durationMin,
  };
}
