import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  props: Props;
  state: State;

  constructor(props: Props) {
    super(props);
    this.props = props;
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Safikulreport Uncaught Error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    try {
      sessionStorage.clear();
    } catch {}
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#09090b] text-white flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-zinc-900/90 border border-zinc-800 rounded-3xl p-8 text-center shadow-2xl backdrop-blur-xl">
            <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-red-500/30">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-2xl font-black tracking-tight mb-2">Something went wrong</h2>
            <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
              Safikulreport encountered a temporary render exception. You can refresh or return to the main dashboard.
            </p>
            {this.state.error && (
              <div className="bg-black/40 border border-zinc-800 rounded-xl p-3 mb-6 text-left overflow-x-auto">
                <code className="text-xs text-red-300 font-mono block break-all">
                  {this.state.error.message || 'Unknown error'}
                </code>
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={this.handleReload}
                className="flex-1 py-3 px-4 bg-[#7b5cf0] hover:bg-[#6847ea] text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#7b5cf0]/20"
              >
                <RefreshCw size={16} /> Reload App
              </button>
              <button 
                onClick={this.handleReset}
                className="flex-1 py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all"
              >
                <Home size={16} /> Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
