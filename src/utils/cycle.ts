export function calculateCyclePhase(lastPeriodDate: string | null, cycleDuration: number = 28, periodDuration: number = 5) {
    if (!lastPeriodDate) return { day: null, phase: "Inconnu", message: "Sélectionnez la date de vos dernières règles." };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const periodDate = new Date(lastPeriodDate);
    periodDate.setHours(0, 0, 0, 0);
    
    if (periodDate > today) return { day: null, phase: "Futur", message: "Veuillez entrer une date passée." };
    
    const diffTime = Math.abs(today.getTime() - periodDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const currentDay = (diffDays % cycleDuration) + 1;
    
    let phase = "";
    if (currentDay <= periodDuration) phase = "Menstruation";
    else if (currentDay <= Math.floor(cycleDuration / 2) - 1) phase = "Folliculaire";
    else if (currentDay <= Math.floor(cycleDuration / 2) + 2) phase = "Ovulatoire";
    else phase = "Lutéal";
    
    return { day: currentDay, phase, message: null };
}

