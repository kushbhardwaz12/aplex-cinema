import React, { useState, useEffect } from "react";
import { Bell, Film, X, ExternalLink } from "lucide-react";
import { adService } from "../services/adService";

interface InPagePushAdProps {
  movieTitle?: string;
  isVisible?: boolean;
}

export function InPagePushAd({ movieTitle, isVisible = true }: InPagePushAdProps) {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isVisible) return;

    // Delay entry slightly (2.5s) for natural push notification feeling
    const timer = setTimeout(() => {
      setShow(true);
    }, 2500);

    return () => clearTimeout(timer);
  }, [isVisible]);

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShow(false);
    setDismissed(true);
  };

  const handlePushClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Trigger Adsterra Push/Smart link
    adService.triggerLegitimateAd('push_notification', e);
    // Dismiss after click
    setShow(false);
  };

  if (!show || dismissed) return null;

  return (
    <div 
      className="fixed bottom-4 right-4 z-50 max-w-sm w-[92vw] sm:w-[360px] animate-in slide-in-from-bottom-5 duration-500 select-none"
      onClick={handlePushClick}
    >
      <div className="relative overflow-hidden bg-slate-900/95 border-2 border-red-500/80 rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.8),0_0_20px_rgba(239,68,68,0.25)] backdrop-blur-md p-3.5 sm:p-4 text-white cursor-pointer hover:border-red-400 hover:shadow-[0_20px_45px_rgba(239,68,68,0.35)] transition-all group">
        
        {/* Glow ambient highlight */}
        <div className="absolute -top-10 -right-10 w-28 h-28 bg-red-600/20 rounded-full blur-2xl pointer-events-none" />

        {/* Header row: App badge + time + close */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </span>
            <span className="text-[11px] font-black tracking-wider uppercase text-red-400 flex items-center gap-1">
              SIGMA FLIX 4US <span className="text-slate-500">•</span> Alert
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-medium">Just now</span>
            <button
              type="button"
              onClick={handleDismiss}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              title="Close notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Notification Body */}
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 shrink-0 rounded-xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shadow-md border border-red-400/30 group-hover:scale-105 transition-transform">
            <Bell className="w-5 h-5 text-white animate-bounce" />
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="text-xs sm:text-sm font-bold text-white leading-tight line-clamp-1 group-hover:text-red-300 transition-colors">
              {movieTitle ? `⚡ New: ${movieTitle} in HD` : "🔥 New 4K HDR Movies Added!"}
            </h4>
            <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-2 leading-relaxed">
              Fast streaming & high-speed direct downloads ready in 1080p & HEVC.
            </p>
          </div>
        </div>

        {/* Push CTA Buttons */}
        <div className="mt-3 flex items-center gap-2 pt-2 border-t border-slate-800/80">
          <button
            type="button"
            onClick={handlePushClick}
            className="flex-1 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold text-xs py-1.5 px-3 rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
          >
            <span>Watch Now</span>
            <ExternalLink className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 font-medium rounded-lg hover:bg-slate-800/60 transition-colors"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}
