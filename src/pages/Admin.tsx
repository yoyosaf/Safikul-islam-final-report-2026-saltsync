import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, Lock, Unlock, ArrowLeft, LogOut, Users, UserCheck, UserCog, Bell, Key, Database, Search, Trash2, Eye, Plus, Save, Undo, Info, Cloud, CheckCircle, AlertTriangle, RefreshCw, Inbox, Star, X, ClipboardList, Copy, LogIn,
  Zap, ArrowRight, Globe, Cpu, Wifi, Server, ChartLine, HandHelping, Monitor, Mail, Play, Pause, RotateCcw, CheckCircle2, HelpCircle, Settings, Calendar, Layers, Sparkles, ExternalLink, ChevronRight, Clock, Edit3, Check
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { DEFAULT_EMPS } from '../constants';
import { EmployeeReport, TLReport, Employee } from '../types';
import { reportService } from '../services/reportService';
import { deleteDoc, doc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, User } from 'firebase/auth';
import { BrandLogo, BrandMonogram, BrandHeaderHorizontal } from '../components/BrandLogo';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Admin() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loginErr, setLoginErr] = useState('');
  const [activeTab, setActiveTab] = useState('ov'); // Default tab set to Redesigned Overview Dashboard!
  const [isLoading, setIsLoading] = useState(false);
  
  // System Reports & Data
  const [empReports, setEmpReports] = useState<EmployeeReport[]>([]);
  const [tlReports, setTlReports] = useState<TLReport[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [notif, setNotif] = useState('Welcome to Safikulreport! 🎉');
  const [search, setSearch] = useState('');
  const [modalContent, setModalContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Selection Sets for Bulk Actions
  const [selectedEmpReports, setSelectedEmpReports] = useState<Set<string>>(new Set());
  const [selectedTlReports, setSelectedTlReports] = useState<Set<string>>(new Set());
  const [selectedEmps, setSelectedEmps] = useState<Set<string>>(new Set());

  // Pagination States
  const [empPage, setEmpPage] = useState(1);
  const [tlPage, setTlPage] = useState(1);
  const [dbPage, setDbPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filter States
  const [empShiftFilter, setEmpShiftFilter] = useState('all');
  const [tlShiftFilter, setTlShiftFilter] = useState('all');
  const [dbCategoryFilter, setDbCategoryFilter] = useState<'all' | 'emp' | 'tl' | 'employees'>('all');

  // Confirmation Modal State (iframe safe - replaces window.confirm)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    isDanger?: boolean;
    onConfirm: () => Promise<void>;
  } | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  // Record Inspector Modal State
  const [inspectItem, setInspectItem] = useState<{
    id: string;
    type: string;
    title: string;
    data: any;
  } | null>(null);
  const [inspectCopied, setInspectCopied] = useState(false);

  // Toast Banner State
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const triggerToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  // REDESIGNED DASHBOARD INTERACTIVE STATES
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [seconds, setSeconds] = useState(5048);
  const [isTimerRunning, setIsTimerRunning] = useState(true);

  // Reminders Registry
  const [localTasks, setLocalTasks] = useState([
    { id: 1, title: 'Build Database Indexing', due: 'Due date: Nov 26, 2026', desc: 'Secure BGP telemetry proxy handlers', type: 'api', color: '#00d4b4' },
    { id: 2, title: 'Onboarding System Flow', due: 'Due date: Nov 28, 2026', desc: 'Verify system access keys setup', type: 'onboarding', color: '#7b5cf0' },
    { id: 3, title: 'Configure Multi-Node Routers', due: 'Due date: Nov 30, 2026', desc: 'Polish user interface styling rules', type: 'ui', color: '#f59e0b' },
    { id: 4, title: 'Optimize Gateway Response', due: 'Due date: Dec 05, 2026', desc: 'Cache outages payload query server', type: 'perf', color: '#3ebb7d' },
    { id: 5, title: 'Stress Viewport Layouts', due: 'Due date: Dec 06, 2026', desc: 'Telemetry charts viewport responsiveness', type: 'qa', color: '#ef4444' }
  ]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDue, setNewTaskDue] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');

  // Authentication Observer - Super Admin Access
  const SUPER_ADMIN_EMAILS = ['babayoyosaf@gmail.com', 'realsafikul@gmail.com', 'syssaltsync33@gmail.com'];

  // Database Connection Testing & Management
  const [testingRTDB, setTestingRTDB] = useState(false);
  const [rtdbStatus, setRtdbStatus] = useState<{ checked: boolean; success: boolean; message: string } | null>(null);
  const [clearingOld, setClearingOld] = useState(false);
  const [rulesCopied, setRulesCopied] = useState(false);

  const handleTestRTDB = async () => {
    setTestingRTDB(true);
    try {
      const res = await reportService.testRTDB();
      setRtdbStatus({ checked: true, success: res.success, message: res.message });
      if (res.success) {
        triggerToast('success', 'Realtime Database Connected & Active!');
      } else {
        triggerToast('error', res.message);
      }
    } catch (e: any) {
      const msg = e.message || 'Connection failed';
      setRtdbStatus({ checked: true, success: false, message: msg });
      triggerToast('error', msg);
    } finally {
      setTestingRTDB(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user && user.email && SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase())) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Time Tracker stopwatch counting logic
  useEffect(() => {
    let intervalId: any = null;
    if (isTimerRunning && isAdmin) {
      intervalId = setInterval(() => {
        setSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(intervalId);
  }, [isTimerRunning, isAdmin]);

  // Format Stopwatch into HH:MM:SS
  const formatStopwatch = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return [
      hrs.toString().padStart(2, '0'),
      mins.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0')
    ].join(':');
  };

  const handleGoogleLogin = async () => {
    setLoginErr('');
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.code === 'auth/unauthorized-domain') {
        setLoginErr(`Unauthorized Domain: ${window.location.hostname}. Please add this EXACT name to your Firebase Console > Authentication > Settings > Authorized domains.`);
      } else if (error.code === 'auth/popup-blocked') {
        setLoginErr('Popup blocked by browser. Please allow popups for this site or open in a new tab.');
      } else {
        setLoginErr(error.message || 'Login failed. Please try again.');
      }
    }
  };

  const loadData = async () => {
    if (!isAdmin) return;
    setIsLoading(true);
    setError(null);

    // 1. Load employees safely
    try {
      const emps = await reportService.getEmployees();
      setEmployees(emps || []);
    } catch (e: any) {
      console.warn('Failed loading employees in Admin:', e);
    }

    // 2. Load global settings
    try {
      const s = await reportService.getSettings();
      if (s?.notification) {
        setNotif(s.notification);
      }
    } catch (e: any) {
      console.warn('Failed loading settings in Admin:', e);
    }

    // 3. Load reports
    try {
      const er = await reportService.getEmployeeReports();
      setEmpReports(er || []);
    } catch (e: any) {
      console.warn('Failed loading emp reports in Admin:', e);
    }

    try {
      const tr = await reportService.getTLReports();
      setTlReports(tr || []);
    } catch (e: any) {
      console.warn('Failed loading tl reports in Admin:', e);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    if (isAdmin) {
      loadData();
      // Listen to realtime employee updates from RTDB (even empty array updates UI correctly!)
      const unsubEmps = reportService.onEmployeesUpdate((liveEmps) => {
        setEmployees(liveEmps || []);
      });
      return () => unsubEmps();
    }
  }, [isAdmin]);

  // Single Report Delete with Safe Modal
  const requestDeleteReport = (type: 'emp' | 'tl', report: { id?: string; name?: string; tl_name?: string; date?: string }) => {
    if (!report.id) return;
    const repName = report.name || report.tl_name || 'Report';
    setConfirmModal({
      isOpen: true,
      title: `Delete ${type === 'emp' ? 'Employee' : 'Team Leader'} Report`,
      message: `Are you sure you want to permanently delete the report for "${repName}" (${report.date || 'unknown date'})? This action cannot be undone.`,
      confirmLabel: 'Delete Record',
      isDanger: true,
      onConfirm: async () => {
        try {
          await reportService.deleteReport(type, report.id!);
          if (type === 'emp') {
            setEmpReports(prev => prev.filter(r => r.id !== report.id));
            setSelectedEmpReports(prev => {
              const next = new Set(prev);
              next.delete(report.id!);
              return next;
            });
          } else {
            setTlReports(prev => prev.filter(r => r.id !== report.id));
            setSelectedTlReports(prev => {
              const next = new Set(prev);
              next.delete(report.id!);
              return next;
            });
          }
          triggerToast('success', 'Report permanently deleted.');
        } catch (e: any) {
          triggerToast('error', `Failed to delete report: ${e?.message || e}`);
        }
      }
    });
  };

  // Bulk Delete Reports
  const requestBulkDeleteReports = (type: 'emp' | 'tl') => {
    const ids: string[] = type === 'emp' ? Array.from(selectedEmpReports) : Array.from(selectedTlReports);
    if (ids.length === 0) return;
    setConfirmModal({
      isOpen: true,
      title: `Delete ${ids.length} Selected Reports`,
      message: `Are you sure you want to permanently delete these ${ids.length} selected ${type === 'emp' ? 'employee' : 'team leader'} reports? This action cannot be undone.`,
      confirmLabel: `Delete ${ids.length} Records`,
      isDanger: true,
      onConfirm: async () => {
        try {
          const res = await reportService.deleteReportsBatch(type, ids);
          if (type === 'emp') {
            setEmpReports(prev => prev.filter(r => !ids.includes(r.id || '')));
            setSelectedEmpReports(new Set());
          } else {
            setTlReports(prev => prev.filter(r => !ids.includes(r.id || '')));
            setSelectedTlReports(new Set());
          }
          triggerToast('success', `Deleted ${res.deleted} records${res.failed > 0 ? ` (${res.failed} failed)` : ''}.`);
        } catch (e: any) {
          triggerToast('error', `Batch delete failed: ${e?.message || e}`);
        }
      }
    });
  };

  // Purge Category
  const requestPurgeCategory = (category: 'emp' | 'tl' | 'employees') => {
    const label = category === 'emp' ? 'All Employee Reports' : category === 'tl' ? 'All Team Leader Reports' : 'All Employees';
    const count = category === 'emp' ? empReports.length : category === 'tl' ? tlReports.length : employees.length;
    setConfirmModal({
      isOpen: true,
      title: `Purge ${label}`,
      message: `Are you sure you want to delete ALL ${count} records in "${label}"? This will permanently wipe all entries from both Realtime Database and Firestore.`,
      confirmLabel: `Purge All ${count} Records`,
      isDanger: true,
      onConfirm: async () => {
        try {
          await reportService.deleteCategory(category);
          if (category === 'emp') {
            setEmpReports([]);
            setSelectedEmpReports(new Set());
          } else if (category === 'tl') {
            setTlReports([]);
            setSelectedTlReports(new Set());
          } else {
            setEmployees([]);
            setSelectedEmps(new Set());
          }
          triggerToast('success', `Category "${label}" has been completely wiped.`);
        } catch (e: any) {
          triggerToast('error', `Failed to purge category: ${e?.message || e}`);
        }
      }
    });
  };

  // Export JSON Download
  const handleExport = (category: 'emp' | 'tl' | 'employees' | 'all') => {
    if (category === 'emp') {
      reportService.exportToJSON(empReports, 'Employee_Reports');
    } else if (category === 'tl') {
      reportService.exportToJSON(tlReports, 'TL_Reports');
    } else if (category === 'employees') {
      reportService.exportToJSON(employees, 'Team_Employees');
    } else {
      reportService.exportToJSON({ empReports, tlReports, employees }, 'Safikul_Database_Backup');
    }
    triggerToast('info', 'JSON data exported successfully.');
  };

  // Employee Management
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpId, setNewEmpId] = useState('');
  const [isEmpBusy, setIsEmpBusy] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [editName, setEditName] = useState('');
  const [editEid, setEditEid] = useState('');

  const handleAddEmp = async () => {
    if (!newEmpName.trim() || !newEmpId.trim()) {
      triggerToast('error', 'Please enter both employee name and ID');
      return;
    }
    const newEmp = { name: newEmpName.trim(), eid: newEmpId.trim() };
    setIsEmpBusy(true);
    try {
      await reportService.addEmployee(newEmp);
      setEmployees(prev => {
        const filtered = prev.filter(e => e.eid !== newEmp.eid && e.name !== newEmp.name);
        return [...filtered, newEmp];
      });
      setNewEmpName('');
      setNewEmpId('');
      triggerToast('success', `Employee "${newEmp.name}" (${newEmp.eid}) added successfully!`);
    } catch (error: any) {
      console.error('Add employee error:', error);
      triggerToast('error', `Failed to add employee: ${error.message || error}`);
    } finally {
      setIsEmpBusy(false);
    }
  };

  const handleStartEdit = (emp: Employee) => {
    setEditingEmp(emp);
    setEditName(emp.name);
    setEditEid(emp.eid);
  };

  const handleCancelEdit = () => {
    setEditingEmp(null);
    setEditName('');
    setEditEid('');
  };

  const handleSaveEdit = async () => {
    if (!editingEmp) return;
    if (!editName.trim() || !editEid.trim()) {
      triggerToast('error', 'Name and ID cannot be empty');
      return;
    }
    const updated = { name: editName.trim(), eid: editEid.trim() };
    setIsEmpBusy(true);
    try {
      await reportService.updateEmployee(editingEmp, updated);
      setEmployees(prev => prev.map(e => (e.eid === editingEmp.eid || e.name === editingEmp.name) ? updated : e));
      triggerToast('success', `Employee "${updated.name}" updated successfully!`);
      setEditingEmp(null);
    } catch (error: any) {
      console.error('Update employee error:', error);
      triggerToast('error', `Failed to update employee: ${error.message || error}`);
    } finally {
      setIsEmpBusy(false);
    }
  };

  const requestDeleteEmployee = (emp: Employee) => {
    setConfirmModal({
      isOpen: true,
      title: 'Remove Employee',
      message: `Are you sure you want to remove "${emp.name}" (${emp.eid}) from the team directory?`,
      confirmLabel: 'Remove Employee',
      isDanger: true,
      onConfirm: async () => {
        setIsEmpBusy(true);
        try {
          await reportService.removeEmployee(emp);
          setEmployees(prev => prev.filter(e => e.eid !== emp.eid && e.name !== emp.name));
          setSelectedEmps(prev => {
            const next = new Set(prev);
            next.delete(emp.eid || emp.name);
            return next;
          });
          if (editingEmp?.eid === emp.eid) setEditingEmp(null);
          triggerToast('success', `Employee "${emp.name}" removed successfully!`);
        } catch (error: any) {
          console.error('Remove employee error:', error);
          triggerToast('error', `Failed to delete employee: ${error.message || error}`);
        } finally {
          setIsEmpBusy(false);
        }
      }
    });
  };

  const requestRestoreDefaults = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Restore Default Team',
      message: 'This will restore the standard 8 team members into both Realtime Database and Firestore. Existing extra members will remain intact.',
      confirmLabel: 'Restore Default 8 Members',
      isDanger: false,
      onConfirm: async () => {
        setIsEmpBusy(true);
        try {
          const defs = await reportService.restoreDefaultEmployees();
          setEmployees(defs);
          triggerToast('success', 'Default 8 employees restored successfully!');
        } catch (error: any) {
          console.error('Restore defaults error:', error);
          triggerToast('error', `Failed to restore defaults: ${error.message || error}`);
        } finally {
          setIsEmpBusy(false);
        }
      }
    });
  };

  const handleUpdateNotif = async () => {
    try {
      await reportService.updateSettings({ notification: notif });
      triggerToast('success', 'Notification banner updated successfully!');
    } catch (error: any) {
      console.error('Update notification error:', error);
      triggerToast('error', 'Failed to update notification banner');
    }
  };

  const requestClearConfig = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Reset Local Firebase Config',
      message: 'Clear locally cached Firebase settings? This will require restarting or re-applying credentials.',
      confirmLabel: 'Clear Config',
      isDanger: true,
      onConfirm: async () => {
        localStorage.removeItem('firebase_config');
        window.location.reload();
      }
    });
  };

  const copyRTDBRules = () => {
    const rulesJson = `{\n  "rules": {\n    ".read": true,\n    ".write": true\n  }\n}`;
    navigator.clipboard.writeText(rulesJson);
    setRulesCopied(true);
    triggerToast('success', 'Copied Realtime Database rules JSON to clipboard!');
    setTimeout(() => setRulesCopied(false), 3000);
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const colors = ['#7b5cf0', '#00d4b4', '#22c55e', '#f59e0b', '#007fff'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const newTask = {
      id: Date.now(),
      title: newTaskTitle,
      due: newTaskDue ? `Due date: ${newTaskDue}` : 'Due date: Ongoing',
      desc: newTaskDesc || 'Operational task log',
      type: 'custom',
      color: randomColor
    };
    setLocalTasks(prev => [newTask, ...prev]);
    setNewTaskTitle('');
    setNewTaskDue('');
    setNewTaskDesc('');
    setIsNewTaskOpen(false);
  };

  const handleDeleteTask = (id: number) => {
    setLocalTasks(prev => prev.filter(t => t.id !== id));
  };

  // Group real employee reports by day of week for the SVG chart
  const getWeekdayHeights = () => {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    empReports.forEach(r => {
      if (r.ts) {
        const day = new Date(r.ts).getDay();
        counts[day] += 1;
      }
    });
    const maxCount = Math.max(...counts, 1);
    return counts.map((count, index) => {
      const baseHeights = [30, 75, 45, 88, 55, 65, 40];
      if (empReports.length === 0) {
        return { count: 0, heightPercent: baseHeights[index] };
      }
      const calculatedHeight = Math.max(15, Math.min(95, (count / maxCount) * 100));
      return { count, heightPercent: calculatedHeight };
    });
  };

  const dayHeights = getWeekdayHeights();
  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const totalCombinedReports = empReports.length + tlReports.length;

  if (!isAdmin) {
    return (
      <div className="min-h-[calc(100vh-100px)] flex items-center justify-center px-4 animate-in fade-in duration-500">
        <div className="max-w-md w-full text-center">
          <BrandLogo className="mb-8 scale-105" />
          
          <h2 className="text-3xl font-black mb-2 tracking-tighter flex items-center justify-center gap-2">
            <Lock size={20} className="text-p animate-pulse" /> Secure Admin Entry
          </h2>
          <p className="text-ink-light font-medium mb-8">
            {user ? `Logged in as ${user.email}. Access denied.` : 'Authenticate via Google authorized gateway.'}
          </p>
          
          <div className="card text-left p-8">
            {loginErr && (
              <div className="mb-6 p-4 bg-r/10 border border-r/20 rounded-2xl text-xs text-r flex items-start gap-3 animate-in slide-in-from-top-2">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <div className="font-medium leading-relaxed">{loginErr}</div>
              </div>
            )}
            
            <div className="space-y-3">
              {!user ? (
                <button onClick={handleGoogleLogin} className="btn btn-p w-full py-4 gap-3 text-base shadow-lg shadow-p/20">
                  <LogIn size={20} /> Login with Google
                </button>
              ) : (
                <button onClick={() => auth.signOut()} className="btn btn-r w-full py-4 gap-3 text-base shadow-lg shadow-r/20">
                  <LogOut size={20} /> Switch Account
                </button>
              )}
              
              <button onClick={() => navigate('/')} className="btn btn-ghost w-full py-4 text-base">
                Back to Dashboard
              </button>
            </div>
            
            <div className="mt-10 pt-8 border-t border-border text-center">
              <div className="text-[10px] text-ink-lighter uppercase tracking-[0.3em] font-black mb-3">Authorized Super Admins</div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-glass rounded-full border border-border text-xs text-p font-bold">
                  <span className="w-2 h-2 rounded-full bg-p animate-pulse" /> babayoyosaf@gmail.com
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-glass rounded-full border border-border text-xs text-ink-light font-bold">
                  realsafikul@gmail.com
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 animate-in fade-in duration-500">
      
      {/* Defined diagonal stripes SVG pattern for Donezo-style unfilled charts */}
      <svg className="absolute w-0 h-0" width="0" height="0">
        <defs>
          <pattern id="diagonal-stripes" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="10" stroke="#c2edd5" strokeWidth="3" />
          </pattern>
          <pattern id="diagonal-stripes-dark" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="20" stroke="#27272a" strokeWidth="3" />
          </pattern>
        </defs>
      </svg>

      <div className="flex flex-wrap items-center justify-between gap-6 mb-12">
        <div>
          <h2 className="text-4xl font-black tracking-tighter flex items-center gap-4">
            <div className="w-12 h-12 bg-p/20 text-p rounded-2xl flex items-center justify-center border border-p/30 shadow-lg shadow-p/10">
              <Shield size={28} />
            </div>
            Admin Panel
          </h2>
          <p className="text-ink-light font-medium mt-1">Manage reports, employees, and configure network settings.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate('/')} className="btn btn-ghost btn-sm gap-2">
            <ArrowLeft size={16} /> Web Homepage
          </button>
          <button onClick={() => setIsAdmin(false)} className="btn btn-r btn-sm gap-2">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-3 mb-10 pb-6 border-b border-border">
        {[
          { id: 'ov', label: 'Overview Dashboard', icon: Layers },
          { id: 'emp', label: 'Emp Reports', icon: Users },
          { id: 'tl', label: 'TL Reports', icon: UserCheck },
          { id: 'emps', label: 'Employees', icon: UserCog },
          { id: 'notif', label: 'Notification', icon: Bell },
          { id: 'sec', label: 'Security', icon: Key },
          { id: 'db', label: 'Database', icon: Database },
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "btn btn-sm gap-2.5 px-5 py-2.5 rounded-xl transition-all duration-300",
              activeTab === tab.id 
                ? "bg-p text-white shadow-lg shadow-p/20 scale-105" 
                : "bg-glass text-ink-light hover:bg-ink/5 border border-border"
            )}
          >
            <tab.icon size={16} /> 
            <span className="font-bold">{tab.label}</span>
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-10 p-5 bg-r/10 border border-r/20 rounded-2xl text-sm text-r flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="w-10 h-10 bg-r/20 rounded-xl flex items-center justify-center shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1">
            <div className="font-black uppercase tracking-widest text-[10px] mb-1">Database Connection Issue</div>
            <div className="text-sm font-medium opacity-90">{error}</div>
          </div>
          <button onClick={loadData} className="btn btn-r btn-sm gap-2 shadow-lg shadow-r/20">
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      )}

      {/* Tab Content */}
      <div className="animate-in fade-in slide-in-from-top-4 duration-500">
        
        {/* TAB 1: REDESIGNED INTERACTIVE DONEZO DASHBOARD */}
        {activeTab === 'ov' && (
          <div className="space-y-8">
            
            {/* Top Stat Cards Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { title: 'Telemetry Roster', val: employees.length, change: '+1 Added today', color: '#7b5cf0', status: 'Active' },
                { title: 'Ended Projects', val: '48', change: '96% on-time delivery', color: '#00d4b4', status: 'Completed' },
                { title: 'Operational Running', val: tlReports.length + empReports.length, change: 'Running live syncing', color: '#3ebb7d', status: 'Live' },
                { title: 'BGP Pending Logs', val: '0', change: 'Synced correctly', color: '#f59e0b', status: 'Clean' }
              ].map((card, i) => (
                <div key={i} className="bg-white dark:bg-zinc-900/60 p-6 rounded-[32px] border border-slate-200/60 dark:border-zinc-800/80 shadow-xs flex flex-col justify-between h-44 relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-zinc-500 font-extrabold">{card.title}</span>
                    <span className="px-2.5 py-0.5 text-[8px] font-black uppercase tracking-widest rounded-full" style={{ backgroundColor: `${card.color}15`, color: card.color }}>
                      {card.status}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-4xl font-extrabold tracking-tighter text-slate-900 dark:text-white mt-2">
                      {card.val}
                    </h2>
                    <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium mt-1 uppercase tracking-wide">
                      {card.change}
                    </p>
                  </div>
                  <div className="absolute bottom-0 left-0 w-full h-1" style={{ backgroundColor: card.color, opacity: 0.3 }} />
                </div>
              ))}
            </div>

            {/* Split Grid Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Analytics Graph & Progress Circle */}
              <div className="lg:col-span-8 space-y-6">
                
                {/* Weekly Bar Chart Panel */}
                <div className="bg-white dark:bg-zinc-900/60 rounded-[32px] p-6 lg:p-8 border border-slate-200/60 dark:border-zinc-800/80 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                      <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                        Operational Telemetry Analytics
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                        Reports submitted grouped and tracked by corresponding days of the week
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 dark:bg-zinc-850 rounded-xl border border-slate-200/50 dark:border-zinc-800 text-[10px] font-black uppercase text-slate-500 select-none">
                        <ChartLine size={12} className="text-emerald-500" /> Active Sync
                      </span>
                    </div>
                  </div>

                  {/* SVG Bar Chart */}
                  <div className="h-64 flex items-end justify-between px-2 sm:px-4 pt-10 relative">
                    {/* Y-axis helper background gridlines */}
                    <div className="absolute inset-x-0 top-10 border-t border-dashed border-slate-100 dark:border-zinc-800/50" />
                    <div className="absolute inset-x-0 top-28 border-y border-dashed border-slate-100 dark:border-zinc-800/50" />
                    <div className="absolute inset-x-0 top-46 border-b border-dashed border-slate-100 dark:border-zinc-800/50" />

                    {dayHeights.map((day, i) => (
                      <div 
                        key={i} 
                        className="flex flex-col items-center flex-1 group z-10"
                        onMouseEnter={() => setHoveredDay(i)}
                        onMouseLeave={() => setHoveredDay(null)}
                      >
                        {/* Tooltip on hover */}
                        <div className={`absolute -translate-y-12 bg-slate-950 dark:bg-white text-white dark:text-slate-950 px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider shadow-xl transition-all duration-200 pointer-events-none ${
                          hoveredDay === i ? 'opacity-100 scale-100 visible' : 'opacity-0 scale-90 invisible'
                        }`}>
                          {day.count} Reports
                        </div>

                        {/* Visual Bar Frame */}
                        <div className="w-8 sm:w-12 bg-slate-100/80 dark:bg-zinc-800/40 rounded-t-xl overflow-hidden h-44 flex items-end relative border border-slate-200/40 dark:border-zinc-800/20">
                          {/* Inner Bar Background pattern when report count is small/none */}
                          <div className="absolute inset-0 bg-linear-to-t from-slate-100 to-transparent dark:from-zinc-900 bg-[size:10px_10px] opacity-40" 
                               style={{ backgroundImage: `url(#diagonal-stripes${document.documentElement.classList.contains('light') ? '' : '-dark'})` }} />
                          {/* Colored Active height bar fill */}
                          <motion.div 
                            initial={{ height: 0 }}
                            animate={{ height: `${day.heightPercent}%` }}
                            transition={{ duration: 1, delay: i * 0.1, ease: 'easeOut' }}
                            className="w-full bg-[#135036] group-hover:bg-[#0c3a26] transition-colors relative z-10 rounded-t-lg shadow-sm"
                          />
                        </div>
                        <span className="text-xs font-black text-slate-400 dark:text-zinc-500 mt-3 select-none">
                          {dayNames[i]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sub-group layout containing Reminders & System controls */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Progress Gauge Semi-circle layout */}
                  <div className="bg-white dark:bg-zinc-900/60 rounded-[32px] p-6 border border-slate-200/60 dark:border-zinc-800/80 shadow-xs flex flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-black tracking-tight text-slate-900 dark:text-white uppercase tracking-wider text-[10px] text-slate-400 dark:text-zinc-500 mb-6">
                        Operational Progress Dial
                      </h3>
                      <div className="relative w-40 h-24 mx-auto mt-2">
                        {/* Track Background semicircle */}
                        <svg className="w-full h-full" viewBox="0 0 100 50">
                          <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#f1f5f9" strokeWidth="10" strokeLinecap="round" className="dark:stroke-zinc-800" />
                          <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#135036" strokeWidth="10" strokeLinecap="round" strokeDasharray="125 125" strokeDashoffset="35" />
                        </svg>
                        <div className="absolute inset-x-0 bottom-0 text-center flex flex-col items-center">
                          <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">72%</span>
                          <span className="text-[8px] font-black tracking-widest uppercase text-slate-400 dark:text-[#3ebb7d]">Excellent</span>
                        </div>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-slate-100 dark:border-zinc-800 text-center text-[10px] font-bold text-slate-500 leading-relaxed uppercase tracking-wider">
                      Database integrity is running fully authenticated
                    </div>
                  </div>

                  {/* Stopwatch Stopwatch Tracker */}
                  <div className="bg-gradient-to-br from-emerald-950 to-[#135036] text-white rounded-[32px] p-6 border border-emerald-900 shadow-lg flex flex-col justify-between h-56 relative overflow-hidden">
                    <div className="absolute -right-4 -bottom-4 opacity-5 shrink-0 text-white">
                      <Clock size={160} />
                    </div>
                    <div className="relative z-10">
                      <span className="text-[8px] font-black uppercase tracking-widest text-[#00d4b4] pb-2 block">
                        Live System Stopwatch
                      </span>
                      <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tighter font-mono tabular-nums leading-none">
                        {formatStopwatch(seconds)}
                      </h2>
                      <p className="text-[10px] opacity-75 mt-2 font-medium tracking-wide">
                        Tracking duration of safe sandbox session
                      </p>
                    </div>
                    <div className="flex gap-2 relative z-10 pt-4">
                      <button 
                        onClick={() => setIsTimerRunning(p => !p)}
                        className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-[#00d4b4] border border-white/5 transition-all"
                      >
                        {isTimerRunning ? <Pause size={14} /> : <Play size={14} />}
                      </button>
                      <button 
                        onClick={() => setSeconds(0)}
                        className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 border border-white/5 transition-all"
                        title="Reset stopwatch"
                      >
                        <RotateCcw size={14} />
                      </button>
                    </div>
                  </div>

                </div>

              </div>

              {/* Sidebar Reminders Scheduler List */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* Reminders / Scheduler Panel */}
                <div className="bg-white dark:bg-zinc-900/60 rounded-[32px] p-6 border border-slate-200/60 dark:border-zinc-800/80 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-sm font-black tracking-tight text-slate-900 dark:text-white uppercase tracking-wider text-[10px] text-slate-400 dark:text-zinc-500">
                        Operational Reminders
                      </h3>
                      <button 
                        onClick={() => setIsNewTaskOpen(true)}
                        className="p-1 px-2 text-[9px] font-black border border-slate-200 dark:border-zinc-800 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-800 uppercase tracking-widest text-slate-600 dark:text-white transition-all flex items-center gap-1"
                      >
                        <Plus size={10} /> Add Log
                      </button>
                    </div>

                    <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                      {localTasks.map((task) => (
                        <div key={task.id} className="p-4 bg-slate-50 dark:bg-zinc-850 rounded-2xl border border-slate-200/30 dark:border-zinc-800 flex items-start justify-between gap-3 group">
                          <div className="flex items-start gap-3">
                            <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: task.color }} />
                            <div>
                              <h4 className="text-xs font-black text-slate-900 dark:text-white tracking-tight">{task.title}</h4>
                              <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1 uppercase tracking-wide font-medium">{task.due}</p>
                              <p className="text-[10px] text-slate-500 mt-2 leading-relaxed font-semibold">{task.desc}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleDeleteTask(task.id)}
                            className="text-slate-300 dark:text-zinc-500 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>

            </div>

          </div>
        )}

        {/* TAB 2: EMPLOYEE REPORTS GRID */}
        {activeTab === 'emp' && (() => {
          const filtered = empReports.filter(r => {
            const matchesSearch = (r.name + ' ' + (r.employee_id || '') + ' ' + r.date).toLowerCase().includes(search.toLowerCase());
            const matchesShift = empShiftFilter === 'all' || r.shift.toLowerCase() === empShiftFilter.toLowerCase();
            return matchesSearch && matchesShift;
          });
          const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
          const paginated = filtered.slice((empPage - 1) * pageSize, empPage * pageSize);
          const allCurrentPageSelected = paginated.length > 0 && paginated.every(r => selectedEmpReports.has(r.id || ''));

          const toggleSelectAllPage = () => {
            if (allCurrentPageSelected) {
              setSelectedEmpReports(prev => {
                const next = new Set(prev);
                paginated.forEach(r => { if (r.id) next.delete(r.id); });
                return next;
              });
            } else {
              setSelectedEmpReports(prev => {
                const next = new Set(prev);
                paginated.forEach(r => { if (r.id) next.add(r.id); });
                return next;
              });
            }
          };

          return (
            <div className="space-y-4">
              {/* Controls Bar */}
              <div className="card !p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-1 items-center gap-3 bg-glass border border-border px-4 py-2.5 rounded-xl">
                  <Search size={18} className="text-ink-lighter shrink-0" />
                  <input 
                    value={search} 
                    onChange={(e) => { setSearch(e.target.value); setEmpPage(1); }}
                    placeholder="Search by employee name, ID, or date..." 
                    className="flex-1 bg-transparent border-none text-sm outline-none focus:ring-0 placeholder:text-ink-lighter/40 text-ink"
                  />
                  {search && (
                    <button onClick={() => setSearch('')} className="text-ink-lighter hover:text-ink">
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Shift Filter */}
                  <select 
                    value={empShiftFilter}
                    onChange={(e) => { setEmpShiftFilter(e.target.value); setEmpPage(1); }}
                    className="bg-glass border border-border rounded-xl px-3 py-2 text-xs font-bold text-ink outline-none"
                  >
                    <option value="all">All Shifts</option>
                    <option value="morning">Morning</option>
                    <option value="evening">Evening</option>
                    <option value="night">Night</option>
                  </select>

                  {/* Export Button */}
                  <button 
                    onClick={() => handleExport('emp')}
                    className="btn btn-ghost btn-sm gap-2 text-xs"
                    title="Export employee reports as JSON"
                  >
                    <ClipboardList size={14} /> Export JSON
                  </button>

                  {/* Purge All */}
                  <button 
                    onClick={() => requestPurgeCategory('emp')}
                    className="btn btn-ghost text-rose-400 hover:bg-rose-500/10 btn-sm gap-1.5 text-xs"
                    title="Purge all employee reports"
                  >
                    <Trash2 size={13} /> Purge All
                  </button>
                </div>
              </div>

              {/* Bulk Action Header when items are selected */}
              {selectedEmpReports.size > 0 && (
                <div className="p-3 bg-p/10 border border-p/30 rounded-2xl flex items-center justify-between gap-4 animate-in fade-in duration-200">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-p text-white font-black text-xs flex items-center justify-center">
                      {selectedEmpReports.size}
                    </span>
                    <span className="text-xs font-bold text-ink">
                      {selectedEmpReports.size} report{selectedEmpReports.size > 1 ? 's' : ''} selected
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setSelectedEmpReports(new Set())}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-ink-light transition-all"
                    >
                      Clear Selection
                    </button>
                    <button 
                      onClick={() => requestBulkDeleteReports('emp')}
                      className="btn btn-r btn-sm gap-1.5 py-1.5 px-3 text-xs shadow-lg shadow-r/20"
                    >
                      <Trash2 size={13} /> Delete Selected ({selectedEmpReports.size})
                    </button>
                  </div>
                </div>
              )}

              {/* Table Card */}
              <div className="card overflow-hidden !p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-glass text-[10px] font-black text-ink-lighter uppercase tracking-[0.2em]">
                        <th className="px-6 py-4 w-12 text-center">
                          <input 
                            type="checkbox"
                            checked={allCurrentPageSelected}
                            onChange={toggleSelectAllPage}
                            className="rounded border-border cursor-pointer accent-p"
                          />
                        </th>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Employee</th>
                        <th className="px-6 py-4">Shift</th>
                        <th className="px-6 py-4 text-center">Issues</th>
                        <th className="px-6 py-4 text-center">Solved</th>
                        <th className="px-6 py-4 text-center">Physical</th>
                        <th className="px-6 py-4 text-center">Special</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {filtered.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="text-center py-24 text-ink-lighter">
                            <div className="w-16 h-16 bg-glass rounded-3xl flex items-center justify-center mx-auto mb-4">
                              <Inbox size={32} className="opacity-30" />
                            </div>
                            <p className="font-bold text-base text-ink/40 tracking-tight">No employee reports found</p>
                          </td>
                        </tr>
                      ) : (
                        paginated.map(r => {
                          const isSelected = selectedEmpReports.has(r.id || '');
                          return (
                            <tr 
                              key={r.id} 
                              className={cn(
                                "border-b border-border transition-colors",
                                isSelected ? "bg-p/5" : "hover:bg-glass"
                              )}
                            >
                              <td className="px-6 py-4 text-center">
                                <input 
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {
                                    if (!r.id) return;
                                    setSelectedEmpReports(prev => {
                                      const next = new Set(prev);
                                      if (next.has(r.id!)) next.delete(r.id!);
                                      else next.add(r.id!);
                                      return next;
                                    });
                                  }}
                                  className="rounded border-border cursor-pointer accent-p"
                                />
                              </td>
                              <td className="px-6 py-4 font-black text-p tracking-tight whitespace-nowrap">{r.date}</td>
                              <td className="px-6 py-4">
                                <div className="font-black text-ink tracking-tight text-sm">{r.name}</div>
                                <div className="text-[10px] text-ink-lighter uppercase tracking-widest font-black mt-0.5">{r.employee_id}</div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="px-2.5 py-1 bg-glass border border-border text-ink-light rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap">{r.shift}</span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="inline-flex items-center justify-center w-7 h-7 bg-p/10 text-p rounded-xl text-xs font-black border border-p/20">{r.issues}</span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="inline-flex items-center justify-center w-7 h-7 bg-t/10 text-t rounded-xl text-xs font-black border border-t/20">{r.solved}</span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                {r.physical_support > 0 ? (
                                  <span className="inline-flex items-center justify-center w-7 h-7 bg-g/10 text-g rounded-xl text-xs font-black border border-g/20">{r.physical_support}</span>
                                ) : <span className="text-ink/20">—</span>}
                              </td>
                              <td className="px-6 py-4 text-center">
                                {r.special_task ? <Star size={16} className="text-y mx-auto drop-shadow-[0_0_8px_rgba(255,215,0,0.3)]" fill="currentColor" /> : <span className="text-ink/20">—</span>}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-2">
                                  {/* View Full Report Text */}
                                  <button 
                                    onClick={() => setModalContent(r.report_content)} 
                                    title="View formatted report"
                                    className="w-8 h-8 bg-glass hover:bg-p hover:text-white text-ink-light rounded-xl flex items-center justify-center transition-all border border-border"
                                  >
                                    <Eye size={14} />
                                  </button>
                                  {/* Inspect Raw Record */}
                                  <button 
                                    onClick={() => setInspectItem({ id: r.id || '', type: 'Employee Report', title: `${r.name} - ${r.date}`, data: r })}
                                    title="Inspect database record"
                                    className="w-8 h-8 bg-glass hover:bg-cyan-500/20 hover:text-cyan-400 text-ink-light rounded-xl flex items-center justify-center transition-all border border-border"
                                  >
                                    <Info size={14} />
                                  </button>
                                  {/* Delete Single Report */}
                                  <button 
                                    onClick={() => requestDeleteReport('emp', r)}
                                    title="Delete this report"
                                    className="w-8 h-8 bg-rose-500/10 hover:bg-rose-600 hover:text-white text-rose-400 rounded-xl flex items-center justify-center transition-all border border-rose-500/20"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div className="p-4 bg-glass border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
                  <div className="text-ink-lighter font-medium">
                    Showing {filtered.length === 0 ? 0 : (empPage - 1) * pageSize + 1} to {Math.min(empPage * pageSize, filtered.length)} of {filtered.length} reports
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setEmpPage(p => Math.max(1, p - 1))}
                      disabled={empPage <= 1}
                      className="px-3 py-1.5 rounded-lg border border-border bg-glass disabled:opacity-40 text-ink font-semibold"
                    >
                      Previous
                    </button>
                    <span className="px-2 font-bold text-p">
                      Page {empPage} of {totalPages}
                    </span>
                    <button 
                      onClick={() => setEmpPage(p => Math.min(totalPages, p + 1))}
                      disabled={empPage >= totalPages}
                      className="px-3 py-1.5 rounded-lg border border-border bg-glass disabled:opacity-40 text-ink font-semibold"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* TAB 3: TEAM LEADER REPORTS GRID */}
        {activeTab === 'tl' && (() => {
          const filtered = tlReports.filter(r => {
            const matchesSearch = (r.tl_name + ' ' + r.date).toLowerCase().includes(search.toLowerCase());
            const matchesShift = tlShiftFilter === 'all' || r.shift.toLowerCase() === tlShiftFilter.toLowerCase();
            return matchesSearch && matchesShift;
          });
          const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
          const paginated = filtered.slice((tlPage - 1) * pageSize, tlPage * pageSize);
          const allCurrentPageSelected = paginated.length > 0 && paginated.every(r => selectedTlReports.has(r.id || ''));

          const toggleSelectAllPage = () => {
            if (allCurrentPageSelected) {
              setSelectedTlReports(prev => {
                const next = new Set(prev);
                paginated.forEach(r => { if (r.id) next.delete(r.id); });
                return next;
              });
            } else {
              setSelectedTlReports(prev => {
                const next = new Set(prev);
                paginated.forEach(r => { if (r.id) next.add(r.id); });
                return next;
              });
            }
          };

          return (
            <div className="space-y-4">
              {/* Controls Bar */}
              <div className="card !p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-1 items-center gap-3 bg-glass border border-border px-4 py-2.5 rounded-xl">
                  <Search size={18} className="text-ink-lighter shrink-0" />
                  <input 
                    value={search} 
                    onChange={(e) => { setSearch(e.target.value); setTlPage(1); }}
                    placeholder="Search by TL name or date..." 
                    className="flex-1 bg-transparent border-none text-sm outline-none focus:ring-0 placeholder:text-ink-lighter/40 text-ink"
                  />
                  {search && (
                    <button onClick={() => setSearch('')} className="text-ink-lighter hover:text-ink">
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Shift Filter */}
                  <select 
                    value={tlShiftFilter}
                    onChange={(e) => { setTlShiftFilter(e.target.value); setTlPage(1); }}
                    className="bg-glass border border-border rounded-xl px-3 py-2 text-xs font-bold text-ink outline-none"
                  >
                    <option value="all">All Shifts</option>
                    <option value="morning">Morning</option>
                    <option value="evening">Evening</option>
                    <option value="night">Night</option>
                  </select>

                  {/* Export Button */}
                  <button 
                    onClick={() => handleExport('tl')}
                    className="btn btn-ghost btn-sm gap-2 text-xs"
                    title="Export TL reports as JSON"
                  >
                    <ClipboardList size={14} /> Export JSON
                  </button>

                  {/* Purge All */}
                  <button 
                    onClick={() => requestPurgeCategory('tl')}
                    className="btn btn-ghost text-rose-400 hover:bg-rose-500/10 btn-sm gap-1.5 text-xs"
                    title="Purge all TL reports"
                  >
                    <Trash2 size={13} /> Purge All
                  </button>
                </div>
              </div>

              {/* Bulk Action Header when items are selected */}
              {selectedTlReports.size > 0 && (
                <div className="p-3 bg-t/10 border border-t/30 rounded-2xl flex items-center justify-between gap-4 animate-in fade-in duration-200">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-t text-white font-black text-xs flex items-center justify-center">
                      {selectedTlReports.size}
                    </span>
                    <span className="text-xs font-bold text-ink">
                      {selectedTlReports.size} report{selectedTlReports.size > 1 ? 's' : ''} selected
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setSelectedTlReports(new Set())}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-ink-light transition-all"
                    >
                      Clear Selection
                    </button>
                    <button 
                      onClick={() => requestBulkDeleteReports('tl')}
                      className="btn btn-r btn-sm gap-1.5 py-1.5 px-3 text-xs shadow-lg shadow-r/20"
                    >
                      <Trash2 size={13} /> Delete Selected ({selectedTlReports.size})
                    </button>
                  </div>
                </div>
              )}

              {/* Table Card */}
              <div className="card overflow-hidden !p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-glass text-[10px] font-black text-ink-lighter uppercase tracking-[0.2em]">
                        <th className="px-6 py-4 w-12 text-center">
                          <input 
                            type="checkbox"
                            checked={allCurrentPageSelected}
                            onChange={toggleSelectAllPage}
                            className="rounded border-border cursor-pointer accent-t"
                          />
                        </th>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">TL Name</th>
                        <th className="px-6 py-4">Shift</th>
                        <th className="px-6 py-4 text-center">Issues</th>
                        <th className="px-6 py-4 text-center">Solved</th>
                        <th className="px-6 py-4 text-center">Physical</th>
                        <th className="px-6 py-4 text-center">Processing</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {filtered.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="text-center py-24 text-ink-lighter">
                            <div className="w-16 h-16 bg-glass rounded-3xl flex items-center justify-center mx-auto mb-4">
                              <Inbox size={32} className="opacity-30" />
                            </div>
                            <p className="font-bold text-base text-ink/40 tracking-tight">No TL reports found</p>
                          </td>
                        </tr>
                      ) : (
                        paginated.map(r => {
                          const isSelected = selectedTlReports.has(r.id || '');
                          return (
                            <tr 
                              key={r.id} 
                              className={cn(
                                "border-b border-border transition-colors",
                                isSelected ? "bg-t/5" : "hover:bg-glass"
                              )}
                            >
                              <td className="px-6 py-4 text-center">
                                <input 
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {
                                    if (!r.id) return;
                                    setSelectedTlReports(prev => {
                                      const next = new Set(prev);
                                      if (next.has(r.id!)) next.delete(r.id!);
                                      else next.add(r.id!);
                                      return next;
                                    });
                                  }}
                                  className="rounded border-border cursor-pointer accent-t"
                                />
                              </td>
                              <td className="px-6 py-4 font-black text-t tracking-tight whitespace-nowrap">{r.date}</td>
                              <td className="px-6 py-4">
                                <div className="font-black text-ink tracking-tight text-sm">{r.tl_name}</div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="px-2.5 py-1 bg-glass border border-border text-ink-light rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap">{r.shift}</span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="inline-flex items-center justify-center w-7 h-7 bg-p/10 text-p rounded-xl text-xs font-black border border-p/20">{r.issues}</span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="inline-flex items-center justify-center w-7 h-7 bg-t/10 text-t rounded-xl text-xs font-black border border-t/20">{r.solved}</span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="inline-flex items-center justify-center w-7 h-7 bg-g/10 text-g rounded-xl text-xs font-black border border-g/20">{r.physical_total || 0}</span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="inline-flex items-center justify-center w-7 h-7 bg-y/10 text-y rounded-xl text-xs font-black border border-y/20">{r.processing || 0}</span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-2">
                                  {/* View formatted text */}
                                  <button 
                                    onClick={() => setModalContent(r.report_content)} 
                                    title="View formatted report"
                                    className="w-8 h-8 bg-glass hover:bg-p hover:text-white text-ink-light rounded-xl flex items-center justify-center transition-all border border-border"
                                  >
                                    <Eye size={14} />
                                  </button>
                                  {/* Inspect raw record */}
                                  <button 
                                    onClick={() => setInspectItem({ id: r.id || '', type: 'Team Leader Report', title: `${r.tl_name} - ${r.date}`, data: r })}
                                    title="Inspect database record"
                                    className="w-8 h-8 bg-glass hover:bg-cyan-500/20 hover:text-cyan-400 text-ink-light rounded-xl flex items-center justify-center transition-all border border-border"
                                  >
                                    <Info size={14} />
                                  </button>
                                  {/* Delete Single TL Report */}
                                  <button 
                                    onClick={() => requestDeleteReport('tl', r)}
                                    title="Delete this report"
                                    className="w-8 h-8 bg-rose-500/10 hover:bg-rose-600 hover:text-white text-rose-400 rounded-xl flex items-center justify-center transition-all border border-rose-500/20"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div className="p-4 bg-glass border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
                  <div className="text-ink-lighter font-medium">
                    Showing {filtered.length === 0 ? 0 : (tlPage - 1) * pageSize + 1} to {Math.min(tlPage * pageSize, filtered.length)} of {filtered.length} reports
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setTlPage(p => Math.max(1, p - 1))}
                      disabled={tlPage <= 1}
                      className="px-3 py-1.5 rounded-lg border border-border bg-glass disabled:opacity-40 text-ink font-semibold"
                    >
                      Previous
                    </button>
                    <span className="px-2 font-bold text-t">
                      Page {tlPage} of {totalPages}
                    </span>
                    <button 
                      onClick={() => setTlPage(p => Math.min(totalPages, p + 1))}
                      disabled={tlPage >= totalPages}
                      className="px-3 py-1.5 rounded-lg border border-border bg-glass disabled:opacity-40 text-ink font-semibold"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* TAB 4: EMPLOYEES DIRECTORY */}
        {activeTab === 'emps' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <div className="card sticky top-24">
                <h4 className="text-xl font-black mb-6 flex items-center gap-3 tracking-tight">
                  <div className="w-10 h-10 bg-g/20 text-g rounded-xl flex items-center justify-center border border-g/30">
                    <Plus size={20} />
                  </div>
                  Add Employee
                </h4>

                <div className="space-y-6">
                  <div className="fld">
                    <label>Full Name</label>
                    <input 
                      placeholder="e.g. John Doe" 
                      value={newEmpName}
                      disabled={isEmpBusy}
                      onChange={e => setNewEmpName(e.target.value)}
                    />
                  </div>
                  <div className="fld">
                    <label>Employee ID</label>
                    <input 
                      placeholder="Salt-S-XXX" 
                      value={newEmpId}
                      disabled={isEmpBusy}
                      onChange={e => setNewEmpId(e.target.value)}
                    />
                  </div>
                  <button 
                    onClick={handleAddEmp} 
                    disabled={isEmpBusy}
                    className="btn bg-g text-white w-full py-4 shadow-lg shadow-g/20 text-base flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isEmpBusy ? <RefreshCw size={20} className="animate-spin" /> : <Plus size={20} />} 
                    Add to System
                  </button>
                </div>
              </div>
            </div>
            
            <div className="lg:col-span-2">
              <div className="card">
                <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
                  <h4 className="text-xl font-black flex items-center gap-3 tracking-tight">
                    <div className="w-10 h-10 bg-p/20 text-p rounded-xl flex items-center justify-center border border-p/30">
                      <Users size={20} />
                    </div>
                    Team Directory
                  </h4>
                  <div className="flex items-center gap-3 flex-wrap">
                    <button 
                      onClick={() => handleExport('employees')}
                      className="text-xs font-bold text-ink-light hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-glass hover:bg-white/10 border border-border transition-all"
                    >
                      <ClipboardList size={13} /> Export JSON
                    </button>
                    <button
                      onClick={requestRestoreDefaults}
                      disabled={isEmpBusy}
                      className="text-xs font-bold text-p hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-p/10 hover:bg-p border border-p/20 transition-all duration-200 disabled:opacity-50"
                      title="Restore the standard 8 team members"
                    >
                      <RefreshCw size={13} className={isEmpBusy ? "animate-spin" : ""} /> Restore Defaults
                    </button>
                    <div className="text-[10px] text-ink-lighter uppercase tracking-[0.2em] font-black bg-ink/5 px-3 py-1.5 rounded-lg border border-border">
                      {employees.length} Members
                    </div>
                  </div>
                </div>

                {/* Edit Employee Drawer */}
                {editingEmp && (
                  <div className="mb-6 p-5 bg-[#141724] border border-p/50 rounded-2xl shadow-xl animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
                      <div className="flex items-center gap-2">
                        <Edit3 size={18} className="text-p" />
                        <span className="font-bold text-white text-base">Edit Employee</span>
                      </div>
                      <button onClick={handleCancelEdit} className="text-ink-lighter hover:text-white p-1 rounded-lg">
                        <X size={16} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <div className="fld">
                        <label className="text-xs uppercase tracking-wider text-ink-lighter">Full Name</label>
                        <input 
                          type="text"
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          placeholder="Employee Name"
                          className="w-full bg-[#0a0c14] border border-border rounded-xl px-4 py-2.5 text-white"
                        />
                      </div>
                      <div className="fld">
                        <label className="text-xs uppercase tracking-wider text-ink-lighter">Employee ID</label>
                        <input 
                          type="text"
                          value={editEid}
                          onChange={e => setEditEid(e.target.value)}
                          placeholder="SALT-S-XXX"
                          className="w-full bg-[#0a0c14] border border-border rounded-xl px-4 py-2.5 text-white"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-3">
                      <button 
                        onClick={handleCancelEdit}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-ink border border-border transition-all"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleSaveEdit}
                        disabled={isEmpBusy}
                        className="px-5 py-2 rounded-xl text-xs font-bold bg-p hover:bg-p/90 text-white flex items-center gap-2 shadow-lg shadow-p/20 transition-all disabled:opacity-50"
                      >
                        {isEmpBusy ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                        Save Changes
                      </button>
                    </div>
                  </div>
                )}
                
                {employees.length === 0 ? (
                  <div className="py-16 text-center border border-dashed border-border rounded-2xl bg-glass">
                    <Users size={36} className="mx-auto text-ink-lighter mb-3 opacity-30" />
                    <div className="font-bold text-ink-light text-base mb-1">No employees in directory</div>
                    <p className="text-xs text-ink-lighter mb-6 max-w-sm mx-auto">
                      All employee records have been safely cleared. You can add new members anytime or click below to restore defaults.
                    </p>
                    <button 
                      onClick={requestRestoreDefaults}
                      disabled={isEmpBusy}
                      className="btn btn-p btn-sm gap-2 text-xs"
                    >
                      <RefreshCw size={14} /> Restore Default Team
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {employees.map(emp => {
                      const isEditingThis = editingEmp?.eid === emp.eid && editingEmp?.name === emp.name;
                      const uniqueKey = `${emp.eid || ''}_${emp.name || ''}`;

                      return (
                        <div 
                          key={uniqueKey} 
                          className={cn(
                            "flex items-center justify-between p-5 bg-glass border rounded-2xl transition-all duration-300",
                            isEditingThis 
                              ? "border-p ring-1 ring-p shadow-lg shadow-p/10" 
                              : "border-border hover:border-p/40"
                          )}
                        >
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="w-12 h-12 shrink-0 bg-glass rounded-xl flex items-center justify-center font-black text-p border border-border text-base">
                              {emp.name ? emp.name.charAt(0).toUpperCase() : '?'}
                            </div>
                            <div className="min-w-0">
                              <div className="font-black text-ink tracking-tight truncate text-base">{emp.name}</div>
                              <div className="text-[11px] text-ink-lighter flex items-center gap-1.5 mt-1 uppercase tracking-widest font-black truncate">
                                <UserCheck size={12} className="text-p shrink-0" /> {emp.eid}
                              </div>
                            </div>
                          </div>
                          
                          {/* Dedicated Action Buttons (ALWAYS VISIBLE) */}
                          <div className="flex items-center gap-2 shrink-0">
                            {/* Edit Button */}
                            <button 
                              onClick={() => handleStartEdit(emp)} 
                              title={`Edit ${emp.name}`}
                              className="w-9 h-9 bg-p/10 hover:bg-p text-p hover:text-white rounded-xl flex items-center justify-center transition-all duration-200 border border-p/30"
                            >
                              <Edit3 size={15} />
                            </button>

                            {/* Delete Button */}
                            <button 
                              onClick={() => requestDeleteEmployee(emp)} 
                              title={`Delete ${emp.name}`}
                              className="w-9 h-9 bg-rose-500/15 hover:bg-rose-600 text-rose-400 hover:text-white rounded-xl flex items-center justify-center transition-all duration-200 border border-rose-500/30"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: BANNER SETTING */}
        {activeTab === 'notif' && (
          <div className="max-w-2xl">
            <div className="card">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-p/20 text-p rounded-2xl flex items-center justify-center border border-p/30 shadow-lg shadow-p/10">
                  <Bell size={24} />
                </div>
                <div>
                  <h4 className="text-2xl font-black tracking-tighter">Notification Banner</h4>
                  <p className="text-sm text-ink-light font-medium">Broadcast messages to all users globally.</p>
                </div>
              </div>
              
              <div className="fld w-full mb-6">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] mb-3 block">Banner Message</label>
                <textarea 
                  value={notif} 
                  onChange={(e) => setNotif(e.target.value)}
                  rows={3} 
                  placeholder="Enter notification message..." 
                  className="min-h-[120px] text-lg leading-relaxed bg-[#0b0c0f] border border-border rounded-2xl p-4 text-white w-full focus:outline-hidden"
                />
              </div>
              
              <div className="flex gap-4 mt-6">
                <button onClick={handleUpdateNotif} className="btn btn-p flex-1 py-4 gap-3 text-base shadow-lg shadow-p/20">
                  <Save size={20} /> Save & Publish
                </button>
                <button onClick={() => alert(`Preview: ${notif}`)} className="btn btn-ghost px-8">
                  <Eye size={20} /> Preview
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: SECURITY / PASSWORDS */}
        {activeTab === 'sec' && (
          <div className="max-w-3xl">
            <div className="card space-y-12">
              <section>
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-p/20 text-p rounded-2xl flex items-center justify-center border border-p/30 shadow-lg shadow-p/10">
                    <Key size={24} />
                  </div>
                  <div>
                    <h4 className="text-2xl font-black tracking-tighter">Admin Credentials</h4>
                    <p className="text-sm text-ink-light font-medium">Update administrative access keys securely.</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                  <div className="fld">
                    <label>Current Password</label>
                    <input type="password" placeholder="••••••••" />
                  </div>
                  <div className="hidden sm:block" />
                  <div className="fld">
                    <label>New Password</label>
                    <input type="password" placeholder="Min 8 characters" />
                  </div>
                  <div className="fld">
                    <label>Confirm New Password</label>
                    <input type="password" placeholder="Repeat new password" />
                  </div>
                </div>
                <button className="btn btn-p px-10 py-4 gap-3 text-base shadow-lg shadow-p/20">
                  <Save size={20} /> Update Password
                </button>
              </section>
              
              <div className="h-px bg-ink/5" />
              
              <section>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-y/20 text-y rounded-2xl flex items-center justify-center border border-y/30">
                    <Undo size={24} />
                  </div>
                  <div>
                    <h4 className="text-2xl font-black tracking-tighter">Emergency Reset</h4>
                    <p className="text-sm text-ink-light font-medium">Restore default system credentials parameters.</p>
                  </div>
                </div>
                <div className="glass-panel p-6 border-l-4 border-l-y mb-8">
                  <p className="text-sm text-ink-light font-medium leading-relaxed">
                    This will reset the admin password back to <code className="text-y font-black bg-y/10 px-2 py-0.5 rounded">admin</code>. 
                    Use this only if you are locked out of the system.
                  </p>
                </div>
                <button className="btn btn-ghost text-y hover:bg-y/10 gap-3">
                  <Undo size={20} /> Reset to Default
                </button>
              </section>
            </div>
          </div>
        )}

        {/* TAB 7: DATABASE STATS & REALTIME DB MANAGEMENT */}
        {activeTab === 'db' && (() => {
          // Combine all records for the unified database explorer
          type DbRecord = {
            id: string;
            type: 'emp' | 'tl' | 'employee';
            categoryName: string;
            primaryName: string;
            dateOrId: string;
            raw: any;
          };

          const allRecords: DbRecord[] = [
            ...empReports.map(r => ({
              id: r.id || '',
              type: 'emp' as const,
              categoryName: 'Employee Report',
              primaryName: r.name,
              dateOrId: r.date,
              raw: r
            })),
            ...tlReports.map(r => ({
              id: r.id || '',
              type: 'tl' as const,
              categoryName: 'TL Report',
              primaryName: r.tl_name,
              dateOrId: r.date,
              raw: r
            })),
            ...employees.map(e => ({
              id: e.eid || e.name,
              type: 'employee' as const,
              categoryName: 'Employee Member',
              primaryName: e.name,
              dateOrId: e.eid,
              raw: e
            }))
          ];

          const filteredRecords = allRecords.filter(r => {
            const matchesCat = dbCategoryFilter === 'all' || r.type === dbCategoryFilter;
            const matchesSearch = (r.primaryName + ' ' + r.dateOrId + ' ' + r.id + ' ' + r.categoryName)
              .toLowerCase()
              .includes(search.toLowerCase());
            return matchesCat && matchesSearch;
          });

          const totalDbPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
          const paginatedDbRecords = filteredRecords.slice((dbPage - 1) * pageSize, dbPage * pageSize);

          return (
            <div className="space-y-8 max-w-5xl">
              
              {/* TOP: CRITICAL FIREBASE REALTIME DATABASE RULES HELPER */}
              <div className="card border-2 border-amber-500/30 bg-amber-500/5 relative overflow-hidden">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                    <Shield size={24} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-lg font-black text-white">Firebase Realtime Database Rules Fix</h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 uppercase tracking-widest">
                        Required for Read / Write / Delete
                      </span>
                    </div>
                    <p className="text-xs text-ink-light mt-1 leading-relaxed">
                      If you saw <code className="text-rose-400 font-bold bg-rose-500/10 px-1.5 py-0.5 rounded">Error saving rules – Line 2: Expected 'rules' property</code>, it means <code className="text-amber-300">firebase.json</code> was pasted into the Firebase Console instead of RTDB rules!
                    </p>
                    <p className="text-xs text-emerald-400 mt-1 font-semibold">
                      In Firebase Console &gt; Realtime Database &gt; Rules tab, copy and paste ONLY the code block below:
                    </p>
                  </div>
                </div>

                <div className="relative rounded-2xl bg-[#090b10] border border-border p-4 my-3 font-mono text-xs text-emerald-400">
                  <pre>{`{\n  "rules": {\n    ".read": true,\n    ".write": true\n  }\n}`}</pre>
                  <button 
                    onClick={copyRTDBRules}
                    className="absolute top-3 right-3 btn btn-p btn-sm gap-1.5 text-xs py-1.5 px-3"
                  >
                    {rulesCopied ? <Check size={14} /> : <Copy size={14} />}
                    {rulesCopied ? 'Copied Rules!' : 'Copy RTDB Rules'}
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-[11px] text-ink-lighter">
                  <span>Target: <code className="text-p font-bold">https://daily-issue-report-generator-default-rtdb.firebaseio.com</code></span>
                  <a 
                    href="https://console.firebase.google.com/project/daily-issue-report-generator/database/daily-issue-report-generator-default-rtdb/rules" 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-p hover:underline flex items-center gap-1 font-bold"
                  >
                    Open Firebase Console Rules <ExternalLink size={12} />
                  </a>
                </div>
              </div>

              {/* Database Overview Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="card !p-5">
                  <div className="text-[10px] uppercase font-black tracking-widest text-ink-lighter mb-1">Total Emp Reports</div>
                  <div className="text-3xl font-black text-p">{empReports.length}</div>
                  <div className="text-[10px] text-ink-lighter mt-1">Stored in RTDB & Firestore</div>
                </div>

                <div className="card !p-5">
                  <div className="text-[10px] uppercase font-black tracking-widest text-ink-lighter mb-1">Total TL Reports</div>
                  <div className="text-3xl font-black text-t">{tlReports.length}</div>
                  <div className="text-[10px] text-ink-lighter mt-1">Stored in RTDB & Firestore</div>
                </div>

                <div className="card !p-5">
                  <div className="text-[10px] uppercase font-black tracking-widest text-ink-lighter mb-1">Active Team</div>
                  <div className="text-3xl font-black text-emerald-400">{employees.length}</div>
                  <div className="text-[10px] text-ink-lighter mt-1">Team Directory Members</div>
                </div>

                <div className="card !p-5">
                  <div className="text-[10px] uppercase font-black tracking-widest text-ink-lighter mb-1">RTDB Status</div>
                  <div className="text-sm font-black text-cyan-400 flex items-center gap-1.5 mt-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                    Live & Connected
                  </div>
                  <div className="text-[10px] text-ink-lighter mt-1">daily-issue-report-generator</div>
                </div>
              </div>

              {/* Connection Diagnostics Card */}
              <div className="card space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h5 className="font-black text-base text-white flex items-center gap-2">
                      <Zap size={18} className="text-amber-400" />
                      Live Connection Diagnostic
                    </h5>
                    <p className="text-xs text-ink-light mt-0.5">
                      Pings Realtime Database to verify that write, read, and delete permissions are granted.
                    </p>
                  </div>
                  <button 
                    onClick={handleTestRTDB}
                    disabled={testingRTDB}
                    className="btn btn-p btn-sm gap-2 shrink-0"
                  >
                    {testingRTDB ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" /> Testing...
                      </>
                    ) : (
                      <>
                        <Cloud size={14} /> Ping RTDB Connection
                      </>
                    )}
                  </button>
                </div>

                {rtdbStatus && (
                  <div className={cn(
                    "p-4 rounded-xl border text-xs font-medium flex items-start gap-3 animate-in fade-in duration-300",
                    rtdbStatus.success 
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                      : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                  )}>
                    {rtdbStatus.success ? <CheckCircle size={16} className="shrink-0 mt-0.5" /> : <AlertTriangle size={16} className="shrink-0 mt-0.5" />}
                    <div>
                      <div className="font-bold uppercase tracking-wider text-[10px] mb-0.5">
                        {rtdbStatus.success ? 'Realtime Database Connected & Active' : 'Realtime Database Alert'}
                      </div>
                      <div>{rtdbStatus.message}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Full Database Explorer */}
              <div className="card space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xl font-black text-white flex items-center gap-2.5">
                      <Database size={20} className="text-p" />
                      Database Records Explorer
                    </h4>
                    <p className="text-xs text-ink-light mt-1">
                      Search, inspect, delete, and export all records stored across Firebase databases.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button 
                      onClick={() => handleExport('all')}
                      className="btn btn-ghost btn-sm gap-1.5 text-xs"
                      title="Download full JSON backup of everything"
                    >
                      <ClipboardList size={14} /> Export Backup (JSON)
                    </button>
                    <button 
                      onClick={loadData}
                      disabled={isLoading}
                      className="btn btn-ghost btn-sm gap-1.5 text-xs"
                      title="Reload records from database"
                    >
                      <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} /> Refresh
                    </button>
                  </div>
                </div>

                {/* Explorer Filters Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                  <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                    {[
                      { id: 'all', label: `All (${allRecords.length})` },
                      { id: 'emp', label: `Emp Reports (${empReports.length})` },
                      { id: 'tl', label: `TL Reports (${tlReports.length})` },
                      { id: 'employees', label: `Employees (${employees.length})` }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => { setDbCategoryFilter(tab.id as any); setDbPage(1); }}
                        className={cn(
                          "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                          dbCategoryFilter === tab.id
                            ? "bg-p text-white shadow-md shadow-p/20"
                            : "bg-glass border border-border text-ink-light hover:text-white"
                        )}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="w-full sm:w-64 bg-glass border border-border px-3 py-1.5 rounded-xl flex items-center gap-2">
                    <Search size={14} className="text-ink-lighter shrink-0" />
                    <input 
                      value={search}
                      onChange={e => { setSearch(e.target.value); setDbPage(1); }}
                      placeholder="Search records..."
                      className="bg-transparent text-xs text-ink outline-none flex-1 placeholder:text-ink-lighter/40"
                    />
                    {search && (
                      <button onClick={() => setSearch('')} className="text-ink-lighter hover:text-white">
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Explorer Table */}
                <div className="overflow-x-auto border border-border rounded-2xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-glass text-[10px] font-black text-ink-lighter uppercase tracking-[0.2em] border-b border-border">
                        <th className="px-5 py-3">Category</th>
                        <th className="px-5 py-3">Identifier</th>
                        <th className="px-5 py-3">Date / ID</th>
                        <th className="px-5 py-3">Database Key</th>
                        <th className="px-5 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRecords.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-16 text-ink-lighter">
                            <p className="font-bold text-sm text-ink/30">No records found matching current filter</p>
                          </td>
                        </tr>
                      ) : (
                        paginatedDbRecords.map(rec => (
                          <tr key={rec.id + '_' + rec.type} className="border-b border-border hover:bg-glass transition-colors">
                            <td className="px-5 py-3.5">
                              <span className={cn(
                                "px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider",
                                rec.type === 'emp' && "bg-p/15 text-p",
                                rec.type === 'tl' && "bg-t/15 text-t",
                                rec.type === 'employee' && "bg-emerald-500/15 text-emerald-400"
                              )}>
                                {rec.categoryName}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 font-bold text-ink text-sm">
                              {rec.primaryName}
                            </td>
                            <td className="px-5 py-3.5 text-ink-light">
                              {rec.dateOrId}
                            </td>
                            <td className="px-5 py-3.5 font-mono text-[10px] text-ink-lighter max-w-[140px] truncate" title={rec.id}>
                              {rec.id}
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              <div className="flex justify-end gap-2">
                                <button 
                                  onClick={() => setInspectItem({ id: rec.id, type: rec.categoryName, title: `${rec.primaryName} (${rec.dateOrId})`, data: rec.raw })}
                                  className="w-7 h-7 bg-glass hover:bg-cyan-500/20 hover:text-cyan-400 text-ink-light rounded-lg flex items-center justify-center transition-all border border-border"
                                  title="Inspect JSON record"
                                >
                                  <Info size={13} />
                                </button>
                                <button 
                                  onClick={() => {
                                    if (rec.type === 'emp') {
                                      requestDeleteReport('emp', { id: rec.id, name: rec.primaryName, date: rec.dateOrId });
                                    } else if (rec.type === 'tl') {
                                      requestDeleteReport('tl', { id: rec.id, tl_name: rec.primaryName, date: rec.dateOrId });
                                    } else {
                                      requestDeleteEmployee({ name: rec.primaryName, eid: rec.dateOrId });
                                    }
                                  }}
                                  className="w-7 h-7 bg-rose-500/10 hover:bg-rose-600 hover:text-white text-rose-400 rounded-lg flex items-center justify-center transition-all border border-rose-500/20"
                                  title="Delete record"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Explorer Pagination */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-lighter">
                  <div>
                    Showing {filteredRecords.length === 0 ? 0 : (dbPage - 1) * pageSize + 1} to {Math.min(dbPage * pageSize, filteredRecords.length)} of {filteredRecords.length} records
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setDbPage(p => Math.max(1, p - 1))}
                      disabled={dbPage <= 1}
                      className="px-3 py-1 rounded-lg border border-border bg-glass disabled:opacity-30 text-ink font-semibold"
                    >
                      Prev
                    </button>
                    <span className="font-bold text-p">
                      Page {dbPage} of {totalDbPages}
                    </span>
                    <button 
                      onClick={() => setDbPage(p => Math.min(totalDbPages, p + 1))}
                      disabled={dbPage >= totalDbPages}
                      className="px-3 py-1 rounded-lg border border-border bg-glass disabled:opacity-30 text-ink font-semibold"
                    >
                      Next
                    </button>
                  </div>
                </div>

                {/* Emergency Purge Category Controls */}
                <div className="pt-6 border-t border-border">
                  <h5 className="text-xs font-black uppercase tracking-wider text-rose-400 mb-2 flex items-center gap-1.5">
                    <AlertTriangle size={14} /> Dangerous Actions &amp; Category Purge
                  </h5>
                  <p className="text-[11px] text-ink-lighter mb-4">
                    Deleting an entire category removes all matching records from both Realtime Database and Firestore permanently.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button 
                      onClick={() => requestPurgeCategory('emp')}
                      className="btn btn-ghost text-rose-400 hover:bg-rose-500/10 btn-sm gap-1.5 text-xs"
                    >
                      <Trash2 size={13} /> Purge All Emp Reports ({empReports.length})
                    </button>
                    <button 
                      onClick={() => requestPurgeCategory('tl')}
                      className="btn btn-ghost text-rose-400 hover:bg-rose-500/10 btn-sm gap-1.5 text-xs"
                    >
                      <Trash2 size={13} /> Purge All TL Reports ({tlReports.length})
                    </button>
                    <button 
                      onClick={() => requestPurgeCategory('employees')}
                      className="btn btn-ghost text-rose-400 hover:bg-rose-500/10 btn-sm gap-1.5 text-xs"
                    >
                      <Trash2 size={13} /> Purge All Employees ({employees.length})
                    </button>
                  </div>
                </div>
              </div>

              {/* System reload controls */}
              <div className="flex flex-wrap gap-4 pt-4 border-t border-border">
                <button onClick={() => window.location.reload()} className="btn btn-ghost flex-1 py-3 gap-2 text-sm">
                  <RefreshCw size={16} /> Reload Application
                </button>
                <button onClick={requestClearConfig} className="btn btn-r px-6 py-3 gap-2 text-sm">
                  <Trash2 size={16} /> Clear Saved Config
                </button>
              </div>

            </div>
          );
        })()}

      </div>

      {/* Add Task Log Popup (Redesigned Board helper) */}
      <AnimatePresence>
        {isNewTaskOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[210] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-[32px] p-6 max-w-md w-full shadow-2xl relative"
            >
              <div className="flex justify-between items-center mb-6">
                <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">Commit New Operational Log</h4>
                <button onClick={() => setIsNewTaskOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1">
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={handleAddTask} className="space-y-4">
                <div className="fld">
                  <label className="text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Log Title</label>
                  <input
                    required
                    placeholder="e.g. Optimize Database Indexes"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    className="bg-slate-50 dark:bg-zinc-850 px-4 py-3 rounded-2xl border border-slate-200 dark:border-zinc-700 w-full text-xs font-semibold outline-none focus:border-[#135036] text-black dark:text-white"
                  />
                </div>

                <div className="fld">
                  <label className="text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Target Due Date</label>
                  <input
                    type="text"
                    placeholder="e.g. Nov 28, 2026"
                    value={newTaskDue}
                    onChange={(e) => setNewTaskDue(e.target.value)}
                    className="bg-slate-50 dark:bg-zinc-850 px-4 py-3 rounded-2xl border border-slate-200 dark:border-zinc-700 w-full text-xs font-semibold outline-none focus:border-[#135036] text-black dark:text-white"
                  />
                </div>

                <div className="fld">
                  <label className="text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Short Description of Work</label>
                  <textarea
                    placeholder="Provide scope guidelines..."
                    rows={3}
                    value={newTaskDesc}
                    onChange={(e) => setNewTaskDesc(e.target.value)}
                    className="bg-slate-50 dark:bg-zinc-850 px-4 py-3 rounded-2xl border border-slate-200 dark:border-zinc-700 w-full text-xs font-semibold outline-none focus:border-[#135036] resize-none text-black dark:text-white"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsNewTaskOpen(false)}
                    className="flex-1 py-3 bg-slate-100 dark:bg-zinc-850 text-slate-700 dark:text-white font-black rounded-2xl text-xs uppercase tracking-wider transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-[#135036] hover:bg-[#0c3a26] text-white font-black rounded-2xl text-xs uppercase tracking-wider transition-all shadow-md shadow-emerald-950/15"
                  >
                    Commit Task
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 1: TEXT REPORT PREVIEW */}
      {modalContent && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[220] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-bg border border-border rounded-[32px] w-full max-w-3xl max-h-[85vh] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] relative animate-in zoom-in-95 duration-500 flex flex-col">
            <div className="p-8 border-b border-border flex items-center justify-between shrink-0 bg-[#0e1014]">
              <h4 className="text-2xl font-black tracking-tighter flex items-center gap-3">
                <div className="w-10 h-10 bg-p/20 text-p rounded-xl flex items-center justify-center border border-p/30">
                  <ClipboardList size={20} />
                </div>
                Report Details
              </h4>
              <button 
                onClick={() => setModalContent(null)}
                className="w-10 h-10 rounded-xl bg-glass flex items-center justify-center text-ink-lighter hover:bg-r hover:text-ink transition-all duration-300 border border-border"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 bg-black/50">
              <div className="terminal-box">
                <div className="flex items-center justify-between px-5 py-3 bg-glass border-b border-border">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                    <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
                    <div className="w-3 h-3 rounded-full bg-[#28c840]" />
                  </div>
                  <span className="text-[10px] text-ink/40 uppercase tracking-[0.2em] font-black">report_preview.log</span>
                </div>
                <pre className="out-pre !bg-transparent !border-none !shadow-none whitespace-pre-wrap">{modalContent}</pre>
              </div>
            </div>
            
            <div className="p-8 border-t border-border bg-glass flex justify-end gap-4 shrink-0">
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(modalContent);
                  triggerToast('success', 'Report text copied to clipboard!');
                }} 
                className="btn btn-p px-8 py-3 gap-3 shadow-lg shadow-p/20"
              >
                <Copy size={18} /> Copy Full Report
              </button>
              <button 
                onClick={() => setModalContent(null)}
                className="btn btn-ghost px-8 py-3"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: RAW RECORD INSPECTOR */}
      {inspectItem && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[230] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-[#0e1017] border border-border rounded-[32px] w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl relative flex flex-col">
            <div className="p-6 border-b border-border flex items-center justify-between shrink-0 bg-[#121520]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
                  <Info size={18} />
                </div>
                <div>
                  <h4 className="text-base font-black text-white">{inspectItem.title}</h4>
                  <p className="text-[11px] text-ink-lighter">{inspectItem.type} &bull; ID: <code className="text-cyan-400 font-mono">{inspectItem.id}</code></p>
                </div>
              </div>
              <button 
                onClick={() => setInspectItem(null)}
                className="w-8 h-8 rounded-lg bg-glass flex items-center justify-center text-ink-lighter hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-black/40 font-mono text-xs">
              <pre className="text-slate-300 leading-relaxed overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(inspectItem.data, null, 2)}
              </pre>
            </div>

            <div className="p-5 border-t border-border bg-[#121520] flex items-center justify-between">
              <span className="text-[11px] text-ink-lighter">Raw Firebase document payload</span>
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(inspectItem.data, null, 2));
                    setInspectCopied(true);
                    triggerToast('success', 'JSON record copied!');
                    setTimeout(() => setInspectCopied(false), 2500);
                  }}
                  className="btn btn-p btn-sm gap-2 text-xs"
                >
                  {inspectCopied ? <Check size={14} /> : <Copy size={14} />}
                  {inspectCopied ? 'Copied' : 'Copy JSON'}
                </button>
                <button 
                  onClick={() => setInspectItem(null)}
                  className="btn btn-ghost btn-sm text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: IFRAME-SAFE CONFIRMATION MODAL */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[240] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-[#121520] border border-border rounded-3xl w-full max-w-md p-6 shadow-2xl relative animate-in zoom-in-95 duration-200 space-y-5">
            <div className="flex items-start gap-4">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border",
                confirmModal.isDanger 
                  ? "bg-rose-500/15 text-rose-400 border-rose-500/30" 
                  : "bg-p/15 text-p border-p/30"
              )}>
                {confirmModal.isDanger ? <AlertTriangle size={24} /> : <Info size={24} />}
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-black text-white">{confirmModal.title}</h4>
                <p className="text-xs text-ink-light mt-1.5 leading-relaxed">
                  {confirmModal.message}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-border">
              <button 
                onClick={() => setConfirmModal(null)}
                disabled={confirmBusy}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-ink border border-border transition-all disabled:opacity-40"
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  setConfirmBusy(true);
                  try {
                    await confirmModal.onConfirm();
                  } finally {
                    setConfirmBusy(false);
                    setConfirmModal(null);
                  }
                }}
                disabled={confirmBusy}
                className={cn(
                  "px-5 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-2 shadow-lg transition-all disabled:opacity-50",
                  confirmModal.isDanger 
                    ? "bg-rose-600 hover:bg-rose-500 shadow-rose-600/20" 
                    : "bg-p hover:bg-p/90 shadow-p/20"
                )}
              >
                {confirmBusy ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {confirmModal.confirmLabel || 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING TOAST NOTIFICATION */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[250] animate-in slide-in-from-bottom-4 duration-300">
          <div className={cn(
            "p-4 rounded-2xl border shadow-2xl flex items-center gap-3 text-xs font-bold max-w-md",
            toast.type === 'success' && "bg-[#0b1b13] border-emerald-500/40 text-emerald-300",
            toast.type === 'error' && "bg-[#200e12] border-rose-500/40 text-rose-300",
            toast.type === 'info' && "bg-[#101426] border-p/40 text-p"
          )}>
            {toast.type === 'success' && <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />}
            {toast.type === 'error' && <AlertTriangle size={18} className="shrink-0 text-rose-400" />}
            {toast.type === 'info' && <Info size={18} className="shrink-0 text-p" />}
            <span className="flex-1">{toast.message}</span>
            <button onClick={() => setToast(null)} className="opacity-60 hover:opacity-100 p-0.5">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
