'use client';

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class MessageErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    // מומלץ לחבר לכאן שירות מעקב שגיאות (כמו Sentry) בסביבת פרודקשן
    console.error('[MessageErrorBoundary]', error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex items-center gap-3 p-4 my-2 rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-rose-100 dark:border-rose-900/30 shadow-sm animate-fade-in max-w-sm">
          {/* אייקון שגיאה רך וידידותי */}
          <div className="w-9 h-9 rounded-full bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center shrink-0 border border-rose-100 dark:border-rose-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-rose-500 dark:text-rose-400">
              <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
            </svg>
          </div>
          
          {/* טקסט שגיאה בטיפוגרפיה מוקפדת */}
          <div className="flex flex-col">
            <span className="text-[13px] font-bold text-slate-800 dark:text-slate-200 leading-tight mb-0.5">
              אופס, משהו השתבש
            </span>
            <span className="text-[12px] text-slate-500 dark:text-slate-400 font-medium">
              לא הצלחנו לטעון את התוכן הזה כרגע.
            </span>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}