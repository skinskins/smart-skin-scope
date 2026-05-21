import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import pearlLumineuse from "@/assets/pearls/Pearl-lumineuse.svg";
import pearlDouce     from "@/assets/pearls/Pearl-douce.svg";
import pearlTerne     from "@/assets/pearls/Pearl-terne.svg";
import pearlFragile   from "@/assets/pearls/Pearl-fragile.svg";
import pearlAbsente   from "@/assets/pearls/Pearl-absente.svg";

const PHASE_TO_PEARL: Record<string, string> = {
  "Folliculaire": "Perle douce",
  "Ovulatoire":   "Perle lumineuse",
  "Lutéal":       "Perle terne",
  "Menstruation": "Perle fragile",
};

const PEARL_SVG: Record<string, string> = {
  "Perle lumineuse": pearlLumineuse,
  "Perle douce":     pearlDouce,
  "Perle terne":     pearlTerne,
  "Perle fragile":   pearlFragile,
};

const getPearlForDate = (
  targetDate: Date,
  lastPeriodDate: string,
  cycleDuration: number,
  periodDuration: number
): string | null => {
  if (!lastPeriodDate) return null;
  const periodStart = new Date(lastPeriodDate); periodStart.setHours(0, 0, 0, 0);
  const target = new Date(targetDate);          target.setHours(0, 0, 0, 0);
  if (target < periodStart) return null;
  const diffDays = Math.floor((target.getTime() - periodStart.getTime()) / 86400000);
  const day = (diffDays % cycleDuration) + 1;
  let phase: string;
  if (day <= periodDuration)                              phase = "Menstruation";
  else if (day <= Math.floor(cycleDuration / 2) - 1)     phase = "Folliculaire";
  else if (day <= Math.floor(cycleDuration / 2) + 2)     phase = "Ovulatoire";
  else                                                    phase = "Lutéal";
  return PHASE_TO_PEARL[phase] ?? null;
};

const DAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

// Generate months : 3 past + current + 1 future
const buildMonths = (): Date[] => {
  const months: Date[] = [];
  for (let offset = -3; offset <= 1; offset++) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + offset);
    months.push(d);
  }
  return months;
};

const MONTHS = buildMonths();

const Suivi = () => {
  const navigate = useNavigate();
  const [lastPeriodDate, setLastPeriodDate] = useState<string>("");
  const [cycleDuration, setCycleDuration]   = useState<number>(28);
  const [periodDuration, setPeriodDuration] = useState<number>(5);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const { data } = await (supabase as any)
        .from("profiles")
        .select("last_period_date, cycle_duration, period_duration")
        .eq("id", session.user.id)
        .single();
      if (data?.last_period_date) setLastPeriodDate(data.last_period_date);
      if (data?.cycle_duration)   setCycleDuration(data.cycle_duration);
      if (data?.period_duration)  setPeriodDuration(data.period_duration);
    };
    fetchProfile();
  }, []);

  const today = new Date(); today.setHours(0, 0, 0, 0);

  const renderMonth = (monthDate: Date) => {
    const year  = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const daysInMonth    = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7;
    const monthName = monthDate.toLocaleDateString("fr-FR", { month: "long" });

    // Build flat day array with null padding
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDayOfWeek; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    while (days.length % 7 !== 0) days.push(null);

    // Split into weeks
    const weeks: (number | null)[][] = [];
    for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

    return (
      <div key={`${year}-${month}`}>
        {/* Month label */}
        <p className="text-center text-lg font-display font-bold text-foreground py-4 capitalize">
          {monthName}
        </p>

        {/* Week rows */}
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-t border-border/15 py-1">
            {week.map((dayNum, di) => {
              if (!dayNum) return <div key={di} />;
              const date     = new Date(year, month, dayNum); date.setHours(0, 0, 0, 0);
              const isToday  = date.getTime() === today.getTime();
              const isFuture = date > today;
              const pearlName = getPearlForDate(date, lastPeriodDate, cycleDuration, periodDuration);
              const imgSrc = pearlName ? (PEARL_SVG[pearlName] ?? pearlAbsente) : pearlAbsente;
              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;

              return (
                <div
                  key={di}
                  onClick={() => !isFuture && navigate(`/suivi/${dateStr}`)}
                  className={`flex flex-col items-center gap-0.5 py-1.5 ${!isFuture ? "cursor-pointer active:opacity-70" : ""}`}
                >
                  {/* Day number */}
                  <div className={`w-7 h-7 flex items-center justify-center rounded-full ${isToday ? "bg-foreground" : ""}`}>
                    <span className={`text-[11px] font-medium leading-none ${isToday ? "text-background font-bold" : "text-muted-foreground/60"}`}>
                      {dayNum}
                    </span>
                  </div>

                  {/* Pearl SVG */}
                  <img
                    src={imgSrc}
                    alt={pearlName ?? ""}
                    className={`w-8 h-8 object-contain transition-opacity ${isFuture ? "opacity-20" : ""}`}
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-24 max-w-lg mx-auto">

      {/* Header + day labels sticky */}
      <div className="sticky top-0 bg-background z-10 border-b border-border/20">
        <div className="px-5 pt-10 pb-2">
          <h1 className="text-3xl font-display text-foreground">Suivi</h1>
        </div>
        <div className="grid grid-cols-7 px-5 pb-2">
          {DAY_LABELS.map((d, i) => (
            <div key={i} className="flex justify-center">
              <p className="text-[10px] font-bold text-muted-foreground uppercase">{d}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Mois */}
      <div className="px-5">
        {MONTHS.map(renderMonth)}
      </div>

    </div>
  );
};

export default Suivi;
