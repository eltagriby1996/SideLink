'use client';

import React, { useState, useEffect } from 'react';

interface TypewriterTitleProps {
  text?: string;
  typeSpeed?: number;
  deleteSpeed?: number;
  pauseAfterTyped?: number;
  pauseAfterDeleted?: number;
  className?: string;
}

export default function TypewriterTitle({
  text = 'SideLink for Windows',
  typeSpeed = 75,
  deleteSpeed = 45,
  pauseAfterTyped = 2600,
  pauseAfterDeleted = 750,
  className = '',
}: TypewriterTitleProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (!isDeleting) {
      // TYPING PHASE
      if (displayedText.length < text.length) {
        timer = setTimeout(() => {
          setDisplayedText(text.slice(0, displayedText.length + 1));
        }, displayedText.length === 0 ? 400 : typeSpeed);
      } else {
        // Completed typing: Pause for comfortable reading (2.6s) before erasing
        timer = setTimeout(() => {
          setIsDeleting(true);
        }, pauseAfterTyped);
      }
    } else {
      // DELETING PHASE (Measured & smooth backspacing)
      if (displayedText.length > 0) {
        timer = setTimeout(() => {
          setDisplayedText(text.slice(0, displayedText.length - 1));
        }, deleteSpeed);
      } else {
        // Completed deleting: Pause briefly before starting to re-type
        timer = setTimeout(() => {
          setIsDeleting(false);
        }, pauseAfterDeleted);
      }
    }

    return () => clearTimeout(timer);
  }, [displayedText, isDeleting, text, typeSpeed, deleteSpeed, pauseAfterTyped, pauseAfterDeleted]);

  return (
    <span
      dir="ltr"
      className={`inline-flex items-center justify-center min-h-[48px] sm:min-h-[72px] font-black tracking-tight select-none ${className}`}
    >
      <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent drop-shadow-[0_0_24px_rgba(56,189,248,0.35)]">
        {displayedText}
      </span>

      {/* Glowing High-Tech Typing Cursor */}
      <span
        className="inline-block w-[3px] sm:w-[4px] h-[0.8em] ml-1.5 sm:ml-2 rounded-full bg-cyan-400 shadow-[0_0_12px_#22d3ee] animate-cursor-blink"
        aria-hidden="true"
      />
    </span>
  );
}
