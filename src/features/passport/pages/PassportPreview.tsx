import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

type JaugeProps = {
  className?: string;
  state?: "High" | "Middle" | "Low";
  percentage?: number;
};

function Jauge({ className, state = "High", percentage }: JaugeProps) {
  const isLow = state === "Low" || (percentage !== undefined && percentage <= 30);
  const isMiddle = state === "Middle" || (percentage !== undefined && percentage > 30 && percentage < 70);
  
  let bgColorClass = "bg-[#1d9e75]";
  if (isLow) bgColorClass = "bg-[#e24b4a]";
  else if (isMiddle) bgColorClass = "bg-[#ef9f27]";

  return (
    <div className={className || "bg-[#f5f4ed] h-[10px] overflow-clip relative rounded-[22px] w-[110px]"}>
      <div 
        className={`absolute h-[10px] left-0 rounded-[22px] top-0 ${bgColorClass}`} 
        style={{ width: percentage ? `${percentage}%` : (isLow ? '20%' : isMiddle ? '50%' : '86%') }}
      />
    </div>
  );
}

export default function PassportPreview() {
  const navigate = useNavigate();

  return (
    <div className="bg-[#f2f2f7] min-h-screen relative w-full pb-[100px]">
      {/* Top Header */}
      <div className="bg-[#f2f2f7] sticky top-0 z-10 flex items-center justify-center px-[28px] pt-[14px] pb-[14px] w-full">
        <button onClick={() => navigate(-1)} className="absolute left-[24px]">
          <ChevronLeft className="w-6 h-6 text-[#1f2024]" />
        </button>
        <p className="font-semibold text-[#1f2024] text-[20px]">
          Passeport de peau
        </p>
      </div>

      <div className="flex flex-col gap-[23px] items-start px-[16px] pt-[24px] w-full max-w-lg mx-auto">
        
        {/* Section 1: Résumé */}
        <div className="flex flex-col gap-[16px] items-start w-full">
          <p className="font-medium text-[#1f2024] text-[16px]">
            1. Résumé
          </p>
          
          <div className="bg-white flex flex-col gap-[16px] items-start p-[16px] rounded-[16px] w-full shadow-sm">
            {/* User Info */}
            <div className="flex gap-[16px] items-center w-full">
              <div className="bg-[#9747ff]/20 flex items-center justify-center rounded-full size-[44px] shrink-0">
                <span className="font-semibold text-[#3b3b3d] text-[14px]">
                  TA
                </span>
              </div>
              <div className="flex flex-col gap-[2px]">
                <p className="text-[#3b3b3d] text-[18px]">Amira SCOTT</p>
                <p className="text-[#71727a] text-[14px]">
                  25 ans - Femme - Paris
                </p>
              </div>
            </div>

            <div className="h-[1px] bg-[#f2f2f7] w-full"></div>

            {/* Skin Type & Period */}
            <div className="flex items-center justify-between w-full">
              <div className="flex flex-col gap-[4px] w-1/2">
                <p className="text-[#71727a] text-[14px]">Type de peau</p>
                <p className="text-[#3b3b3d] text-[16px]">Mixte</p>
              </div>
              <div className="flex flex-col gap-[4px] w-1/2">
                <p className="text-[#71727a] text-[14px]">Période</p>
                <p className="text-[#3b3b3d] text-[16px]">30 Jours</p>
              </div>
            </div>

            <div className="h-[1px] bg-[#f2f2f7] w-full"></div>

            {/* Concerns */}
            <div className="flex flex-col gap-[8px] items-start w-full">
              <p className="text-[#71727a] text-[14px]">Préoccupations</p>
              <div className="flex flex-wrap gap-[8px]">
                <div className="bg-[#1f2024] px-[12px] py-[6px] rounded-full">
                  <p className="text-[12px] text-white">Acné</p>
                </div>
                <div className="bg-[#1f2024] px-[12px] py-[6px] rounded-full">
                  <p className="text-[12px] text-white">Déshydratation</p>
                </div>
              </div>
            </div>

            <div className="h-[1px] bg-[#f2f2f7] w-full"></div>

            {/* Objectives */}
            <div className="flex flex-col gap-[8px] items-start w-full">
              <p className="text-[#71727a] text-[14px]">Objectifs</p>
              <div className="flex flex-wrap gap-[8px]">
                <div className="bg-[#eae6ca] px-[12px] py-[6px] rounded-full">
                  <p className="text-[12px] text-[#313131]">Hydratation</p>
                </div>
                <div className="bg-[#eae6ca] px-[12px] py-[6px] rounded-full">
                  <p className="text-[12px] text-[#313131]">Réduire les tâches</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stability Card */}
          <div className="bg-white flex gap-[16px] items-start p-[16px] rounded-[16px] w-full shadow-sm">
            <div className="bg-[#3892f2]/10 border border-[#3892f2]/20 flex items-center justify-center rounded-[8px] size-[44px] shrink-0">
              <Sparkles className="w-[20px] h-[20px] text-[#1f2024]" />
            </div>
            <div className="flex flex-col gap-[8px] flex-1">
              <div className="bg-[#1eb500]/10 flex gap-[6px] items-center px-[8px] py-[4px] rounded-full self-start">
                <div className="bg-[#1eb500] rounded-full size-[6px]"></div>
                <p className="font-semibold text-[#1eb500] text-[12px]">Stable</p>
              </div>
              <p className="text-[#3b3b3d] text-[15px] leading-snug">
                Peau globalement stable avec épisodes d'acné liés au stress et au cycle menstruel.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Régularité de la routine */}
        <div className="flex flex-col gap-[16px] items-start w-full mt-[8px]">
          <p className="font-medium text-[#1f2024] text-[16px]">
            Régularité de la routine
          </p>
          
          <div className="bg-white flex flex-col gap-[16px] p-[16px] rounded-[16px] w-full shadow-sm">
            <div className="flex flex-col gap-[12px]">
              <p className="text-[#3b3b3d] text-[18px]">Observance globale</p>
              <div className="flex gap-[12px] items-center">
                <p className="font-bold text-[#3b3b3d] text-[24px]">75%</p>
                <div className="bg-[#f5f4ed] h-[10px] rounded-full flex-1 overflow-hidden">
                  <div className="bg-[#1d9e75] h-full w-[75%] rounded-full"></div>
                </div>
              </div>
              <p className="text-[#71727a] text-[15px] leading-snug">
                La routine est suivie 3 jours sur 4 en moyenne.
              </p>
            </div>

            <div className="h-[1px] bg-[#f2f2f7] w-full"></div>

            {/* Metric Bars */}
            <div className="flex flex-col gap-[16px]">
              <div className="flex items-center justify-between">
                <p className="text-[#71727a] text-[15px]">Nettoyage</p>
                <div className="flex items-center gap-[12px]">
                  <Jauge percentage={86} state="High" className="w-[100px] h-[8px] bg-[#f5f4ed] rounded-full overflow-hidden relative" />
                  <p className="text-[#3b3b3d] text-[15px] w-[35px] text-right">86%</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <p className="text-[#71727a] text-[15px]">Démaquillage</p>
                <div className="flex items-center gap-[12px]">
                  <Jauge percentage={86} state="High" className="w-[100px] h-[8px] bg-[#f5f4ed] rounded-full overflow-hidden relative" />
                  <p className="text-[#3b3b3d] text-[15px] w-[35px] text-right">86%</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-[#71727a] text-[15px]">Hydratation matin</p>
                <div className="flex items-center gap-[12px]">
                  <Jauge percentage={50} state="Middle" className="w-[100px] h-[8px] bg-[#f5f4ed] rounded-full overflow-hidden relative" />
                  <p className="text-[#3b3b3d] text-[15px] w-[35px] text-right">50%</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-[#71727a] text-[15px]">Protection SPF</p>
                <div className="flex items-center gap-[12px]">
                  <Jauge percentage={10} state="Low" className="w-[100px] h-[8px] bg-[#f5f4ed] rounded-full overflow-hidden relative" />
                  <p className="text-[#3b3b3d] text-[15px] w-[35px] text-right">10%</p>
                </div>
              </div>
            </div>

            {/* Alert Box */}
            <div className="bg-[#e24b4a]/10 p-[12px] rounded-[12px] mt-[4px]">
              <p className="text-[#be0807] text-[14px]">
                SPF quasi absent. Facteur aggravant pour les taches. Point à aborder en consultation.
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Pagination Controls - Keeping it above the BottomNav */}
      <div className="bg-transparent flex items-center justify-between px-[24px] py-[16px] max-w-lg mx-auto mt-[16px]">
        <button className="bg-white border border-[#e9e9e9] rounded-[8px] p-[8px] shadow-sm">
          <ChevronLeft className="w-[20px] h-[20px] text-[#71727a]" />
        </button>
        
        <div className="flex gap-[8px] items-center">
          <div className="bg-[#7d7d7d] h-[8px] w-[20px] rounded-full"></div>
          <div className="bg-[#d4d6dd] h-[8px] w-[8px] rounded-full"></div>
          <div className="bg-[#d4d6dd] h-[8px] w-[8px] rounded-full"></div>
          <div className="bg-[#d4d6dd] h-[8px] w-[8px] rounded-full"></div>
        </div>

        <button className="bg-white border border-[#e9e9e9] rounded-[8px] p-[8px] shadow-sm">
          <ChevronRight className="w-[20px] h-[20px] text-[#1f2024]" />
        </button>
      </div>

    </div>
  );
}
