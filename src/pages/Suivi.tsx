import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { calculateCyclePhaseForDate } from "@/utils/cycle";
import { PageHeader } from "@/components/PageHeader";

const PHASE_GRADIENTS: Record<string, string> = {
  Folliculaire: "linear-gradient(145deg, #B8D4E8 0%, #7EB3D4 45%, #4A8AB8 100%)",
  Ovulatoire:   "linear-gradient(145deg, #F5E6A3 0%, #F0C060 45%, #E89020 100%)",
  Lutéale:      "linear-gradient(145deg, #C4A882 0%, #A07850 45%, #785030 100%)",
  Menstruelle:  "linear-gradient(145deg, #E8A4A8 0%, #D06070 45%, #A83050 100%)",
};

function PearlDot({ phase, size = 36 }: { phase: string; size?: number }) {
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: "50%",
      background: PHASE_GRADIENTS[phase] ?? "#D3D1C7",
    }} />
  );
}

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
  const [accountCreatedDate, setAccountCreatedDate] = useState<string>("");

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      if (session.user.created_at) setAccountCreatedDate(session.user.created_at.split("T")[0]);
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
              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
              const beforeAccount = accountCreatedDate !== "" && dateStr < accountCreatedDate;
              const phase = beforeAccount ? "" : calculateCyclePhaseForDate(lastPeriodDate, cycleDuration, periodDuration, dateStr);

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

                  {/* Pearl dot */}
                  <div className={isFuture ? "opacity-20" : ""}>
                    <PearlDot phase={phase ?? ""} size={32} />
                  </div>
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
        <PageHeader title="Suivi" onBack={() => navigate(-1)} />
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
