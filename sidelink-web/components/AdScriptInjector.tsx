'use client';

import { useEffect } from 'react';

interface AdScriptInjectorProps {
  scripts: (string | undefined | null)[];
}

export default function AdScriptInjector({ scripts }: AdScriptInjectorProps) {
  useEffect(() => {
    const injectedElements: HTMLElement[] = [];

    scripts.forEach((rawSnippet) => {
      if (!rawSnippet || !rawSnippet.trim()) return;

      const trimmed = rawSnippet.trim();

      // Case 1: Just a URL provided (e.g. //pl...com/... or https://...)
      if (/^(https?:)?\/\/[^\s<"']+$/i.test(trimmed)) {
        const scriptEl = document.createElement('script');
        scriptEl.type = 'text/javascript';
        scriptEl.src = trimmed;
        scriptEl.async = true;
        document.body.appendChild(scriptEl);
        injectedElements.push(scriptEl);
        return;
      }

      // Case 2: HTML containing <script> tags or inline JavaScript
      const parser = new DOMParser();
      const doc = parser.parseFromString(trimmed, 'text/html');
      const scriptNodes = doc.querySelectorAll('script');

      if (scriptNodes.length > 0) {
        scriptNodes.forEach((node) => {
          const scriptEl = document.createElement('script');
          scriptEl.type = node.type || 'text/javascript';
          if (node.src) {
            scriptEl.src = node.src;
            scriptEl.async = true;
          } else {
            scriptEl.textContent = node.textContent;
          }
          document.body.appendChild(scriptEl);
          injectedElements.push(scriptEl);
        });
      } else {
        // If user pasted raw inline JS without script tags
        try {
          const scriptEl = document.createElement('script');
          scriptEl.type = 'text/javascript';
          scriptEl.textContent = trimmed;
          document.body.appendChild(scriptEl);
          injectedElements.push(scriptEl);
        } catch {
          // ignore parsing error
        }
      }
    });

    return () => {
      injectedElements.forEach((el) => {
        try {
          if (el.parentNode) {
            el.parentNode.removeChild(el);
          }
        } catch {}
      });
    };
  }, [scripts]);

  return null;
}
