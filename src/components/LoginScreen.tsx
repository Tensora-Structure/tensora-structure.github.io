import React, { useEffect, useRef, useState } from 'react';

interface LoginScreenProps {
  renderButton: (container: HTMLElement) => void | Promise<void>;
}

export default function LoginScreen({ renderButton }: LoginScreenProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.resolve(renderButton(buttonRef.current as HTMLDivElement))
      .then(() => {
        if (!cancelled) setStatus('ready');
      })
      .catch((error: Error) => {
        if (cancelled) return;
        setErrorMessage(error.message || 'Sign-in failed to load');
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-screen w-screen bg-[#F3F3F3] text-slate-800 overflow-hidden font-sans select-none">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-[#D1D1D1] p-8 text-center">
        <div className="mx-auto w-14 h-14 rounded-lg bg-[#004A99] flex items-center justify-center mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 20h20" />
            <path d="M4 20V8l8-6 8 6v12" />
            <path d="M9 20v-6h6v6" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-[#004A99] tracking-wide mb-1">Tensora Structure</h1>
        <p className="text-sm text-slate-500 mb-6">Structural analysis &amp; detailing suite</p>
        <p className="text-xs text-slate-400 mb-4">Sign in with your Google account to continue</p>
        <div ref={buttonRef} id="google-signin-button" className="flex justify-center mb-4 min-h-[40px]" />
        {status === 'loading' && <p className="text-xs text-slate-400 mb-4 -mt-2">Loading sign-in…</p>}
        {status === 'error' && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2 mb-3">
            {errorMessage}
          </div>
        )}
        <p className="text-[10px] text-slate-400 leading-relaxed">
          By continuing, you agree that your name and email will be logged for access tracking.
        </p>
      </div>
    </div>
  );
}
