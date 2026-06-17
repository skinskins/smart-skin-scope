import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { AdviceCard, Conseil, sortConseils } from "@/components/AdviceCard";

type WeekGroup = {
  key: string;       // "2026-W24"
  label: string;     // "Semaine du 9 au 15 juin"
  conseils: Conseil[];
};

const getMonday = (dateStr: string): Date => {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
};

const isoWeekKey = (monday: Date): string => {
  const year = monday.getFullYear();
  const jan4 = new Date(year, 0, 4);
  const weekNum = Math.ceil(
    ((monday.getTime() - jan4.getTime()) / 86400000 + jan4.getDay() + 1) / 7
  );
  return `${year}-W${String(weekNum).padStart(2, "0")}`;
};

const formatWeekLabel = (monday: Date): string => {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  return `Semaine du ${fmt(monday)} au ${fmt(sunday)}`;
};

const groupByWeek = (conseils: Conseil[], dates: Map<string, string>): WeekGroup[] => {
  const map = new Map<string, { monday: Date; conseils: Conseil[] }>();

  for (const c of conseils) {
    const dateStr = dates.get(c.id);
    if (!dateStr) continue;
    const monday = getMonday(dateStr);
    const key = isoWeekKey(monday);
    if (!map.has(key)) {
      map.set(key, { monday, conseils: [] });
    }
    map.get(key)!.conseils.push(c);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, { monday, conseils: list }]) => ({
      key,
      label: formatWeekLabel(monday),
      conseils: sortConseils(list),
    }));
};

const getCurrentWeekKey = (): string => {
  const today = new Date().toISOString().split("T")[0];
  return isoWeekKey(getMonday(today));
};

const WeeklyPlan = () => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<WeekGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [openKeys, setOpenKeys] = useState<Set<string>>(new Set());

  const currentWeekKey = getCurrentWeekKey();

  useEffect(() => {
    const fetchAdvices = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }

      const since = new Date();
      since.setDate(since.getDate() - 30);

      const { data } = await (supabase as any)
        .from("daily_advice_log")
        .select("id, advice_title, advice_text, advice_tip, advice_group, priority, date")
        .eq("user_id", session.user.id)
        .gte("date", since.toISOString().split("T")[0])
        .order("date", { ascending: false });

      if (data && data.length > 0) {
        const dateMap = new Map<string, string>(
          data.map((row: Conseil & { date: string }) => [row.id, row.date])
        );
        const conseils: Conseil[] = data.map(({ date: _d, ...rest }: Conseil & { date: string }) => rest);
        setGroups(groupByWeek(conseils, dateMap));
      }
      setLoading(false);
    };
    fetchAdvices();
  }, []);

  const toggleKey = (key: string) => {
    setOpenKeys(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  return (
    <div className="min-h-screen pb-24 max-w-lg mx-auto bg-white">
      <PageHeader
        title="Mon plan de la semaine"
        onBack={() => navigate("/dashboard")}
      />

      <div className="px-5 pt-4">
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-2xl bg-[#F8F6F2] h-20 animate-pulse" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm text-muted-foreground">
              Vos conseils apparaîtront ici après votre première routine.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {groups.map((group, idx) => {
              const isCurrent = group.key === currentWeekKey;
              const isOpen = isCurrent || openKeys.has(group.key);

              return (
                <div key={group.key}>
                  <button
                    onClick={() => !isCurrent && toggleKey(group.key)}
                    className={`w-full flex items-center justify-between mb-2 ${isCurrent ? "cursor-default" : "cursor-pointer"}`}
                  >
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                        {isCurrent ? "Cette semaine" : group.label}
                      </span>
                      {isCurrent && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">{group.label}</p>
                      )}
                    </div>
                    {!isCurrent && (
                      isOpen
                        ? <ChevronUp size={14} className="text-muted-foreground" />
                        : <ChevronDown size={14} className="text-muted-foreground" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="flex flex-col gap-2">
                      {group.conseils.map(conseil => (
                        <AdviceCard key={conseil.id} conseil={conseil} />
                      ))}
                    </div>
                  )}

                  {idx < groups.length - 1 && (
                    <div className="mt-4 border-t border-border/10" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default WeeklyPlan;
