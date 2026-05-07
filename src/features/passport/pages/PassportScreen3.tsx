import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function PassportScreen3() {
  const navigate = useNavigate();

  return (
    <div className="bg-[#f2f2f7] min-h-screen relative w-full pb-[100px]">
      <div className="bg-[#f2f2f7] sticky top-0 z-10 flex items-center justify-center px-[28px] pt-[14px] pb-[14px] w-full">
        <button onClick={() => navigate("/passport/symptoms")} className="absolute left-[24px]">
          <ChevronLeft className="w-6 h-6 text-[#1f2024]" />
        </button>
        <p className="font-semibold text-[#1f2024] text-[20px]">Passeport de peau</p>
      </div>

      <div className="flex flex-col gap-[23px] items-start px-[16px] pt-[24px] w-full max-w-lg mx-auto">
        <p className="font-medium text-[#1f2024] text-[16px]">3. Facteurs corrélés</p>

        <div className="bg-white rounded-[16px] shadow-sm w-full flex items-center justify-center py-[60px]">
          <p className="text-[#71727a] text-[15px]">Graphiques en cours de développement</p>
        </div>
      </div>

      <div className="flex items-center justify-between px-[24px] py-[16px] max-w-lg mx-auto mt-[16px]">
        <button onClick={() => navigate("/passport/symptoms")} className="bg-white border border-[#e9e9e9] rounded-[8px] p-[8px] shadow-sm">
          <ChevronLeft className="w-[20px] h-[20px] text-[#71727a]" />
        </button>

        <div className="flex gap-[8px] items-center">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className={`rounded-full ${i === 2 ? "bg-[#7d7d7d] h-[8px] w-[20px]" : "bg-[#d4d6dd] h-[8px] w-[8px]"}`} />
          ))}
        </div>

        <button onClick={() => navigate("/passport/visual")} className="bg-white border border-[#e9e9e9] rounded-[8px] p-[8px] shadow-sm">
          <ChevronRight className="w-[20px] h-[20px] text-[#1f2024]" />
        </button>
      </div>
    </div>
  );
}
