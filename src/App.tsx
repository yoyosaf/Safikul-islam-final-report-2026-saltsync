import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase';
import { reportService } from './services/reportService';
import { AppSettings } from './types';
import { Bell } from 'lucide-react';

import Navbar from './components/Navbar';
import { ErrorBoundary } from './components/ErrorBoundary';

// Page-level code splitting via React.lazy()
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const EmployeeReport = lazy(() => import('./pages/EmployeeReport'));
const TLReport = lazy(() => import('./pages/TLReport'));
const PhysicalSupportMaker = lazy(() => import('./pages/PhysicalSupportMaker'));
const Portal = lazy(() => import('./pages/Portal'));
const Admin = lazy(() => import('./pages/Admin'));

// Lightweight, non-intrusive page loading fallback
const PageLoader = () => (
  <div className="flex flex-col items-center justify-center py-24 min-h-[50vh] gap-3">
    <div className="w-8 h-8 rounded-full border-2 border-p/20 border-t-p animate-spin" />
    <span className="text-xs text-ink-light font-medium tracking-wide">Loading...</span>
  </div>
);

export default function App() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let unsubscribeAuth = () => {};
    try {
      unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
      });
    } catch (err) {
      console.warn('App auth listener error:', err);
    }

    let unsubscribeSettings = () => {};
    try {
      unsubscribeSettings = reportService.onSettingsUpdate((newSettings) => {
        setSettings(newSettings);
      });
    } catch (err) {
      console.warn('App settings listener error:', err);
    }

    return () => {
      unsubscribeAuth();
      unsubscribeSettings();
    };
  }, []);

  const currentNotification = settings?.notification || 'Welcome to Safikulreport! 🎉';

  return (
    <ErrorBoundary>
      <Router>
        <div className="min-h-screen bg-bg transition-colors duration-300">
          {/* Navbar renders immediately without blocking page navigation */}
          <Navbar />

          <div className="mt-[64px] pt-2 sm:pt-4">
            {/* Global Notice Marquee Banner */}
            <div className="bg-gradient-to-r from-p/80 to-t/80 text-white py-1.5 sm:py-2 text-xs sm:text-sm font-medium flex items-center gap-2 shadow-sm border-b border-border overflow-hidden">
              <div className="pl-3 sm:pl-6 flex items-center gap-1.5 shrink-0 z-10 bg-inherit pr-3">
                <Bell size={13} className="shrink-0" />
                <span className="font-black uppercase tracking-widest text-[9px] sm:text-[10px]">Notice:</span>
              </div>
              <div className="marquee-container flex-1">
                <div className="marquee-content">
                  {currentNotification}
                </div>
              </div>
            </div>

            {/* Suspense-wrapped lazy routes */}
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Dashboard user={user} />} />
                <Route path="/employee-report" element={<EmployeeReport />} />
                <Route path="/tl-report" element={<TLReport />} />
                <Route path="/physical-support-maker" element={<PhysicalSupportMaker />} />
                <Route path="/portal" element={<Portal />} />
                <Route path="/admin" element={<Admin />} />
                {/* Fallback route redirecting any old /ip-finder or unknown path to home */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </div>
        </div>
      </Router>
    </ErrorBoundary>
  );
}
