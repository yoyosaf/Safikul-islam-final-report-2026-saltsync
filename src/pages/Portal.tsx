import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserCircle, Inbox, Calendar, Eye, RefreshCw, X, Copy, ClipboardList, Check } from 'lucide-react';
import { DEFAULT_EMPS } from '../constants';
import { EmployeeReport, Employee } from '../types';
import { reportService } from '../services/reportService';

export default function Portal() {
  const navigate = useNavigate();
  const [selectedEmp, setSelectedEmp] = useState('');
  const [reports, setReports] = useState<EmployeeReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [modalContent, setModalContent] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Employee[]>(DEFAULT_EMPS);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadEmployees = async () => {
      try {
        const list = await reportService.getEmployees();
        if (isMounted && list && list.length > 0) {
          setEmployees(list);
        }
      } catch (error) {
        console.error('Error loading employees in Portal:', error);
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

  const loadReports = async () => {
    if (!selectedEmp) return;
    setIsLoading(true);
    setErrorMessage(null);
    
    try {
      const data = await reportService.getEmployeeReports(selectedEmp);
      setReports(data);
    } catch (error: any) {
      console.error('Fetch error:', error);
      setErrorMessage(error?.message || 'Failed to fetch reports from cloud.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [selectedEmp]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-6 py-6 md:py-10 animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-8 gap-4">
        <div className="space-y-0.5">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">MY <span className="grad-text">REPORTS</span></h2>
          <p className="text-xs sm:text-sm text-ink-light font-medium">Personal shift report history synced to the cloud.</p>
        </div>
        <button onClick={() => navigate('/')} className="btn btn-ghost px-3 py-1.5 text-xs gap-1.5 shrink-0">
          <ArrowLeft size={14} /> Back
        </button>
      </div>

      {errorMessage && (
        <div className="p-3 mb-6 bg-r/15 border border-r/30 text-r rounded-xl text-xs font-semibold flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="p-1">✕</button>
        </div>
      )}

      <div className="card p-4 sm:p-5 mb-6">
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="fld flex-1 w-full">
            <label>Select Employee Name</label>
            <select 
              value={selectedEmp} 
              onChange={(e) => setSelectedEmp(e.target.value)}
              className="w-full bg-bg border-1.5 border-border rounded-xl px-3.5 py-2.5 text-sm"
            >
              <option value="" className="bg-bg text-ink">— Select Profile —</option>
              {employees.map(e => (
                <option key={e.eid || e.name} value={e.name} className="bg-bg text-ink">
                  {e.name} {e.eid ? `(${e.eid})` : ''}
                </option>
              ))}
            </select>
          </div>
          <button 
            onClick={loadReports} 
            disabled={isLoading || !selectedEmp}
            className="btn btn-p gap-2 px-5 py-2.5 w-full sm:w-auto text-xs font-bold disabled:opacity-50"
          >
            <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {!selectedEmp ? (
          <div className="card py-16 text-center">
            <div className="w-14 h-14 bg-ink/5 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-border">
              <UserCircle size={32} className="text-ink-lighter opacity-40" />
            </div>
            <p className="text-xs sm:text-sm text-ink-light font-medium">Select your name above to view historical reports</p>
          </div>
        ) : isLoading ? (
          <div className="card py-16 text-center">
            <div className="w-10 h-10 border-2 border-p/20 border-t-p rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-ink-light font-medium">Loading reports from cloud...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="card py-16 text-center">
            <div className="w-14 h-14 bg-ink/5 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-border">
              <Inbox size={32} className="text-ink-lighter opacity-40" />
            </div>
            <p className="text-xs sm:text-sm text-ink-light font-medium">No reports found for <span className="text-ink font-bold">{selectedEmp}</span></p>
          </div>
        ) : (
          reports.map((r, idx) => (
            <div key={idx} className="card p-4 sm:p-5 hover:border-p/30 transition-all duration-200">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="space-y-3 flex-1 min-w-0">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-p/10 rounded-lg flex items-center justify-center border border-p/20 shrink-0">
                      <Calendar size={15} className="text-p" />
                    </div>
                    <div>
                      <div className="text-sm sm:text-base font-bold text-ink">{r.date}</div>
                      <div className="text-[10px] font-black text-p uppercase tracking-wider">{r.shift} Shift</div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-1.5">
                    <span className="px-2.5 py-0.5 bg-ink/5 border border-border text-ink rounded-md text-[10px] font-bold uppercase tracking-wider">
                      {r.issues} Issues
                    </span>
                    <span className="px-2.5 py-0.5 bg-ink/5 border border-border text-ink rounded-md text-[10px] font-bold uppercase tracking-wider">
                      {r.solved} Solved
                    </span>
                    {r.processing > 0 && (
                      <span className="px-2.5 py-0.5 bg-ink/5 border border-border text-y rounded-md text-[10px] font-bold uppercase tracking-wider">
                        {r.processing} Proc
                      </span>
                    )}
                    {r.physical_support > 0 && (
                      <span className="px-2.5 py-0.5 bg-ink/5 border border-border text-g rounded-md text-[10px] font-bold uppercase tracking-wider">
                        {r.physical_support} Phys
                      </span>
                    )}
                  </div>
                  
                  {r.special_task && (
                    <div className="text-xs text-y bg-y/5 border border-y/10 px-2.5 py-1.5 rounded-lg italic line-clamp-2">
                      ★ {r.special_task}
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={() => setModalContent(r.report_content)} 
                  className="btn btn-ghost px-3 py-1.5 text-xs gap-1.5 w-full sm:w-auto shrink-0"
                >
                  <Eye size={13} /> View Log
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Dialog */}
      {modalContent && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="card p-5 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl relative border-border">
            <button 
              onClick={() => setModalContent(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-ink/5 flex items-center justify-center text-ink-light hover:bg-r hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
            
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-p/10 rounded-xl flex items-center justify-center border border-p/20">
                <ClipboardList size={20} className="text-p" />
              </div>
              <div>
                <h4 className="text-base sm:text-lg font-bold tracking-tight">Report Log Details</h4>
                <p className="text-[10px] text-ink-light uppercase tracking-wider">Cloud Synchronized Output</p>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto mb-5 rounded-xl border border-border bg-zinc-950 p-3 sm:p-4">
              <pre className="font-mono text-xs text-t-light whitespace-pre-wrap break-words">{modalContent}</pre>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2.5">
              <button 
                onClick={() => handleCopy(modalContent)} 
                className="btn btn-p flex-1 gap-2 py-2.5 text-xs font-bold"
              >
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied ? 'Copied to Clipboard!' : 'Copy to Clipboard'}
              </button>
              <button 
                onClick={() => setModalContent(null)} 
                className="btn btn-ghost flex-1 py-2.5 text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
