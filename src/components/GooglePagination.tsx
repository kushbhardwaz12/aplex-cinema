import React, { useState } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface GooglePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

export const GooglePagination: React.FC<GooglePaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
}) => {
  const [jumpPage, setJumpPage] = useState("");

  if (totalPages <= 1) return null;

  // Google shows up to 10 pages at once
  const maxVisiblePages = 10;
  let startPage = Math.max(1, currentPage - 4);
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  const pages: number[] = [];
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  const handleJump = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(jumpPage, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      onPageChange(pageNum);
      setJumpPage("");
    }
  };

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="w-full flex flex-col items-center justify-center pt-8 pb-12 mt-8 border-t border-slate-800/80">
      
      {/* 1. Google Iconic 'Goooooogle' Pagination */}
      <div className="overflow-x-auto max-w-full pb-4 px-2 flex justify-center">
        <div className="inline-flex items-end gap-1 select-none">
          
          {/* Previous Button (Left) */}
          <div className="flex flex-col items-center justify-end pb-1 mr-2">
            {currentPage > 1 ? (
              <button
                type="button"
                onClick={() => onPageChange(currentPage - 1)}
                className="flex items-center gap-1 text-[#8ab4f8] hover:text-white font-medium text-xs sm:text-sm px-2.5 py-1.5 rounded-lg hover:bg-slate-800/80 transition-all cursor-pointer group"
                title="Previous page"
              >
                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                <span>Prev</span>
              </button>
            ) : (
              <div className="w-14 h-8" />
            )}
          </div>

          {/* Letter 'G' in Google Blue */}
          <div className="flex flex-col items-center justify-end pb-6 sm:pb-7">
            <span
              className="text-[#4285F4] font-bold text-3xl sm:text-5xl leading-none"
              style={{ fontFamily: "'Product Sans', 'Roboto', 'Arial', sans-serif" }}
            >
              G
            </span>
          </div>

          {/* Dynamic 'o's for each visible page number */}
          {pages.map((p) => {
            const isActive = p === currentPage;
            return (
              <button
                key={`ggl-page-${p}`}
                type="button"
                onClick={() => onPageChange(p)}
                className="flex flex-col items-center justify-end group px-1 sm:px-2 py-1 transition-all cursor-pointer focus:outline-none"
                title={`Go to page ${p}`}
              >
                {/* 'o' letter */}
                <span
                  className={`text-2xl sm:text-4xl font-bold leading-none transition-transform ${
                    isActive
                      ? "text-[#EA4335] scale-110 drop-shadow-[0_0_8px_rgba(234,67,53,0.6)]"
                      : "text-[#FBBC05] opacity-90 group-hover:opacity-100 group-hover:scale-110"
                  }`}
                  style={{ fontFamily: "'Product Sans', 'Roboto', 'Arial', sans-serif" }}
                >
                  o
                </span>

                {/* Page Number */}
                <span
                  className={`mt-1.5 text-xs sm:text-sm font-semibold transition-all ${
                    isActive
                      ? "text-white bg-red-600 px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)] font-bold"
                      : "text-[#8ab4f8] group-hover:text-white group-hover:underline px-1 py-0.5"
                  }`}
                >
                  {p}
                </span>
              </button>
            );
          })}

          {/* Letters 'gle' */}
          <div className="flex items-end pb-6 sm:pb-7 ml-0.5">
            <span
              className="text-[#4285F4] font-bold text-3xl sm:text-5xl leading-none"
              style={{ fontFamily: "'Product Sans', 'Roboto', 'Arial', sans-serif" }}
            >
              g
            </span>
            <span
              className="text-[#34A853] font-bold text-3xl sm:text-5xl leading-none"
              style={{ fontFamily: "'Product Sans', 'Roboto', 'Arial', sans-serif" }}
            >
              l
            </span>
            <span
              className="text-[#EA4335] font-bold text-3xl sm:text-5xl leading-none"
              style={{ fontFamily: "'Product Sans', 'Roboto', 'Arial', sans-serif" }}
            >
              e
            </span>
          </div>

          {/* Next Button (Right) */}
          <div className="flex flex-col items-center justify-end pb-1 ml-2">
            {currentPage < totalPages ? (
              <button
                type="button"
                onClick={() => onPageChange(currentPage + 1)}
                className="flex items-center gap-1 text-[#8ab4f8] hover:text-white font-medium text-xs sm:text-sm px-2.5 py-1.5 rounded-lg hover:bg-slate-800/80 transition-all cursor-pointer group"
                title="Next page"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            ) : (
              <div className="w-14 h-8" />
            )}
          </div>

        </div>
      </div>

      {/* 2. Secondary Navigation Controls & Info */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs sm:text-sm text-slate-400">
        
        {/* First & Previous quick buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => onPageChange(1)}
            className="p-1.5 rounded-md border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title="First Page"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => onPageChange(currentPage - 1)}
            className="px-2.5 py-1 rounded-md border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-medium"
          >
            Prev
          </button>
        </div>

        {/* Showing Items Range */}
        <div className="px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-slate-300 font-medium text-center">
          Showing <span className="text-white font-bold">{startItem}–{endItem}</span> of <span className="text-red-400 font-bold">{totalItems}</span> movies
        </div>

        {/* Next & Last quick buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            className="px-2.5 py-1 rounded-md border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-medium"
          >
            Next
          </button>
          <button
            type="button"
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(totalPages)}
            className="p-1.5 rounded-md border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title="Last Page"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>

        {/* Jump to Page Input */}
        <form onSubmit={handleJump} className="flex items-center gap-2">
          <span className="text-slate-500 text-xs">Jump:</span>
          <input
            type="number"
            min={1}
            max={totalPages}
            placeholder={`1..${totalPages}`}
            value={jumpPage}
            onChange={(e) => setJumpPage(e.target.value)}
            className="w-16 px-2 py-1 text-xs text-center rounded-md bg-slate-900 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-red-500"
          />
          <button
            type="submit"
            className="px-2.5 py-1 text-xs font-semibold rounded-md bg-red-600 hover:bg-red-500 text-white transition-all cursor-pointer"
          >
            Go
          </button>
        </form>

      </div>

    </div>
  );
};
