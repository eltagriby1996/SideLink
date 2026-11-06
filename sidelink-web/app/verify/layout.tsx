import React from 'react';
import Script from 'next/script';

export default function VerifyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Adsterra Popunder Script in Head */}
      <Script
        id="adsterra-popunder"
        src="https://accountut.com/1/0a6dadbbf05fcfc44cee6a5e531224e6"
        strategy="afterInteractive"
      />
      {children}
      {/* Adsterra Social Bar Script before Closing Body */}
      <Script
        id="adsterra-socialbar"
        src="https://bellnewyork.org/14/f504848a82ca24d1bee310ac6e6d8991"
        strategy="lazyOnload"
      />
    </>
  );
}

