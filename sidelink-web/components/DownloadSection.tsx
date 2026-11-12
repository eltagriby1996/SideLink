'use client';

import React, { useState } from 'react';
import {
  Download,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  Cpu,
  Smartphone,
  ShieldCheck,
  X,
  FileArchive,
  ArrowRight
} from 'lucide-react';

export default function DownloadSection() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDownloadUrl, setSelectedDownloadUrl] = useState<string>('');
  const [selectedFileName, setSelectedFileName] = useState<string>('');

  const handleDownloadClick = (e: React.MouseEvent, url: string, filename: string) => {
    e.preventDefault();
    setSelectedDownloadUrl(url);
    setSelectedFileName(filename);
    setModalOpen(true);
  };

  const confirmDownload = () => {
    if (selectedDownloadUrl) {
      const link = document.createElement('a');
      link.href = selectedDownloadUrl;
      link.download = selectedFileName || 'SideLink-Download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Pre-requisites Notice Banner (Directly before downloads) */}
      <div className="max-w-2xl mx-auto p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-right space-y-3 shadow-lg shadow-amber-500/5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-bold text-amber-300 text-sm sm:text-base">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <span>خطوة ضرورية قبل تحميل وتشغيل الأداة:</span>
          </div>
          <a
            href="#prerequisites"
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 underline shrink-0 transition"
          >
            شرح المتطلبات بالتفصيل ↓
          </a>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          لكي تتعرف الأداة على جهاز الآيفون وتتصل به عبر USB، يجب تثبيت تعريفات Apple الرسمية التالية (من الروابط المباشرة وليست نسخة متجر Microsoft Store):
        </p>

        {/* Quick Prerequisite Download Buttons */}
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-1">
          <a
            href="https://www.apple.com/itunes/download/win64"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/90 border border-amber-500/30 hover:border-amber-400 hover:bg-slate-800 text-white text-xs font-bold transition shadow-sm group"
          >
            <Download className="w-3.5 h-3.5 text-amber-400 group-hover:-translate-y-0.5 transition-transform" />
            <span>1. تحميل iTunes 64-bit الرسمي</span>
            <ExternalLink className="w-3 h-3 text-slate-500" />
          </a>

          <a
            href="https://updates.cdn-apple.com/2020/windows/001-39935-20200911-1A70AA56-F448-11EA-8CC0-99D41950005E/iCloudSetup.exe"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/90 border border-amber-500/30 hover:border-amber-400 hover:bg-slate-800 text-white text-xs font-bold transition shadow-sm group"
          >
            <Download className="w-3.5 h-3.5 text-amber-400 group-hover:-translate-y-0.5 transition-transform" />
            <span>2. تحميل iCloud الرسمي المباشر</span>
            <ExternalLink className="w-3 h-3 text-slate-500" />
          </a>
        </div>
      </div>

      {/* Main Download CTA Buttons */}
      <div id="download" className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4 scroll-mt-28">
        <button
          type="button"
          onClick={(e) => handleDownloadClick(e, '/downloads/SideLink-v1.0.0-Setup.exe', 'SideLink-v1.0.0-Setup.exe')}
          className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-base shadow-xl shadow-blue-600/30 hover:shadow-blue-500/40 transition-all duration-300 hover:-translate-y-1 active:scale-95 border border-blue-400/30 group cursor-pointer"
        >
          <Download className="w-5 h-5 group-hover:-translate-y-1 transition-transform shrink-0" />
          <div className="text-right">
            <div>تحميل برنامج التثبيت (Setup Wizard)</div>
            <div className="text-xs font-normal text-blue-200">النسخة الرسمية المعتمدة v1.0.0 (ملف تنفيذي EXE • 58 MB)</div>
          </div>
        </button>

        <button
          type="button"
          onClick={(e) => handleDownloadClick(e, '/downloads/SideLink-v1.0.0-win-x64.zip', 'SideLink-v1.0.0-win-x64.zip')}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 text-slate-200 hover:text-white font-semibold text-sm transition-all duration-300 hover:-translate-y-1 border border-slate-800 hover:border-slate-700 cursor-pointer"
        >
          <FileArchive className="w-4 h-4 text-slate-400" />
          <span>تحميل نسخة محمولة (Portable ZIP)</span>
        </button>
      </div>

      {/* Quick Specs Badges */}
      <div className="pt-2 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400">
        <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:-translate-y-0.5 hover:border-slate-700 transition-all">
          <Cpu className="w-3.5 h-3.5 text-blue-400" /> Windows 10 &amp; 11 (64-bit)
        </span>
        <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:-translate-y-0.5 hover:border-slate-700 transition-all">
          <Smartphone className="w-3.5 h-3.5 text-indigo-400" /> يدعم جميع إصدارات iOS حتى iOS 18+
        </span>
        <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:-translate-y-0.5 hover:border-slate-700 transition-all">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> توقيع رقمي محلي وآمن 100%
        </span>
      </div>

      {/* Prerequisite Confirmation Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 max-w-lg w-full text-right shadow-2xl space-y-5 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 font-bold text-white text-lg">
                <ShieldAlert className="w-6 h-6 text-amber-400" />
                <span>تأكيد تثبيت متطلبات Apple قبل التحميل</span>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              لضمان تشغيل أداة <strong>SideLink</strong> والتعرف على كابل USB بنجاح، هل قمت بتثبيت برامج Apple الرسمية مسبقاً؟
            </p>

            {/* Checklist of requirements */}
            <div className="space-y-3 bg-slate-950/70 p-4 rounded-2xl border border-slate-800/80 text-xs sm:text-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>تثبيت iTunes 64-bit الرسمي</span>
                </div>
                <a
                  href="https://www.apple.com/itunes/download/win64"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 underline font-semibold shrink-0"
                >
                  تحميل الآن ↗
                </a>
              </div>

              <div className="flex items-start justify-between gap-3 pt-2 border-t border-slate-800/60">
                <div className="flex items-center gap-2 text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>تثبيت iCloud Windows المباشر</span>
                </div>
                <a
                  href="https://updates.cdn-apple.com/2020/windows/001-39935-20200911-1A70AA56-F448-11EA-8CC0-99D41950005E/iCloudSetup.exe"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 underline font-semibold shrink-0"
                >
                  تحميل الآن ↗
                </a>
              </div>
            </div>

            <div className="text-[11px] text-amber-300/80 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
              💡 تنبيه: إذا كانت لديك نسخة متجر Microsoft Store، يرجى حذفها وتثبيت النسخ المباشرة أعلاه لكي يعمل كابل الـ USB مع بروتوكول Usbmuxd.
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                onClick={confirmDownload}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition active:scale-95 flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>نعم، مثبتة لدي — بدء التحميل الآن</span>
              </button>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-full sm:w-auto py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

