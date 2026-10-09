import React, { useState } from "react";
import { 
  Sparkles, 
  Globe, 
  FileText, 
  Bookmark, 
  Download, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  ArrowRight, 
  Copy, 
  ExternalLink,
  Layers,
  UploadCloud,
  Check
} from "lucide-react";

export interface ExtractedMovie {
  title: string;
  year?: string;
  rating?: number;
  categories: string[];
  image: string;
  screenshots: string[];
  description: string;
  links: Array<{
    quality: string;
    size?: string;
    url: string;
  }>;
  isSeries?: boolean;
  streamingUrl?: string;
  seasons?: any[];
}

interface AiMovieImporterProps {
  onApplyToForm: (movie: ExtractedMovie) => void;
  onInstantUpload: (movie: ExtractedMovie) => Promise<void>;
  onInstantBulkUpload?: (movies: ExtractedMovie[]) => Promise<void>;
}

export const AiMovieImporter: React.FC<AiMovieImporterProps> = ({
  onApplyToForm,
  onInstantUpload,
  onInstantBulkUpload,
}) => {
  const [activeTab, setActiveTab] = useState<"url" | "text" | "bookmarklet">("url");
  const [inputUrl, setInputUrl] = useState("");
  const [inputText, setInputText] = useState("");
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [extractedMovies, setExtractedMovies] = useState<ExtractedMovie[]>([]);
  const [selectedBulkIndices, setSelectedBulkIndices] = useState<number[]>([]);
  const [uploadingBulk, setUploadingBulk] = useState(false);
  const [copiedBookmarklet, setCopiedBookmarklet] = useState(false);

  const handleExtract = async () => {
    setError(null);
    setSuccessNotice(null);

    const payload = activeTab === "url" 
      ? { url: inputUrl.trim(), bulk: isBulkMode } 
      : { text: inputText.trim(), bulk: isBulkMode };

    if (activeTab === "url" && !inputUrl.trim()) {
      setError("Please enter a valid movie webpage URL.");
      return;
    }
    if (activeTab === "text" && !inputText.trim()) {
      setError("Please paste movie information, HTML or text.");
      return;
    }

    setLoading(true);
    setStatusMessage(activeTab === "url" ? "Fetching webpage and analyzing with AI..." : "Parsing content with Gemini AI...");

    try {
      const response = await fetch("/api/ai-extract-movie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to extract movie details.");
      }

      const movies: ExtractedMovie[] = data.movies || [];
      if (movies.length === 0) {
        throw new Error("No movie details could be extracted. Please paste raw text directly.");
      }

      setExtractedMovies(movies);
      setSelectedBulkIndices(movies.map((_, i) => i));
      setSuccessNotice(`Successfully extracted ${movies.length} title(s) via ${data.source === "gemini-ai" ? "Gemini AI" : "Smart Parser"}!`);
    } catch (err: any) {
      setError(err?.message || "Extraction failed. Please try pasting raw text instead.");
    } finally {
      setLoading(false);
      setStatusMessage("");
    }
  };

  const handleApplySingle = (movie: ExtractedMovie) => {
    onApplyToForm(movie);
    setSuccessNotice(`Loaded "${movie.title}" into upload form! Scroll down to inspect or save.`);
    const formElement = document.getElementById("admin-movie-form");
    if (formElement) {
      formElement.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleUploadSingle = async (movie: ExtractedMovie) => {
    try {
      setLoading(true);
      setStatusMessage(`Uploading "${movie.title}" to Sigma Flix 4us...`);
      await onInstantUpload(movie);
      setSuccessNotice(`🎉 "${movie.title}" uploaded successfully to Sigma Flix 4us!`);
      setExtractedMovies(prev => prev.filter(m => m !== movie));
    } catch (err: any) {
      setError(`Failed to upload: ${err?.message || "Unknown error"}`);
    } finally {
      setLoading(false);
      setStatusMessage("");
    }
  };

  const handleUploadAllSelected = async () => {
    if (!onInstantBulkUpload) return;
    const toUpload = extractedMovies.filter((_, idx) => selectedBulkIndices.includes(idx));
    if (toUpload.length === 0) {
      setError("Please select at least one movie to upload.");
      return;
    }

    try {
      setUploadingBulk(true);
      setStatusMessage(`Uploading ${toUpload.length} movies in bulk...`);
      await onInstantBulkUpload(toUpload);
      setSuccessNotice(`🎉 Successfully uploaded ${toUpload.length} movies to Sigma Flix 4us!`);
      setExtractedMovies([]);
      setSelectedBulkIndices([]);
    } catch (err: any) {
      setError(`Bulk upload error: ${err?.message || "Unknown error"}`);
    } finally {
      setUploadingBulk(false);
      setStatusMessage("");
    }
  };

  const bookmarkletCode = `javascript:(function(){const title=document.querySelector('h1')?.innerText||document.title;const text=document.body.innerText.slice(0,10000);navigator.clipboard.writeText(location.href);alert('✨ Sigma Flix AI: Movie URL copied! Open Sigma Flix Admin and click Extract.');})();`;

  const copyBookmarklet = () => {
    navigator.clipboard.writeText(bookmarkletCode);
    setCopiedBookmarklet(true);
    setTimeout(() => setCopiedBookmarklet(false), 2000);
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-red-950/30 border border-red-500/30 rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden mb-10">
      {/* Glow highlight */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/10 blur-[90px] rounded-full pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-tr from-red-600 to-amber-500 rounded-xl text-white shadow-lg shadow-red-600/30">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white tracking-wide flex items-center gap-2">
                Sigma Flix AI Auto-Importer Bot
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 bg-red-500/20 text-red-400 border border-red-500/40 rounded-full">
                  Gemini 3.8
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Paste any movie page URL or raw text — AI instantly extracts poster, qualities, screenshots &amp; links!
              </p>
            </div>
          </div>
        </div>

        {/* Tab selection */}
        <div className="flex bg-slate-950/80 border border-slate-800 rounded-xl p-1 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("url")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === "url" 
                ? "bg-red-600 text-white shadow-md shadow-red-600/30" 
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Globe className="w-3.5 h-3.5" /> Webpage URL
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("text")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === "text" 
                ? "bg-red-600 text-white shadow-md shadow-red-600/30" 
                : "text-slate-400 hover:text-white"
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Paste Raw Text
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("bookmarklet")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === "bookmarklet" 
                ? "bg-red-600 text-white shadow-md shadow-red-600/30" 
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" /> 1-Click Bookmarklet
          </button>
        </div>
      </div>

      {/* Error / Success Notices */}
      {error && (
        <div className="mb-5 bg-red-950/50 border border-red-500/50 text-red-200 text-sm px-4 py-3 rounded-xl flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successNotice && (
        <div className="mb-5 bg-emerald-950/50 border border-emerald-500/50 text-emerald-200 text-sm px-4 py-3 rounded-xl flex items-center gap-2.5">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Tab 1: Webpage URL Input */}
      {activeTab === "url" && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Source Movie URL:
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <input
                  type="url"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder="https://vegamovies.../movie-name-2024-download/ or BollyFlix / IMDb link"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none pr-10"
                />
                {inputUrl && (
                  <button 
                    onClick={() => setInputUrl("")} 
                    className="absolute right-3 top-3.5 text-slate-500 hover:text-white text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={handleExtract}
                disabled={loading}
                className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold px-6 py-3 rounded-xl text-sm transition-all shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer whitespace-nowrap"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Extracting...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>⚡ Extract with AI</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              💡 Supports VegaMovies, MoviesMod, BollyFlix, FilmyZilla, IMDb, TMDB, or any movie blog URL. If a site blocks external requests, use the <strong>Paste Raw Text</strong> tab!
            </p>
          </div>
        </div>
      )}

      {/* Tab 2: Raw Text / HTML Input */}
      {activeTab === "text" && (
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Paste Movie Details / HTML / Post Content:
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400 hover:text-slate-200">
                <input
                  type="checkbox"
                  checked={isBulkMode}
                  onChange={(e) => setIsBulkMode(e.target.checked)}
                  className="rounded text-red-600 bg-slate-950 border-slate-700"
                />
                <span>Bulk Extraction (Multiple Movies)</span>
              </label>
            </div>
            <textarea
              rows={5}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Copy everything from the movie page (Title, Poster link, 480p/720p/1080p links, Screenshots, Storyline) and paste here..."
              className="w-full bg-slate-950 border border-slate-700 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-xl p-3.5 text-xs text-white placeholder-slate-500 outline-none font-mono"
            />
            <div className="flex justify-between items-center mt-3">
              <span className="text-[11px] text-slate-500">
                {inputText.length > 0 ? `${inputText.length} characters pasted` : "Paste directly without formatting"}
              </span>
              <button
                type="button"
                onClick={handleExtract}
                disabled={loading}
                className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing with AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>⚡ Extract Details with AI</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: 1-Click Bookmarklet */}
      {activeTab === "bookmarklet" && (
        <div className="space-y-4 text-sm text-slate-300 bg-slate-950/60 p-5 rounded-xl border border-slate-800">
          <h4 className="font-bold text-white text-base flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-amber-400" />
            Browser 1-Click Extractor Bookmarklet
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Drag the button below to your browser&apos;s Bookmarks bar (or on Mobile: save bookmark). Whenever you are browsing any movie site, simply click this bookmark — it will instantly grab the movie URL and details so you can paste here!
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <a
              href={bookmarkletCode}
              onClick={(e) => {
                e.preventDefault();
                copyBookmarklet();
              }}
              className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-600/20 cursor-grab active:cursor-grabbing border border-amber-400/40"
              title="Drag me to your Bookmarks Bar"
            >
              ⭐ Sigma Flix Bot
            </a>

            <button
              type="button"
              onClick={copyBookmarklet}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            >
              {copiedBookmarklet ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedBookmarklet ? "Copied code!" : "Copy Bookmarklet Code"}
            </button>
          </div>
        </div>
      )}

      {/* Loading indicator */}
      {loading && statusMessage && (
        <div className="mt-6 p-4 rounded-xl bg-red-950/20 border border-red-500/30 flex items-center gap-3 text-red-300 text-sm">
          <Loader2 className="w-5 h-5 animate-spin text-red-400 shrink-0" />
          <span className="font-medium animate-pulse">{statusMessage}</span>
        </div>
      )}

      {/* Extracted Results Section */}
      {extractedMovies.length > 0 && (
        <div className="mt-8 border-t border-slate-800 pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <h4 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-400" />
              Extracted Results ({extractedMovies.length})
            </h4>

            {extractedMovies.length > 1 && onInstantBulkUpload && (
              <button
                type="button"
                onClick={handleUploadAllSelected}
                disabled={uploadingBulk}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2 rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/20"
              >
                {uploadingBulk ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <UploadCloud className="w-3.5 h-3.5" />
                )}
                Upload Selected ({selectedBulkIndices.length}) in 1-Click
              </button>
            )}
          </div>

          <div className="space-y-4">
            {extractedMovies.map((movie, idx) => (
              <div 
                key={idx} 
                className="bg-slate-950/90 border border-slate-800 hover:border-slate-700 rounded-xl p-4 md:p-5 transition-all"
              >
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Poster Thumbnail */}
                  <div className="relative w-full md:w-32 h-44 md:h-auto rounded-lg overflow-hidden bg-slate-900 shrink-0 border border-slate-800">
                    <img 
                      src={movie.image} 
                      alt={movie.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&q=80";
                      }} 
                    />
                    {movie.year && (
                      <span className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded">
                        {movie.year}
                      </span>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h5 className="text-base font-bold text-white line-clamp-2">
                          {movie.title}
                        </h5>
                        {extractedMovies.length > 1 && (
                          <input
                            type="checkbox"
                            checked={selectedBulkIndices.includes(idx)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedBulkIndices(prev => [...prev, idx]);
                              } else {
                                setSelectedBulkIndices(prev => prev.filter(i => i !== idx));
                              }
                            }}
                            className="w-4 h-4 rounded text-red-600 bg-slate-900 border-slate-700 mt-1"
                          />
                        )}
                      </div>

                      {/* Categories & Rating */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {movie.rating && (
                          <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded">
                            ★ {movie.rating}
                          </span>
                        )}
                        {movie.categories?.map((cat, cIdx) => (
                          <span 
                            key={cIdx} 
                            className="text-[10px] font-medium bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700"
                          >
                            {cat}
                          </span>
                        ))}
                      </div>

                      {/* Download Links Badges */}
                      <div className="flex flex-wrap gap-2 mt-3">
                        {movie.links?.map((lnk, lIdx) => (
                          <div 
                            key={lIdx} 
                            className="text-[11px] bg-slate-900 border border-slate-700/80 rounded px-2.5 py-1 text-slate-300 flex items-center gap-1.5"
                          >
                            <span className="font-bold text-red-400">{lnk.quality.toUpperCase()}</span>
                            {lnk.size && <span className="text-slate-500">({lnk.size})</span>}
                          </div>
                        ))}
                      </div>

                      {/* Screenshots count */}
                      {movie.screenshots && movie.screenshots.length > 0 && (
                        <p className="text-[11px] text-slate-400 mt-2">
                          📷 {movie.screenshots.length} screenshot(s) detected
                        </p>
                      )}

                      {/* Description preview */}
                      <p className="text-xs text-slate-400 line-clamp-2 mt-2 leading-relaxed">
                        {movie.description}
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t border-slate-900">
                      <button
                        type="button"
                        onClick={() => handleApplySingle(movie)}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5 text-blue-400" />
                        Auto-Fill Form
                      </button>

                      <button
                        type="button"
                        onClick={() => handleUploadSingle(movie)}
                        className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-red-600/20 transition-all"
                      >
                        <UploadCloud className="w-3.5 h-3.5" />
                        ⚡ 1-Click Instant Upload
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
export default AiMovieImporter;
