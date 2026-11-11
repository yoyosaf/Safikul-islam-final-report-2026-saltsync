import React from 'react';

// Lightweight static background with zero runtime CPU cost
export const PacketStream = () => null;

export const NetworkBackground = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-25">
      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="light-grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M 48 0 L 0 0 0 48" fill="none" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.15" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#light-grid)" />
      </svg>
      {/* Subtle, static ambient gradients (zero repaints) */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-p/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-t/5 rounded-full blur-3xl pointer-events-none" />
    </div>
  );
};
