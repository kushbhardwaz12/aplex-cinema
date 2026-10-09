import React, { useEffect, useState } from 'react';
import { AdsterraAd } from '../components/AdsterraAd';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { adService } from '../services/adService';

interface MediatorPageProps {
  movieId: string;
  quality: string;
  url?: string;
}

export function MediatorPage({ movieId, quality, url }: MediatorPageProps) {
  const [countdown, setCountdown] = useState(15);
  const [rawLink, setRawLink] = useState<string | null>(null);
  const isMobile = typeof window !== "undefined" ? window.innerWidth <= 768 : false;

  useEffect(() => {
    let timer: any;
    
    const fetchLink = async () => {
      let link = url;
      // If no url provided, or it's an old mediator string, try local storage first
      if (!link || link.startsWith('mediator:')) {
        link = localStorage.getItem(`movieUrl_${quality}_${movieId}`);
        if (!link && quality.startsWith('episode_')) {
          const epId = quality.replace('episode_', '');
          link = localStorage.getItem(`movieUrl_${epId}_${movieId}`);
          if (!link && epId.startsWith('ep')) {
             link = localStorage.getItem(`movieUrl_${epId}_${movieId}`);
          }
        }
        
        // If still not found in local storage, fetch from Firestore
        if (!link) {
          try {
            const docRef = doc(db, "movies", movieId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              const data = docSnap.data();
              if (quality === '620p') link = data.link620p;
              else if (quality === '720p') link = data.link720p;
              else if (quality === '1080p') link = data.link1080p;
              else if (quality === 'live') link = data.liveStreamLink;
              else if (quality.startsWith('episode_')) {
                const epId = quality.replace('episode_', '');
                const ep = data.episodes?.find((e: any) => e.id === epId || e.id.toString() === epId);
                if (ep) link = ep.link;
              }
              
              if (link && link.startsWith('mediator:')) {
                link = null;
              }
            }
          } catch (e) {
            console.error("Error fetching link:", e);
          }
        }
      }
      
      setRawLink(link || null);
    };

    fetchLink();

    timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [movieId, quality, url]);

  
  return (
    <div 
      className="min-h-screen bg-slate-950 flex flex-col relative overflow-hidden font-sans cursor-default"
      onClick={(e) => {
        // Trigger Adsterra smart link on mediator page interaction
        adService.triggerLegitimateAd('mediator_page_click', e);
      }}
    >
      {/* Background Shapes */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[5%] w-[150%] h-[150%] bg-slate-900 rounded-[40%] -rotate-12 transform origin-top-left opacity-50"></div>
      </div>

      {/* Header */}
      <div className="w-full relative z-10 flex items-center justify-between px-6 py-5 bg-slate-950/80 backdrop-blur-sm">
        <div className="flex items-center">
          <div className="flex items-center text-xl font-black tracking-tight select-none mr-3">
            <span className="text-white font-black">SIGMA</span><span className="text-red-500 font-black"> FLIX</span>
            <span className="bg-gradient-to-r from-red-600 to-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded italic ml-1.5 shadow-md border border-red-500/30">
              4US
            </span>
          </div>
          <span className="hidden sm:inline-block text-slate-700 mx-2">|</span>
          <span className="hidden sm:inline-block text-slate-400 text-xs font-medium">Safe Download Gateway</span>
        </div>
        <div className="text-xs font-semibold text-red-400 bg-red-950/40 border border-red-800/40 px-2.5 py-1 rounded-full">
          Secure Mediator
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center py-10 relative z-10 w-full">
        {/* Main Content */}
        <div className="flex flex-col items-center w-full max-w-2xl px-4 py-8 relative z-20">
          <h2 className="text-lg sm:text-xl text-slate-200 mb-10">Links Page is Almost Ready 🚀</h2>

          <div 
            className="relative w-40 h-40 sm:w-48 sm:h-48 flex items-center justify-center mb-12 cursor-pointer group"
            onClick={(e) => {
              e.stopPropagation();
              adService.triggerLegitimateAd('mediator_page_click', e);
            }}
            title="Click to accelerate countdown"
          >
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="#ef4444" strokeWidth="1" strokeDasharray="220 80" strokeLinecap="round" className="origin-center animate-[spin_4s_linear_infinite]" />
              <circle cx="50" cy="50" r="35" fill="none" stroke="#475569" strokeWidth="1.5" strokeDasharray="150 80" strokeLinecap="round" className="origin-center animate-[spin_5s_linear_infinite_reverse]" />
              <circle cx="50" cy="50" r="25" fill="none" stroke="#475569" strokeWidth="1.5" strokeDasharray="100 60" strokeLinecap="round" className="origin-center animate-[spin_3s_linear_infinite]" />
            </svg>
            <span className="text-5xl sm:text-6xl text-white font-light z-10 group-hover:scale-110 transition-transform">{countdown}</span>
          </div>

          {countdown === 0 && rawLink ? (
            <button
              onClick={(e) => {
                const fullUrl = rawLink.startsWith('http') ? rawLink : 'https://' + rawLink;
                // Legitimate User Trigger via Resilient Adsterra Service
                adService.triggerLegitimateAd('mediator_get_link', e);
                // Redirect current tab smoothly to user's destination file/link
                window.location.href = fullUrl;
              }}
              className="bg-red-600 hover:bg-red-500 text-white border-[6px] border-red-900/50 shadow-[0_0_25px_rgba(239,68,68,0.5)] cursor-pointer font-bold tracking-widest text-base rounded-full px-12 py-3.5 transition-all inline-block text-center hover:scale-105 active:scale-95 animate-pulse"
            >
              GET LINK
            </button>
          ) : (
            <button
              disabled={true}
              className={`
                font-bold tracking-widest text-sm rounded-full px-10 py-3 transition-all
                ${countdown === 0 
                   ? 'bg-slate-800 text-slate-500 border-[6px] border-slate-900'
                  : 'bg-red-600/30 text-white/50 border-[6px] border-red-900/30 cursor-default'}
              `}
            >
              {countdown > 0 ? 'PLEASE WAIT...' : 'NOT FOUND'}
            </button>
          )}
        </div>
      </div>
      
      {/* Popunder ad will trigger on both Desktop and Mobile */}
      <AdsterraAd type="popunder" isMobile={isMobile} />
    </div>
  );
}
