import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, LucideIcon } from 'lucide-react';
import { cn } from '../lib/utils';

interface PageHeaderProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  iconColor?: string;
  backPath?: string;
  actions?: React.ReactNode;
}

export const PageHeader = ({ 
  title, 
  description, 
  icon: Icon, 
  iconColor = "text-p", 
  backPath = "/", 
  actions 
}: PageHeaderProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8 md:mb-12">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className={cn("w-10 h-10 md:w-12 md:h-12 bg-ink/5 rounded-2xl flex items-center justify-center border border-border", iconColor)}>
              <Icon size={24} />
            </div>
          )}
          <h2 className="text-3xl md:text-4xl font-black tracking-tighter leading-none">{title}</h2>
        </div>
        <p className="text-ink-light font-medium text-sm md:text-base">{description}</p>
      </div>
      
      <div className="flex items-center gap-3 w-full md:w-auto">
        {actions}
        <button 
          onClick={() => navigate(backPath)} 
          className="btn btn-ghost btn-sm gap-2 border border-border/50 flex-1 md:flex-none"
        >
          <ArrowLeft size={16} /> Back
        </button>
      </div>
    </div>
  );
};
