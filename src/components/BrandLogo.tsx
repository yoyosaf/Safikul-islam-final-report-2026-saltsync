import React from 'react';

interface BrandProps {
  className?: string;
  size?: number | string;
  onDark?: boolean;
}

/**
 * BrandMonogram renders the stylized "SR" badge layout with the bar chart and ascending arrow.
 */
export const BrandMonogram = ({ className = '', size = 48, onDark = false }: BrandProps) => {
  const primaryColor = onDark ? "#ffffff" : "#0c1e36";
  const accentColor = "#007fff"; // Bright brand blue

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block select-none ${className}`}
    >
      {/* Curved Background / Accent Outer Line representing bottom swoosh */}
      <path
        d="M 24 95 Q 38 108, 62 100 Q 86 92, 102 70"
        stroke={accentColor}
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
      {/* Monogram S and R Combined Path */}
      {/* Upper Loop of S/R */}
      <path
        d="M 45 42 Q 65 24, 85 24 Q 105 24, 105 44 C 105 60, 85 64, 75 64 Q 63 64, 52 74"
        stroke={primaryColor}
        strokeWidth="11"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Main Back Spine of S */}
      <path
        d="M 68 28 C 45 28, 38 42, 38 52 C 38 68, 55 64, 65 72 C 72 78, 68 88, 54 88 M 80 64 L 98 94"
        stroke={primaryColor}
        strokeWidth="11"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* Bar Chart Bars Inside Logo */}
      {/* Bar 1 */}
      <rect x="42" y="72" width="6" height="14" rx="2" fill={primaryColor} />
      {/* Bar 2 */}
      <rect x="52" y="66" width="6" height="20" rx="2" fill={primaryColor} />
      {/* Bar 3 */}
      <rect x="62" y="56" width="6" height="30" rx="2" fill={primaryColor} />

      {/* Radiant Blue Rising Sweeping Arrow */}
      {/* Swoosh Tail */}
      <path
        d="M 32 82 Q 45 98, 70 82 Q 88 70, 100 52"
        stroke={accentColor}
        strokeWidth="7"
        strokeLinecap="round"
        fill="none"
      />
      {/* Arrow Head */}
      <path
        d="M 88 50 L 102 48 L 100 62 Z"
        fill={accentColor}
        stroke={accentColor}
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/**
 * BrandLogo provides the complete corporate logotype with monogram, text, and sub-banner.
 */
export const BrandLogo = ({ className = '', onDark = false }: { className?: string; onDark?: boolean }) => {
  const isDarkClass = onDark ? "text-white" : "text-[#0c1e36] dark:text-white";
  const lightMuted = onDark ? "text-slate-300" : "text-ink-light";
  const subAccent = "#007fff"; // Bright brand blue

  return (
    <div className={`flex flex-col items-center text-center select-none ${className}`}>
      {/* Large Monogram Emblem */}
      <BrandMonogram size={100} onDark={onDark} className="mb-2" />
      
      {/* Main Named Branding */}
      <h1 className={`text-2xl md:text-3.5xl font-black tracking-tight leading-tight ${isDarkClass}`}>
        Safikul Islam
      </h1>
      
      {/* Accent Subtitle with divider lines */}
      <div className="flex items-center justify-center gap-3 w-full max-w-[280px] my-1">
        <div className={`h-[1px] flex-1 ${onDark ? "bg-white/20" : "bg-ink/10 dark:bg-white/20"}`} />
        <span className="text-sm md:text-base font-extrabold tracking-[0.25em] text-[#007fff] uppercase leading-none">
          report
        </span>
        <div className={`h-[1px] flex-1 ${onDark ? "bg-white/20" : "bg-ink/10 dark:bg-white/20"}`} />
      </div>

      {/* Standardized sub-text tag */}
      <span className={`text-[10px] md:text-xs font-black tracking-[0.35em] uppercase opacity-75 ${lightMuted}`}>
        REPORTING SOFTWARE
      </span>
    </div>
  );
};

/**
 * BrandHeaderHorizontal provides a sleek, high-profile horizontal header for page navigation rails or header bars.
 */
export const BrandHeaderHorizontal = ({ onDark = false }: { onDark?: boolean }) => {
  const isDarkClass = onDark ? "text-white" : "text-[#0c1e36] dark:text-white";
  
  return (
    <div className="flex items-center gap-3 select-none">
      <BrandMonogram size={42} onDark={onDark} />
      <div className="flex flex-col items-start leading-none">
        <div className="flex items-baseline gap-1.5">
          <span className={`text-base md:text-lg font-black tracking-tight ${isDarkClass}`}>
            Safikul Islam
          </span>
          <span className="text-xs md:text-sm font-black tracking-wider text-[#007fff] uppercase">
            Report
          </span>
        </div>
        <span className="text-[7.5px] md:text-[8px] font-black tracking-[0.22em] text-ink-lighter uppercase mt-0.5">
          REPORTING SOFTWARE
        </span>
      </div>
    </div>
  );
};
