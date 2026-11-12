'use client';

import React, { useState } from 'react';
import { Download, Menu, X, Sparkles, Smartphone, ShieldCheck, HelpCircle, Layers, FileCode2 } from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  badge?: string;
  badgeColor?: string;
  href?: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'web-sideload',
    label: 'تثبيت أونلاين',
    badge: 'سحابي',
    badgeColor: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    href: '/web-sideload',
  },
  {
    id: 'mobile',
    label: 'التجديد بالآيفون',
    badge: 'جديد',
    badgeColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    href: '/mobile',
  },
  {
    id: 'modded-ipas',
    label: 'تطبيقات معدلة',
    badge: 'VIP',
    badgeColor: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    href: '/modded-ipas',
  },
  {
    id: 'esign-ksign',
    label: 'شهادات و DNS',
    badge: 'OTA',
    badgeColor: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    href: '/certificates',
  },
  { id: 'prerequisites', label: 'المتطلبات', href: '/#prerequisites' },
  { id: 'guide', label: 'دليل الاستخدام', href: '/#guide' },
  { id: 'features', label: 'المميزات', href: '/#features' },
];

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Smooth scroll handler with proper navbar offset
  const scrollToSection = (e: React.MouseEvent, id: string) => {
    setMobileMenuOpen(false);

    // If on another page, let the natural link /#id navigate to home section
    if (typeof window !== 'undefined' && window.location.pathname !== '/') {
      return;
    }

    e.preventDefault();
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
    setMobileMenuOpen(false);
    if (typeof window !== 'undefined' && window.location.pathname !== '/') {
      return;
    }
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (window.history && window.history.pushState) {
      window.history.pushState(null, '', window.location.pathname);
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-md transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Logo */}
        <a
          href="/"
          onClick={scrollToTop}
          className="flex items-center gap-2.5 group cursor-pointer shrink-0 select-none"
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

        {/* Clean Desktop Navigation (lg and xl screens) */}
        <nav className="hidden lg:flex items-center gap-2 xl:gap-5 text-xs xl:text-sm font-medium text-slate-300">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.id}
              href={item.href || `#${item.id}`}
              onClick={(e) => {
                if (!item.href) scrollToSection(e, item.id);
              }}
              className="px-2.5 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-900/70 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 group/item"
            >
              <span>{item.label}</span>
              {item.badge && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded border leading-none shadow-sm ${
                    item.badgeColor || 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </a>
          ))}
        </nav>

        {/* Action Button & Mobile Menu Toggle */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <a
            href="/downloads/SideLink-v1.0.0-Setup.exe"
            download="SideLink-v1.0.0-Setup.exe"
            className="flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all duration-300 text-xs sm:text-sm shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 hover:-translate-y-0.5 active:scale-95 group shrink-0 whitespace-nowrap"
          >
            <Download className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform shrink-0" />
            <span className="hidden sm:inline">تحميل الأداة (Setup)</span>
            <span className="sm:hidden">تحميل الأداة</span>
          </a>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition shrink-0"
            aria-label="القائمة"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile / Tablet Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-800/90 bg-slate-950/95 backdrop-blur-xl px-4 py-4 space-y-2 animate-fade-in-down shadow-2xl">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.id}
              href={item.href || `#${item.id}`}
              onClick={(e) => {
                if (!item.href) {
                  scrollToSection(e, item.id);
                } else {
                  setMobileMenuOpen(false);
                }
              }}
              className="flex items-center justify-between p-3 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-900 transition"
            >
              <span>{item.label}</span>
              {item.badge && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded border leading-none ${
                    item.badgeColor || 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </a>
          ))}

          {/* Quick link to download inside mobile menu */}
          <a
            href="/downloads/SideLink-v1.0.0-Setup.exe"
            download="SideLink-v1.0.0-Setup.exe"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center justify-center gap-2 p-3 mt-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-md transition"
          >
            <Download className="w-4 h-4" />
            <span>تحميل إصدار الويندوز المباشر (Setup.exe)</span>
          </a>
        </div>
      )}
    </header>
  );
}
