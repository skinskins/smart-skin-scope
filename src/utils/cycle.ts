export function calculateCyclePhaseForDate(
  lastPeriodDate: string | null,
  cycleDuration: number = 28,
  periodDuration: number = 5,
  targetDate?: string
): string | null {
  if (!lastPeriodDate) return null;
  const target = targetDate ? new Date(targetDate + "T00:00:00") : new Date();
  target.setHours(0, 0, 0, 0);
  const periodDate = new Date(lastPeriodDate + "T00:00:00");
  periodDate.setHours(0, 0, 0, 0);
  if (periodDate > target) return null;
  const diffDays = Math.floor((target.getTime() - periodDate.getTime()) / (1000 * 60 * 60 * 24));
  const currentDay = (diffDays % cycleDuration) + 1;
  if (currentDay <= periodDuration) return "Menstruelle";
  if (currentDay <= Math.floor(cycleDuration / 2) - 1) return "Folliculaire";
  if (currentDay <= Math.floor(cycleDuration / 2) + 2) return "Ovulatoire";
  return "Lutéale";
}

export function calculateCyclePhase(lastPeriodDate: string | null, cycleDuration: number = 28, periodDuration: number = 5) {
    if (!lastPeriodDate) return { day: null, phase: "Inconnu", message: "Sélectionnez la date de vos dernières règles." };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Force local-time parsing to avoid UTC offset shifting the date by 1 day
    const periodDate = new Date(lastPeriodDate + "T00:00:00");
    periodDate.setHours(0, 0, 0, 0);

    if (periodDate > today) return { day: null, phase: "Futur", message: "Veuillez entrer une date passée." };

    const diffTime = Math.abs(today.getTime() - periodDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const currentDay = (diffDays % cycleDuration) + 1;

    let phase = "";
    if (currentDay <= periodDuration) phase = "Menstruelle";
    else if (currentDay <= Math.floor(cycleDuration / 2) - 1) phase = "Folliculaire";
    else if (currentDay <= Math.floor(cycleDuration / 2) + 2) phase = "Ovulatoire";
    else phase = "Lutéale";

    return { day: currentDay, phase, message: null };
}

