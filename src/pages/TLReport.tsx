import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  ChartBar, 
  Wrench, 
  ListOrdered, 
  CloudUpload, 
  Copy, 
  Tag, 
  Info, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw,
  Check
} from 'lucide-react';
import { format } from 'date-fns';
import { TL_SHIFTS, FIXED_ISSUES, DEFAULT_EMPS } from '../constants';
import { reportService } from '../services/reportService';
import { Employee } from '../types';
import { PageHeader } from '../components/PageHeader';

export default function TLReport() {
  const navigate = useNavigate();
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [tlName, setTlName] = useState('');
  const [shift, setShift] = useState('');
  const [issues, setIssues] = useState('');
  const [persons, setPersons] = useState('Shamsur + Rony');
  const [physIssues, setPhysIssues] = useState('');
  const [ssNumbers, setSsNumbers] = useState('');
  const [output, setOutput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'idle' | 'success' | 'error'; message: string }>({ type: 'idle', message: '' });
  const [copied, setCopied] = useState(false);

  // Dynamic employees list from Employee Management
  const [employees, setEmployees] = useState<Employee[]>(DEFAULT_EMPS);
  const [isLoadingEmps, setIsLoadingEmps] = useState(true);

  // Load registered employees dynamically from Firebase
  useEffect(() => {
    let isMounted = true;
    const fetchEmployees = async () => {
      try {
        const emps = await reportService.getEmployees();
        if (isMounted && emps && emps.length > 0) {
          setEmployees(emps);
        }
      } catch (err) {
        console.warn('Failed to load dynamic employees in TL Report:', err);
      } finally {
        if (isMounted) setIsLoadingEmps(false);
      }
    };

    fetchEmployees();

    // Listen to realtime employee directory updates
    const unsub = reportService.onEmployeesUpdate((liveEmps) => {
      if (isMounted && liveEmps && liveEmps.length > 0) {
        setEmployees(liveEmps);
      }
    });

    return () => {
      isMounted = false;
      unsub();
    };
  }, []);

  const [overview, setOverview] = useState<{ cat: string; count: number }[]>([]);
  const [physStats, setPhysStats] = useState({ total: 0, comp: 0, shift: 0, cancel: 0 });

  useEffect(() => {
    const lines = issues.split('\n').filter(l => l.trim());
    const counts: Record<string, number> = {};
    
    lines.forEach(line => {
      const lower = line.toLowerCase();
      let found = false;
      for (const [cat, kws] of Object.entries(FIXED_ISSUES)) {
        if (kws.some(k => lower.includes(k))) {
          counts[cat] = (counts[cat] || 0) + 1;
          found = true;
          break;
        }
      }
      if (!found) {
        const key = line.trim().toLowerCase();
        counts[key] = (counts[key] || 0) + 1;
      }
    });

    const ov = Object.entries(counts)
      .filter(([_, count]) => count >= 3)
      .map(([cat, count]) => ({ cat, count }))
      .sort((a, b) => b.count - a.count);
    
    setOverview(ov);
  }, [issues]);

  useEffect(() => {
    const lines = physIssues.split('\n').filter(l => l.trim());
    let comp = 0, shiftC = 0, cancel = 0;
    
    lines.forEach(l => {
      const t = l.toLowerCase();
      if (t.includes('done') || t.includes('complete') || t.includes('fixed') || t.includes('solved')) comp++;
      else if (t.includes('shift') || t.includes('next day') || t.includes('pending')) shiftC++;
      else if (t.includes('cancel')) cancel++;
    });
    
    setPhysStats({ total: lines.length, comp, shift: shiftC, cancel });
  }, [physIssues]);

  const handleGenerate = async () => {
    if (isSaving) return; // Prevent double submission

    if (!shift || !tlName) {
      setSaveStatus({ type: 'error', message: 'Please select both Reporting Boss/TL Name and Shift.' });
      return;
    }

    const issueList = issues.split('\n').filter(l => l.trim());
    const ssList = ssNumbers.split(/[\s,]+/)
      .map(l => l.trim().replace(/^"|"$/g, '').trim())
      .filter(l => l.length > 0);
    const physList = physIssues.split('\n').filter(l => l.trim());

    const remRec = issueList.length;
    const procCnt = ssList.length;
    const remSolv = remRec - procCnt;

    const formattedDate = format(new Date(date), 'd MMMM, yyyy');
    const shiftText = shift.includes('6:30PM') ? '9:00AM to 6:30PM' : shift.includes('9:00AM to 9:00AM') ? '9:00AM to 9:00AM' : shift;

    let report = `Report: ${formattedDate} (${shiftText})\n=============\nRemotely Support>>\n`;
    report += `Total Issue Rec: ${remRec}\nTotal Issue Solve: ${remSolv}\n`;
    report += procCnt > 0 ? `Processing: ${procCnt} (${ssList.join(' ')})\n` : `Processing: 0\n`;
    report += `\t\nProcessing: Soft & Sheet Processing Responsible Person : (${persons})\n\n`;
    report += `Physically Support >>\nTotal Physical: ${physList.length}\nComplete: ${physStats.comp}\nShift: ${physStats.shift}\nCancel: ${physStats.cancel}\n\n`;
    report += `${shiftText}\n`;

    const disp = ['QC Issue', 'Slow Issues', 'Solved', 'Billing Issues', 'Gaming Issue', 'Site Browsing Issue', 'No Internet', 'Loss', 'Shifting', 'New Line'];
    const counts: Record<string, number> = {};
    issueList.forEach(line => {
      const lower = line.toLowerCase();
      for (const [cat, kws] of Object.entries(FIXED_ISSUES)) {
        if (kws.some(k => lower.includes(k))) {
          counts[cat] = (counts[cat] || 0) + 1;
          break;
        }
      }
    });

    let any = false;
    disp.forEach(cat => {
      const c = counts[cat];
      if (!c) return;
      const n = cat === 'Site Browsing Issue' ? 'site browsing issue' : cat === 'No Internet' ? 'No internet' : cat;
      report += `${n}: ${c}\n`;
      any = true;
    });

    if (!any && remRec > 0) report += `Issues: ${remRec}\n`;
    report += `Remotely Solved. Details in task.\n\n`;

    const contacts: Record<string, { email: string; phone: string }> = {
      'Safikul Islam': { email: 'safikul@saltsync.com', phone: '01901041903' },
      'S.M Faisal': { email: 'faisal@saltsync.com', phone: '01901041901' }
    };

    if (contacts[tlName]) {
      const c = contacts[tlName];
      report += `Reported by ${tlName}\nEmail: ${c.email}\nCall: ${c.phone}\n-Thanks.\n`;
    } else {
      report += `Reported by ${tlName}\n-Thanks.\n`;
    }

    setOutput(report);

    // Save report to cloud
    setIsSaving(true);
    setSaveStatus({ type: 'idle', message: '' });

    try {
      await reportService.saveTLReport({
        date: formattedDate,
        tl_name: tlName,
        shift,
        issues: remRec,
        solved: remSolv,
        processing: procCnt,
        physical_total: physList.length,
        physical_complete: physStats.comp,
        physical_shift: physStats.shift,
        physical_cancel: physStats.cancel,
        processing_persons: persons,
        report_content: report,
        ts: Date.now()
      });

      setSaveStatus({ type: 'success', message: 'TL Report generated & saved to cloud ☁️' });
    } catch (error: any) {
      console.error('Save error:', error);
      let msg = error.message || 'Failed to save TL report to cloud.';
      setSaveStatus({ type: 'error', message: msg });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-6 md:py-10 animate-in fade-in duration-300">
      <PageHeader 
        title="Team Leader Report" 
        description="Shift breakdown, team operations feed, and performance logs."
        icon={Users}
        iconColor="text-t"
      />

      <div className="card p-4 sm:p-6 md:p-8 space-y-6 md:space-y-8">
        {/* Status Toast Banner */}
        {saveStatus.type !== 'idle' && (
          <div className={`p-4 rounded-xl flex items-center justify-between gap-3 text-xs sm:text-sm font-semibold transition-all ${
            saveStatus.type === 'success' ? 'bg-g/15 text-g border border-g/30' : 'bg-r/15 text-r border border-r/30'
          }`}>
            <div className="flex items-center gap-2">
              {saveStatus.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
              <span>{saveStatus.message}</span>
            </div>
            <button 
              onClick={() => setSaveStatus({ type: 'idle', message: '' })}
              className="text-current opacity-70 hover:opacity-100 p-1"
            >
              ✕
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
          <div className="fld">
            <label>Reporting Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          {/* Dynamic Employee Selection (Team Leader / Reporting Boss) */}
          <div className="fld">
            <label>
              Reporting Boss / Team Leader 
              {isLoadingEmps && <span className="text-ink-lighter font-normal lowercase ml-1">(loading...)</span>}
            </label>
            <select 
              value={tlName} 
              onChange={(e) => setTlName(e.target.value)}
              className="w-full bg-bg border-1.5 border-border rounded-xl px-3.5 py-2.5 text-sm"
            >
              <option value="" className="bg-bg text-ink">— Select Team Leader / Reporting Boss —</option>
              {employees.map(emp => (
                <option key={emp.eid || emp.name} value={emp.name} className="bg-bg text-ink">
                  {emp.name} {emp.eid ? `(${emp.eid})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="fld sm:col-span-2">
            <label>Report Shift</label>
            <select value={shift} onChange={(e) => setShift(e.target.value)}>
              <option value="" className="bg-bg text-ink">— Select Shift —</option>
              {TL_SHIFTS.map(s => <option key={s} value={s} className="bg-bg text-ink">{s}</option>)}
            </select>
          </div>

          <div className="fld sm:col-span-2">
            <label>List of Issues <span className="text-ink-lighter font-normal lowercase">(one per line)</span></label>
            <textarea 
              value={issues} 
              onChange={(e) => setIssues(e.target.value)} 
              placeholder="Enter issues..."
              className="min-h-[130px] text-sm"
            />
          </div>
        </div>

        {/* Responsible Persons */}
        <div className="glass-panel border-l-4 border-l-t p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2.5 font-display font-bold text-sm">
            <div className="w-7 h-7 bg-t/20 text-t rounded-lg flex items-center justify-center">
              <Users size={16} />
            </div>
            Processing Responsible Persons
          </div>
          <input 
            type="text" 
            value={persons} 
            onChange={(e) => setPersons(e.target.value)} 
            className="w-full bg-bg border-1.5 border-border rounded-xl px-3.5 py-2.5 text-sm"
          />
        </div>

        {/* TL Overview */}
        <div className="glass-panel border-l-4 border-l-t p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 font-display font-bold text-sm">
              <div className="w-7 h-7 bg-t/20 text-t rounded-lg flex items-center justify-center">
                <ChartBar size={16} />
              </div>
              TL Overview Breakdown
            </div>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider w-fit ${
              overview.length > 5 ? 'bg-r/20 text-r' : overview.length > 0 ? 'bg-t/20 text-t' : 'bg-ink/5 text-ink-lighter'
            }`}>
              {overview.length} repeated patterns
            </span>
          </div>
          
          <div className="space-y-2">
            {overview.length === 0 ? (
              <div className="text-center py-6 text-ink-lighter text-xs font-medium bg-bg/50 rounded-xl border border-dashed border-border px-4">
                Type issues above to see automatic pattern counts
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {overview.map((item, idx) => (
                  <div key={idx} className={`flex items-center justify-between p-3 rounded-xl border-l-4 ${
                    item.count >= 10 ? 'border-r bg-r/10' : item.count >= 5 ? 'border-y bg-y/10' : 'border-t bg-t/10'
                  }`}>
                    <span className="font-bold text-xs sm:text-sm capitalize">{item.cat}</span>
                    <span className={`font-display font-black px-2.5 py-0.5 rounded text-white text-xs ${
                      item.count >= 10 ? 'bg-r' : item.count >= 5 ? 'bg-y text-slate-950' : 'bg-t text-slate-950'
                    }`}>
                      ×{item.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-3.5 bg-bg/60 rounded-xl border border-border">
            <div className="text-[10px] font-black text-t uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Tag size={12} /> System Keywords
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Object.keys(FIXED_ISSUES).map(cat => (
                <span key={cat} className="px-2 py-0.5 bg-t/10 text-t border border-t/20 rounded text-[10px] font-bold uppercase tracking-wider">
                  {cat}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Physical Support Issues */}
        <div className="glass-panel border-l-4 border-l-p p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-2.5 font-display font-bold text-sm">
            <div className="w-7 h-7 bg-p/20 text-p rounded-lg flex items-center justify-center">
              <Wrench size={16} />
            </div>
            Physical Support Issues
          </div>
          <textarea 
            value={physIssues} 
            onChange={(e) => setPhysIssues(e.target.value)} 
            placeholder="ONT replacement - done&#10;Fiber splicing - shift&#10;Router setup - cancel"
            className="bg-bg border-1.5 border-border rounded-xl p-3 w-full text-sm min-h-[100px]"
          />
          <div className="flex flex-wrap gap-2 text-[10px]">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-g/10 rounded-lg border border-g/20 text-g font-semibold">
              <CheckCircle size={12} /> Complete: {physStats.comp}
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-y/10 rounded-lg border border-y/20 text-y font-semibold">
              <Info size={12} /> Shift: {physStats.shift}
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-r/10 rounded-lg border border-r/20 text-r font-semibold">
              <AlertTriangle size={12} /> Cancel: {physStats.cancel}
            </div>
          </div>
        </div>

        {/* SS Numbers */}
        <div className="glass-panel border-l-4 border-l-t p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2.5 font-display font-bold text-sm">
            <div className="w-7 h-7 bg-t/20 text-t rounded-lg flex items-center justify-center">
              <ListOrdered size={16} />
            </div>
            SS Numbers / Processing
          </div>
          <textarea 
            value={ssNumbers} 
            onChange={(e) => setSsNumbers(e.target.value)} 
            placeholder="Paste SS numbers here..."
            className="bg-bg border-1.5 border-border rounded-xl p-3 w-full text-sm min-h-[80px]"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-end pt-2">
          {output && (
            <button 
              onClick={handleCopy} 
              className="btn btn-ghost w-full sm:w-auto text-xs"
            >
              {copied ? <Check size={16} className="text-g" /> : <Copy size={16} />}
              {copied ? 'Copied to Clipboard!' : 'Copy Output'}
            </button>
          )}
          <button 
            onClick={handleGenerate} 
            disabled={isSaving} 
            className="btn btn-t px-6 w-full sm:w-auto text-xs font-bold shadow-md disabled:opacity-50"
          >
            {isSaving ? <RefreshCw size={16} className="animate-spin" /> : <CloudUpload size={16} />}
            {isSaving ? 'Saving to Cloud...' : 'Generate & Sync'}
          </button>
        </div>

        {/* Terminal Output Log */}
        {output && (
          <div className="mt-6 terminal-box border border-border">
            <div className="flex items-center justify-between px-4 py-2.5 bg-card border-b border-border">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-r opacity-80" />
                <div className="w-2.5 h-2.5 rounded-full bg-y opacity-80" />
                <div className="w-2.5 h-2.5 rounded-full bg-g opacity-80" />
              </div>
              <span className="text-[10px] text-ink-light uppercase tracking-wider font-mono font-bold">tl_report_output.log</span>
              <button 
                onClick={handleCopy} 
                className="btn btn-ghost px-2.5 py-1 text-[10px] rounded-lg"
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="out-pre min-h-[240px] text-xs px-4 py-3 whitespace-pre-wrap">{output}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
