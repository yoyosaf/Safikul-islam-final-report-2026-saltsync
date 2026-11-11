import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HandHelping, Copy, RefreshCw, ClipboardCheck, Info, Check } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';

export default function PhysicalSupportMaker() {
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);

  const formatData = () => {
    const rows = input.trim().split('\n');
    let result = '';

    rows.forEach(row => {
      const cols = row.split('\t').map(c => c.trim().replace(/^"|"$/g, ''));
      if (cols.length >= 4) {
        result += `${cols[0] || ''}\n${cols[1] || ''}\n${cols[2] || ''}\n${cols[3] || ''}\n${cols[4] || ''}\n${cols[5] || ''}\n${cols[6] || ''}\n${cols[7] || ''}\n\n-------------------------\n`;
      }
    });

    setOutput(result.trim());
  };

  const handleCopy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleClear = () => {
    setInput('');
    setOutput('');
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 md:py-10 animate-in fade-in duration-300">
      <PageHeader 
        title="Physical Support Maker" 
        description="Transform spreadsheet rows into clean, structured dispatch logs."
        icon={HandHelping}
        iconColor="text-g"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-8">
        <div className="card p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 font-display font-bold text-sm">
              <div className="w-7 h-7 bg-g/20 text-g rounded-lg flex items-center justify-center">
                <HandHelping size={16} />
              </div>
              Input (Paste from Sheets)
            </div>
            <div className="group relative">
              <Info size={16} className="text-ink-lighter cursor-help" />
              <div className="absolute bottom-full right-0 mb-2 w-60 p-3 bg-card border border-border text-ink-light text-xs rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl font-medium leading-relaxed">
                Copy rows from Google Sheets or Excel and paste here.
              </div>
            </div>
          </div>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste Google Sheet rows here (tab-separated columns)..."
            className="w-full h-[280px] sm:h-[360px] p-3.5 bg-bg border-1.5 border-border rounded-xl focus:border-g/60 outline-hidden font-mono text-xs resize-none transition-all placeholder:text-ink-lighter/30"
          />

          <div className="flex flex-col sm:flex-row gap-3">
            <button 
              onClick={handleClear}
              className="btn btn-ghost flex-1 order-2 sm:order-1 text-xs"
            >
              <RefreshCw size={15} /> Clear
            </button>
            <button 
              onClick={formatData}
              className="btn btn-t flex-1 px-6 order-1 sm:order-2 text-xs font-bold"
            >
              <ClipboardCheck size={16} /> Format Now
            </button>
          </div>

          <div className="glass-panel p-4 space-y-2">
            <h4 className="text-[10px] font-black text-ink-lighter uppercase tracking-wider">Instructions:</h4>
            <ul className="text-xs text-ink-light space-y-1 list-disc ml-4 font-medium opacity-90">
              <li>Copy rows directly from your Google Sheet or Excel</li>
              <li>Paste them into the box above</li>
              <li>Click "Format Now" to transform into vertical ticket blocks</li>
            </ul>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="text-xs font-black uppercase tracking-wider text-ink-lighter">
              Formatted Output
            </div>
            {output && (
              <button 
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs font-bold text-g hover:text-g/80 transition-colors"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied!' : 'Copy All'}
              </button>
            )}
          </div>
          
          {output ? (
            <div className="terminal-box border border-border">
              <div className="flex items-center justify-between px-4 py-2.5 bg-card border-b border-border">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-r opacity-80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-y opacity-80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-g opacity-80" />
                </div>
                <span className="text-[10px] text-ink-light uppercase tracking-wider font-mono font-bold">formatted_tasks.log</span>
                <button 
                  onClick={handleCopy} 
                  className="btn btn-ghost px-2.5 py-1 text-[10px] rounded-lg"
                >
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre className="out-pre min-h-[300px] sm:min-h-[420px] text-xs px-4 py-3 whitespace-pre-wrap">{output}</pre>
            </div>
          ) : (
            <div className="min-h-[300px] sm:min-h-[420px] glass-panel border-dashed flex flex-col items-center justify-center text-center p-6 sm:p-10">
              <ClipboardCheck className="text-ink/20 mb-3" size={36} />
              <h3 className="text-base font-bold mb-1 text-ink/40">Awaiting Data</h3>
              <p className="text-xs text-ink/30 max-w-[240px] leading-relaxed">
                Paste your spreadsheet rows and click Format Now to generate the formatted log.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
