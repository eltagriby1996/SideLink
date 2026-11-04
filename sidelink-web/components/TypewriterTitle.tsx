'use client';

import React, { useState, useEffect } from 'react';

interface TypewriterTitleProps {
  text?: string;
  speed?: number;
  delay?: number;
  className?: string;
}

export default function TypewriterTitle({
  text = 'SideLink for Windows',
  speed = 70,
  delay = 300,
  className = '',
}: TypewriterTitleProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isFinished, setIsFinished] = useState(false);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    // Small delay before starting so the visitor clearly sees the typing start
    const startTimeout = setTimeout(() => {
      let currentIndex = 0;

      intervalId = setInterval(() => {
        currentIndex++;
        setDisplayedText(text.slice(0, currentIndex));

        if (currentIndex >= text.length) {
          clearInterval(intervalId);
          setIsFinished(true);

          // Allow cursor to blink for 2.2 seconds after finishing, then fade out
          setTimeout(() => {
            setShowCursor(false);
          }, 2200);
        }
      }, speed);
    }, delay);

    return () => {
      clearTimeout(startTimeout);
      if (intervalId) clearInterval(intervalId);
    };
  }, [text, speed, delay]);

  return (
    <span
      dir="ltr"
      className={`inline-flex items-center justify-center min-h-[48px] sm:min-h-[72px] font-black tracking-tight ${className}`}
    >
      <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent drop-shadow-[0_0_24px_rgba(56,189,248,0.35)]">
        {displayedText}
      </span>

      {/* Glowing High-Tech Typing Cursor */}
      <span
        className={`inline-block w-[3px] sm:w-[4px] h-[0.8em] ml-1.5 sm:ml-2 rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee] transition-opacity duration-500 ${
          !showCursor
            ? 'opacity-0'
            : isFinished
            ? 'animate-pulse opacity-80'
            : 'animate-cursor-blink opacity-100'
        }`}
        aria-hidden="true"
      />
    </span>
  );
}

