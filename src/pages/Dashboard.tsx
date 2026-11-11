import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from 'firebase/auth';
import { 
  ClipboardList, 
  UserCheck, 
  Shield, 
  User as UserIcon, 
  Activity, 
  Hammer
} from 'lucide-react';
import { BigClock } from '../components/BigClock';
import { WeatherKhulna } from '../components/WeatherKhulna';
import { NetworkBackground, PacketStream } from '../components/NetworkBackground';
import { BrandLogo, BrandMonogram } from '../components/BrandLogo';

export const Dashboard = ({ user }: { user: User | null }) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[calc(100vh-100px)] relative px-4 md:px-8 pb-12 overflow-hidden text-ink">
      <NetworkBackground />
      <PacketStream />
      
      {/* Mobile Experience Header */}
      <div className="block md:hidden w-full text-center py-5 mb-6 bg-card rounded-2xl border border-border shadow-md">
        <BrandLogo />
      </div>

      {/* Desktop Header and Navigation */}
      <div className="hidden md:flex w-full items-center justify-between py-5 border-b border-border/40 mb-8 gap-x-4 relative z-10">
        <div className="flex items-center gap-4">
          <BrandMonogram size={46} />
          <div className="flex flex-col text-left">
            <h2 className="text-xl md:text-2xl font-black tracking-tight text-ink">SAFIKUL ISLAM</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs font-extrabold tracking-widest text-[#007fff] uppercase">REPORT</span>
              <span className="text-[10px] font-bold text-ink-light uppercase tracking-[0.2em] border-l border-border pl-2">REPORTING SOFTWARE</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-ink-lighter uppercase tracking-wider">TELEMETRY CLOUD SYNC ACTIVE</span>
          <div className="w-2 h-2 rounded-full bg-g animate-pulse" />
        </div>
      </div>

      {/* Hero Body Content */}
      <div className="relative z-10 max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 lg:gap-12 pt-2 items-start lg:items-center">
        {/* Left column: Text panel and launcher shortcuts */}
        <div className="flex-1 text-center lg:text-left space-y-6 w-full">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#007fff]/10 rounded-full border border-[#007fff]/20 text-[#007fff] text-[10px] font-bold uppercase tracking-wider mb-1">
              <Activity size={12} className="animate-pulse" /> CLOUD REPORTING PORTAL
            </div>
            
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tighter leading-[0.95] grad-text pb-1">
              Safikul Islam <span className="text-[#007fff]">Report</span>
            </h1>
            <p className="text-ink-light text-sm sm:text-base md:text-lg font-medium tracking-tight max-w-2xl leading-relaxed mx-auto lg:mx-0">
              High-performance daily issue reporting system with <span className="text-t font-black">real-time sync</span>, <span className="text-p font-black">instant cloud storage</span>, and <span className="text-ink font-bold">team shift management</span>.
            </p>
          </div>

          {/* Grid Layout Shortcuts (3 core tools) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
            {[
              {
                title: "Employee Shift Report",
                desc: "Submit daily work logs, solved issues, and shift records.",
                path: "/employee-report",
                color: "text-p",
                borderColor: "hover:border-p/50",
                iconBg: "bg-p/10 border-p/20 text-p",
                icon: ClipboardList,
              },
              {
                title: "Team Leader Overview",
                desc: "Review daily operations feed and performance breakdown.",
                path: "/tl-report",
                color: "text-t",
                borderColor: "hover:border-t/50",
                iconBg: "bg-t/10 border-t/20 text-t",
                icon: UserCheck,
              },
              {
                title: "Physical Support Maker",
                desc: "Transform Google Sheets rows into formatted terminal logs.",
                path: "/physical-support-maker",
                color: "text-g",
                borderColor: "hover:border-g/50",
                iconBg: "bg-g/10 border-g/20 text-g",
                icon: Hammer,
              },
            ].map((card, i) => {
              const Icon = card.icon;
              return (
                <button
                  key={i}
                  onClick={() => navigate(card.path)}
                  className={`card group text-left p-5 flex flex-col justify-between transition-all duration-200 border border-border ${card.borderColor} relative overflow-hidden min-h-[145px] hover:-translate-y-1`}
                >
                  <div className="absolute right-[-10px] bottom-[-10px] opacity-5 group-hover:opacity-10 transition-opacity text-white pointer-events-none">
                    <Icon size={90} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 border rounded-xl shrink-0 ${card.iconBg}`}>
                        <Icon size={18} />
                      </div>
                      <h3 className="font-extrabold text-sm tracking-tight text-ink group-hover:text-p transition-colors leading-tight">
                        {card.title}
                      </h3>
                    </div>
                    <p className="text-[11px] text-ink-light mt-2.5 leading-relaxed">{card.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Secondary Action Link buttons */}
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
            <button
              onClick={() => navigate('/portal')}
              className="btn btn-ghost px-4 py-2.5 rounded-xl text-xs font-bold gap-2"
            >
              <UserIcon size={14} /> My Reports History
            </button>
            <button
              onClick={() => navigate('/admin')}
              className="btn btn-p px-5 py-2.5 rounded-xl text-xs font-bold gap-2 shadow-md"
            >
              <Shield size={14} /> Admin Database Panel
            </button>
          </div>
        </div>

        {/* Right column: Widgets (Clock + Weather) */}
        <div className="w-full lg:w-96 shrink-0 space-y-5">
          <BigClock />
          <WeatherKhulna />
        </div>
      </div>
    </div>
  );
};
