import React from 'react';
import type { Metadata } from 'next';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import ModdedIpaSection from '../../components/ModdedIpaSection';

export const metadata: Metadata = {
  title: 'تطبيقات معدلة وألعاب بلس — SideLink IPAs Library',
  description: 'مكتبة تطبيقات الآيفون المعدلة (IPA) بروابط مباشرة وتحديثات مستمرة: تطبيقات بلس، ألعاب مهكرة، ومحاكيات للآيفون والآيباد.',
};

export default function ModdedIpasPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-600 selection:text-white" dir="rtl">
      {/* Background Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[450px] bg-indigo-600/15 blur-[140px] rounded-full" />
        <div className="absolute top-[40%] -left-40 w-[500px] h-[350px] bg-blue-600/10 blur-[130px] rounded-full" />
      </div>

      <Navbar />

      <main className="pt-6 pb-20">
        <ModdedIpaSection />
      </main>

      <Footer />
    </div>
  );
}
