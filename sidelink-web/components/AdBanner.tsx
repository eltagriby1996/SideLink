'use client';

import React, { useId, useMemo } from 'react';

interface AdBannerProps {
  htmlCode: string;
  label?: string;
  minHeight?: number;
  className?: string;
}

export default function AdBanner({
  htmlCode,
  label = 'إعلان رعاية',
  minHeight = 90,
  className = '',
}: AdBannerProps) {
  const uniqueId = useId();

  const iframeSrcDoc = useMemo(() => {
    if (!htmlCode || !htmlCode.trim()) return null;

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {
      margin: 0;
      padding: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      background: transparent;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    img, iframe {
      max-width: 100%;
      height: auto;
    }
  </style>
</head>
<body>
  ${htmlCode}
</body>
</html>`;
  }, [htmlCode]);

  if (!iframeSrcDoc) {
    return null;
  }

  return (
    <div className={`w-full flex flex-col items-center my-3 ${className}`} dir="rtl">
      {label && (
        <span className="text-[10px] text-slate-500 font-mono tracking-wider mb-1 uppercase">
          {label}
        </span>
      )}
      <div 
        className="w-full max-w-full rounded-2xl overflow-hidden border border-slate-800/80 bg-slate-900/40 backdrop-blur shadow-lg flex items-center justify-center p-1 transition-all hover:border-slate-700"
        style={{ minHeight: `${minHeight}px` }}
      >
        <iframe
          key={uniqueId}
          srcDoc={iframeSrcDoc}
          title="Sponsored Advertisement"
          className="w-full border-0 overflow-hidden"
          style={{ minHeight: `${minHeight}px`, height: `${minHeight}px` }}
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-top-navigation-by-user-activation"
          loading="lazy"
        />
      </div>
    </div>
  );
}
