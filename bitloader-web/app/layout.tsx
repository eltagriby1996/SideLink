import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BitLoader — iOS Sideloading & Refresh Verification',
  description: 'Secure launch verification gateway for BitLoader Windows iOS Sideloading & Refresh Manager.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 antialiased selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
