'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ShieldCheck, Lock, CheckCircle2, AlertCircle, Clock, ExternalLink, ArrowRight, ShieldAlert } from 'lucide-react';

function VerifyContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');
  const nonce = searchParams.get('nonce');

  const [status, setStatus] = useState<'pending' | 'verifying' | 'verified' | 'expired' | 'error'>('pending');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [secondsRemaining, setSecondsRemaining] = useState<number>(600); // 10 mins

  // Countdown timer
  useEffect(() => {
    if (status === 'verified' || status === 'expired') return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setStatus('expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status]);

  // Check initial session status
  useEffect(() => {
    if (!sessionId) {
      setStatus('error');
      setErrorMessage('Missing session identifier. Please launch verification directly from SideLink.');
      return;
    }

    async function checkInitialStatus() {
      try {
        const res = await fetch(`/api/verification/sessions/${sessionId}/status`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'verified') {
            setStatus('verified');
          } else if (data.status === 'expired') {
            setStatus('expired');
          }
        }
      } catch (e) {
        // Fall through to pending
      }
    }

    checkInitialStatus();
  }, [sessionId]);

  const handleVerify = async () => {
    if (!sessionId || !nonce) {
      setStatus('error');
      setErrorMessage('Missing verification parameters. Please restart SideLink.');
      return;
    }

    setStatus('verifying');
    setErrorMessage('');

    try {
      // Simulate light challenge verification delay for human interaction
      await new Promise((r) => setTimeout(r, 600));

      const res = await fetch(`/api/verification/sessions/${sessionId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nonce }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStatus('verified');
      } else {
        setStatus('error');
        setErrorMessage(data.error || 'Verification rejected by server.');
      }
    } catch (err: unknown) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Network error during verification.');
    }
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="SideLink Logo" className="w-20 h-20 rounded-2xl shadow-xl shadow-blue-500/20 border border-blue-500/30 object-cover" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            SideLink Link Unlock
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            One-step launch authorization gateway for SideLink Windows
          </p>
        </div>

        {/* Verification Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-xl relative overflow-hidden">
          {/* Top highlight bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400" />

          {/* Status view: Verified */}
          {status === 'verified' && (
            <div className="text-center py-6 space-y-4">
              <div className="mx-auto w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center animate-bounce">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Application Unlocked!</h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Verification was successful. Your SideLink desktop client will automatically unlock in a moment.
              </p>
              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 text-xs text-slate-400">
                You can now safely close this browser tab and continue in SideLink.
              </div>
            </div>
          )}

          {/* Status view: Pending or Verifying */}
          {(status === 'pending' || status === 'verifying') && (
            <div className="space-y-6">
              <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-3">
                <span className="flex items-center gap-1.5 font-medium">
                  <Clock className="w-4 h-4 text-blue-400" /> Session Expiration:
                </span>
                <span className="font-mono text-blue-300 font-semibold bg-blue-950/60 px-2 py-0.5 rounded border border-blue-900">
                  {formatTime(secondsRemaining)}
                </span>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-slate-300">
                  Please confirm your session to unlock the SideLink desktop application for this launch.
                </p>
                <div className="text-xs text-slate-500 font-mono truncate">
                  Session: {sessionId ? `${sessionId.slice(0, 16)}...` : 'Initializing...'}
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={handleVerify}
                disabled={status === 'verifying' || !sessionId}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-white font-medium bg-blue-600 hover:bg-blue-500 active:bg-blue-700 transition duration-150 ease-in-out shadow-lg shadow-blue-600/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {status === 'verifying' ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Confirming with Server...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5 text-blue-200" />
                    <span>Complete Verification</span>
                    <ArrowRight className="w-4 h-4 text-blue-200" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* Status view: Expired */}
          {status === 'expired' && (
            <div className="text-center py-6 space-y-4">
              <div className="mx-auto w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center">
                <Clock className="w-10 h-10 text-amber-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Session Expired</h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                This verification session has expired. Please return to SideLink and click &ldquo;Reopen Verification Page&rdquo; or restart the application.
              </p>
            </div>
          )}

          {/* Status view: Error */}
          {status === 'error' && (
            <div className="text-center py-6 space-y-4">
              <div className="mx-auto w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center">
                <ShieldAlert className="w-10 h-10 text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Verification Error</h2>
              <p className="text-sm text-red-300 leading-relaxed">
                {errorMessage || 'An error occurred during verification.'}
              </p>
              <button
                type="button"
                onClick={() => setStatus('pending')}
                className="mt-2 text-xs text-blue-400 hover:text-blue-300 underline cursor-pointer"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Separated, Policy-Compliant Advertising Notice Slot */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 text-center">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block mb-1">
            Compliant Sponsor Slot
          </span>
          <p className="text-xs text-slate-400">
            SideLink is free &amp; open-source iOS sideloading utility for Windows. Verification supports our maintenance and server costs.
          </p>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-500 space-y-2">
          <p>
            SideLink does not store or transmit your Apple ID passwords during Link Unlock.
          </p>
          <div className="flex justify-center gap-4">
            <a href="/" className="hover:text-slate-400 transition">About SideLink</a>
            <span>&bull;</span>
            <a href="/#privacy" className="hover:text-slate-400 transition">Privacy Notice</a>
            <span>&bull;</span>
            <a href="/#security" className="hover:text-slate-400 transition">Threat Model</a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        Loading verification gateway...
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}
