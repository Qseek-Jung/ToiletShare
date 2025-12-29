import React from 'react';

// Branding Icon (Logo)
// Branding Icon (Logo)
export const PoopIcon = ({ className }: { className?: string }) => (
  <img src="/images/app/ddong-icon.png" alt="Logo" className={className} />
);

// New Simple Pictograms
export const ManSymbol = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="5" r="3" />
    <path d="M12 8v5" />
    <path d="M9 13l3-2 3 2" />
    <path d="M9 21v-6" />
    <path d="M15 21v-6" />
    <path d="M9 15h6" />
  </svg>
);

export const WomanSymbol = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="7" r="4" />
    <path d="M12 11a4 4 0 0 1 4 4v2" />
    <path d="M8 17h8" />
    <path d="M8 15a4 4 0 0 1 4-4" />
    <path d="M12 17v4" />
  </svg>
);

export const UnisexSymbol = ({ className }: { className?: string }) => (
  <div className={`flex items-center ${className}`}>
    <ManSymbol className="w-1/2 h-full" />
    <div className="w-[1px] h-4/5 bg-current mx-0.5 opacity-50"></div>
    <WomanSymbol className="w-1/2 h-full" />
  </div>
);

// Not used for Google Maps (generated via string), but used for UI lists
export const ToiletTypeIcon = ({ type, className }: { type: 'MALE' | 'FEMALE' | 'UNISEX', className?: string }) => {
  const imageSrc = type === 'MALE'
    ? '/images/icons/Man_boxicon.png'
    : type === 'FEMALE'
      ? '/images/icons/Woman_boxicon.png'
      : '/images/icons/uni_boxicon.png';

  return <img src={imageSrc} alt={type} className={className} />;
};