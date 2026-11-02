import React from 'react';
import { Smartphone, RefreshCw, ShieldCheck, Download, FileCode, CheckCircle, Lock, ExternalLink, Cpu } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/30">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-white">BitLoader</span>
          </div>
          <nav className="flex items-center gap-6 text-sm text-slate-300">
            <a href="#features" className="hover:text-white transition">Features</a>
            <a href="#link-unlock" className="hover:text-white transition">Link Unlock</a>
            <a href="#security" className="hover:text-white transition">Security &amp; Privacy</a>
            <a
              href="/verify?session=demo-session-preview"
              className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition text-xs shadow-md shadow-blue-600/20"
            >
              Test Gateway
            </a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 max-w-5xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold uppercase tracking-wider">
          <Cpu className="w-3.5 h-3.5" /> Windows 10 &amp; 11 Sideloading Architecture
        </div>
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight">
          Reliable iOS IPA Management <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">
            &amp; 7-Day Refresh Manager
          </span>
        </h1>
        <p className="max-w-2xl mx-auto text-lg text-slate-400 leading-relaxed">
          Install, sign, and monitor your personal iOS applications without third-party cloud compromises. Real-time usbmux device communication, native bplist decoding, and secure Link Unlock verification.
        </p>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-16 px-4 max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold text-center text-white mb-12">Core Capabilities</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl hover:border-slate-700 transition">
            <Smartphone className="w-8 h-8 text-blue-400 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Native Usbmux Device Detection</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Real-time asynchronous USB listening on TCP 27015. Detects connection, device pairing status, iOS version, and model directly.
            </p>
          </div>

          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl hover:border-slate-700 transition">
            <RefreshCw className="w-8 h-8 text-indigo-400 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">7-Day Refresh Management</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Tracks personal development certificate expiration down to the hour. Automated warnings and one-click refresh before apps expire.
            </p>
          </div>

          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl hover:border-slate-700 transition">
            <ShieldCheck className="w-8 h-8 text-emerald-400 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Windows DPAPI Security</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Credentials are never stored in plaintext. Encrypted strictly with Windows Data Protection API bound to the local user account.
            </p>
          </div>
        </div>
      </section>

      {/* Security & Link Unlock */}
      <section id="security" className="py-16 px-4 max-w-4xl mx-auto border-t border-slate-800/80">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">Link Unlock Security Model</h2>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4">
          <p className="text-sm text-slate-300 leading-relaxed">
            Every fresh launch of BitLoader initiates a single-use verification session with our Vercel-hosted gateway. The web portal verifies the session and produces a cryptographically signed authorization token (HMAC-SHA256) valid only for the active process.
          </p>
          <ul className="space-y-2 text-sm text-slate-400">
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Zero credentials or Apple ID details are transmitted to or stored by the web backend.</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Verification state is stored strictly in ephemeral process memory, requiring verification once per launch.</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Tokens are cryptographically bound to session IDs to prevent replay attacks.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-8 text-center text-xs text-slate-600">
        <p>BitLoader &copy; 2026. Designed for legitimate personal iOS application management.</p>
      </footer>
    </div>
  );
}
