import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ClipboardList, 
  HandHelping, 
  ListOrdered, 
  Star, 
  CloudUpload, 
  Copy, 
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Check
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { DEFAULT_EMPS, SHIFTS } from '../constants';
import { reportService } from '../services/reportService';
import { Employee } from '../types';
import { PageHeader } from '../components/PageHeader';

export default function EmployeeReport() {
  const navigate = useNavigate();
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedEmp, setSelectedEmp] = useState('');
  const [empName, setEmpName] = useState('');
  const [empId, setEmpId] = useState('');
  const [shift, setShift] = useState('');
  const [issues, setIssues] = useState('');
  const [physicalSupport, setPhysicalSupport] = useState(0);
  const [ssNumbers, setSsNumbers] = useState('');
  const [specialTask, setSpecialTask] = useState('');
  const [output, setOutput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'idle' | 'success' | 'error'; message: string }>({ type: 'idle', message: '' });
  const [copied, setCopied] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>(DEFAULT_EMPS);

  useEffect(() => {
    let isMounted = true;
    const loadEmployees = async () => {
      try {
        const list = await reportService.getEmployees();
        if (isMounted && list && list.length > 0) {
          setEmployees(list);
        }
      } catch (error) {
        console.error('Error loading employees dropdown:', error);
      }
    };
    loadEmployees();

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

  useEffect(() => {
    const emp = employees.find(e => e.name === selectedEmp);
    if (emp) {
      setEmpName(emp.name);
      setEmpId(emp.eid);
    }
  }, [selectedEmp, employees]);

  useEffect(() => {
    if (shift === 'Night') {
      const prevDate = subDays(new Date(), 1);
      setDate(format(prevDate, 'yyyy-MM-dd'));
    } else if (shift === 'Day' || shift === 'Evening') {
      setDate(format(new Date(), 'yyyy-MM-dd'));
    }
  }, [shift]);

  const handleGenerate = async () => {
    if (isSaving) return; // Prevent double submission

    if (!shift || !empName || !empId) {
      setSaveStatus({ type: 'error', message: 'Please select profile/employee name, ID, and duty shift.' });
      return;
    }

    const issueList = issues.split('\n').filter(l => l.trim());
    const ssList = ssNumbers.split(/[\s,]+/)
      .map(l => l.trim().replace(/^"|"$/g, '').trim())
      .filter(l => l.length > 0);
    
    const totalRec = issueList.length + physicalSupport;
    const procCnt = ssList.length;
    const solved = totalRec - procCnt;

    const issueCounts: Record<string, number> = {};
    issueList.forEach(i => {
      let k = i.toLowerCase().trim();
      if (k.includes('qc')) k = 'qc issue';
      issueCounts[k] = (issueCounts[k] || 0) + 1;
    });

    const uniqueIssues: Record<string, string> = {};
    issueList.forEach(i => {
      let k = i.toLowerCase().trim();
      if (k.includes('qc')) {
        uniqueIssues['qc issue'] = 'QC Issue';
      } else {
        if (!uniqueIssues[k]) uniqueIssues[k] = i;
      }
    });

    const formattedDate = format(new Date(date), 'dd.MM.yyyy');

    let report = `Employee Name: ${empName}\nEmployee ID: ${empId}\nDate: ${formattedDate}\nDuty Shift: ${shift}\n`;
    report += `Total Issues Received: ${totalRec}\nTotal Issues Solved: ${solved}\n`;
    report += procCnt > 0 ? `Total Issues Processing: ${procCnt} (${ssList.join(' ')})\n` : `Total Issues Processing: 0\n`;
    report += `\n------* Type of Issues *------\n`;
    
    Object.keys(issueCounts).forEach(k => {
      report += `${uniqueIssues[k]}: ${issueCounts[k]}\n`;
    });

    if (physicalSupport > 0) {
      report += `Physical Support: ${physicalSupport}\n`;
    }

    if (specialTask) {
      report += `\n★ Special Task/NOTE:\n${specialTask}\n`;
    }

    setOutput(report);
    
    setIsSaving(true);
    setSaveStatus({ type: 'idle', message: '' });

    try {
      await reportService.saveEmployeeReport({
        date: formattedDate,
        name: empName,
        employee_id: empId,
        shift,
        issues: totalRec,
        physical_support: physicalSupport,
        regular_issues: issueList.length,
        processing: procCnt,
        solved,
        special_task: specialTask,
        report_content: report,
        ts: Date.now()
      });

      setSaveStatus({ type: 'success', message: 'Report generated & synced to cloud ☁️' });
    } catch (error: any) {
      console.error('Save error:', error);
      let msg = error.message || 'Failed to save report to cloud.';
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
        title="Daily Issue Report" 
        description="Generate, format, and sync your daily logs to the cloud."
        icon={ClipboardList}
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
          <div className="fld">
            <label>Select Profile</label>
            <select value={selectedEmp} onChange={(e) => setSelectedEmp(e.target.value)}>
              <option value="" className="bg-bg text-ink">— Select Employee Profile —</option>
              {employees.map(e => (
                <option key={e.eid || e.name} value={e.name} className="bg-bg text-ink">{e.name}</option>
              ))}
            </select>
          </div>
          <div className="fld">
            <label>Employee Name</label>
            <input type="text" value={empName} onChange={(e) => setEmpName(e.target.value)} placeholder="Full name" />
          </div>
          <div className="fld">
            <label>Employee ID</label>
            <input type="text" value={empId} readOnly className="opacity-70 cursor-not-allowed bg-ink/5" placeholder="Salt-S-XXX" />
          </div>
          <div className="fld sm:col-span-2">
            <label>Duty Shift</label>
            <select value={shift} onChange={(e) => setShift(e.target.value)}>
              <option value="" className="bg-bg text-ink">— Select Shift —</option>
              {SHIFTS.map(s => <option key={s} value={s} className="bg-bg text-ink">{s}</option>)}
            </select>
          </div>
          <div className="fld sm:col-span-2">
            <label>Issues <span className="text-ink-lighter font-normal lowercase">(one per line)</span></label>
            <textarea 
              value={issues} 
              onChange={(e) => setIssues(e.target.value)} 
              placeholder="Type each issue on a new line..."
              className="min-h-[130px] text-sm"
            />
          </div>
        </div>

        {/* Physical Support Count */}
        <div className="glass-panel border-l-4 border-l-p p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2.5 font-display font-bold text-sm">
            <div className="w-7 h-7 bg-p/20 text-p rounded-lg flex items-center justify-center">
              <HandHelping size={16} />
            </div>
            Physical Support Units
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <input 
              type="number" 
              value={physicalSupport} 
              onChange={(e) => setPhysicalSupport(parseInt(e.target.value) || 0)}
              className="w-full sm:w-28 bg-bg border-1.5 border-border rounded-xl px-3.5 py-2.5 text-xl font-black text-center"
              min="0"
            />
            <div className="flex flex-col">
              <span className="text-xs text-ink-light font-medium">Included in total received & solved counts automatically.</span>
              {physicalSupport > 0 && (
                <span className="text-[10px] font-bold text-p uppercase tracking-wider mt-0.5">
                  +{physicalSupport} Active Units Added
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Secondary Inputs: SS Numbers & Special Task */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div className="glass-panel border-l-4 border-l-t p-4 sm:p-5 space-y-3 flex flex-col">
            <div className="flex items-center gap-2.5 font-display font-bold text-sm">
              <div className="w-7 h-7 bg-t/20 text-t rounded-lg flex items-center justify-center">
                <ListOrdered size={16} />
              </div>
              SS Numbers / Processing
            </div>
            <textarea 
              value={ssNumbers} 
              onChange={(e) => setSsNumbers(e.target.value)} 
              placeholder="Paste SS numbers..."
              className="bg-bg border-1.5 border-border rounded-xl p-3 w-full text-sm min-h-[90px] flex-1"
            />
          </div>

          <div className="glass-panel border-l-4 border-l-border p-4 sm:p-5 space-y-3 flex flex-col">
            <div className="flex items-center gap-2.5 font-display font-bold text-sm">
              <div className="w-7 h-7 bg-ink/10 text-ink rounded-lg flex items-center justify-center">
                <Star size={16} />
              </div>
              Special Task / Note
            </div>
            <textarea 
              value={specialTask} 
              onChange={(e) => setSpecialTask(e.target.value)} 
              placeholder="Any special accomplishments..."
              className="bg-bg border-1.5 border-border rounded-xl p-3 w-full text-sm min-h-[90px] flex-1"
            />
          </div>
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
            className="btn btn-p px-6 w-full sm:w-auto text-xs font-bold shadow-md disabled:opacity-50"
          >
            {isSaving ? <RefreshCw size={16} className="animate-spin" /> : <CloudUpload size={16} />}
            {isSaving ? 'Syncing to Cloud...' : 'Generate & Sync'}
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
              <span className="text-[10px] text-ink-light uppercase tracking-wider font-mono font-bold">report_output.log</span>
              <button 
                onClick={handleCopy} 
                className="btn btn-ghost px-2.5 py-1 text-[10px] rounded-lg"
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="out-pre min-h-[200px] text-xs px-4 py-3 whitespace-pre-wrap">{output}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
