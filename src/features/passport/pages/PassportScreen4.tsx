import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Expand, Sparkles, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

interface PhotoEntry {
  id: string;
  date: string;
  storage_path: string;
  publicUrl: string;
  cycle_phase: string | null;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function PassportScreen4() {
  const navigate = useNavigate();
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [beforeAfterOpen, setBeforeAfterOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }

      const [{ data: photoRows }, { data: checkinRows }] = await Promise.all([
        (supabase as any)
          .from("skin_photos")
          .select("id, date, storage_path")
          .eq("user_id", session.user.id)
          .order("date", { ascending: true }),
        (supabase as any)
          .from("daily_checkins")
          .select("date, cycle_phase")
          .eq("user_id", session.user.id),
      ]);

      const cycleMap: Record<string, string> = {};
      (checkinRows ?? []).forEach((r: any) => {
        if (r.cycle_phase) cycleMap[r.date] = r.cycle_phase;
      });

      const entries: PhotoEntry[] = await Promise.all(
        (photoRows ?? []).map(async (row: any) => {
          const { data: signed } = await supabase.storage
            .from("skin-photos")
            .createSignedUrl(row.storage_path, 3600);
          return {
            id: row.id,
            date: row.date,
            storage_path: row.storage_path,
            publicUrl: signed?.signedUrl ?? "",
            cycle_phase: cycleMap[row.date] ?? null,
          };
        })
      );

      setPhotos(entries);
      setLoading(false);
    };
    load();
  }, []);

  const first = photos[0];
  const last = photos[photos.length - 1];
  const isEmpty = !loading && photos.length === 0;

  const insightText = () => {
    if (photos.length === 1)
      return `1 photo ajoutée le ${formatDate(first.date)}. Continuez votre suivi quotidien pour observer votre évolution.`;
    return `${photos.length} photos ajoutées du ${formatDate(first.date)} au ${formatDate(last.date)}. Votre évolution est visible sur ${photos.length} jours.`;
  };

  if (loading) {
    return (
      <div className="bg-[#f2f2f7] min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#1f2024] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-[#f2f2f7] min-h-screen relative w-full pb-[100px]">

      {/* Sticky header */}
      <div className="bg-[#f2f2f7] sticky top-0 z-10 flex items-center justify-center px-[28px] pt-[14px] pb-[14px] w-full">
        <button onClick={() => navigate("/passport/factors")} className="absolute left-[24px]">
          <ChevronLeft className="w-6 h-6 text-[#1f2024]" />
        </button>
        <p className="font-semibold text-[#1f2024] text-[20px]">Passeport de peau</p>
      </div>

      <div className="flex flex-col gap-[23px] items-start pt-[24px] w-full max-w-lg mx-auto">

        {/* Section label */}
        <div className="flex items-center justify-between w-full px-[16px]">
          <p className="font-medium text-[#1f2024] text-[16px]">4. Évolution visuelle</p>
          {!isEmpty && (
            <button onClick={() => setGalleryOpen(true)} className="p-1">
              <Expand className="w-[18px] h-[18px] text-[#71727a]" />
            </button>
          )}
        </div>

        {/* Empty state */}
        {isEmpty && (
          <div className="flex flex-col items-center justify-center w-full px-[16px] py-[60px] text-center gap-3">
            <div className="bg-[#e9e9ef] rounded-full p-4 mb-2">
              <Sparkles className="w-7 h-7 text-[#71727a]" />
            </div>
            <p className="text-[#3b3b3d] text-[16px] font-medium leading-snug">
              Aucune photo pour le moment.
            </p>
            <p className="text-[#71727a] text-[14px] leading-relaxed max-w-[260px]">
              Ajoutez une photo lors de votre check-in quotidien.
            </p>
          </div>
        )}

        {/* Section 1 — Horizontal gallery */}
        {!isEmpty && (
          <div
            className="flex gap-[12px] overflow-x-auto pl-[16px] pr-[40px] pb-[4px] w-full"
            style={{ scrollbarWidth: "none" }}
          >
            {photos.map((photo) => (
              <motion.div
                key={photo.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col gap-[8px] shrink-0 w-[220px]"
              >
                {photo.cycle_phase ? (
                  <p className="text-[#71727a] text-[13px] truncate">
                    Phase {photo.cycle_phase.toLowerCase()}
                  </p>
                ) : (
                  <p className="text-[#71727a] text-[13px]">{formatDate(photo.date)}</p>
                )}
                <div className="bg-white rounded-[16px] overflow-hidden shadow-sm aspect-[3/4]">
                  <img
                    src={photo.publicUrl}
                    alt={`Peau ${photo.date}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Section 2 — Insight card */}
        {!isEmpty && (
          <div className="px-[16px] w-full">
            <Card className="bg-[#F9F9F9] border-0 rounded-[16px] shadow-sm">
              <CardContent className="flex gap-[16px] items-start p-[16px]">
                <div className="bg-[#3892f2]/10 border border-[#3892f2]/20 flex items-center justify-center rounded-[8px] size-[44px] shrink-0">
                  <Sparkles className="w-[20px] h-[20px] text-[#1f2024]" />
                </div>
                <p className="text-[#3b3b3d] text-[15px] leading-snug flex-1 pt-[2px]">
                  {insightText()}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Section 3 — Avant / Après */}
        {photos.length >= 2 && (
          <div className="flex flex-col gap-[16px] items-start w-full px-[16px]">
            <div className="flex items-center justify-between w-full">
              <p className="font-medium text-[#1f2024] text-[16px]">Comparaison avant / après</p>
              <button onClick={() => setBeforeAfterOpen(true)} className="p-1">
                <Expand className="w-[18px] h-[18px] text-[#71727a]" />
              </button>
            </div>

            <div className="bg-white rounded-[16px] shadow-sm w-full overflow-hidden">
              <div className="flex">
                {/* Before */}
                <div className="flex flex-col flex-1">
                  <div className="px-[12px] pt-[12px] pb-[8px]">
                    <p className="text-[#71727a] text-[12px]">{formatDate(first.date)} — Début</p>
                  </div>
                  <div className="aspect-[3/4] overflow-hidden">
                    <img src={first.publicUrl} alt="Avant" className="w-full h-full object-cover" />
                  </div>
                </div>

                {/* Divider */}
                <div className="w-[1px] bg-[#f2f2f7]" />

                {/* After */}
                <div className="flex flex-col flex-1">
                  <div className="px-[12px] pt-[12px] pb-[8px]">
                    <p className="text-[#71727a] text-[12px]">{formatDate(last.date)} — Auj.</p>
                  </div>
                  <div className="aspect-[3/4] overflow-hidden">
                    <img src={last.publicUrl} alt="Après" className="w-full h-full object-cover" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-[24px] py-[16px] max-w-lg mx-auto mt-[16px]">
        <button
          onClick={() => navigate("/passport/factors")}
          className="bg-white border border-[#e9e9e9] rounded-[8px] p-[8px] shadow-sm"
        >
          <ChevronLeft className="w-[20px] h-[20px] text-[#71727a]" />
        </button>

        <div className="flex gap-[8px] items-center">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`rounded-full transition-all ${
                i === 3
                  ? "bg-[#7d7d7d] h-[8px] w-[20px]"
                  : "bg-[#d4d6dd] h-[8px] w-[8px]"
              }`}
            />
          ))}
        </div>

        <button
          onClick={() => navigate("/passport/details")}
          className="bg-white border border-[#e9e9e9] rounded-[8px] p-[8px] shadow-sm"
        >
          <ChevronRight className="w-[20px] h-[20px] text-[#1f2024]" />
        </button>
      </div>

      {/* Gallery modal */}
      <AnimatePresence>
        {galleryOpen && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "tween", duration: 0.3 }}
            className="fixed inset-0 bg-white z-50 overflow-y-auto"
          >
            <div className="flex items-center justify-between px-[20px] pt-[14px] pb-[14px] sticky top-0 bg-white border-b border-[#f2f2f7] z-10">
              <p className="font-semibold text-[#1f2024] text-[18px]">Toutes les photos</p>
              <button onClick={() => setGalleryOpen(false)} className="p-2">
                <X className="w-5 h-5 text-[#71727a]" />
              </button>
            </div>
            <div className="flex flex-col gap-[16px] p-[16px]">
              {photos.map((photo) => (
                <div key={photo.id} className="flex flex-col gap-[6px]">
                  <div className="flex items-center justify-between">
                    <p className="text-[#3b3b3d] text-[14px] font-medium">{formatDate(photo.date)}</p>
                    {photo.cycle_phase && (
                      <p className="text-[#71727a] text-[13px]">Phase {photo.cycle_phase.toLowerCase()}</p>
                    )}
                  </div>
                  <div className="rounded-[16px] overflow-hidden aspect-[3/4] bg-[#f2f2f7]">
                    <img src={photo.publicUrl} alt={photo.date} className="w-full h-full object-cover" />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Before / After modal */}
      <AnimatePresence>
        {beforeAfterOpen && photos.length >= 2 && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "tween", duration: 0.3 }}
            className="fixed inset-0 bg-white z-50 flex flex-col"
          >
            <div className="flex items-center justify-between px-[20px] pt-[14px] pb-[14px] border-b border-[#f2f2f7]">
              <p className="font-semibold text-[#1f2024] text-[18px]">Avant / Après</p>
              <button onClick={() => setBeforeAfterOpen(false)} className="p-2">
                <X className="w-5 h-5 text-[#71727a]" />
              </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
              <div className="flex flex-col flex-1">
                <div className="px-[16px] py-[12px]">
                  <p className="text-[#71727a] text-[13px]">{formatDate(first.date)} — Début</p>
                </div>
                <div className="flex-1 overflow-hidden">
                  <img src={first.publicUrl} alt="Avant" className="w-full h-full object-cover" />
                </div>
              </div>

              <div className="w-[1px] bg-[#f2f2f7]" />

              <div className="flex flex-col flex-1">
                <div className="px-[16px] py-[12px]">
                  <p className="text-[#71727a] text-[13px]">{formatDate(last.date)} — Auj.</p>
                </div>
                <div className="flex-1 overflow-hidden">
                  <img src={last.publicUrl} alt="Après" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
