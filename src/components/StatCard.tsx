import React from 'react';
import { motion } from 'motion/react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../lib/utils';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  sub: string;
  color: string;
}

export const StatCard = ({ icon: Icon, label, value, sub, color }: StatCardProps) => {
  const colorMap: Record<string, string> = {
    p: 'text-p bg-p/10 border-p/20 hover:bg-p/20',
    t: 'text-t bg-t/10 border-t/20 hover:bg-t/20',
    ink: 'text-ink bg-ink/10 border-ink/20 hover:bg-ink/20',
    g: 'text-g bg-g/10 border-g/20 hover:bg-g/20',
  };

  const glowMap: Record<string, string> = {
    p: 'bg-p/5',
    t: 'bg-t/5',
    ink: 'bg-ink/5',
    g: 'bg-g/5',
  };

  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="bg-card/40 border border-border backdrop-blur-md rounded-2xl p-4 md:p-6 relative overflow-hidden group h-full"
    >
      <div className={cn(
        "p-2.5 md:p-3 rounded-xl border w-fit mb-3 md:mb-4 transition-colors",
        colorMap[color] || 'text-p bg-p/10 border-p/20'
      )}>
        <Icon size={18} md:size={20} />
      </div>
      <div className="text-[9px] md:text-[10px] font-bold text-ink-lighter uppercase tracking-[0.15em] mb-1">{label}</div>
      <div className="text-2xl md:text-3xl font-black tracking-tighter text-ink mb-1">{value}</div>
      <div className="text-[9px] md:text-[10px] font-medium text-ink-light tracking-tight leading-none">{sub}</div>
      <div className={cn(
        "absolute bottom-0 right-0 w-24 h-24 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none",
        glowMap[color] || 'bg-p/5'
      )} />
    </motion.div>
  );
};
