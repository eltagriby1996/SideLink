'use client';

import React, { useState } from 'react';
import { Download, Menu, X } from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'download', label: 'تحميل الأداة' },
  { id: 'modded-ipas', label: 'تطبيقات معدلة', badge: 'VIP' },
  { id: 'esign-ksign', label: 'ESign و KSign و DNS', badge: 'OTA' },
  { id: 'prerequisites', label: 'المتطلبات الأساسية' },
  { id: 'guide', label: 'دليل الاستخدام' },
  { id: 'features', label: 'المميزات' },
];

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Smooth scroll handler with proper navbar offset
  const scrollToSection = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);

    const element = document.getElementById(id);
    if (!element) return;

    const navHeight = 75;
    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - navHeight;

    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth',
    });

    if (window.history && window.history.pushState) {
      window.history.pushState(null, '', `#${id}`);
    }
  };

  const scrollToTop = (e: React.MouseEvent) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (window.history && window.history.pushState) {
      window.history.pushState(null, '', window.location.pathname);
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md transition-all duration-300">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <a
          href="#"
          onClick={scrollToTop}
          className="flex items-center gap-3 group cursor-pointer"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="SideLink Logo"
            className="w-9 h-9 rounded-xl shadow-lg shadow-blue-600/30 object-cover ring-1 ring-blue-500/30 group-hover:scale-105 group-hover:-rotate-3 transition-transform duration-300"
          />
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-xl tracking-tight text-white group-hover:text-blue-300 transition-colors">
              SideLink
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
              v1.0.0
            </span>
          </div>
        </a>

        {/* Clean Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-300">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(e) => scrollToSection(e, item.id)}
              className="text-glow-hover hover:-translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>{item.label}</span>
              {item.badge && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30">
                  {item.badge}
                </span>
              )}
            </a>
          ))}
        </nav>

        {/* Action Button & Mobile Menu Toggle */}
        <div className="flex items-center gap-3">
          <a
            href="/downloads/SideLink-v1.0.0-Setup.exe"
            download="SideLink-v1.0.0-Setup.exe"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all duration-300 text-xs sm:text-sm shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 hover:-translate-y-0.5 active:scale-95 group"
          >
            <Download className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
            <span className="hidden sm:inline">تحميل الأداة (Setup)</span>
            <span className="sm:hidden">تحميل</span>
          </a>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
            aria-label="القائمة"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800/90 bg-slate-950/95 backdrop-blur-xl px-4 py-4 space-y-2 animate-fade-in-down">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(e) => scrollToSection(e, item.id)}
              className="flex items-center justify-between p-3 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-900 transition"
            >
              <span>{item.label}</span>
              {item.badge && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30">
                  {item.badge}
                </span>
              )}
            </a>
          ))}
        </div>
      )}
    </header>
  );
}
