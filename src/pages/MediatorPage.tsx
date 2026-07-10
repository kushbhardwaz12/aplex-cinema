import React, { useEffect, useState } from 'react';
import { AdsterraAd } from '../components/AdsterraAd';

interface MediatorPageProps {
  movieId: string;
  quality: string;
}

export function MediatorPage({ movieId, quality }: MediatorPageProps) {
  const [countdown, setCountdown] = useState(15);
  const [rawLink, setRawLink] = useState<string | null>(null);
  const isMobile = window.innerWidth <= 768;

  useEffect(() => {
    // Fetch raw link from localStorage
    const link = localStorage.getItem(`movieUrl_${quality}_${movieId}`);
    setRawLink(link);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [movieId, quality]);

  const handleDownload = () => {
    if (rawLink) {
      window.location.href = rawLink;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col relative overflow-hidden font-sans">
      {/* Background Shapes */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[5%] w-[150%] h-[150%] bg-slate-900 rounded-[40%] -rotate-12 transform origin-top-left opacity-50"></div>
      </div>

      {/* Header */}
      <div className="w-full relative z-10 flex items-center px-6 py-5 border-b border-slate-800 bg-slate-950">
        <div className="flex gap-[2px] mr-4 flex-wrap w-[22px] h-[22px]">
          <div className="w-[10px] h-[10px] bg-red-500 rounded-sm"></div>
          <div className="w-[10px] h-[10px] bg-slate-500 rounded-sm"></div>
          <div className="w-[10px] h-[10px] bg-slate-700 rounded-sm"></div>
          <div className="w-[10px] h-[10px] bg-red-800 rounded-sm"></div>
        </div>
        <h1 className="text-xl text-slate-200 tracking-tight">Mediator Page <span className="text-slate-600 mx-1">|</span> Please Wait.</h1>
      </div>

      <div className="flex-1 flex flex-col items-center py-10 relative z-10 w-full">
        {/* Top Ads */}
        <div className="w-full flex justify-center mb-8 bg-slate-900/40 border border-slate-800/60 rounded-2xl py-4 overflow-hidden shadow-lg mx-4 max-w-[1200px]">
           {isMobile ? (
             <div className="flex flex-col gap-4 items-center w-full">
               <AdsterraAd type="banner300x250" isMobile={isMobile} />
               <AdsterraAd type="banner300x250" isMobile={isMobile} />
             </div>
           ) : (
             <div className="grid grid-cols-3 gap-4 items-center justify-items-center w-full">
               <div className="w-full"><AdsterraAd type="banner300x250" isMobile={isMobile} /></div>
               <div className="w-full"><AdsterraAd type="banner300x250" isMobile={isMobile} /></div>
               <div className="w-full"><AdsterraAd type="banner300x250" isMobile={isMobile} /></div>
             </div>
           )}
        </div>

        {/* Main Content */}
        <div className="flex flex-col items-center w-full max-w-2xl px-4 py-4 relative z-20">
          <h2 className="text-lg sm:text-xl text-slate-200 mb-10">Links Page is Almost Ready 🚀</h2>

          <div className="relative w-40 h-40 sm:w-48 sm:h-48 flex items-center justify-center mb-12">
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="#ef4444" strokeWidth="1" strokeDasharray="220 80" strokeLinecap="round" className="origin-center animate-[spin_4s_linear_infinite]" />
              <circle cx="50" cy="50" r="35" fill="none" stroke="#475569" strokeWidth="1.5" strokeDasharray="150 80" strokeLinecap="round" className="origin-center animate-[spin_5s_linear_infinite_reverse]" />
              <circle cx="50" cy="50" r="25" fill="none" stroke="#475569" strokeWidth="1.5" strokeDasharray="100 60" strokeLinecap="round" className="origin-center animate-[spin_3s_linear_infinite]" />
            </svg>
            <span className="text-5xl sm:text-6xl text-white font-light z-10">{countdown}</span>
          </div>

          <button
            onClick={countdown === 0 ? handleDownload : undefined}
            disabled={countdown === 0 && !rawLink}
            className={`
              font-bold tracking-widest text-sm rounded-full px-10 py-3 transition-all
              ${countdown === 0 
                ? (rawLink ? 'bg-red-600 hover:bg-red-500 text-white border-[6px] border-red-900/50 shadow-[0_0_20px_rgba(239,68,68,0.4)] cursor-pointer' : 'bg-slate-800 text-slate-500 border-[6px] border-slate-900')
                : 'bg-red-600/30 text-white/50 border-[6px] border-red-900/30 cursor-default'}
            `}
          >
            {countdown > 0 ? 'PLEASE WAIT...' : (rawLink ? 'GET LINK' : 'NOT FOUND')}
          </button>
        </div>

        {/* Bottom Ads */}
        <div className="w-full flex justify-center mt-8 border border-slate-800/60 pt-4 bg-slate-900/40 rounded-2xl pb-4 overflow-hidden shadow-lg mx-4 max-w-[1200px]">
          {isMobile ? (
             <div className="flex flex-col gap-4 items-center w-full">
               <AdsterraAd type="banner300x250" isMobile={isMobile} />
               <AdsterraAd type="banner300x250" isMobile={isMobile} />
             </div>
           ) : (
             <div className="grid grid-cols-3 gap-4 items-center justify-items-center w-full">
               <div className="w-full"><AdsterraAd type="banner300x250" isMobile={isMobile} /></div>
               <div className="w-full"><AdsterraAd type="banner300x250" isMobile={isMobile} /></div>
               <div className="w-full"><AdsterraAd type="banner300x250" isMobile={isMobile} /></div>
             </div>
           )}
        </div>
      </div>
      
      {/* Popunder ad will trigger on click events (like clicking the Get Link button) */}
      <AdsterraAd type="popunder" isMobile={isMobile} />
    </div>
  );
}
