import React, { useState, useEffect } from 'react';

export const BigClock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeParts = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).split(' ');
  const timeStr = timeParts[0];
  const ampm = timeParts[1];
  const dateStr = time.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const tzStr = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <div className="animate-in zoom-in duration-1000 p-5 md:p-8 bg-card/40 backdrop-blur-md rounded-[32px] border border-white/5 shadow-2xl shadow-p/5 flex flex-col items-start w-full relative">
      <div className="flex items-baseline gap-1 md:gap-2 flex-wrap min-w-0 w-full overflow-hidden">
        <div className="text-3xl sm:text-4xl md:text-5xl font-black tabular-nums tracking-tighter text-p leading-none shrink-0">{timeStr}</div>
        <div className="text-[10px] md:text-lg font-black text-p/50 uppercase tracking-widest shrink-0">{ampm}</div>
      </div>
      <div className="text-[9px] md:text-sm font-medium opacity-70 mt-3 md:mt-4 border-t border-white/5 pt-2 w-full uppercase tracking-wider line-clamp-1">{dateStr}</div>
      <div className="text-[7px] md:text-[9px] font-mono text-ink-lighter mt-1 opacity-50 uppercase tracking-[0.2em] truncate w-full">{tzStr}</div>
    </div>
  );
};
