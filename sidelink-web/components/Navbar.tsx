'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Download, Sparkles, Menu, X, ArrowUpRight } from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  badge?: string;
  badgeColor?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'download', label: 'تحميل الأداة' },
  { id: 'modded-ipas', label: 'تطبيقات معدلة', badge: 'جديد', badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { id: 'esign-ksign', label: 'ESign والشهادات', badge: 'P12', badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { id: 'prerequisites', label: 'المتطلبات الأساسية' },
  { id: 'guide', label: 'دليل الاستخدام' },
  { id: 'features', label: 'المميزات' },
];

export default function Navbar() {
  const [activeSection, setActiveSection] = useState<string>('download');
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [isScrolled, setIsScrolled] = useState<boolean>(false);

  // ScrollSpy & Progress listener
  useEffect(() => {
    const handleScroll = () => {
      // 1. Calculate reading progress percentage
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const currentProgress = (window.scrollY / totalHeight) * 100;
        setScrollProgress(Math.min(100, Math.max(0, currentProgress)));
      }

      setIsScrolled(window.scrollY > 30);

      // 2. Determine active section based on scroll position
      const scrollPos = window.scrollY + 120; // offset for navbar
      for (let i = NAV_ITEMS.length - 1; i >= 0; i--) {
        const item = NAV_ITEMS[i];
        const el = document.getElementById(item.id);
        if (el) {
          const top = el.offsetTop;
          if (scrollPos >= top) {
            setActiveSection(item.id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle smooth scroll and section spotlight flash
  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    setActiveSection(id);
    setMobileMenuOpen(false);

    const target = document.getElementById(id);
    if (!target) return;

    // Smooth scroll with offset for sticky navbar
    const navOffset = 80;
    const elementPosition = target.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - navOffset;

    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth',
    });

    // Flash spotlight glow on target section
    target.classList.remove('section-spotlight-active');
    // Trigger reflow to restart CSS animation
    void target.offsetWidth;
    target.classList.add('section-spotlight-active');

    setTimeout(() => {
      target.classList.remove('section-spotlight-active');
    }, 2100);

    // Update history without sudden jump
    if (window.history && window.history.pushState) {
      window.history.pushState(null, '', `#${id}`);
    }
  };

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-slate-950/90 backdrop-blur-md border-b border-slate-800 shadow-xl shadow-black/40'
          : 'bg-slate-950/70 backdrop-blur-sm border-b border-slate-800/60'
      }`}
    >
      {/* Laser Reading Progress Bar */}
      <div
        className="absolute top-0 right-0 h-[2.5px] bg-gradient-to-l from-blue-500 via-cyan-400 to-emerald-400 transition-all duration-150 pointer-events-none z-50 shadow-[0_0_10px_rgba(56,189,248,0.9)]"
        style={{ width: `${scrollProgress}%` }}
      />

      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo & Brand */}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="flex items-center gap-3 group cursor-pointer"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="SideLink Logo"
            className="w-9 h-9 rounded-xl shadow-lg shadow-blue-600/30 object-cover ring-1 ring-blue-500/30 group-hover:scale-105 group-hover:-rotate-3 transition-transform duration-300"
          />
          <div className="flex items-center gap-2">
            <span className="font-black text-xl tracking-tight text-white group-hover:text-blue-300 transition-colors">
              Side<span className="text-blue-400">Link</span>
            </span>
            <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30 shadow-sm">
              v1.0.0
            </span>
          </div>
        </a>

        {/* Desktop Navigation with Sliding Pill */}
        <nav className="hidden lg:flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900/60 border border-slate-800/70 text-xs font-semibold relative">
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(e) => handleNavClick(e, item.id)}
                className={`relative px-3.5 py-2 rounded-xl transition-all duration-300 flex items-center gap-1.5 select-none ${
                  isActive
                    ? 'text-white bg-slate-800/95 shadow-md shadow-blue-500/15 border border-blue-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${item.badgeColor}`}
                  >
                    {item.badge}
                  </span>
                )}
                {/* Active Glow Dot */}
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_6px_#38bdf8] animate-pulse" />
                )}
              </a>
            );
          })}
        </nav>

        {/* Medium Screen Nav (Without badges to fit neatly) */}
        <nav className="hidden md:flex lg:hidden items-center gap-4 text-xs font-medium text-slate-300">
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(e) => handleNavClick(e, item.id)}
                className={`transition-all duration-200 relative py-1 ${
                  isActive
                    ? 'text-blue-400 font-bold'
                    : 'hover:text-white'
                }`}
              >
                <span>{item.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 right-0 left-0 h-0.5 bg-blue-400 rounded-full shadow-[0_0_6px_#38bdf8]" />
                )}
              </a>
            );
          })}
        </nav>

        {/* Action Button & Mobile Toggle */}
        <div className="flex items-center gap-2.5">
          <a
            href="/downloads/SideLink-v1.0.0-win-x64.zip"
            download="SideLink-v1.0.0-win-x64.zip"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all duration-300 text-xs sm:text-sm shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 hover:-translate-y-0.5 active:scale-95 group"
          >
            <Download className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
            <span className="hidden sm:inline">تحميل ZIP مجاناً</span>
            <span className="sm:hidden">تحميل</span>
          </a>

          {/* Mobile Menu Button */}
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

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800/90 bg-slate-950/95 backdrop-blur-xl px-4 py-4 space-y-2 animate-fade-in-down">
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(e) => handleNavClick(e, item.id)}
                className={`flex items-center justify-between p-3 rounded-xl text-sm font-semibold transition ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                    : 'text-slate-300 hover:bg-slate-900'
                }`}
              >
                <span>{item.label}</span>
                {item.badge && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
              </a>
            );
          })}
        </div>
      )}
    </header>
  );
}
