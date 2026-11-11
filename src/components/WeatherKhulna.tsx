import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Cloud, Search, X } from 'lucide-react';
import { cn } from '../lib/utils';

export const WeatherKhulna = () => {
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState('Khulna');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const khulnaAreas = [
    { name: 'Khulna', bn: 'খুলনা' },
    { name: 'Daulatpur,Khulna', bn: 'দৌলতপুর' },
    { name: 'Khalishpur,Khulna', bn: 'খালিশপুর' },
    { name: 'Rupsha,Khulna', bn: 'রূপসা' },
    { name: 'Phultala,Khulna', bn: 'ফুলতলা' },
  ];

  const fetchWeather = async (loc: string) => {
    setLoading(true);
    try {
      const res = await fetch(`https://wttr.in/${encodeURIComponent(loc)}?format=j1`);
      const data = await res.json();
      setWeather(data);
    } catch (err) {
      console.error("Weather fetch failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather(location);
  }, [location]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(searchQuery);
      setIsSearching(false);
    }
  };

  const banglaDesc: { [key: string]: string } = {
    "Clear": "পরিষ্কার আকাশ",
    "Sunny": "রৌদ্রোজ্জ্বল",
    "Partly cloudy": "আংশিক মেঘলা",
    "Cloudy": "মেঘলা",
    "Overcast": "মেঘাচ্ছন্ন",
    "Mist": "কুয়াশা",
    "Patchy rain possible": "হালকা বৃষ্টির সম্ভাবনা",
    "Light rain": "হালকা বৃষ্টি",
    "Moderate rain": "মাঝারি বৃষ্টি",
    "Heavy rain": "ভারী বৃষ্টি",
    "Thundery outbreaks possible": "বজ্রসহ বৃষ্টির সম্ভাবনা",
    "Fog": "ঘন কুয়াশা",
    "Light drizzle": "গুঁড়ি গুঁড়ি বৃষ্টি",
  };

  const current = weather?.current_condition?.[0];
  const temp = current?.temp_C;
  const desc = current?.weatherDesc?.[0]?.value;
  const displayDesc = banglaDesc[desc] || desc;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-5 md:p-8 bg-card/40 backdrop-blur-md border border-white/5 rounded-[32px] shadow-2xl shadow-p/5"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-p/10 rounded-xl md:rounded-2xl flex items-center justify-center border border-p/20">
            <Cloud className="text-p" size={20} />
          </div>
          <div>
            <h4 className="text-lg md:text-xl font-black tracking-tighter">আবহাওয়া রিপোর্ট</h4>
            <p className="text-[9px] md:text-[10px] font-bold text-ink-lighter uppercase tracking-widest leading-none">
              {location.split(',')[0]} এর বর্তমান অবস্থা
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isSearching ? (
            <form onSubmit={handleSearch} className="flex items-center gap-2 animate-in slide-in-from-right-2 w-full md:w-auto">
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="এলাকা খুঁজুন..."
                className="bg-ink/5 border border-border rounded-xl px-3 py-1.5 text-xs outline-hidden focus:border-p/50 transition-colors flex-1 md:w-40"
              />
              <button type="submit" className="btn btn-p btn-sm px-3 py-1.5 text-[10px]">খুঁজুন</button>
              <button type="button" onClick={() => setIsSearching(false)} className="text-ink-lighter p-1"><X size={14} /></button>
            </form>
          ) : (
            <button
              onClick={() => setIsSearching(true)}
              className="text-[10px] md:text-xs font-bold text-ink-lighter hover:text-p flex items-center gap-1.5 uppercase tracking-wider"
            >
              <Search size={12} /> অন্য এলাকা খুঁজুন
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {khulnaAreas.map((area) => (
          <button
            key={area.name}
            onClick={() => setLocation(area.name)}
            className={cn(
              "px-3 py-1.5 rounded-lg md:rounded-xl text-[10px] font-bold transition-all border",
              location === area.name
                ? "bg-p text-white border-p shadow-lg shadow-p/20"
                : "bg-glass text-ink-light border-white/5 hover:border-p/30"
            )}
          >
            {area.bn}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6 md:py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-p"></div>
        </div>
      ) : weather ? (
        <div className="flex flex-col gap-6 bg-ink/5 p-4 md:p-6 rounded-xl md:rounded-2xl border border-border/50">
          <div className="flex items-center gap-4 md:gap-5">
            <div className="text-4xl md:text-5xl font-black tracking-tighter text-p whitespace-nowrap">{temp}°C</div>
            <div className="min-w-0">
              <div className="text-base md:text-lg font-bold text-ink leading-tight truncate">{displayDesc}</div>
              <div className="text-[10px] md:text-xs text-ink-lighter font-medium mt-1 truncate">
                আর্দ্রতা: {current.humidity}% · বাতাস: {current.windspeedKmph} km/h
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 border-t border-border/30 pt-4">
            <div className="flex flex-col">
              <div className="text-[9px] font-black text-ink-lighter uppercase tracking-[0.15em] mb-1 opacity-60">সূর্যোদয়</div>
              <div className="text-xs md:text-sm font-bold text-ink">{weather.weather[0].astronomy[0].sunrise}</div>
            </div>
            <div className="flex flex-col border-l border-border/30 pl-4">
              <div className="text-[9px] font-black text-ink-lighter uppercase tracking-[0.15em] mb-1 opacity-60">সূর্যাস্ত</div>
              <div className="text-xs md:text-sm font-bold text-ink">{weather.weather[0].astronomy[0].sunset}</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-r font-bold text-xs">আবহাওয়া তথ্য পাওয়া যায়নি</div>
      )}
    </motion.div>
  );
};
