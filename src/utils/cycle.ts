export function calculateCyclePhase(lastPeriodDate: string | null) {
    if (!lastPeriodDate) return { day: null, phase: "Inconnu", message: "Sélectionnez la date de vos dernières règles." };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const periodDate = new Date(lastPeriodDate);
    periodDate.setHours(0, 0, 0, 0);
    
    if (periodDate > today) return { day: null, phase: "Futur", message: "Veuillez entrer une date passée." };
    
    const diffTime = Math.abs(today.getTime() - periodDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const currentDay = (diffDays % 28) + 1;
    
    let phase = "";
    if (currentDay <= 5) phase = "Menstruation";
    else if (currentDay <= 13) phase = "Folliculaire";
    else if (currentDay <= 16) phase = "Ovulatoire";
    else phase = "Lutéal";
    
    return { day: currentDay, phase, message: null };
}
