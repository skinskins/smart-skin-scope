import React from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface INCIVerdictBadgeProps {
  verdict: 'recommended' | 'avoid' | 'neutral';
  reason: string | null;
}

export const INCIVerdictBadge: React.FC<INCIVerdictBadgeProps> = ({ verdict, reason }) => {
  if (verdict === 'neutral') return null;

  const isRecommended = verdict === 'recommended';

  return (
    <div className="mt-1.5 flex flex-col gap-1">
      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-wider w-fit ${
        isRecommended 
          ? 'bg-[#E7F5E9] text-[#2E7D32] border border-[#C8E6C9]' 
          : 'bg-[#FFF3E0] text-[#E65100] border border-[#FFE0B2]'
      }`}>
        {isRecommended ? (
          <CheckCircle2 size={10} />
        ) : (
          <AlertCircle size={10} />
        )}
        {isRecommended ? 'Recommandé' : 'À éviter'}
      </div>
      {!isRecommended && reason && (
        <p className="text-[10px] text-[#8B7355] italic leading-tight mt-0.5 max-w-[180px]">
          {reason}
        </p>
      )}
    </div>
  );
};
