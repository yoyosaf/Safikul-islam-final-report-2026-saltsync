import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Shield, User, Moon, Sun, LogIn, LogOut } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { auth } from '../firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User as FirebaseUser } from 'firebase/auth';
import { BrandHeaderHorizontal } from './BrandLogo';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Navbar() {
  const location = useLocation();
  const [isDark, setIsDark] = useState(true);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      setIsDark(false);
      document.documentElement.classList.add('light');
    } else {
      setIsDark(true);
      document.documentElement.classList.remove('light');
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const toggleDark = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    if (newIsDark) {
      document.documentElement.classList.remove('light');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.add('light');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleLogin = async () => {
    setLoginError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.code === 'auth/unauthorized-domain') {
        setLoginError(`Unauthorized Domain: ${window.location.hostname}. Please add it to Firebase Console > Authentication > Settings > Authorized domains.`);
      } else if (error.code === 'auth/popup-blocked') {
        setLoginError('Login popup was blocked. Please allow popups for this site or open in a new tab.');
      } else {
        setLoginError(`Login failed: ${error.message || 'Unknown error'}`);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <>
      <nav className="fixed top-0 inset-x-0 h-[64px] bg-card border-b border-border flex items-center justify-between px-3 sm:px-6 z-[200] shadow-md transition-colors">
        <Link to="/" className="flex items-center shrink-0 min-w-0 pr-2">
          <BrandHeaderHorizontal />
        </Link>
        
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button 
            onClick={toggleDark}
            className="btn btn-ghost p-2 text-ink-light hover:text-p rounded-xl"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label="Toggle theme"
          >
            {isDark ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          <Link 
            to="/portal" 
            className={cn(
              "btn btn-ghost px-2.5 sm:px-3.5 py-1.5 text-xs gap-1.5 rounded-xl", 
              location.pathname === '/portal' && "border-p/50 text-p bg-p/10"
            )}
          >
            <User size={15} />
            <span className="hidden sm:inline">My Reports</span>
          </Link>

          {user ? (
            <>
              <Link 
                to="/admin" 
                className={cn(
                  "btn btn-p px-2.5 sm:px-3.5 py-1.5 text-xs gap-1.5 rounded-xl", 
                  location.pathname === '/admin' && "bg-p-light"
                )}
              >
                <Shield size={15} />
                <span className="hidden sm:inline">Admin</span>
              </Link>

              <button 
                onClick={handleLogout} 
                className="btn btn-ghost p-2 text-r hover:bg-r/10 border-r/20 rounded-xl"
                title="Log out"
                aria-label="Log out"
              >
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <button 
              onClick={handleLogin} 
              className="btn btn-p px-2.5 sm:px-3.5 py-1.5 text-xs gap-1.5 rounded-xl"
            >
              <LogIn size={15} />
              <span className="hidden xs:inline">Admin</span>
              <span>Login</span>
            </button>
          )}
        </div>
      </nav>

      {/* Non-blocking login error banner if any */}
      {loginError && (
        <div className="fixed top-[68px] inset-x-4 max-w-lg mx-auto bg-r/90 text-white text-xs p-3 rounded-xl shadow-xl z-[250] flex items-center justify-between gap-3 animate-in fade-in">
          <span>{loginError}</span>
          <button 
            onClick={() => setLoginError(null)} 
            className="p-1 hover:bg-white/20 rounded font-bold"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}
