import React, {  useState, useRef, useEffect  } from "react";
import {
  Film,
  LogOut,
  Settings,
  Lock,
  Upload,
  Image as ImageIcon,
  Link as LinkIcon,
  Download,
  Search,
  CheckCircle2,
  Clapperboard,
  Trash2,
  ArrowLeft,
  UserCircle,
  Mail,
  ShieldAlert,
  AlertCircle,
  Star,
  StarHalf,
  Eye,
  EyeOff,
  Play,
  Plus,
  MessageSquare,
  Send,
  Clock,
  Bookmark,
  Bell,
  Pencil,
  Activity,
  CheckCircle,
  XCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  setDoc,
  onSnapshot,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import { db, auth, googleProvider } from "./firebase";
import { AdsterraAd } from "./components/AdsterraAd";
import { MediatorPage } from "./pages/MediatorPage";

// Image Compression Utility with Web Worker for offloading
const workerScript = `
  self.onmessage = async (e) => {
    try {
      const { file, maxWidth } = e.data;
      const bitmap = await createImageBitmap(file);
      let width = bitmap.width;
      let height = bitmap.height;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(bitmap, 0, 0, width, height);
      const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.7 });
      self.postMessage({ success: true, blob });
    } catch (err) {
      self.postMessage({ success: false, error: err.message });
    }
  };
`;

const compressImage = (file: File, maxWidth: number = 800): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (typeof window.OffscreenCanvas !== 'undefined' && typeof window.Worker !== 'undefined') {
      const blob = new Blob([workerScript], { type: 'application/javascript' });
      const worker = new Worker(URL.createObjectURL(blob));
      worker.onmessage = (e) => {
        if (e.data.success) {
          const reader = new FileReader();
          reader.onload = (ev) => resolve(ev.target?.result as string);
          reader.readAsDataURL(e.data.blob);
        } else {
          fallbackCompress(file, maxWidth).then(resolve).catch(reject);
        }
        worker.terminate();
      };
      worker.onerror = () => {
        fallbackCompress(file, maxWidth).then(resolve).catch(reject);
        worker.terminate();
      };
      worker.postMessage({ file, maxWidth });
    } else {
      fallbackCompress(file, maxWidth).then(resolve).catch(reject);
    }
  });
};

const fallbackCompress = (file: File, maxWidth: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
};

// --- Types ---
interface Comment {
  id: string;
  text: string;
  createdAt: any;
}

interface Episode {
  id: number;
  title: string;
  link: string;
}

interface Movie {
  id: string;
  type?: "movie" | "series";
  title: string;
  description: string;
  image: string;
  category?: string;
  screenshots?: string[];
  link620p?: string;
  link720p?: string;
  link1080p?: string;
  link720pHevc?: string;
  link1080pHevc?: string;
  link4k?: string;
  size620p?: string;
  size720p?: string;
  size1080p?: string;
  size720pHevc?: string;
  size1080pHevc?: string;
  size4k?: string;
  extraLinks?: { name: string; url: string; size: string }[];
  ratings?: number[];
  episodes?: Episode[];
  isHighlight?: boolean;
  isLiveStream?: boolean;
  liveStreamLink?: string;
  trailerUrl?: string;
  createdAt?: any;
}


const DebouncedInput = ({ value, onChange, debounce = 300, ...props }: any) => {
  const [localValue, setLocalValue] = React.useState(value);
  const onChangeRef = React.useRef(onChange);
  React.useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  React.useEffect(() => { if (value !== undefined) setLocalValue(value); }, [value]);
  React.useEffect(() => {
    const handler = setTimeout(() => {
      onChangeRef.current(localValue);
    }, debounce);
    return () => clearTimeout(handler);
  }, [localValue, debounce]);
  return <input {...props} value={localValue} onChange={(e) => setLocalValue(e.target.value)} />;
};

const DebouncedTextarea = ({ value, onChange, debounce = 300, ...props }: any) => {
  const [localValue, setLocalValue] = React.useState(value);
  const onChangeRef = React.useRef(onChange);
  React.useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  React.useEffect(() => { if (value !== undefined) setLocalValue(value); }, [value]);
  React.useEffect(() => {
    const handler = setTimeout(() => {
      onChangeRef.current(localValue);
    }, debounce);
    return () => clearTimeout(handler);
  }, [localValue, debounce]);
  return <textarea {...props} value={localValue} onChange={(e) => setLocalValue(e.target.value)} />;
};

const CATEGORIES = [
  "Action",
  "Mystery",
  "Family",
  "Animation",
  "Fantasy",
  "Crime",
  "Drama",
  "Horror",
  "Comedy",
  "Sci-Fi",
  "Romance",
  "Thriller",
  "Adventure",
];

const ImageWithSkeleton = ({
  src,
  alt,
  className,
  onClick,
}: {
  src: string;
  alt: string;
  className?: string;
  onClick?: () => void;
}) => {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="relative w-full h-full">
      {!loaded && (
        <div className="absolute inset-0 bg-slate-800 animate-pulse" />
      )}
                            <img
        src={src}
        alt={alt}
        onClick={onClick}
        className={`${className} ${loaded ? "opacity-100" : "opacity-0"} transition-opacity duration-300`}
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
};

const getEmbedUrl = (url: string) => {
  if (!url) return '';
  if (url.includes('youtube.com/watch?v=')) {
    return url.replace('youtube.com/watch?v=', 'youtube.com/embed/').split('&')[0];
  }
  if (url.includes('youtu.be/')) {
    return url.replace('youtu.be/', 'youtube.com/embed/').split('?')[0];
  }
  return url;
};

const formatSize = (size: string | null) => {
  if (!size) return null;
  const bytes = parseInt(size, 10);
  if (isNaN(bytes) || bytes === 0) return null;
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + " GB";
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + " MB";
  return (bytes / 1024).toFixed(2) + " KB";
};

// Jugad for auto-detecting file size
const fetchFileSize = async (url: string): Promise<string> => {
  if (!url) return "";
  
  const proxies = [
    (u: string) => u,
    (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
    (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`
  ];

  for (const getProxyUrl of proxies) {
    try {
      const targetUrl = getProxyUrl(url);
      
      // Attempt 1: HEAD request
      let res = await fetch(targetUrl, { method: "HEAD" });
      let size = formatSize(res.headers.get("content-length"));
      if (size) return size;

      // Attempt 2: GET request (abort immediately to save bandwidth)
      const controller = new AbortController();
      res = await fetch(targetUrl, { method: "GET", signal: controller.signal });
      size = formatSize(res.headers.get("content-length"));
      controller.abort(); 
      if (size) return size;
      
    } catch (e) {
      // Silently try next proxy
    }
  }
  return "";
};


export const generateCleanSlug = (title) => {
  if (!title) return "movie";
  return title
    .toLowerCase()
    .replace(/hdtc|1080p|720p|480p|x264|full-movie/gi, '')
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, '');
};

export const getCleanTitle = (title) => {
  if (!title) return "";
  let clean = title.replace(/hdtc|1080p|720p|480p|x264|full-movie/gi, '').trim();
  clean = clean.replace(/[-_]+$/, '').trim();
  return clean;
};


const NativeBannerAd = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (containerRef.current && !containerRef.current.querySelector('script')) {
      const script = document.createElement('script');
      script.async = true;
      script.setAttribute('data-cfasync', 'false');
      script.src = 'https://pl31164034.profitableratecpmnetwork.com/809506099fd69325b0fe10497e00c479/invoke.js';
      containerRef.current.appendChild(script);
    }
  }, []);

  return (
    <div className="w-full flex justify-center py-8">
      <div id="container-809506099fd69325b0fe10497e00c479" ref={containerRef}></div>
    </div>
  );
};

export default function App() {
  // Navigation & Auth State
  const [screen, setScreen] = useState<
    "login" | "pin_check" | "admin_dashboard" | "public_home" | "movie_detail" | "mediator" | "loading" | "my_library"
  >(window.location.pathname.startsWith("/movie/") ? "loading" : "public_home");
  const [mediatorTarget, setMediatorTarget] = useState<{ id: string; quality: string; url?: string } | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [isAdminAuth, setIsAdminAuth] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const DIRECT_LINK = "https://www.profitableratecpmnetwork.com/d192d2ap8?key=b61f2d758f64d7e7b4e6a422be46afd5";

  const [adTriggeredKeys, setAdTriggeredKeys] = useState<Set<string>>(new Set());
  const [movieClickCount, setMovieClickCount] = useState(0);
  const [liveStreamClickCount, setLiveStreamClickCount] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (screen === 'public_home') {
      setMovieClickCount(0);
      setLiveStreamClickCount(0);
    }
  }, [screen]);

  // --- AD NETWORK SETUP ---
  const isMobileOrTablet = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isDesktop = !isMobileOrTablet;
  
  // Instantly block ads for admin using synchronous localStorage check
  const isStrictlyAdmin = localStorage.getItem("isAdmin") === "true";

  useEffect(() => {
    if (isStrictlyAdmin || isAdminAuth) return;
    if (screen === "admin_dashboard") return;
    
    const timer = setTimeout(() => {
      const existingScript = document.getElementById('social-bar-script');
      if (isMobileOrTablet && !existingScript) {
        const script = document.createElement('script');
        script.id = 'social-bar-script';
        script.src = 'https://pl31063278.profitableratecpmnetwork.com/b0/ca/63/b0ca630d2be61581807ab7009cf42df8.js';
        script.async = true;
        document.body.appendChild(script);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [isMobileOrTablet, screen, isAdminAuth, isStrictlyAdmin]);

  const [popunderInjected, setPopunderInjected] = useState(false);
  useEffect(() => {
    if (isStrictlyAdmin || isAdminAuth) return;
    if (screen === "admin_dashboard") return;
    
    const timer = setTimeout(() => {
      const existingScript = document.getElementById('popunder-script');
      if (isDesktop && !existingScript) {
        const script = document.createElement('script');
        script.id = 'popunder-script';
        script.src = 'https://pl31063276.profitableratecpmnetwork.com/1c/92/c8/1c92c833d1b12d095d2f10c876c01465.js';
        script.async = true;
        document.body.appendChild(script);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [isDesktop, screen, isAdminAuth, isStrictlyAdmin]);

  const handleMovieInteraction = () => {
    // Popunder is now injected on load for Desktop, it will handle clicks natively
  };

  
  // type can be 'movie_click' | 'download_click' | 'live_stream_click' | 'input_click'
  const triggerAdOverlay = (nextAction: () => void, adKey?: string, type: 'movie_click' | 'download_click' | 'live_stream_click' | 'input_click' = 'download_click') => {
    if (screen === "admin_dashboard") {
      nextAction();
      return;
    }
    
    // For movie clicks (navigate immediately, but trigger ad in background)
    if (type === 'movie_click') {
      if (movieClickCount < 2) {
        window.open(DIRECT_LINK, "_blank");
        setMovieClickCount(prev => prev + 1);
      }
      nextAction();
      return;
    }
    
    // For live stream clicks (requires 3 total clicks to proceed)
    if (type === 'live_stream_click') {
      if (liveStreamClickCount < 2) {
        window.open(DIRECT_LINK, "_blank");
        setLiveStreamClickCount(prev => prev + 1);
        return; // Block navigation
      } else {
        nextAction();
        return;
      }
    }

    // For input clicks
    if (type === 'input_click') {
      if (adKey && !adTriggeredKeys.has(adKey)) {
        window.open(DIRECT_LINK, "_blank");
        setAdTriggeredKeys(prev => new Set(prev).add(adKey));
      }
      nextAction();
      return;
    }
    
    // For download clicks
    if (adKey) {
      if (!adTriggeredKeys.has(adKey)) {
        window.open(DIRECT_LINK, "_blank");
        setAdTriggeredKeys(prev => new Set(prev).add(adKey));
      }
    } else {
      window.open(DIRECT_LINK, "_blank");
    }
    
    nextAction();
  };

  const [showNotificationPopup, setShowNotificationPopup] = useState(false);

  const installPopupShown = useRef(false);
  useEffect(() => {
    if (screen === "public_home" && !installPopupShown.current) {
      const timer = setTimeout(() => {
        setShowNotificationPopup(true);
        installPopupShown.current = true;
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [screen]);
  



  const [newMovieNotice, setNewMovieNotice] = useState<string | null>(null);
  const initialLoadComplete = useRef(false);
  const initialRoutingDone = useRef(false);
  const [watchLaterList, setWatchLaterList] = useState<string[]>(() => {
    const saved = localStorage.getItem("watchLaterList");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("watchLaterList", JSON.stringify(watchLaterList));
  }, [watchLaterList]);




  // Global Link Interceptor for Mediator
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      const anchor = target.closest('a');
      if (anchor) {
        const rawHref = anchor.getAttribute('href');
        if (rawHref && rawHref.startsWith("mediator:")) {
          e.preventDefault();
          const parts = rawHref.split(":");
          if (parts.length >= 3) {
            setMediatorTarget({ id: parts[1], quality: parts[2] });
            setScreen("mediator");
          }
        }
      }
    };
    document.addEventListener("click", handleClick, true); // Use capture phase to intercept early
    return () => document.removeEventListener("click", handleClick, true);
  }, [screen]);

  const toggleWatchLater = (movieId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setWatchLaterList(prev => 
        prev.includes(movieId) ? prev.filter(id => id !== movieId) : [...prev, movieId]
    );
  };


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUserEmail(user.email);
        if (user.email === "lalitasuraj27@gmail.com") {
          setIsAdminAuth(true);
          localStorage.setItem("isAdmin", "true");
        } else {
          setIsAdminAuth(false);
          localStorage.removeItem("isAdmin");
        }
        if (screen === "login") {
           setScreen("public_home");
        }
      } else {
        setCurrentUserEmail(null);
        setIsAdminAuth(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Login Form States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [pinError, setPinError] = useState("");

  // Movie Form States
  const [movieTitle, setMovieTitle] = useState("");
  const [movieDesc, setMovieDesc] = useState("");
  const [movieImage, setMovieImage] = useState<string | null>(null);
  const [movieImageUrlInput, setMovieImageUrlInput] = useState("");
  const [movieScreenshots, setMovieScreenshots] = useState<string[]>([]);
  const [movieScreenshotUrlInput, setMovieScreenshotUrlInput] = useState("");
  const [isMovieHighlight, setIsMovieHighlight] = useState(false);
  const [isLiveStream, setIsLiveStream] = useState(false);
  const [liveStreamLink, setLiveStreamLink] = useState("");
  const [movieTrailerUrl, setMovieTrailerUrl] = useState("");
  const [link620p, setLink620p] = useState("");
  const [link720p, setLink720p] = useState("");
  const [link1080p, setLink1080p] = useState("");
  const [link720pHevc, setLink720pHevc] = useState("");
  const [link1080pHevc, setLink1080pHevc] = useState("");
  const [link4k, setLink4k] = useState("");
  const [size620p, setSize620p] = useState("");
  const [size720p, setSize720p] = useState("");
  const [size1080p, setSize1080p] = useState("");
  const [size720pHevc, setSize720pHevc] = useState("");
  const [size1080pHevc, setSize1080pHevc] = useState("");
  const [size4k, setSize4k] = useState("");
  const [extraLinks, setExtraLinks] = useState<{ name: string; url: string; size: string }[]>([]);

  const [adminError, setAdminError] = useState("");
  const [adminSuccess, setAdminSuccess] = useState("");
  useEffect(() => {
    if (adminSuccess) {
      const timer = setTimeout(() => {
        setAdminSuccess("");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [adminSuccess]);
  const [editingMovieId, setEditingMovieId] = useState<string | null>(null);
  


  // Series Form States
  const [activeAdminTab, setActiveAdminTab] = useState<"movie" | "series">(
    "movie",
  );
  const [seriesTitle, setSeriesTitle] = useState("");
  const [seriesDesc, setSeriesDesc] = useState("");
  const [seriesImage, setSeriesImage] = useState<string | null>(null);
  const [seriesImageUrlInput, setSeriesImageUrlInput] = useState("");
  const [seriesCategory, setSeriesCategory] = useState<string[]>([CATEGORIES[0]]);
  const [seriesScreenshots, setSeriesScreenshots] = useState<string[]>([]);
  const [seriesScreenshotUrlInput, setSeriesScreenshotUrlInput] = useState("");
  const [isSeriesHighlight, setIsSeriesHighlight] = useState(false);
  const [seriesTrailerUrl, setSeriesTrailerUrl] = useState("");
  const [episodes, setEpisodes] = useState<{ link: string }[]>([{ link: "" }]);
  const [seriesLink620p, setSeriesLink620p] = useState("");
  const [seriesLink720p, setSeriesLink720p] = useState("");
  const [seriesLink1080p, setSeriesLink1080p] = useState("");
  const [seriesLink720pHevc, setSeriesLink720pHevc] = useState("");
  const [seriesLink1080pHevc, setSeriesLink1080pHevc] = useState("");
  const [seriesLink4k, setSeriesLink4k] = useState("");
  const [seriesSize620p, setSeriesSize620p] = useState("");
  const [seriesSize720p, setSeriesSize720p] = useState("");
  const [seriesSize1080p, setSeriesSize1080p] = useState("");
  const [seriesSize720pHevc, setSeriesSize720pHevc] = useState("");
  const [seriesSize1080pHevc, setSeriesSize1080pHevc] = useState("");
  const [seriesSize4k, setSeriesSize4k] = useState("");
  const [seriesExtraLinks, setSeriesExtraLinks] = useState<{ name: string; url: string; size: string }[]>([]);

  const [starClicks, setStarClicks] = useState(0);
  const [showAdminLoginForm, setShowAdminLoginForm] = useState(false);

  // UI States
  const fileInputRef = useRef<HTMLInputElement>(null);
  const screenshotsInputRef = useRef<HTMLInputElement>(null);
  const seriesFileInputRef = useRef<HTMLInputElement>(null);
  const seriesScreenshotsInputRef = useRef<HTMLInputElement>(null);

  // App Data State
  const [movies, setMovies] = useState<Movie[]>([]);
  const [isLoadingMovies, setIsLoadingMovies] = useState(true);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [isSliderHovered, setIsSliderHovered] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [isTrailerResumed, setIsTrailerResumed] = useState(false);
  const [showResumeOverlay, setShowResumeOverlay] = useState(false);
  const [isScrolledPast, setIsScrolledPast] = useState(false);
  
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolledPast(window.scrollY > (window.innerWidth <= 768 ? 150 : 400));
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setShowTrailer(false);
    setIsTrailerResumed(false);
    setShowResumeOverlay(false);
    // On mobile, just play after 3s. On PC, play after 1.5s of hovering (or just 1s).
    // Actually, user wants: if window is hovered, show full trailer. 
    // We will just let showTrailer=true after 3s, but in render we check (showTrailer && (isMobile || isSliderHovered))
    const timeout = setTimeout(() => {
      setShowTrailer(true);
    }, 2000);
    return () => clearTimeout(timeout);
  }, [highlightIndex]);
  const [bookmarks, setBookmarks] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('movieBookmarks');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('movieBookmarks', JSON.stringify(bookmarks));
  }, [bookmarks]);

  // Viewed Episodes State for Web Series
  const [viewedEpisodes, setViewedEpisodes] = React.useState<Record<string, string[]>>(() => {
    try {
      const stored = localStorage.getItem('viewedEpisodes');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });
  React.useEffect(() => {
    localStorage.setItem('viewedEpisodes', JSON.stringify(viewedEpisodes));
  }, [viewedEpisodes]);

  const toggleEpisodeViewed = (movieId: string, episodeId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setViewedEpisodes(prev => {
      const movieViewed = prev[movieId] || [];
      const updated = movieViewed.includes(episodeId) 
        ? movieViewed.filter(id => id !== episodeId)
        : [...movieViewed, episodeId];
      return { ...prev, [movieId]: updated };
    });
  };

  const toggleBookmark = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setBookmarks(prev => prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]);
  };

  useEffect(() => {
    if (screen !== "public_home") return;
    const hCount = movies.filter(m => m.isHighlight).length;
    if (hCount === 0) return;
    
    // Auto-slide removed based on user request. Only manually slide.
    
    return () => {
      // Cleanups for timeouts removed
    };
  }, [screen, highlightIndex, movies, isTrailerResumed]);

  // AI Bot State
  const [botCheckStatus, setBotCheckStatus] = useState<"idle" | "running" | "done">("idle");
  const [brokenLinksReport, setBrokenLinksReport] = useState<{movieId: string, title: string, linkType: string, url: string}[]>([]);
  const [lastChecked, setLastChecked] = useState<string | null>(localStorage.getItem("ai_bot_last_checked"));

  const runAiBotCheck = async () => {
    setBotCheckStatus("running");
    const broken: {movieId: string, title: string, linkType: string, url: string}[] = [];
    
    // Check up to 50 movies to keep it somewhat fast in frontend
    const moviesToCheck = movies.slice(0, 50);
    
    for (const m of moviesToCheck) {
        const links = [];
        if (m.type === 'movie') {
            if (m.link620p) links.push({ type: '620p', url: m.link620p });
            if (m.link720p) links.push({ type: '720p', url: m.link720p });
            if (m.link1080p) links.push({ type: '1080p', url: m.link1080p });
        } else if (m.type === 'series') {
            m.episodes?.forEach((ep, i) => {
               if (ep.link) links.push({ type: `Ep ${i+1}`, url: ep.link });
            });
        }
        
        for (const l of links) {
           try {
              // Quick check via allorigins proxy to avoid CORS
              const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(l.url)}`);
              const data = await res.json();
              if (data.status && data.status.http_code >= 400 && data.status.http_code !== 403) { // 403 might just be anti-bot blocking on valid link
                 broken.push({ movieId: m.id, title: m.title, linkType: l.type, url: l.url });
              }
           } catch (e) {
              // Ignore proxy failure to not false positive too much
           }
        }
    }
    setBrokenLinksReport(broken);
    setBotCheckStatus("done");
    const now = new Date().toLocaleString();
    setLastChecked(now);
    localStorage.setItem("ai_bot_last_checked", now);
  };

  useEffect(() => {
    if (isAdminAuth && screen === "admin_dashboard" && movies.length > 0) {
       const last = localStorage.getItem("ai_bot_last_checked");
       if (!last) {
          runAiBotCheck();
       } else {
          // Check if 48 hours passed (1 din chhodke 1 din check karega automaticly)
          const lastDate = new Date(last).getTime();
          if (Date.now() - lastDate > 48 * 60 * 60 * 1000) {
              runAiBotCheck();
          }
       }
    }
  }, [isAdminAuth, screen, movies.length]);

  // Comments State
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    const fetchStartTime = performance.now();
    // 🔥 Humne query mein 'orderBy' jod diya hai taaki Instagram jaisa live setup bane
    const q = query(collection(db, "movies"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchEndTime = performance.now();
        if (process.env.NODE_ENV !== "production") {
          console.log(`[Performance] Movies data loaded in ${(fetchEndTime - fetchStartTime).toFixed(2)}ms (Count: ${snapshot.size})`);
        }
        const moviesData: Movie[] = [];
        snapshot.forEach((doc) => {
          moviesData.push({ id: doc.id, ...doc.data() } as Movie);
        });
        
        if (initialLoadComplete.current) {
          snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
              const data = change.doc.data();
              if (data.createdAt && data.createdAt.toMillis && (Date.now() - data.createdAt.toMillis() < 60000)) {
                if (auth.currentUser) {
                  setNewMovieNotice(data.title);
                  setTimeout(() => setNewMovieNotice(null), 5000);
                }
              }
            }
          });
        }
        initialLoadComplete.current = true;

        // Ab data direct top-to-bottom automatically line mein lag kar aayega
        setMovies(moviesData);
        setIsLoadingMovies(false);
      },
      (error) => {
        console.error("Firestore Error in App.tsx movies onSnapshot:", error);
      },
    );
    return () => unsubscribe();
  }, []);

  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [adminSearchQuery, setAdminSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [movieCategory, setMovieCategory] = useState<string[]>(["Action"]);
  const [customCategoryInput, setCustomCategoryInput] = useState("");
  const [customSeriesCategoryInput, setCustomSeriesCategoryInput] = useState("");

  // Fetch comments when selectedMovie changes
  useEffect(() => {
    if (!selectedMovie) {
      setComments([]);
      return;
    }
    const commentsRef = collection(db, "movies", selectedMovie.id, "comments");
    const q = query(commentsRef, orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const commentsData: Comment[] = [];
      snapshot.forEach((doc) => {
        commentsData.push({ id: doc.id, ...doc.data() } as Comment);
      });
      setComments(commentsData);
    }, (error) => {
      console.error("Comments onSnapshot error:", error);
    });
    return () => unsubscribe();
  }, [selectedMovie]);

  // URL updating logic
  useEffect(() => {
    if (screen === "movie_detail" && selectedMovie) {
      document.title = selectedMovie.title;
      
      // Update Description
      let metaDesc = document.querySelector('meta[name="description"]') || document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      metaDesc.setAttribute('content', selectedMovie.description?.substring(0, 160) || "");
      document.head.appendChild(metaDesc);

      // Update OG Title
      let ogTitle = document.querySelector('meta[property="og:title"]') || document.createElement('meta');
      ogTitle.setAttribute('property', 'og:title');
      ogTitle.setAttribute('content', selectedMovie.title);
      document.head.appendChild(ogTitle);

      // Update OG Image
      let ogImage = document.querySelector('meta[property="og:image"]') || document.createElement('meta');
      ogImage.setAttribute('property', 'og:image');
      ogImage.setAttribute('content', selectedMovie.image);
      document.head.appendChild(ogImage);

      // Update OG URL
      let ogUrl = document.querySelector('meta[property="og:url"]') || document.createElement('meta');
      ogUrl.setAttribute('property', 'og:url');
      ogUrl.setAttribute('content', window.location.href);
      document.head.appendChild(ogUrl);
      
      let jsonLdScript = document.querySelector('#movie-json-ld');
      if (!jsonLdScript) {
        jsonLdScript = document.createElement('script');
        jsonLdScript.id = 'movie-json-ld';
        jsonLdScript.setAttribute('type', 'application/ld+json');
        document.head.appendChild(jsonLdScript);
      }
      const jsonLdData = {
        "@context": "https://schema.org",
        "@type": selectedMovie.type === "series" ? "TVSeries" : "Movie",
        "name": selectedMovie.title,
        "image": selectedMovie.image,
        "description": selectedMovie.description,
        "url": window.location.href
      };
      jsonLdScript.textContent = JSON.stringify(jsonLdData);

      const slug = generateCleanSlug(selectedMovie.title);
      const newUrl = `/movie/${selectedMovie.id}/${slug}`;
      if (window.location.pathname !== newUrl) {
         window.history.pushState({ screen: "movie_detail", movieId: selectedMovie.id }, '', newUrl);
      }
    } else if (screen === "public_home") {
      document.title = "Aplex Cinema - Download Latest HD Movies & Web Series";
      if (window.location.pathname !== "/") {
         window.history.pushState({ screen: "public_home" }, '', "/");
      }
      const jsonLdScript = document.querySelector('#movie-json-ld');
      if (jsonLdScript) {
        jsonLdScript.remove();
      }
    }
  }, [screen, selectedMovie]);

  // Initial routing and PopState handling
  useEffect(() => {
    const handlePopState = () => {
       const path = window.location.pathname;
       if (path.startsWith("/movie/")) {
          const parts = path.split("/");
          const movieId = parts[2];
          if (movieId && movies.length > 0) {
             const m = movies.find(m => m.id === movieId);
             if (m) {
                 setSelectedMovie(m);
                 setScreen("movie_detail");
             }
          }
       } else if (path === "/") {
          setScreen("public_home");
       }
    };
    window.addEventListener("popstate", handlePopState);
    
    // Initial routing logic once movies are loaded
    if (movies.length > 0 && !initialRoutingDone.current) {
       initialRoutingDone.current = true;
       const path = window.location.pathname;
       if (path.startsWith("/movie/")) {
          const parts = path.split("/");
          const movieId = parts[2];
          if (movieId) {
             const m = movies.find(m => m.id === movieId);
             if (m) {
                 setSelectedMovie(m);
                 setScreen("movie_detail");
             } else {
                 setScreen("public_home");
             }
          }
       }
    }

    return () => window.removeEventListener("popstate", handlePopState);
  }, [movies]);

  // --- Handlers ---
  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, rawHref: string) => {
    e.preventDefault();
    if (rawHref.startsWith("mediator:")) {
      const parts = rawHref.split(":");
      if (parts.length >= 3) {
        setMediatorTarget({ id: parts[1], quality: parts[2] });
        setScreen("mediator");
      }
    } else {
      window.open(rawHref, "_blank");
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedMovie) return;

    try {
      const commentsRef = collection(
        db,
        "movies",
        selectedMovie.id,
        "comments",
      );
      await addDoc(commentsRef, {
        text: newComment.trim(),
        createdAt: serverTimestamp(),
      });
      setNewComment("");
    } catch (e) {
      console.error("Error adding comment", e);
    }
  };

  const handleRateMovie = async (movieId: string, rating: number) => {
    try {
      const movieToUpdate = movies.find((m) => m.id === movieId);
      if (movieToUpdate) {
        const currentRatings = movieToUpdate.ratings || [];
        const newRatings = [...currentRatings, rating];

        await updateDoc(doc(db, "movies", movieId), {
          ratings: newRatings,
        });

        // Optimistically update selectedMovie
        if (selectedMovie && selectedMovie.id === movieId) {
          setSelectedMovie({ ...selectedMovie, ratings: newRatings });
        }
      }
    } catch (e) {
      console.error("Error rating movie", e);
    }
  };

  const handleMovieClick = (e: React.MouseEvent<any>, movie: any) => {
    e.preventDefault();
    e.stopPropagation();
    
    const isMobile = window.innerWidth <= 768;
    const slug = generateCleanSlug(movie.title);
    const newUrl = `/movie/${movie.id}/${slug}`;
    
    if (screen === "admin_dashboard") {
      window.history.pushState({ screen: "movie_detail", movieId: movie.id }, "", newUrl);
      setSelectedMovie(movie);
      setScreen("movie_detail");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // Open 1 ad only for the first time someone clicks on a movie
    if (!adTriggeredKeys.has(movie.id)) {
      window.open(DIRECT_LINK, "_blank");
      setAdTriggeredKeys(prev => {
        const newSet = new Set(prev);
        newSet.add(movie.id);
        return newSet;
      });
    }

    if (isMobile) {
      window.history.pushState({ screen: "movie_detail", movieId: movie.id }, "", newUrl);
      setSelectedMovie(movie);
      setScreen("movie_detail");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      // Instead of opening in a new tab, navigate in the same tab so popups don't get blocked
      // when ad is already opening in a new tab.
      window.history.pushState({ screen: "movie_detail", movieId: movie.id }, "", newUrl);
      setSelectedMovie(movie);
      setScreen("movie_detail");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleAutoDetectMovieSizes = async () => {
    setAdminError("");
    setAdminSuccess("Detecting sizes (this may take a few seconds)...");
    
    let detectedCount = 0;
    if (link620p && !size620p) { const s = await fetchFileSize(link620p); if(s) { setSize620p(s); detectedCount++; } }
    if (link720p && !size720p) { const s = await fetchFileSize(link720p); if(s) { setSize720p(s); detectedCount++; } }
    if (link1080p && !size1080p) { const s = await fetchFileSize(link1080p); if(s) { setSize1080p(s); detectedCount++; } }
    if (link720pHevc && !size720pHevc) { const s = await fetchFileSize(link720pHevc); if(s) { setSize720pHevc(s); detectedCount++; } }
    if (link1080pHevc && !size1080pHevc) { const s = await fetchFileSize(link1080pHevc); if(s) { setSize1080pHevc(s); detectedCount++; } }
    if (link4k && !size4k) { const s = await fetchFileSize(link4k); if(s) { setSize4k(s); detectedCount++; } }
    
    setAdminSuccess(detectedCount > 0 ? `Auto-detected ${detectedCount} sizes!` : "Could not auto-detect sizes. (Google Drive/Terabox links may block this). Please enter manually.");
  };

  const handleAutoDetectSeriesSizes = async () => {
    setAdminError("");
    setAdminSuccess("Detecting sizes (this may take a few seconds)...");
    
    let detectedCount = 0;
    if (seriesLink620p && !seriesSize620p) { const s = await fetchFileSize(seriesLink620p); if(s) { setSeriesSize620p(s); detectedCount++; } }
    if (seriesLink720p && !seriesSize720p) { const s = await fetchFileSize(seriesLink720p); if(s) { setSeriesSize720p(s); detectedCount++; } }
    if (seriesLink1080p && !seriesSize1080p) { const s = await fetchFileSize(seriesLink1080p); if(s) { setSeriesSize1080p(s); detectedCount++; } }
    if (seriesLink720pHevc && !seriesSize720pHevc) { const s = await fetchFileSize(seriesLink720pHevc); if(s) { setSeriesSize720pHevc(s); detectedCount++; } }
    if (seriesLink1080pHevc && !seriesSize1080pHevc) { const s = await fetchFileSize(seriesLink1080pHevc); if(s) { setSeriesSize1080pHevc(s); detectedCount++; } }
    if (seriesLink4k && !seriesSize4k) { const s = await fetchFileSize(seriesLink4k); if(s) { setSeriesSize4k(s); detectedCount++; } }
    
    setAdminSuccess(detectedCount > 0 ? `Auto-detected ${detectedCount} sizes!` : "Could not auto-detect sizes. (Google Drive/Terabox links may block this). Please enter manually.");
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCurrentUserEmail(null);
      setIsAdminAuth(false);
      localStorage.removeItem("isAdmin");
      setEmail("");
      setPassword("");
      setPin("");
      setScreen("public_home");
      setShowAdminLoginForm(false);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    if (!email || !password) {
      setLoginError("Please fill in all fields.");
      return;
    }

    if (showAdminLoginForm) {
      if (email === "kushbhardwajadmin" && password === "1983") {
        setIsAdminAuth(true);
        setScreen("admin_dashboard");
        return;
      } else {
        setLoginError("Invalid Admin Credentials! Access Denied.");
        return;
      }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setLoginError("Please enter a valid email address.");
      return;
    }
    
    const emailLower = email.toLowerCase();

    // Check if it's admin trying to log in directly via email/password form with PIN
    if (emailLower === "lalitasuraj27@gmail.com") {
      if (pin === "1983") {
        try {
          await signInWithEmailAndPassword(auth, emailLower, password);
          setIsAdminAuth(true);
          setScreen("admin_dashboard");
        } catch (error: any) {
          try {
            await createUserWithEmailAndPassword(auth, emailLower, password);
            setIsAdminAuth(true);
            setScreen("admin_dashboard");
          } catch (createError: any) {
            setLoginError(error.message);
          }
        }
      } else {
        setLoginError("Invalid Admin Credentials! Access Denied.");
      }
      return;
    }

    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
        setShowNotificationPopup(true);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      setScreen("public_home");
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
         setLoginError("Incorrect email or password. If you don't have an account, please register.");
      } else if (error.code === 'auth/email-already-in-use') {
         setLoginError("Email is already registered. Please login instead.");
      } else {
         setLoginError(error.message || "Authentication failed. Please try again.");
      }
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const isNewUser = result.user.metadata.creationTime === result.user.metadata.lastSignInTime;
      if (isNewUser) {
        setShowNotificationPopup(true);
      }
      setScreen("public_home");
    } catch (error: any) {
      if (error.code === "auth/cancelled-popup-request" || error.code === "auth/popup-closed-by-user") {
        return;
      }
      console.error(error);
      setLoginError(error.message || "Google Sign-In failed. Please try again.");
    }
  };

  const handleSeriesImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 600);
        setSeriesImage(compressed);
      } catch (error) {
        console.error("Image compression failed:", error);
      }
    }
  };

  const handleSeriesScreenshotsChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length > 0) {
      try {
        const compressedImages = await Promise.all(
          files.map(file => compressImage(file, 800))
        );
        setSeriesScreenshots(prev => [...prev, ...compressedImages]);
      } catch (error) {
        console.error("Screenshots compression failed:", error);
      }
    }
  };

  const manageHighlightsCount = async () => {
    const currentHighlights = movies.filter((m) => m.isHighlight);
    if (currentHighlights.length >= 8) {
      const sorted = [...currentHighlights].sort((a, b) => {
        let timeA = 0;
        if (a.createdAt) {
          timeA = a.createdAt.seconds
            ? a.createdAt.seconds * 1000
            : typeof a.createdAt.toMillis === "function"
              ? a.createdAt.toMillis()
              : new Date(a.createdAt).getTime();
        }
        let timeB = 0;
        if (b.createdAt) {
          timeB = b.createdAt.seconds
            ? b.createdAt.seconds * 1000
            : typeof b.createdAt.toMillis === "function"
              ? b.createdAt.toMillis()
              : new Date(b.createdAt).getTime();
        }
        return timeA - timeB;
      });
      const excessCount = sorted.length - 7;
      const toRemove = sorted.slice(0, excessCount);
      for (const item of toRemove) {
        try {
          await updateDoc(doc(db, "movies", item.id), { isHighlight: false });
        } catch (err) {
          console.error("Error removing highlight:", err);
        }
      }
    }
  };

  const handleAddSeries = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUploading) return;
    setAdminError("");
    setAdminSuccess("");
    setIsUploading(true);

    const validEpisodes = episodes.filter((ep) => ep.link.trim() !== "");
    if (!seriesTitle || !seriesDesc || validEpisodes.length === 0) {
      setAdminError(
        "Please fill Title, Description and at least one valid Episode Link.",
      );
      return;
    }

    try {
      if (isSeriesHighlight && (!editingMovieId || movies.find(m => m.id === editingMovieId)?.isHighlight !== isSeriesHighlight)) {
        await manageHighlightsCount();
      }

      if (editingMovieId) {
        if (seriesLink620p) localStorage.setItem(`movieUrl_620p_${editingMovieId}`, seriesLink620p);
        if (seriesLink720p) localStorage.setItem(`movieUrl_720p_${editingMovieId}`, seriesLink720p);
        if (seriesLink1080p) localStorage.setItem(`movieUrl_1080p_${editingMovieId}`, seriesLink1080p);
        validEpisodes.forEach((ep, idx) => {
            localStorage.setItem(`movieUrl_ep${idx}_${editingMovieId}`, ep.link);
        });

        const updateData = {
          title: seriesTitle,
          description: seriesDesc,
          image: seriesImage || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&q=80",
          category: seriesCategory,
          screenshots: seriesScreenshots,
          episodes: validEpisodes.map((ep, idx) => ({
            id: Date.now() + idx,
            title: `Episode ${idx + 1}`,
            link: ep.link,
          })),
          link620p: seriesLink620p,
          link720p: seriesLink720p,
          link1080p: seriesLink1080p,
          link720pHevc: seriesLink720pHevc,
          link1080pHevc: seriesLink1080pHevc,
          link4k: seriesLink4k,
          size620p: seriesSize620p,
          size720p: seriesSize720p,
          size1080p: seriesSize1080p,
          size720pHevc: seriesSize720pHevc,
          size1080pHevc: seriesSize1080pHevc,
          size4k: seriesSize4k,
          extraLinks: seriesExtraLinks,
          isHighlight: isSeriesHighlight,
          trailerUrl: seriesTrailerUrl,
        };
        
        if (bringToTop) {
          updateData.createdAt = new Date();
        }
        await updateDoc(doc(db, "movies", editingMovieId), updateData);
        setAdminSuccess("Web Series updated successfully!");
        setEditingMovieId(null);
      } else {
        const docRef = doc(collection(db, "movies"));
        const docId = docRef.id;
        
        if (seriesLink620p) localStorage.setItem(`movieUrl_620p_${docId}`, seriesLink620p);
        if (seriesLink720p) localStorage.setItem(`movieUrl_720p_${docId}`, seriesLink720p);
        if (seriesLink1080p) localStorage.setItem(`movieUrl_1080p_${docId}`, seriesLink1080p);
        validEpisodes.forEach((ep, idx) => {
            localStorage.setItem(`movieUrl_ep${idx}_${docId}`, ep.link);
        });

        const newSeries = {
          type: "series",
          title: seriesTitle,
          description: seriesDesc,
          image:
            seriesImage ||
            "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&q=80",
          category: seriesCategory,
          screenshots: seriesScreenshots,
          episodes: validEpisodes.map((ep, idx) => ({
            id: Date.now() + idx,
            title: `Episode ${idx + 1}`,
            link: ep.link,
          })),
          link620p: seriesLink620p,
          link720p: seriesLink720p,
          link1080p: seriesLink1080p,
          link720pHevc: seriesLink720pHevc,
          link1080pHevc: seriesLink1080pHevc,
          link4k: seriesLink4k,
          size620p: seriesSize620p,
          size720p: seriesSize720p,
          size1080p: seriesSize1080p,
          size720pHevc: seriesSize720pHevc,
          size1080pHevc: seriesSize1080pHevc,
          size4k: seriesSize4k,
          extraLinks: seriesExtraLinks,
          ratings: [],
          createdAt: new Date(),
          isHighlight: isSeriesHighlight,
          trailerUrl: seriesTrailerUrl,
        };

        await setDoc(docRef, newSeries);
        setAdminSuccess("Web Series published successfully!");
      }

      setSeriesTitle("");
      setSeriesDesc("");
      setSeriesImage(null);
      setSeriesScreenshots([]);
      setIsSeriesHighlight(false);
      setSeriesTrailerUrl("");
      setEpisodes([{ link: "" }]);
      setSeriesLink620p("");
      setSeriesLink720p("");
      setSeriesLink1080p("");
      setSeriesLink720pHevc("");
      setSeriesLink1080pHevc("");
      setSeriesLink4k("");
      setSeriesSize620p("");
      setSeriesSize720p("");
      setSeriesSize1080p("");
      setSeriesSize720pHevc("");
      setSeriesSize1080pHevc("");
      setSeriesSize4k("");
      if (seriesFileInputRef.current) seriesFileInputRef.current.value = "";
      if (seriesScreenshotsInputRef.current)
        seriesScreenshotsInputRef.current.value = "";

      setTimeout(() => {
        setAdminSuccess("");
        // Only redirect to home if we added a new series, otherwise stay in admin panel
        if (!editingMovieId) setScreen("public_home");
      }, 1500);
    } catch (error) {
      setAdminError("Failed to save series to network.");
      console.error(error);
    }
  };

  const handleEditSeries = (movie: Movie) => {
    setActiveAdminTab("series");
    setEditingMovieId(movie.id);
    setSeriesTitle(movie.title || "");
    setSeriesDesc(movie.description || "");
    setSeriesImage(movie.image || null);
    setSeriesCategory(Array.isArray(movie.category) ? movie.category : (movie.category ? [movie.category] : []));
    setSeriesScreenshots(movie.screenshots || []);
    setSeriesLink620p(movie.link620p || "");
    setSeriesLink720p(movie.link720p || "");
    setSeriesLink1080p(movie.link1080p || "");
    setSeriesLink720pHevc(movie.link720pHevc || "");
    setSeriesLink1080pHevc(movie.link1080pHevc || "");
    setSeriesLink4k(movie.link4k || "");
    setSeriesSize620p(movie.size620p || "");
    setSeriesSize720p(movie.size720p || "");
    setSeriesSize1080p(movie.size1080p || "");
    setSeriesSize720pHevc(movie.size720pHevc || "");
    setSeriesSize1080pHevc(movie.size1080pHevc || "");
    setSeriesSize4k(movie.size4k || "");
    setSeriesExtraLinks(movie.extraLinks || []);
    setIsSeriesHighlight(movie.isHighlight || false);
    setSeriesTrailerUrl(movie.trailerUrl || "");
    setEpisodes(movie.episodes?.length ? movie.episodes.map(ep => ({ link: ep.link })) : [{ link: "" }]);
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 600);
        setMovieImage(compressed);
      } catch (error) {
        console.error("Image compression failed:", error);
      }
    }
  };

  const handleScreenshotsChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length > 0) {
      try {
        const compressedImages = await Promise.all(
          files.map(file => compressImage(file, 800))
        );
        setMovieScreenshots(prev => [...prev, ...compressedImages]);
      } catch (error) {
        console.error("Screenshots compression failed:", error);
      }
    }
  };

  const handleAddMovie = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUploading) return;
    setAdminError("");
    setAdminSuccess("");
    setIsUploading(true);

    if (!movieTitle || !movieDesc || (!link620p && !link720p && !link1080p)) {
      setAdminError(
        "Please fill at least Title, Description and one valid Download Link.",
      );
      return;
    }

    try {
      if (isMovieHighlight && (!editingMovieId || movies.find(m => m.id === editingMovieId)?.isHighlight !== isMovieHighlight)) {
        await manageHighlightsCount();
      }

      if (editingMovieId) {
        if (link620p) localStorage.setItem(`movieUrl_620p_${editingMovieId}`, link620p);
        if (link720p) localStorage.setItem(`movieUrl_720p_${editingMovieId}`, link720p);
        if (link1080p) localStorage.setItem(`movieUrl_1080p_${editingMovieId}`, link1080p);
        if (liveStreamLink) localStorage.setItem(`movieUrl_live_${editingMovieId}`, liveStreamLink);

        const bringToTop = window.confirm("Republish: Do you want to bring this Movie to the top of the list?\n\nClick OK to move it to top, or Cancel to keep it in its original position.");
        
        const updateData: any = {
          title: movieTitle,
          description: movieDesc,
          image: movieImage || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&q=80",
          category: movieCategory,
          screenshots: movieScreenshots,
          link620p: link620p,
          link720p: link720p,
          link1080p: link1080p,
          link720pHevc: link720pHevc,
          link1080pHevc: link1080pHevc,
          link4k: link4k,
          size620p,
          size720p,
          size1080p,
          size720pHevc,
          size1080pHevc,
          size4k,
          extraLinks,
          isHighlight: isMovieHighlight,
          isLiveStream,
          liveStreamLink: liveStreamLink,
          trailerUrl: movieTrailerUrl,
        };
        
        if (bringToTop) {
          updateData.createdAt = new Date();
        }
        await updateDoc(doc(db, "movies", editingMovieId), updateData);
        setAdminSuccess("Movie updated successfully!");
        setEditingMovieId(null);
      } else {
        const docRef = doc(collection(db, "movies"));
        const docId = docRef.id;

        if (link620p) localStorage.setItem(`movieUrl_620p_${docId}`, link620p);
        if (link720p) localStorage.setItem(`movieUrl_720p_${docId}`, link720p);
        if (link1080p) localStorage.setItem(`movieUrl_1080p_${docId}`, link1080p);
        if (liveStreamLink) localStorage.setItem(`movieUrl_live_${docId}`, liveStreamLink);

        const newMovie = {
          title: movieTitle,
          description: movieDesc,
          image:
            movieImage ||
            "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&q=80",
          category: movieCategory,
          screenshots: movieScreenshots,
          type: "movie",
          link620p: link620p,
          link720p: link720p,
          link1080p: link1080p,
          link720pHevc: link720pHevc,
          link1080pHevc: link1080pHevc,
          link4k: link4k,
          size620p,
          size720p,
          size1080p,
          size720pHevc,
          size1080pHevc,
          size4k,
          extraLinks,
          ratings: [],
          createdAt: new Date(),
          isHighlight: isMovieHighlight,
          isLiveStream,
          liveStreamLink: liveStreamLink,
          trailerUrl: movieTrailerUrl,
        };

        await setDoc(docRef, newMovie);
        setAdminSuccess("Movie published successfully!");
      }

      setMovieTitle("");
      setMovieDesc("");
      setMovieImage(null);
      setMovieScreenshots([]);
      setLink620p("");
      setLink720p("");
      setLink1080p("");
      setLink720pHevc("");
      setLink1080pHevc("");
      setLink4k("");
      setSize620p("");
      setSize720p("");
      setSize1080p("");
      setSize720pHevc("");
      setSize1080pHevc("");
      setSize4k("");
      setIsMovieHighlight(false);
      setIsLiveStream(false);
      setLiveStreamLink("");
      setMovieTrailerUrl("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (screenshotsInputRef.current) screenshotsInputRef.current.value = "";

      setTimeout(() => {
        setAdminSuccess("");
        // Only redirect to home if we added a new movie, otherwise stay in admin panel
        if (!editingMovieId) setScreen("public_home");
      }, 1500);
    } catch (error) {
      setAdminError("Failed to save movie to network.");
      console.error(error);
    }
  };

  const handleEditMovie = (movie: Movie) => {
    setActiveAdminTab("movie");
    setEditingMovieId(movie.id);
    setMovieTitle(movie.title || "");
    setMovieDesc(movie.description || "");
    setMovieImage(movie.image || null);
    setMovieCategory(Array.isArray(movie.category) ? movie.category : (movie.category ? [movie.category] : []));
    setMovieScreenshots(movie.screenshots || []);
    setLink620p(movie.link620p || "");
    setLink720p(movie.link720p || "");
    setLink1080p(movie.link1080p || "");
    setLink720pHevc(movie.link720pHevc || "");
    setLink1080pHevc(movie.link1080pHevc || "");
    setLink4k(movie.link4k || "");
    setSize620p(movie.size620p || "");
    setSize720p(movie.size720p || "");
    setSize1080p(movie.size1080p || "");
    setSize720pHevc(movie.size720pHevc || "");
    setSize1080pHevc(movie.size1080pHevc || "");
    setSize4k(movie.size4k || "");
    setExtraLinks(movie.extraLinks || []);
    setIsMovieHighlight(movie.isHighlight || false);
    setIsLiveStream(movie.isLiveStream || false);
    setLiveStreamLink(movie.liveStreamLink || "");
    setMovieTrailerUrl(movie.trailerUrl || "");
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteMovie = async (id: string) => {
    try {
      await deleteDoc(doc(db, "movies", id));
      if (selectedMovie?.id === id) {
        setSelectedMovie(null);
        setScreen("public_home");
      }
    } catch (error) {
      console.error("Error deleting document: ", error);
    }
  };

  const filteredMovies = (movies || []).filter((movie) => {
    if (!movie) return false;
    const matchesSearch =
      !searchQuery ||
      (movie.title &&
        typeof movie.title === "string" &&
        movie.title.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory =
      selectedCategory === "All" || 
      (Array.isArray(movie.category) 
        ? movie.category.includes(selectedCategory) 
        : movie.category === selectedCategory);
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-[#080806] font-sans text-slate-50 selection:bg-red-500/30">
      
      {/* NAVBAR */}
      <nav className="bg-[#080806]/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
                        <div
              className="flex items-center gap-3 group cursor-pointer"
              onClick={() => setScreen("public_home")}
            >
              <div className="flex items-center gap-3">
                {screen === "movie_detail" && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setScreen("public_home");
                    }} 
                    className="p-1.5 bg-slate-800/80 hover:bg-red-600 text-slate-300 hover:text-white rounded-full transition-all border border-slate-700 hover:border-red-500 shadow-md flex items-center justify-center mr-2"
                    title="Go Back"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                  </button>
                )}
                <div
                  id="text-logo"
                  className="flex items-center text-xl sm:text-2xl font-black tracking-tighter text-white drop-shadow-md hover:scale-105 transition-transform"
                >
                  APLEX <span className="text-red-600 ml-1.5 mr-2">CINEMA</span>
                  <span className="bg-gradient-to-r from-red-600 to-red-500 text-white text-xs px-2 py-1 rounded-md italic shadow-lg shadow-red-500/20 tracking-wider hidden sm:inline-block">4US</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setScreen("my_library")}
                className="flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-red-400 transition-colors px-3 py-2 rounded-md hover:bg-slate-800"
              >
                <Bookmark className="w-4 h-4" />
                <span className="hidden sm:inline">My Library</span>
              </button>
              {currentUserEmail ? (
                <div className="flex items-center gap-3">
                  {isAdminAuth && (
                    <button
                      onClick={() => setScreen("admin_dashboard")}
                      className="flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-red-400 transition-colors px-3 py-2 rounded-md hover:bg-slate-800"
                    >
                      <Settings className="w-4 h-4" />
                      <span className="hidden sm:inline">Admin Panel</span>
                    </button>
                  )}
                  <div className="hidden md:block text-sm text-red-500/70 border border-red-900/50 bg-red-950/30 px-3 py-1 rounded-full">
                    {currentUserEmail}
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 text-sm font-medium text-red-400 hover:text-red-300 transition-colors px-3 py-2 rounded-md hover:bg-red-950/30"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                </div>
              ) : (
                screen !== "login" &&
                screen !== "pin_check" && (
                  <div className="flex items-center gap-2">
                    <a
                      href="https://apk.e-droid.net/apk/app4185770-ra0ojl.apk?v=1"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-xs font-bold bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white transition-all px-4 py-1.5 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.5)] uppercase tracking-wider"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Install
                    </a>
                    {/* Login button removed as requested */}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </nav>


      <main className="pb-12">
        <AnimatePresence mode="wait">
          {/* 1. LOGIN SCREEN */}
          {screen === "login" && (
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex justify-center items-center mt-20 px-4"
            >
              <div className="w-full max-w-md bg-slate-900 border border-slate-800/60 rounded-2xl shadow-2xl shadow-red-900/10 p-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50" />

                <div className="flex flex-col items-center mb-8">
                  <div className="bg-red-500/10 p-4 rounded-full mb-4 border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.15)]">
                    <UserCircle className="w-8 h-8 text-red-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">
                    Welcome Interface
                  </h2>
                  <p className="text-slate-400 mt-2 text-center text-sm">
                    Enter credentials to synchronize.
                  </p>
                </div>

                {loginError && (
                  <div className="mb-6 p-4 bg-red-950/50 border border-red-900/50 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-200">{loginError}</p>
                  </div>
                )}
                <>
                    <form onSubmit={handleLogin} className="space-y-5">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                          {showAdminLoginForm ? "Admin Username" : "Email address"}
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Mail className="h-5 w-5 text-slate-500" />
                          </div>
                          <input
                            type={showAdminLoginForm ? "text" : "email"}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder={showAdminLoginForm ? "admin_username" : "you@example.com"}
                            className="block w-full pl-10 pr-3 py-3 border border-slate-700/50 rounded-xl bg-slate-950 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all shadow-inner"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                          Password
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Lock className="h-5 w-5 text-slate-500" />
                          </div>
                          <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="block w-full pl-10 pr-10 py-3 border border-slate-700/50 rounded-xl bg-slate-950 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all shadow-inner"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                          >
                            {showPassword ? (
                              <EyeOff className="h-5 w-5" />
                            ) : (
                              <Eye className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                      </div>

                      <AnimatePresence>
                        {email.toLowerCase() === "lalitasuraj27@gmail.com" && (
                          <motion.div
                            initial={{ opacity: 0, height: 0, marginTop: 0 }}
                            animate={{ opacity: 1, height: "auto", marginTop: 20 }}
                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                            className="overflow-hidden"
                          >
                            <label className="block text-sm font-medium text-red-400 mb-1">
                              Security PIN
                            </label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <ShieldAlert className="h-5 w-5 text-red-500" />
                              </div>
                              <input
                                type={showPin ? "text" : "password"}
                                maxLength={4}
                                value={pin}
                                onChange={(e) =>
                                  setPin(e.target.value.replace(/\D/g, ""))
                                }
                                placeholder="••••"
                                className="block w-full pl-10 pr-10 py-3 border border-red-900/50 rounded-xl bg-red-950/20 text-red-100 placeholder-red-900/50 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all shadow-[0_0_15px_rgba(239,68,68,0.1)] tracking-widest"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPin(!showPin)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-red-500/70 hover:text-red-400"
                              >
                                {showPin ? (
                                  <EyeOff className="h-5 w-5" />
                                ) : (
                                  <Eye className="h-5 w-5" />
                                )}
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <button
                        type="submit"
                        className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-4 rounded-xl shadow-[0_0_15px_rgba(239,68,68,0.4)] hover:shadow-[0_0_25px_rgba(239,68,68,0.6)] transition-all flex justify-center items-center gap-2 mt-4"
                      >
                        {isRegistering ? "Register Account" : "Authenticate"}
                      </button>
                    </form>

                    <div className="mt-6 text-center text-sm text-slate-400">
                      {isRegistering ? "Already have an account? " : "Don't have an account? "}
                      <button 
                        onClick={() => {
                          setIsRegistering(!isRegistering);
                          setLoginError("");
                        }} 
                        className="text-red-400 hover:text-red-300 underline"
                      >
                        {isRegistering ? "Login Here" : "Register Here"}
                      </button>
                    </div>

                    <div className="mt-6 relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-700/50"></div>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-slate-900 text-slate-500">Or continue with</span>
                      </div>
                    </div>
                  </>
                <button
                  onClick={handleGoogleLogin}
                  type="button"
                  className="w-full mt-2 bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 px-4 rounded-xl border border-slate-700 transition-all flex justify-center items-center gap-3 shadow-[0_0_15px_rgba(255,255,255,0.05)] hover:shadow-[0_0_25px_rgba(255,255,255,0.1)]"
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Sign in with Google
                </button>
              </div>
            </motion.div>
          )}

          {/* 3. ADMIN DASHBOARD */}
          {screen === "admin_dashboard" && (
            <motion.div
              key="admin_dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-4xl mx-auto px-4 py-8"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-1 flex items-center gap-3">
                    <Settings className="w-8 h-8 text-red-400" />
                    Command Center
                  </h1>
                    <p className="text-slate-400 text-sm mt-1 font-medium">Total {movies.length} titles available</p>
                  <p className="text-slate-400">
                    Upload and manage media entries.
                  </p>
                </div>
                <button
                  onClick={() => setScreen("public_home")}
                  className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors border border-slate-700 text-sm font-medium flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" /> View Public Page
                </button>
              </div>

              {/* AI Bot Link Checker Dashboard */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden mb-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Activity className={`w-5 h-5 ${botCheckStatus === 'running' ? 'text-blue-400 animate-pulse' : 'text-blue-500'}`} />
                    AI Link Health Bot
                  </h3>
                  <button
                    onClick={runAiBotCheck}
                    disabled={botCheckStatus === 'running'}
                    className="bg-blue-900/40 hover:bg-blue-800/60 text-blue-400 border border-blue-900/50 px-4 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {botCheckStatus === 'running' ? 'Scanning Network...' : 'Run Diagnostics'}
                  </button>
                </div>
                
                <div className="text-sm text-slate-400 mb-4">
                  Last checked: {lastChecked || "Never"}
                </div>

                {botCheckStatus === 'running' && (
                  <div className="flex items-center gap-3 text-blue-400 bg-blue-950/30 p-4 rounded-xl border border-blue-900/30">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span>AI Bot is verifying extraction protocols across the network...</span>
                  </div>
                )}

                {botCheckStatus === 'done' && brokenLinksReport.length === 0 && (
                  <div className="flex items-center gap-3 text-green-400 bg-green-950/30 p-4 rounded-xl border border-green-900/30">
                    <CheckCircle className="w-5 h-5" />
                    <span>All verified protocols are operational. No expired links detected.</span>
                  </div>
                )}

                {botCheckStatus === 'done' && brokenLinksReport.length > 0 && (
                  <div className="bg-red-950/20 border border-red-900/50 rounded-xl overflow-hidden">
                    <div className="bg-red-900/40 px-4 py-2 flex items-center gap-2 border-b border-red-900/50">
                      <XCircle className="w-4 h-4 text-red-400" />
                      <span className="text-red-400 font-bold text-sm uppercase tracking-wider">Expired Protocols Detected ({brokenLinksReport.length})</span>
                    </div>
                    <div className="p-4 flex flex-col gap-3 max-h-[300px] overflow-y-auto">
                      {brokenLinksReport.map((report, idx) => (
                        <div key={idx} className="flex justify-between items-start border-b border-slate-800 pb-3 last:border-0 last:pb-0">
                           <div>
                             <h4 className="text-slate-200 font-bold">{report.title}</h4>
                             <p className="text-slate-500 text-xs mt-1">Resolution: {report.linkType}</p>
                           </div>
                           <a href={report.url} target="_blank"  rel="noreferrer" className="text-xs text-blue-400 hover:text-blue-300 underline break-all max-w-[200px]">
                             View Link
                           </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Upload Form */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden mb-12">
                <div
                  className="absolute top-0 left-0 w-max h-max bg-red-500/5 blur-[100px] rounded-full pointer-events-none"
                  style={{ width: "400px", height: "400px" }}
                />

                <div className="flex items-center gap-4 mb-6 border-b border-slate-800 pb-4">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Upload className="w-5 h-5 text-red-400" /> Initialize New
                    Feed
                  </h3>
                  <div className="flex bg-slate-950 border border-slate-800 rounded-lg overflow-hidden ml-auto">
                    <button
                      type="button"
                      onClick={() => setActiveAdminTab("movie")}
                      className={`px-4 py-2 text-sm font-medium transition-colors ${activeAdminTab === "movie" ? "bg-red-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}
                    >
                      Movie
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveAdminTab("series")}
                      className={`px-4 py-2 text-sm font-medium transition-colors ${activeAdminTab === "series" ? "bg-red-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}
                    >
                      Web Series
                    </button>
                  </div>
                </div>

                {adminError && (
                  <div className="bg-red-900/50 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg mb-6">
                    {adminError}
                  </div>
                )}
                {/* We will move this to a global AnimatePresence overlay so it looks like a phone notification */}

                {activeAdminTab === "movie" ? (
                  <form
                    onSubmit={handleAddMovie}
                    className="space-y-6 relative z-10"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Primary Descriptor (Title) *
                        </label>
                        <DebouncedInput required
                          type="text"
                          value={movieTitle}
                           onChange={(val: string) => setMovieTitle(val)} 
                          placeholder="e.g., The Matrix Protocol"
                          className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all shadow-inner"
                         />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Category *
                        </label>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {Array.from(new Set([...CATEGORIES, ...movieCategory])).map((category) => (
                            <button
                              key={category}
                              type="button"
                              onClick={() => {
                                setMovieCategory(prev => {
                                  if (prev.includes(category)) {
                                    return prev.filter(c => c !== category);
                                  } else {
                                    return [...prev, category];
                                  }
                                });
                              }}
                              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                                movieCategory.includes(category)
                                  ? "bg-red-600 text-white shadow-[0_0_10px_rgba(239,68,68,0.4)]"
                                  : "bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-700/50"
                              }`}
                            >
                              {category}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={customCategoryInput}
                            onChange={(e) => setCustomCategoryInput(e.target.value)}
                            placeholder="Add custom category..."
                            className="block w-full sm:w-auto flex-grow px-4 py-2 border border-slate-700 rounded-lg bg-slate-900 text-slate-100 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const trimmed = customCategoryInput.trim();
                              if (trimmed && !movieCategory.includes(trimmed)) {
                                setMovieCategory(prev => [...prev, trimmed]);
                              }
                              setCustomCategoryInput("");
                            }}
                            className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors border border-slate-700"
                          >
                            Add
                          </button>
                        </div>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Data Narrative (Storyline) *
                        </label>
                        <DebouncedTextarea required
                          rows={4}
                          value={movieDesc}
                           onChange={(val: string) => setMovieDesc(val)} 
                          placeholder="Initialize context parameters..."
                          className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all resize-y shadow-inner"
                         />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                          <ImageIcon className="w-4 h-4 text-red-400" /> Visual
                          Asset (Local Upload)
                        </label>
                        <div
                          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${movieImage ? "border-red-500/50 bg-red-950/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]" : "border-slate-700 hover:border-red-500/50 bg-slate-950"}`}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          {movieImage ? (
                            <div className="flex flex-col items-center">
                            <img
                                src={movieImage}
                                alt="Preview"
                                className="h-48 object-contain rounded-lg mb-4 shadow-xl border border-slate-800"
                              />
                              <p className="text-sm text-red-400 font-medium tracking-widest">
                                ASSET LOADED - CLICK TO REPLACE
                              </p>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center text-slate-400 hover:text-red-400 transition-colors">
                              <Upload className="w-12 h-12 mb-3 opacity-50" />
                              <p className="text-sm font-medium">
                                Select media chunk from device array
                              </p>
                            </div>
                          )}
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          ref={fileInputRef}
                          onChange={handleImageChange}
                          className="hidden"
                        />
                        <div className="flex gap-2 mt-3">
                          <input
                            type="url"
                            placeholder="Or paste Poster Image URL here..."
                            value={movieImageUrlInput}
                            onChange={(e) =>
                              setMovieImageUrlInput(e.target.value)
                            }
                            className="flex-1 bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-2 text-white focus:ring-1 focus:ring-red-500 outline-none text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (movieImageUrlInput) {
                                setMovieImage(movieImageUrlInput);
                                setMovieImageUrlInput("");
                              }
                            }}
                            className="bg-slate-800 hover:bg-slate-700 text-white px-4 rounded-xl flex items-center justify-center transition-colors"
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                          <ImageIcon className="w-4 h-4 text-red-400" /> Quality
                          Screenshots (Multiple from Gallery)
                        </label>
                        <div
                          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${movieScreenshots.length > 0 ? "border-red-500/50 bg-red-950/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]" : "border-slate-700 hover:border-red-500/50 bg-slate-950"}`}
                          onClick={() => screenshotsInputRef.current?.click()}
                        >
                          {movieScreenshots.length > 0 ? (
                            <div className="flex flex-col items-center w-full">
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4 w-full">
                                {movieScreenshots.map((img, i) => (
                                  <div key={i} className="relative group">
                                    <img
                                      src={img}
                                      alt={`Screenshot ${i + 1}`}
                                      className="h-24 w-full object-cover rounded-lg shadow-xl border border-slate-800"
                                    />
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setMovieScreenshots(prev => prev.filter((_, idx) => idx !== i));
                                      }}
                                      className="absolute top-1 right-1 bg-red-600/90 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:scale-110"
                                      title="Remove"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ))}
                              </div>
                              <p className="text-sm text-red-400 font-medium tracking-widest mt-2">
                                ASSETS LOADED - CLICK TO REPLACE
                              </p>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center text-slate-400 hover:text-red-400 transition-colors">
                              <Upload className="w-12 h-12 mb-3 opacity-50" />
                              <p className="text-sm font-medium">
                                Select 2-3 quality proofs from device array
                              </p>
                            </div>
                          )}
                        </div>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          ref={screenshotsInputRef}
                          onChange={handleScreenshotsChange}
                          className="hidden"
                        />
                        <div className="flex gap-2 mt-3">
                          <input
                            type="url"
                            placeholder="Or paste Screenshot URL here..."
                            value={movieScreenshotUrlInput}
                            onChange={(e) =>
                              setMovieScreenshotUrlInput(e.target.value)
                            }
                            className="flex-1 bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-2 text-white focus:ring-1 focus:ring-red-500 outline-none text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (movieScreenshotUrlInput) {
                                setMovieScreenshots((prev) => [
                                  ...prev,
                                  movieScreenshotUrlInput,
                                ]);
                                setMovieScreenshotUrlInput("");
                              }
                            }}
                            className="bg-slate-800 hover:bg-slate-700 text-white px-4 rounded-xl flex items-center justify-center transition-colors"
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-slate-800">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                          <LinkIcon className="w-5 h-5 text-red-400" />{" "}
                          Transmission Vectors (Links)
                        </h3>
                        <button
                          type="button"
                          onClick={handleAutoDetectMovieSizes}
                          className="bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 border border-blue-500/50 px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z"/><path d="m14 7 3 3"/><path d="M5 6v4"/><path d="M19 14v4"/><path d="M10 2v2"/><path d="M7 8H3"/><path d="M21 16h-4"/><path d="M11 3H9"/></svg>
                          Auto Detect Sizes
                        </button>
                      </div>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">
                              620p Package URL
                            </label>
                            <DebouncedInput type="url"
                              value={link620p}
                               onChange={(val: string) => setLink620p(val)} 
                              placeholder="https://..."
                              className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-sm"
                             />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">
                              620p File Size (Optional)
                            </label>
                            <DebouncedInput type="text"
                              value={size620p}
                               onChange={(val: string) => setSize620p(val)} 
                              placeholder="e.g., 300 MB"
                              className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-sm"
                             />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">
                              720p Package URL
                            </label>
                            <DebouncedInput type="url"
                              value={link720p}
                               onChange={(val: string) => setLink720p(val)} 
                              placeholder="https://..."
                              className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-sm"
                             />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">
                              720p File Size (Optional)
                            </label>
                            <DebouncedInput type="text"
                              value={size720p}
                               onChange={(val: string) => setSize720p(val)} 
                              placeholder="e.g., 700 MB"
                              className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-sm"
                             />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">
                              1080p Package URL
                            </label>
                            <DebouncedInput type="url"
                              value={link1080p}
                               onChange={(val: string) => setLink1080p(val)} 
                              placeholder="https://..."
                              className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-sm"
                             />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">
                              1080p File Size (Optional)
                            </label>
                            <DebouncedInput type="text"
                              value={size1080p}
                               onChange={(val: string) => setSize1080p(val)} 
                              placeholder="e.g., 1.5 GB"
                              className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-sm"
                             />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">
                              720p HEVC Package URL
                            </label>
                            <DebouncedInput type="url"
                              value={link720pHevc}
                               onChange={(val: string) => setLink720pHevc(val)} 
                              placeholder="https://..."
                              className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-sm"
                             />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">
                              720p HEVC File Size
                            </label>
                            <DebouncedInput type="text"
                              value={size720pHevc}
                               onChange={(val: string) => setSize720pHevc(val)} 
                              placeholder="e.g., 400 MB"
                              className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-sm"
                             />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">
                              1080p HEVC Package URL
                            </label>
                            <DebouncedInput type="url"
                              value={link1080pHevc}
                               onChange={(val: string) => setLink1080pHevc(val)} 
                              placeholder="https://..."
                              className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-sm"
                             />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">
                              1080p HEVC File Size
                            </label>
                            <DebouncedInput type="text"
                              value={size1080pHevc}
                               onChange={(val: string) => setSize1080pHevc(val)} 
                              placeholder="e.g., 800 MB"
                              className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-sm"
                             />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">
                              4K Package URL
                            </label>
                            <DebouncedInput type="url"
                              value={link4k}
                               onChange={(val: string) => setLink4k(val)} 
                              placeholder="https://..."
                              className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-sm"
                             />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">
                              4K File Size
                            </label>
                            <DebouncedInput type="text"
                              value={size4k}
                               onChange={(val: string) => setSize4k(val)} 
                              placeholder="e.g., 4.5 GB"
                              className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-sm"
                             />
                          </div>
                        </div>

                        {/* Extra Links Section */}
                        <div className="pt-4 border-t border-slate-800">
                          <div className="flex justify-between items-center mb-4">
                            <h4 className="text-sm font-bold text-slate-300">Additional Download Links</h4>
                            <button
                              type="button"
                              onClick={() => setExtraLinks([...extraLinks, { name: "", url: "", size: "" }])}
                              className="text-xs bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-md transition-colors flex items-center gap-1"
                            >
                              <span>+</span> Add Custom Link
                            </button>
                          </div>
                          <div className="space-y-4">
                            {extraLinks.map((link, idx) => (
                              <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-4 relative bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                                <div>
                                  <label className="block text-xs font-medium text-slate-400 mb-1">Name/Quality</label>
                                  <input
                                    type="text"
                                    value={link.name}
                                    onChange={(e) => {
                                      const newLinks = [...extraLinks];
                                      newLinks[idx].name = e.target.value;
                                      setExtraLinks(newLinks);
                                    }}
                                    placeholder="e.g., 720p HEVC"
                                    className="w-full bg-slate-950 border border-slate-700/50 rounded-lg px-3 py-2 text-white outline-none text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-slate-400 mb-1">URL</label>
                                  <input
                                    type="url"
                                    value={link.url}
                                    onChange={(e) => {
                                      const newLinks = [...extraLinks];
                                      newLinks[idx].url = e.target.value;
                                      setExtraLinks(newLinks);
                                    }}
                                    placeholder="https://..."
                                    className="w-full bg-slate-950 border border-slate-700/50 rounded-lg px-3 py-2 text-white outline-none text-sm"
                                  />
                                </div>
                                <div className="relative">
                                  <label className="block text-xs font-medium text-slate-400 mb-1">Size</label>
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      value={link.size}
                                      onChange={(e) => {
                                        const newLinks = [...extraLinks];
                                        newLinks[idx].size = e.target.value;
                                        setExtraLinks(newLinks);
                                      }}
                                      placeholder="e.g., 400 MB"
                                      className="w-full bg-slate-950 border border-slate-700/50 rounded-lg px-3 py-2 text-white outline-none text-sm"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newLinks = [...extraLinks];
                                        newLinks.splice(idx, 1);
                                        setExtraLinks(newLinks);
                                      }}
                                      className="bg-red-900/30 text-red-400 hover:bg-red-900/50 p-2 rounded-lg transition-colors flex items-center justify-center shrink-0"
                                      title="Remove Link"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 flex flex-col gap-4">
                      <div className="flex flex-col gap-2 p-4 bg-slate-900/50 rounded-xl border border-slate-700">
                        <label className="text-slate-300 font-medium text-sm flex items-center gap-2">
                          <Play className="w-4 h-4 text-red-500" /> Trailer URL (YouTube/MP4 link)
                        </label>
                        <DebouncedInput type="url"
                          value={movieTrailerUrl}
                           onChange={(val: string) => setMovieTrailerUrl(val)} 
                          placeholder="https://youtube.com/watch?v=..."
                          className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-sm"
                         />
                      </div>

                      <div className="flex flex-col gap-2 p-4 bg-slate-900/50 rounded-xl border border-slate-700">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="liveStreamMovie"
                            checked={isLiveStream}
                            onChange={(e) => setIsLiveStream(e.target.checked)}
                            className="w-5 h-5 accent-red-600 rounded border-slate-700 bg-slate-900 focus:ring-red-500"
                          />
                          <label
                            htmlFor="liveStreamMovie"
                            className="text-white font-medium cursor-pointer"
                          >
                            Live Stream Event
                          </label>
                        </div>
                        {isLiveStream && (
                          <DebouncedInput type="url"
                            value={liveStreamLink}
                             onChange={(val: string) => setLiveStreamLink(val)} 
                            placeholder="https://..."
                            className="w-full mt-2 bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-sm"
                            required={isLiveStream}
                           />
                        )}
                      </div>

                      <div className="flex flex-col md:flex-row items-center gap-4 justify-between">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="highlightMovie"
                            checked={isMovieHighlight}
                            onChange={(e) =>
                              setIsMovieHighlight(e.target.checked)
                            }
                            className="w-5 h-5 accent-red-600 rounded border-slate-700 bg-slate-900 focus:ring-red-500"
                          />
                          <label
                            htmlFor="highlightMovie"
                            className="text-white font-medium cursor-pointer"
                          >
                            Add to Top Highlights
                          </label>
                        </div>
                      <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                        {editingMovieId && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMovieId(null);
                              setMovieTitle("");
                              setMovieDesc("");
                              setMovieImage(null);
                              setMovieScreenshots([]);
                              setLink620p("");
                              setLink720p("");
                              setLink1080p("");
                              setLink720pHevc("");
                              setLink1080pHevc("");
                              setLink4k("");
                              setSize620p("");
                              setSize720p("");
                              setSize1080p("");
                              setSize720pHevc("");
                              setSize1080pHevc("");
                              setSize4k("");
                              setIsMovieHighlight(false);
                              setIsLiveStream(false);
                              setLiveStreamLink("");
                              setMovieTrailerUrl("");
                            }}
                            className="w-full md:w-auto bg-slate-800 hover:bg-slate-700 text-white font-bold px-8 py-4 rounded-xl transition-all flex items-center justify-center gap-2"
                          >
                            Cancel Edit
                          </button>
                        )}
                        <button
                          type="submit"
                          className="w-full md:w-auto bg-red-600 hover:bg-red-500 text-white font-bold px-8 py-4 rounded-xl shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:shadow-[0_0_30px_rgba(239,68,68,0.5)] transition-all flex items-center justify-center gap-2"
                        >
                          <CheckCircle2 className="w-5 h-5" />
                          {editingMovieId ? "Update Movie" : "Publish to Network"}
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
                ) : (
                  <form
                    onSubmit={handleAddSeries}
                    className="space-y-6 relative z-10"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Series Title *
                        </label>
                        <DebouncedInput required
                          type="text"
                          value={seriesTitle}
                           onChange={(val: string) => setSeriesTitle(val)} 
                          placeholder="e.g., Stranger Things"
                          className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all shadow-inner"
                         />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Category *
                        </label>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {Array.from(new Set([...CATEGORIES, ...seriesCategory])).map((category) => (
                            <button
                              key={category}
                              type="button"
                              onClick={() => {
                                setSeriesCategory(prev => {
                                  if (prev.includes(category)) {
                                    return prev.filter(c => c !== category);
                                  } else {
                                    return [...prev, category];
                                  }
                                });
                              }}
                              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                                seriesCategory.includes(category)
                                  ? "bg-red-600 text-white shadow-[0_0_10px_rgba(239,68,68,0.4)]"
                                  : "bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-700/50"
                              }`}
                            >
                              {category}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={customSeriesCategoryInput}
                            onChange={(e) => setCustomSeriesCategoryInput(e.target.value)}
                            placeholder="Add custom category..."
                            className="block w-full sm:w-auto flex-grow px-4 py-2 border border-slate-700 rounded-lg bg-slate-900 text-slate-100 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const trimmed = customSeriesCategoryInput.trim();
                              if (trimmed && !seriesCategory.includes(trimmed)) {
                                setSeriesCategory(prev => [...prev, trimmed]);
                              }
                              setCustomSeriesCategoryInput("");
                            }}
                            className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors border border-slate-700"
                          >
                            Add
                          </button>
                        </div>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Series Description *
                        </label>
                        <DebouncedTextarea required
                          rows={4}
                          value={seriesDesc}
                           onChange={(val: string) => setSeriesDesc(val)} 
                          placeholder="Initialize context parameters..."
                          className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all resize-y shadow-inner"
                         />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                          <ImageIcon className="w-4 h-4 text-red-400" /> Series
                          Poster (Local Upload)
                        </label>
                        <div
                          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${seriesImage ? "border-red-500/50 bg-red-950/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]" : "border-slate-700 hover:border-red-500/50 bg-slate-950"}`}
                          onClick={() => seriesFileInputRef.current?.click()}
                        >
                          {seriesImage ? (
                            <div className="flex flex-col items-center">
                            <img
                                src={seriesImage}
                                alt="Preview"
                                className="h-48 object-contain rounded-lg mb-4 shadow-xl border border-slate-800"
                              />
                              <p className="text-sm text-red-400 font-medium tracking-widest">
                                ASSET LOADED - CLICK TO REPLACE
                              </p>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center text-slate-400 hover:text-red-400 transition-colors">
                              <Upload className="w-12 h-12 mb-3 opacity-50" />
                              <p className="text-sm font-medium">
                                Select media chunk from device array
                              </p>
                            </div>
                          )}
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          ref={seriesFileInputRef}
                          onChange={handleSeriesImageChange}
                          className="hidden"
                        />
                        <div className="flex gap-2 mt-3">
                          <input
                            type="url"
                            placeholder="Or paste Poster Image URL here..."
                            value={seriesImageUrlInput}
                            onChange={(e) =>
                              setSeriesImageUrlInput(e.target.value)
                            }
                            className="flex-1 bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-2 text-white focus:ring-1 focus:ring-red-500 outline-none text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (seriesImageUrlInput) {
                                setSeriesImage(seriesImageUrlInput);
                                setSeriesImageUrlInput("");
                              }
                            }}
                            className="bg-slate-800 hover:bg-slate-700 text-white px-4 rounded-xl flex items-center justify-center transition-colors"
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                          <ImageIcon className="w-4 h-4 text-red-400" /> Quality
                          Screenshots (Multiple from Gallery)
                        </label>
                        <div
                          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${seriesScreenshots.length > 0 ? "border-red-500/50 bg-red-950/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]" : "border-slate-700 hover:border-red-500/50 bg-slate-950"}`}
                          onClick={() =>
                            seriesScreenshotsInputRef.current?.click()
                          }
                        >
                          {seriesScreenshots.length > 0 ? (
                            <div className="flex flex-col items-center w-full">
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4 w-full">
                                {seriesScreenshots.map((img, i) => (
                                  <div key={i} className="relative group">
                                    <img
                                      src={img}
                                      alt={`Screenshot ${i + 1}`}
                                      className="h-24 w-full object-cover rounded-lg shadow-xl border border-slate-800"
                                    />
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSeriesScreenshots(prev => prev.filter((_, idx) => idx !== i));
                                      }}
                                      className="absolute top-1 right-1 bg-red-600/90 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:scale-110"
                                      title="Remove"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ))}
                              </div>
                              <p className="text-sm text-red-400 font-medium tracking-widest mt-2">
                                ASSETS LOADED - CLICK TO REPLACE
                              </p>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center text-slate-400 hover:text-red-400 transition-colors">
                              <Upload className="w-12 h-12 mb-3 opacity-50" />
                              <p className="text-sm font-medium">
                                Select 2-3 quality proofs from device array
                              </p>
                            </div>
                          )}
                        </div>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          ref={seriesScreenshotsInputRef}
                          onChange={handleSeriesScreenshotsChange}
                          className="hidden"
                        />
                        <div className="flex gap-2 mt-3">
                          <input
                            type="url"
                            placeholder="Or paste Screenshot URL here..."
                            value={seriesScreenshotUrlInput}
                            onChange={(e) =>
                              setSeriesScreenshotUrlInput(e.target.value)
                            }
                            className="flex-1 bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-2 text-white focus:ring-1 focus:ring-red-500 outline-none text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (seriesScreenshotUrlInput) {
                                setSeriesScreenshots((prev) => [
                                  ...prev,
                                  seriesScreenshotUrlInput,
                                ]);
                                setSeriesScreenshotUrlInput("");
                              }
                            }}
                            className="bg-slate-800 hover:bg-slate-700 text-white px-4 rounded-xl flex items-center justify-center transition-colors"
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="pt-6 border-t border-slate-800">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                          <LinkIcon className="w-5 h-5 text-red-400" /> Combo Pack
                        </h3>
                        <button
                          type="button"
                          onClick={handleAutoDetectSeriesSizes}
                          className="bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 border border-blue-500/50 px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z"/><path d="m14 7 3 3"/><path d="M5 6v4"/><path d="M19 14v4"/><path d="M10 2v2"/><path d="M7 8H3"/><path d="M21 16h-4"/><path d="M11 3H9"/></svg>
                          Auto Detect Sizes
                        </button>
                      </div>
                      <div className="space-y-4 mb-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">
                              620p Combo Pack URL
                            </label>
                            <input
                              type="url"
                              value={seriesLink620p}
                              onChange={(e) => setSeriesLink620p(e.target.value)}
                              placeholder="https://..."
                              className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">
                              620p Combo Pack Size (Optional)
                            </label>
                            <input
                              type="text"
                              value={seriesSize620p}
                              onChange={(e) => setSeriesSize620p(e.target.value)}
                              placeholder="e.g., 300 MB"
                              className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-sm"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">
                              720p Combo Pack URL
                            </label>
                            <input
                              type="url"
                              value={seriesLink720p}
                              onChange={(e) => setSeriesLink720p(e.target.value)}
                              placeholder="https://..."
                              className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">
                              720p Combo Pack Size (Optional)
                            </label>
                            <input
                              type="text"
                              value={seriesSize720p}
                              onChange={(e) => setSeriesSize720p(e.target.value)}
                              placeholder="e.g., 700 MB"
                              className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-sm"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">
                              1080p Combo Pack URL
                            </label>
                            <input
                              type="url"
                              value={seriesLink1080p}
                              onChange={(e) => setSeriesLink1080p(e.target.value)}
                              placeholder="https://..."
                              className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">
                              1080p Combo Pack Size (Optional)
                            </label>
                            <input
                              type="text"
                              value={seriesSize1080p}
                              onChange={(e) => setSeriesSize1080p(e.target.value)}
                              placeholder="e.g., 1.5 GB"
                              className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-sm"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">
                              720p HEVC Combo URL
                            </label>
                            <input
                              type="url"
                              value={seriesLink720pHevc}
                              onChange={(e) => setSeriesLink720pHevc(e.target.value)}
                              placeholder="https://..."
                              className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">
                              720p HEVC Combo Size
                            </label>
                            <input
                              type="text"
                              value={seriesSize720pHevc}
                              onChange={(e) => setSeriesSize720pHevc(e.target.value)}
                              placeholder="e.g., 400 MB"
                              className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-sm"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">
                              1080p HEVC Combo URL
                            </label>
                            <input
                              type="url"
                              value={seriesLink1080pHevc}
                              onChange={(e) => setSeriesLink1080pHevc(e.target.value)}
                              placeholder="https://..."
                              className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">
                              1080p HEVC Combo Size
                            </label>
                            <input
                              type="text"
                              value={seriesSize1080pHevc}
                              onChange={(e) => setSeriesSize1080pHevc(e.target.value)}
                              placeholder="e.g., 800 MB"
                              className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-sm"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">
                              4K Combo URL
                            </label>
                            <input
                              type="url"
                              value={seriesLink4k}
                              onChange={(e) => setSeriesLink4k(e.target.value)}
                              placeholder="https://..."
                              className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">
                              4K Combo Size
                            </label>
                            <input
                              type="text"
                              value={seriesSize4k}
                              onChange={(e) => setSeriesSize4k(e.target.value)}
                              placeholder="e.g., 4.5 GB"
                              className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-sm"
                            />
                          </div>
                        </div>

                        {/* Extra Links Section */}
                        <div className="pt-4 border-t border-slate-800">
                          <div className="flex justify-between items-center mb-4">
                            <h4 className="text-sm font-bold text-slate-300">Additional Combo Packs</h4>
                            <button
                              type="button"
                              onClick={() => setSeriesExtraLinks([...seriesExtraLinks, { name: "", url: "", size: "" }])}
                              className="text-xs bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-md transition-colors flex items-center gap-1"
                            >
                              <span>+</span> Add Custom Link
                            </button>
                          </div>
                          <div className="space-y-4">
                            {seriesExtraLinks.map((link, idx) => (
                              <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-4 relative bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                                <div>
                                  <label className="block text-xs font-medium text-slate-400 mb-1">Name/Quality</label>
                                  <input
                                    type="text"
                                    value={link.name}
                                    onChange={(e) => {
                                      const newLinks = [...seriesExtraLinks];
                                      newLinks[idx].name = e.target.value;
                                      setSeriesExtraLinks(newLinks);
                                    }}
                                    placeholder="e.g., 720p HEVC"
                                    className="w-full bg-slate-950 border border-slate-700/50 rounded-lg px-3 py-2 text-white outline-none text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-slate-400 mb-1">URL</label>
                                  <input
                                    type="url"
                                    value={link.url}
                                    onChange={(e) => {
                                      const newLinks = [...seriesExtraLinks];
                                      newLinks[idx].url = e.target.value;
                                      setSeriesExtraLinks(newLinks);
                                    }}
                                    placeholder="https://..."
                                    className="w-full bg-slate-950 border border-slate-700/50 rounded-lg px-3 py-2 text-white outline-none text-sm"
                                  />
                                </div>
                                <div className="relative">
                                  <label className="block text-xs font-medium text-slate-400 mb-1">Size</label>
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      value={link.size}
                                      onChange={(e) => {
                                        const newLinks = [...seriesExtraLinks];
                                        newLinks[idx].size = e.target.value;
                                        setSeriesExtraLinks(newLinks);
                                      }}
                                      placeholder="e.g., 400 MB"
                                      className="w-full bg-slate-950 border border-slate-700/50 rounded-lg px-3 py-2 text-white outline-none text-sm"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newLinks = [...seriesExtraLinks];
                                        newLinks.splice(idx, 1);
                                        setSeriesExtraLinks(newLinks);
                                      }}
                                      className="bg-red-900/30 text-red-400 hover:bg-red-900/50 p-2 rounded-lg transition-colors flex items-center justify-center shrink-0"
                                      title="Remove Link"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <LinkIcon className="w-5 h-5 text-red-400" /> Episodes
                        (Links)
                      </h3>
                      <div className="space-y-3">
                        {episodes.map((ep, index) => (
                          <div key={index} className="flex gap-2 items-center">
                            <span className="text-slate-400 font-bold w-6">
                              {index + 1}.
                            </span>
                            <input
                              type="url"
                              value={ep.link}
                              onChange={(e) => {
                                const newEps = [...episodes];
                                newEps[index].link = e.target.value;
                                setEpisodes(newEps);
                              }}
                              placeholder="Episode Link https://..."
                              className="flex-1 bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-sm"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (episodes.length > 1) {
                                  setEpisodes(
                                    episodes.filter((_, i) => i !== index),
                                  );
                                }
                              }}
                              className="text-slate-500 hover:text-red-500 p-2"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => setEpisodes([...episodes, { link: "" }])}
                        className="mt-4 text-sm text-red-400 hover:text-red-300 font-bold"
                      >
                        + Add Episode
                      </button>
                    </div>

                    <div className="pt-4 flex flex-col gap-4">
                      <div className="flex flex-col gap-2 p-4 bg-slate-900/50 rounded-xl border border-slate-700">
                        <label className="text-slate-300 font-medium text-sm flex items-center gap-2">
                          <Play className="w-4 h-4 text-red-500" /> Trailer URL (YouTube/MP4 link)
                        </label>
                        <DebouncedInput type="url"
                          value={seriesTrailerUrl}
                           onChange={(val: string) => setSeriesTrailerUrl(val)} 
                          placeholder="https://youtube.com/watch?v=..."
                          className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-sm"
                         />
                      </div>
                    </div>

                    <div className="pt-4 flex flex-col md:flex-row items-center gap-4 justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="highlightSeries"
                          checked={isSeriesHighlight}
                          onChange={(e) =>
                            setIsSeriesHighlight(e.target.checked)
                          }
                          className="w-5 h-5 accent-red-600 rounded border-slate-700 bg-slate-900 focus:ring-red-500"
                        />
                        <label
                          htmlFor="highlightSeries"
                          className="text-white font-medium cursor-pointer"
                        >
                          Add to Top Highlights
                        </label>
                      </div>
                      <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                        {editingMovieId && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMovieId(null);
                              setSeriesTitle("");
                              setSeriesDesc("");
                              setSeriesImage(null);
                              setSeriesScreenshots([]);
                              setEpisodes([{ link: "" }]);
                              setSeriesLink620p("");
                              setSeriesLink720p("");
                              setSeriesLink1080p("");
                              setSeriesLink720pHevc("");
                              setSeriesLink1080pHevc("");
                              setSeriesLink4k("");
                              setSeriesSize620p("");
                              setSeriesSize720p("");
                              setSeriesSize1080p("");
                              setSeriesSize720pHevc("");
                              setSeriesSize1080pHevc("");
                              setSeriesSize4k("");
                              setIsSeriesHighlight(false);
                              setSeriesTrailerUrl("");
                            }}
                            className="w-full md:w-auto bg-slate-800 hover:bg-slate-700 text-white font-bold px-8 py-4 rounded-xl transition-all flex items-center justify-center gap-2"
                          >
                            Cancel Edit
                          </button>
                        )}
                        <button
                          type="submit"
                          className="w-full md:w-auto bg-red-600 hover:bg-red-500 text-white font-bold px-8 py-4 rounded-xl shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:shadow-[0_0_30px_rgba(239,68,68,0.5)] transition-all flex items-center justify-center gap-2"
                        >
                          <CheckCircle2 className="w-5 h-5" />
                          {editingMovieId ? "Update Series" : "Publish Series to Network"}
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </div>

              {/* Manage Movies */}
              <div className="mt-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b border-slate-800 pb-4 gap-4">
                  <h3 className="text-xl font-bold text-white">
                    Active Data Streams
                  </h3>
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search active streams..."
                      value={adminSearchQuery}
                      onChange={(e) => setAdminSearchQuery(e.target.value)}
                      className="w-full bg-[#0a0a0a] border border-slate-700 text-white rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:border-red-500 transition-colors text-sm"
                    />
                  </div>
                </div>
                {movies.length === 0 ? (
                  <div className="text-center py-12 bg-slate-900/50 rounded-2xl border border-slate-800 border-dashed">
                    <p className="text-slate-500">
                      No media streams initialized.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {movies.filter(movie => movie.title.toLowerCase().includes(adminSearchQuery.toLowerCase())).map((movie) => (
                      <div
                        key={movie.id}
                        className="flex flex-col sm:flex-row justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-2xl gap-4 hover:bg-slate-800/80 hover:border-slate-700 transition-colors shadow-lg"
                      >
                        <div className="flex items-center gap-4 w-full sm:w-auto">
                            <img
                            src={movie.image}
                            alt={movie.title}
                            className="w-16 h-24 object-cover rounded-lg shadow-md border border-slate-800"
                          />
                          <div>
                            <h4 className="font-bold text-white mb-1 flex items-center gap-2">
                              {movie.title}
                              {movie.isLiveStream && (
                                <span className="bg-red-600 text-white text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                                  Live
                                </span>
                              )}
                            

          
                            </h4><p className="text-xs text-slate-500 font-mono">
                              NODE_ID: {movie.id}
                            </p>
                            <div className="flex gap-2 mt-2">
                              {movie.link620p && (
                                <span className="bg-slate-800 text-slate-400 text-[10px] px-2 py-0.5 rounded border border-slate-700">
                                  620p
                                </span>
                              )}
                            
                              {movie.link720p && (
                                <span className="bg-slate-800 text-slate-400 text-[10px] px-2 py-0.5 rounded border border-slate-700">
                                  720p
                                </span>
                              )}
                            
                              {movie.link1080p && (
                                <span className="bg-slate-800 text-slate-400 text-[10px] px-2 py-0.5 rounded border border-slate-700">
                                  1080p
                                </span>
                              )}
                            
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                          <button
                            onClick={() => movie.type === 'series' ? handleEditSeries(movie) : handleEditMovie(movie)}
                            className="flex-1 sm:flex-none bg-blue-950/40 text-blue-400 hover:bg-blue-900/60 hover:text-blue-300 border border-blue-900/50 px-4 py-2 rounded-xl transition-colors flex items-center justify-center gap-2"
                          >
                            <Pencil className="w-4 h-4" /> Edit
                          </button>
                          <button
                            onClick={() => handleDeleteMovie(movie.id)}
                            className="flex-1 sm:flex-none bg-red-950/40 text-red-400 hover:bg-red-900/60 hover:text-red-300 border border-red-900/50 px-4 py-2 rounded-xl transition-colors flex items-center justify-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" /> Terminate
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* 4. PUBLIC HOME SCREEN */}
          {screen === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center min-h-[50vh]"
            >
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500 mb-4"></div>
              <p className="text-slate-400 font-medium">Loading Movie...</p>
            </motion.div>
          )}
          {screen === "my_library" && (
            <motion.div
              key="my_library"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <button
                  onClick={() => setScreen("public_home")}
                  className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors bg-slate-900 px-4 py-2 rounded-full border border-slate-800 hover:border-slate-700"
                >
                  <ArrowLeft className="w-5 h-5" /> Back to Home
                </button>
                <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                  <Bookmark className="w-6 h-6 text-red-500" /> My Library
                </h1>
              </div>

              {movies.filter((m) => bookmarks.includes(m.id)).length === 0 ? (
                <div className="text-center py-20 bg-slate-900/50 rounded-2xl border border-slate-800 border-dashed">
                  <Bookmark className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-slate-300 mb-2">Your library is empty</h3>
                  <p className="text-slate-500">Save your favorite movies and series to watch them later.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
                  {movies
                    .filter((m) => bookmarks.includes(m.id))
                    .map((item, index) => (
                      <motion.a
                          href={`/movie/${item.id}/${generateCleanSlug(item.title)}`}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          key={item.id}
                          onClick={(e) => handleMovieClick(e, item)}
                          className="group cursor-pointer bg-[#0f0f0f] rounded-sm overflow-hidden border border-slate-900 hover:border-slate-700 transition-all duration-300 flex flex-col relative block"
                        >
                        <button onClick={(e) => toggleBookmark(item.id, e)} className={`absolute top-2 left-2 z-20 p-1.5 rounded-full backdrop-blur-sm transition-all ${bookmarks.includes(item.id) ? "bg-red-600 text-white" : "bg-slate-950/60 text-slate-300 hover:text-white"}`}><Bookmark className={`w-3 h-3 ${bookmarks.includes(item.id) ? "fill-current" : ""}`} /></button>
                        <div className="absolute top-2 right-2 bg-slate-950/80 backdrop-blur-sm text-red-400 text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded border border-red-900/50 z-10">
                          {item.type === "series" ? "Series" : "Online"}
                        </div>
                        <div className="aspect-[2/3] overflow-hidden bg-slate-950 relative">
                          <img
                            src={item.image}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 group-hover:opacity-80 transition-all duration-500"
                          />
                        </div>
                        <div className="p-3 flex flex-col flex-grow bg-[#0f0f0f]">
                          <h3 className="font-semibold text-white text-[13px] sm:text-[14px] leading-snug">
                            {item.title}
                          </h3>
                        </div>
                      </motion.a>
                    ))}
                </div>
              )}
            </motion.div>
          )}
          {screen === "public_home" && (
            <motion.div
              key="public_home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full"
            >
              {/* Highlights Slider Edge Style */}
              {!searchQuery && (isLoadingMovies || movies.filter((m) => m.isHighlight).length > 0) && (
                <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2 relative">
                  <h2 
                    className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2 cursor-pointer select-none w-fit relative z-10"
                    onClick={() => {
                      setStarClicks(prev => {
                        if (prev + 1 >= 3) {
                          setShowAdminLoginForm(true);
                          setScreen("login");
                          return 0;
                        }
                        return prev + 1;
                      });
                    }}
                  >
                    <span>⭐</span> Top Highlight
                  </h2>
                  

                </div>
              )}
              {!searchQuery && (isLoadingMovies || movies.filter((m) => m.isHighlight).length > 0) && (
                <div 
                  className="w-full max-w-[1600px] relative h-[450px] sm:h-[500px] md:h-[550px] lg:h-[650px] mx-auto mb-2 overflow-hidden bg-[#000000] flex flex-col justify-center items-center font-sans rounded-2xl px-4"
                  onMouseEnter={() => setIsSliderHovered(true)}
                  onMouseLeave={() => setIsSliderHovered(false)}
                >
                  {/* Subtle background glow */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[90%] bg-blue-900/20 blur-[150px] rounded-full pointer-events-none" />
                  
                  {isLoadingMovies ? (
                    <div className="w-[80%] max-w-4xl h-[300px] animate-pulse bg-slate-800 rounded-2xl"></div>
                  ) : (() => {
                    const highlights = movies.filter((m) => m.isHighlight).slice(0, 8);
                    const activeHighlight = highlights[highlightIndex] || highlights[0];
                    if (!activeHighlight) return null;
                    
                    const getYouTubeId = (url) => {
                      if (!url) return null;
                      const match = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
                      return (match && match[2].length === 11) ? match[2] : null;
                    };

                    return (
                      <>
                        <div className="relative w-full max-w-[1800px] h-[75%] sm:h-[80%] flex justify-center items-center mt-[-40px] perspective-[1200px]">
                          {highlights.map((movie, index) => {
                            // Calculate offset for infinite-like wrapping
                            const total = highlights.length;
                            const diff = (index - highlightIndex + total) % total;
                            let offsetDiff = diff;
                            if (diff > Math.floor(total / 2)) {
                               offsetDiff = diff - total;
                            }

                            const isActive = offsetDiff === 0;
                            const isNext = offsetDiff === 1;
                            const isPrev = offsetDiff === -1;
                            const isNextNext = offsetDiff === 2;
                            const isPrevPrev = offsetDiff === -2;

                            let xPos = 0;
                            let zPos = 0;
                            let scale = 1;
                            let zIndex = 20;
                            let opacity = 1;

                            if (isActive) {
                              xPos = 0;
                              zPos = 0;
                              scale = 1;
                              zIndex = 50;
                              opacity = 1;
                            } else if (isNext) {
                              xPos = 90; // Move right
                              zPos = -100;
                              scale = 0.85;
                              zIndex = 40;
                              opacity = 0.6;
                            } else if (isPrev) {
                              xPos = -90; // Move left
                              zPos = -100;
                              scale = 0.85;
                              zIndex = 40;
                              opacity = 0.6;
                            } else if (isNextNext) {
                              xPos = 180; // Move further right
                              zPos = -200;
                              scale = 0.7;
                              zIndex = 30;
                              opacity = 0.3;
                            } else if (isPrevPrev) {
                              xPos = -180; // Move further left
                              zPos = -200;
                              scale = 0.7;
                              zIndex = 30;
                              opacity = 0.3;
                            } else {
                              xPos = offsetDiff > 0 ? 250 : -250;
                              zPos = -300;
                              scale = 0.5;
                              zIndex = 20;
                              opacity = 0;
                            }

                            const ytId = isActive ? getYouTubeId(movie.trailerUrl) : null;

                            return (
                              <motion.div
                                key={movie.id}
                                className="absolute w-[80%] sm:w-[70%] max-w-[800px] h-full rounded-2xl sm:rounded-3xl overflow-hidden cursor-pointer bg-slate-900 border-[6px] border-[#1a1a1a] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.9)]"
                                onClick={(e) => {
                                  if (!isActive) {
                                    setHighlightIndex(index);
                                  } else {
                                    handleMovieClick(e, movie);
                                  }
                                }}
                                animate={{
                                  x: `${xPos}%`,
                                  z: zPos,
                                  scale: scale,
                                  opacity: opacity,
                                  zIndex: zIndex
                                }}
                                transition={{ type: "spring", stiffness: 300, damping: 30, mass: 1 }}
                                style={{ transformStyle: 'preserve-3d' }}
                              >
                                {/* Media Content */}
                                {ytId && isActive && showTrailer && !isScrolledPast && (window.innerWidth <= 768 || isSliderHovered) ? (
                                  <div className="w-full h-full relative overflow-hidden pointer-events-none">
                                    <iframe
                                      src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=0&controls=0&showinfo=0&rel=0&loop=1&playlist=${ytId}`}
                                      className="absolute top-1/2 left-1/2 w-[135%] h-[135%] md:w-[120%] md:h-[120%] -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                                      style={{ border: 'none' }}
                                      allow="autoplay; encrypted-media"
                                    />
                                  </div>
                                ) : (
                                  <img
                                    src={movie.image}
                                    alt={movie.title}
                                    className="absolute inset-0 w-full h-full object-cover object-center opacity-100"
                                  />
                                )}

                                {/* Overlay gradient for inactive cards to darken them */}
                                {!isActive && <div className="absolute inset-0 bg-black/50 z-10" />}

                                {/* Card Gradient & Info (Only visible when active) */}
                                <div className={`absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent transition-opacity duration-500 z-20 ${isActive && (!showTrailer || isScrolledPast || (window.innerWidth > 768 && !isSliderHovered)) ? 'opacity-100' : 'opacity-0'}`} />
                                
                                {isActive && (!showTrailer || isScrolledPast || (window.innerWidth > 768 && !isSliderHovered)) && (
                                  <div className="absolute inset-0 flex flex-col justify-end p-5 sm:p-10 z-30">
                                    <motion.div 
                                      initial={{ y: 20, opacity: 0 }} 
                                      animate={{ y: 0, opacity: 1 }}
                                      transition={{ delay: 0.15 }}
                                    >
                                      <div className="flex items-center gap-2 mb-2 sm:mb-3">
                                        <span className="text-[#00a8e1] font-bold text-[10px] sm:text-xs tracking-wider uppercase">
                                          Feature
                                        </span>
                                        {movie.isLiveStream && (
                                          <span className="bg-red-600 text-white text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded animate-pulse">
                                            Live
                                          </span>
                                        )}
                                      </div>
                                      <h2 className="text-xl sm:text-4xl md:text-5xl font-extrabold text-white mb-2 sm:mb-3 line-clamp-1 drop-shadow-lg">
                                        {movie.title}
                                      </h2>
                                      
                                      <div className="flex items-center gap-3">
                                        <button 
                                          onClick={(e) => { e.stopPropagation(); handleMovieClick(e, movie); }}
                                          className="bg-white hover:bg-slate-200 text-black font-bold py-2 sm:py-3 px-5 sm:px-8 rounded-full flex items-center gap-2 transition-transform hover:scale-105 active:scale-95 text-xs sm:text-sm shadow-xl"
                                        >
                                          <Download className="w-3 h-3 sm:w-5 sm:h-5" /> Download Now
                                        </button>
                                      </div>
                                    </motion.div>
                                  </div>
                                )}
                              </motion.div>
                            );
                          })}
                        </div>
                        
                        {/* Resume Trailer Overlay */}
                        {showResumeOverlay && (
                          <div className="absolute bottom-[22%] right-[15%] sm:bottom-[24%] sm:right-[18%] z-50 flex justify-end pointer-events-none">
                            <button
                              onClick={() => {
                                setIsTrailerResumed(true);
                                setShowResumeOverlay(false);
                              }}
                              className="pointer-events-auto bg-red-600/90 backdrop-blur-md hover:bg-red-500 text-white px-2.5 py-1 text-[9px] sm:text-[10px] uppercase tracking-wide rounded-full font-bold shadow-[0_0_10px_rgba(239,68,68,0.5)] border border-red-400/50 flex items-center gap-1 transition-all"
                            >
                              <Play className="w-2.5 h-2.5 fill-current" /> Watch Full Trailer
                            </button>
                          </div>
                        )}
                        {/* Microsoft Edge Style Bottom Controls */}
                        <div className="absolute bottom-6 sm:bottom-10 z-50 flex items-center justify-center gap-4 sm:gap-6 w-full px-4">
                          <button 
                            onClick={() => setHighlightIndex(prev => prev === 0 ? highlights.length - 1 : prev - 1)} 
                            className="p-3 sm:p-4 rounded-full bg-[#1a1a1a] hover:bg-[#333] text-white transition-all border border-slate-700 shadow-xl flex items-center justify-center"
                            title="Previous"
                          >
                            <ChevronLeft className="w-5 h-5" />
                          </button>
                          
                          <div className="flex gap-2 sm:gap-3 items-center">
                            {highlights.map((_, idx) => (
                              <button
                                key={`dot-${idx}`}
                                onClick={() => setHighlightIndex(idx)}
                                className={`rounded-full transition-all duration-300 shadow-md ${idx === highlightIndex ? 'bg-white w-8 sm:w-10 h-2.5 sm:h-3' : 'bg-slate-500 w-2.5 sm:w-3 h-2.5 sm:h-3 hover:bg-slate-400'}`}
                              />
                            ))}
                          </div>

                          <button 
                            onClick={() => setHighlightIndex(prev => prev === highlights.length - 1 ? 0 : prev + 1)} 
                            className="bg-[#005fb8] hover:bg-[#0078d4] text-white px-6 sm:px-10 py-3 sm:py-3.5 rounded-full font-bold flex items-center gap-2 shadow-xl transition-all hover:scale-105 active:scale-95 text-sm sm:text-base border border-blue-400/20"
                          >
                            Next <ChevronRight className="w-5 h-5" />
                          </button>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
{/* WARNING BANNER */}
              <div className="bg-[#1a0505] border border-red-900/40 py-2.5 px-4 z-40 relative shadow-inner mb-6 mx-4 sm:mx-6 lg:mx-8 rounded-lg flex items-center justify-center">
                <div className="text-red-200/90 text-[11px] sm:text-[13px] md:text-sm font-medium tracking-wide whitespace-nowrap overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] text-center w-full">
                  <span className="mr-1">🎉</span> Welcome to <strong className="text-red-400 font-bold mx-1">Aplex Cinema 4US</strong> app. Please wait, content takes a moment to load ⏳
                </div>
              </div>
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
                <div className="w-full overflow-x-auto pb-4 mb-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedCategory("All")}
                      className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        selectedCategory === "All"
                          ? "bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                          : "bg-slate-900 border border-slate-700 hover:border-red-500/50 text-slate-300 hover:text-white"
                      }`}
                    >
                      All
                    </button>
                    {CATEGORIES.map((category) => (
                      <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all ${
                          selectedCategory === category
                            ? "bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                            : "bg-slate-900 border border-slate-700 hover:border-red-500/50 text-slate-300 hover:text-white"
                        }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                  <div>
                    <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                      <span className="text-white">🔥</span> Latest Releases
                    </h1>
                    <p className="text-slate-400 text-sm mt-1 font-medium">Total {movies.length} titles available</p>
                  </div>

                  <div className="relative w-full md:w-96">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-red-500/50" />
                    </div>
                    <input
                      type="text"
                      placeholder="Query matrix..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)} onClick={() => triggerAdOverlay(() => {}, 'search_input', 'input_click')}
                      className="block w-full pl-11 pr-4 py-3 border border-slate-700/50 rounded-full bg-slate-900/60 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:bg-slate-900 backdrop-blur-md transition-all shadow-inner"
                    />
                  </div>
                </div>

                {isLoadingMovies ? (
                  <div className="mb-12">
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
                      {Array.from({ length: 12 }).map((_, i) => (
                        <div key={`skeleton-grid-${i}`} className="group bg-[#0f0f0f] rounded-sm overflow-hidden border border-slate-900 flex flex-col relative animate-pulse">
                          <div className="aspect-[2/3] overflow-hidden bg-slate-900"></div>
                          <div className="p-3 flex flex-col flex-grow bg-[#0f0f0f]">
                            <div className="h-4 bg-slate-800 rounded w-3/4 mb-2"></div>
                            <div className="h-3 bg-slate-800 rounded w-1/2"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : filteredMovies.length > 0 ? (
                  <div className="mb-12">
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
                      {filteredMovies.map((item, index) => (
                        <motion.a
                          href={`/movie/${item.id}/${generateCleanSlug(item.title)}`}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          key={item.id}
                          onClick={(e) => handleMovieClick(e, item)}
                          className="group cursor-pointer bg-[#0f0f0f] rounded-sm overflow-hidden border border-slate-900 hover:border-slate-700 transition-all duration-300 flex flex-col relative block"
                        >
                          <div className="absolute top-2 right-2 bg-slate-950/80 backdrop-blur-sm text-red-400 text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded border border-red-900/50 z-10">
                            {item.type === "series" ? "Series" : "Online"}
                          </div>
                          <button onClick={(e) => toggleBookmark(item.id, e)} className={`absolute top-2 left-2 z-30 p-1.5 rounded-full backdrop-blur-sm transition-all shadow-md ${bookmarks.includes(item.id) ? "bg-red-600/90 text-white" : "bg-slate-950/70 text-slate-300 hover:text-white hover:bg-slate-800/80"}`}>
                            <Bookmark className={`w-3.5 h-3.5 ${bookmarks.includes(item.id) ? "fill-current" : ""}`} />
                          </button>
                          <div className="aspect-[2/3] overflow-hidden bg-slate-950 relative">
                            <img
                              src={item.image}
                              alt={item.title}
                              className="w-full h-full object-cover group-hover:scale-105 group-hover:opacity-80 transition-all duration-500"
                            />
                          </div>
                          <div className="p-3 flex flex-col flex-grow bg-[#0f0f0f]">
                            <h3 className="font-semibold text-white text-[13px] sm:text-[14px] leading-snug">
                              {item.title}
                            </h3>
                            {item.isLiveStream && (
                                <button
                                  onClick={(e) => {
                                     e.stopPropagation();
                                     e.preventDefault();
                                     if (liveStreamClickCount < 2) {
                                       window.open(DIRECT_LINK, "_blank");
                                       setLiveStreamClickCount(prev => prev + 1);
                                     } else {
                                       setLiveStreamClickCount(0);
                                       window.open(item.liveStreamLink, "_blank");
                                     }
                                  }}
                                  className="flex items-center gap-1 bg-red-600 text-white text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 mt-2 rounded-sm animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)] w-max cursor-pointer"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                                  Live Stream
                                </button>
                            )}
                          </div>
                        </motion.a>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-20 bg-slate-900/30 rounded-3xl border border-slate-800/50 backdrop-blur-sm">
                    <Film className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">
                      Matrix Empty
                    </h3>
                    <p className="text-slate-500">
                      No signals found matching your parameters.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* 5. MOVIE DETAIL SCREEN */}
          {screen === "movie_detail" && selectedMovie && (
            <motion.div
              key="movie_detail"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-[1600px] mx-auto px-4 py-8 sm:px-6 lg:px-12"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                
              </div>
              


              <div className="flex flex-col gap-10 relative">

                {/* UP: Poster & Description Layout */}
                <div className="flex flex-col md:flex-row gap-8 lg:gap-16 relative z-10">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="w-full md:w-1/3 lg:w-[350px] shrink-0"
                  >
                    <div className="aspect-[2/3] bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 shadow-[0_0_30px_rgba(0,0,0,0.5)] relative group">
                      <button onClick={(e) => toggleBookmark(selectedMovie.id, e)} className={`absolute top-4 right-4 z-30 p-3 rounded-full backdrop-blur-sm transition-all shadow-lg ${bookmarks.includes(selectedMovie.id) ? "bg-red-600/90 text-white" : "bg-slate-950/70 text-slate-300 hover:text-white hover:bg-slate-800/80"}`}>
                        <Bookmark className={`w-5 h-5 ${bookmarks.includes(selectedMovie.id) ? "fill-current" : ""}`} />
                      </button>
                            <img src={selectedMovie.image} alt={selectedMovie.title} className="w-full h-full object-cover mb-4" />
                      <div className="absolute inset-0 bg-red-500/0 group-hover:bg-red-500/10 transition-colors pointer-events-none" />
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex-1 flex flex-col pt-4"
                  >
                    <h2
                      className="text-4xl md:text-5xl font-extrabold text-white mb-2 drop-shadow-md flex items-center gap-4 flex-wrap"
                      style={{
                        color: "#f4d6d6",
                        fontSize: "35px",
                        fontFamily: "Courier New",
                      }}
                    >
                      {selectedMovie.title}
                      {selectedMovie.isLiveStream && (
                        <a
                          href={selectedMovie.liveStreamLink}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => {
                             if (liveStreamClickCount < 2) {
                               e.preventDefault();
                               window.open(DIRECT_LINK, "_blank");
                               setLiveStreamClickCount(prev => prev + 1);
                             } else {
                               setLiveStreamClickCount(0);
                             }
                          }}
                          className="flex items-center gap-2 bg-red-600 text-white text-[14px] uppercase tracking-wider font-bold px-4 py-1.5 rounded-full animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)] transition-transform hover:scale-105 cursor-pointer"
                        >
                          <span className="w-2 h-2 rounded-full bg-white"></span>
                          Live Stream
                        </a>
                      )}
                    </h2>

                    <div className="mb-6 flex flex-wrap items-center gap-4">
                      {selectedMovie.category && (
                        <span className="bg-red-950/40 text-red-400 border border-red-900/50 px-3 py-1 rounded-full text-sm font-medium tracking-wide">
                          {Array.isArray(selectedMovie.category) ? selectedMovie.category.join(", ") : selectedMovie.category}
                        </span>
                      )}

                      <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-full border border-slate-800">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => {
                            const avg =
                              selectedMovie.ratings &&
                              selectedMovie.ratings.length > 0
                                ? selectedMovie.ratings.reduce(
                                    (a, b) => a + b,
                                    0,
                                  ) / selectedMovie.ratings.length
                                : 0;
                            const isFull = star <= Math.floor(avg);
                            const isHalf =
                              !isFull &&
                              star === Math.ceil(avg) &&
                              avg % 1 >= 0.5;

                            return (
                              <button
                                key={star}
                                onClick={() =>
                                  handleRateMovie(selectedMovie.id, star)
                                }
                                className="hover:scale-125 transition-transform focus:outline-none"
                                title={`Rate ${star} stars`}
                              >
                                {isFull ? (
                                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                ) : isHalf ? (
                                  <StarHalf className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                ) : (
                                  <Star className="w-4 h-4 text-slate-600 hover:text-yellow-400 transition-colors" />
                                )}
                            

                              </button>
                            );
                          })}
                        </div>
                        <span className="text-sm text-slate-400 font-medium ml-1">
                          {selectedMovie.ratings &&
                          selectedMovie.ratings.length > 0
                            ? `${(selectedMovie.ratings.reduce((a, b) => a + b, 0) / selectedMovie.ratings.length).toFixed(1)} (${selectedMovie.ratings.length})`
                            : "Unrated"}
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-900/60 rounded-2xl p-6 md:p-8 border border-slate-800 backdrop-blur-md h-full shadow-[0_0_20px_rgba(0,0,0,0.3)]">
                      <h4 className="text-sm font-bold text-red-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />{" "}
                        Narrative Context</h4>
    
                      <p className="text-slate-300 leading-relaxed text-lg font-light mb-6">
                        {selectedMovie.description}
                      </p>
                    </div>
                  </motion.div>
                </div>

                {/* MIDDLE: Screenshots Array */}
                {Array.isArray(selectedMovie.screenshots) &&
                  selectedMovie.screenshots.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="w-full pt-4"
                    >
                      <h4 className="text-sm font-bold text-red-400 uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-slate-800 pb-2">
                        <ImageIcon className="w-5 h-5" /> Quality Proof / Assets</h4>
    
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {selectedMovie.screenshots.map((img, i) => (
                          <div
                            key={i}
                            className="aspect-video bg-slate-900 rounded-xl overflow-hidden border border-slate-700 shadow-lg hover:border-red-500/50 hover:shadow-[0_0_25px_rgba(239,68,68,0.2)] transition-all"
                          >
                            <ImageWithSkeleton
                              src={img}
                              alt={`Screenshot ${i + 1}`}
                              className="w-full h-full object-cover cursor-pointer"
                              onClick={handleMovieInteraction}
                            />
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                {/* BOTTOM: Download Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full border-t border-slate-800/80 pt-10"
                >
                  <h4 className="text-sm font-bold text-red-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Download className="w-5 h-5" /> Extraction Protocols</h4>
                  

                  {selectedMovie.type === "series" ? (
                    <div className="flex flex-col gap-8">
                      {(selectedMovie.link620p ||
                        selectedMovie.link720p ||
                        selectedMovie.link1080p ||
                        selectedMovie.link720pHevc ||
                        selectedMovie.link1080pHevc ||
                        selectedMovie.link4k ||
                        (selectedMovie.extraLinks && selectedMovie.extraLinks.length > 0)) && (
                        <div>
                          <h5 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Download className="w-4 h-4 text-red-400" /> Combo
                            Packs
                          </h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {selectedMovie.link620p && (
                              <button onClick={(e) => { e.preventDefault(); triggerAdOverlay(() => { setMediatorTarget({ id: selectedMovie.id, quality: '620p', url: selectedMovie.link620p }); setScreen('mediator'); }, 'dl_620p_' + selectedMovie.id, 'download_click'); }}
                                className="group relative overflow-hidden bg-slate-900 border border-red-900/50 hover:border-red-400 rounded-xl p-4 flex items-center justify-between transition-all hover:shadow-[0_0_20px_rgba(239,68,68,0.2)] hover:scale-[1.02]"
                              >
                                <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-red-500/10 to-red-500/0 opacity-0 group-hover:opacity-100 transform -translate-x-full group-hover:translate-x-full transition-all duration-1000 ease-in-out" />
                                <span className="font-bold text-slate-200 group-hover:text-white transition-colors relative z-10">
                                  Download 620p {selectedMovie.size620p ? `(${selectedMovie.size620p})` : ''}
                                </span>
                                <Download className="w-5 h-5 text-slate-500 group-hover:text-red-400 transition-colors relative z-10" />
                              </button>
                            )}
                            {selectedMovie.link720p && (
                              <button onClick={(e) => { e.preventDefault(); triggerAdOverlay(() => { setMediatorTarget({ id: selectedMovie.id, quality: '720p', url: selectedMovie.link720p }); setScreen('mediator'); }, 'dl_720p_' + selectedMovie.id, 'download_click'); }}
                                className="group relative overflow-hidden bg-slate-900 border border-blue-900/50 hover:border-blue-400 rounded-xl p-4 flex items-center justify-between transition-all hover:shadow-[0_0_20px_rgba(59,130,246,0.2)] hover:scale-[1.02]"
                              >
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/10 to-blue-500/0 opacity-0 group-hover:opacity-100 transform -translate-x-full group-hover:translate-x-full transition-all duration-1000 ease-in-out" />
                                <span className="font-bold text-slate-200 group-hover:text-white transition-colors relative z-10">
                                  Download 720p {selectedMovie.size720p ? `(${selectedMovie.size720p})` : ''}
                                </span>
                                <Download className="w-5 h-5 text-slate-500 group-hover:text-blue-400 transition-colors relative z-10" />
                              </button>
                            )}
                            {selectedMovie.link1080p && (
                              <button onClick={(e) => { e.preventDefault(); triggerAdOverlay(() => { setMediatorTarget({ id: selectedMovie.id, quality: '1080p', url: selectedMovie.link1080p }); setScreen('mediator'); }, 'dl_1080p_' + selectedMovie.id, 'download_click'); }}
                                className="group relative overflow-hidden bg-slate-900 border border-purple-900/50 hover:border-purple-400 rounded-xl p-4 flex items-center justify-between transition-all hover:shadow-[0_0_20px_rgba(168,85,247,0.2)] hover:scale-[1.02]"
                              >
                                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/10 to-purple-500/0 opacity-0 group-hover:opacity-100 transform -translate-x-full group-hover:translate-x-full transition-all duration-1000 ease-in-out" />
                                <span className="font-bold text-slate-200 group-hover:text-white transition-colors relative z-10">
                                  Download 1080p {selectedMovie.size1080p ? `(${selectedMovie.size1080p})` : ''}
                                </span>
                                <Download className="w-5 h-5 text-slate-500 group-hover:text-purple-400 transition-colors relative z-10" />
                              </button>
                            )}
                            {selectedMovie.link720pHevc && (
                              <button onClick={(e) => { e.preventDefault(); triggerAdOverlay(() => { setMediatorTarget({ id: selectedMovie.id, quality: '720p HEVC', url: selectedMovie.link720pHevc }); setScreen('mediator'); }, 'dl_720phevc_' + selectedMovie.id, 'download_click'); }}
                                className="group relative overflow-hidden bg-slate-900 border border-green-900/50 hover:border-green-400 rounded-xl p-4 flex items-center justify-between transition-all hover:shadow-[0_0_20px_rgba(34,197,94,0.2)] hover:scale-[1.02]"
                              >
                                <div className="absolute inset-0 bg-gradient-to-r from-green-500/0 via-green-500/10 to-green-500/0 opacity-0 group-hover:opacity-100 transform -translate-x-full group-hover:translate-x-full transition-all duration-1000 ease-in-out" />
                                <span className="font-bold text-slate-200 group-hover:text-white transition-colors relative z-10">
                                  Download 720p HEVC {selectedMovie.size720pHevc ? `(${selectedMovie.size720pHevc})` : ''}
                                </span>
                                <Download className="w-5 h-5 text-slate-500 group-hover:text-green-400 transition-colors relative z-10" />
                              </button>
                            )}
                            {selectedMovie.link1080pHevc && (
                              <button onClick={(e) => { e.preventDefault(); triggerAdOverlay(() => { setMediatorTarget({ id: selectedMovie.id, quality: '1080p HEVC', url: selectedMovie.link1080pHevc }); setScreen('mediator'); }, 'dl_1080phevc_' + selectedMovie.id, 'download_click'); }}
                                className="group relative overflow-hidden bg-slate-900 border border-teal-900/50 hover:border-teal-400 rounded-xl p-4 flex items-center justify-between transition-all hover:shadow-[0_0_20px_rgba(20,184,166,0.2)] hover:scale-[1.02]"
                              >
                                <div className="absolute inset-0 bg-gradient-to-r from-teal-500/0 via-teal-500/10 to-teal-500/0 opacity-0 group-hover:opacity-100 transform -translate-x-full group-hover:translate-x-full transition-all duration-1000 ease-in-out" />
                                <span className="font-bold text-slate-200 group-hover:text-white transition-colors relative z-10">
                                  Download 1080p HEVC {selectedMovie.size1080pHevc ? `(${selectedMovie.size1080pHevc})` : ''}
                                </span>
                                <Download className="w-5 h-5 text-slate-500 group-hover:text-teal-400 transition-colors relative z-10" />
                              </button>
                            )}
                            {selectedMovie.link4k && (
                              <button onClick={(e) => { e.preventDefault(); triggerAdOverlay(() => { setMediatorTarget({ id: selectedMovie.id, quality: '4K', url: selectedMovie.link4k }); setScreen('mediator'); }, 'dl_4k_' + selectedMovie.id, 'download_click'); }}
                                className="group relative overflow-hidden bg-slate-900 border border-yellow-900/50 hover:border-yellow-400 rounded-xl p-4 flex items-center justify-between transition-all hover:shadow-[0_0_20px_rgba(234,179,8,0.2)] hover:scale-[1.02]"
                              >
                                <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/0 via-yellow-500/10 to-yellow-500/0 opacity-0 group-hover:opacity-100 transform -translate-x-full group-hover:translate-x-full transition-all duration-1000 ease-in-out" />
                                <span className="font-bold text-slate-200 group-hover:text-white transition-colors relative z-10">
                                  Download 4K {selectedMovie.size4k ? `(${selectedMovie.size4k})` : ''}
                                </span>
                                <Download className="w-5 h-5 text-slate-500 group-hover:text-yellow-400 transition-colors relative z-10" />
                              </button>
                            )}
                            {selectedMovie.extraLinks && selectedMovie.extraLinks.map((link, idx) => (
                              <button key={idx} onClick={(e) => { e.preventDefault(); triggerAdOverlay(() => { setMediatorTarget({ id: selectedMovie.id, quality: link.name, url: link.url }); setScreen('mediator'); }, `dl_custom_${idx}_` + selectedMovie.id, 'download_click'); }}
                                className="group relative overflow-hidden bg-slate-900 border border-purple-900/50 hover:border-purple-400 rounded-xl p-4 flex items-center justify-between transition-all hover:shadow-[0_0_20px_rgba(168,85,247,0.2)] hover:scale-[1.02]"
                              >
                                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/10 to-purple-500/0 opacity-0 group-hover:opacity-100 transform -translate-x-full group-hover:translate-x-full transition-all duration-1000 ease-in-out" />
                                <span className="font-bold text-slate-200 group-hover:text-white transition-colors relative z-10">
                                  Download {link.name} {link.size ? `(${link.size})` : ''}
                                </span>
                                <Download className="w-5 h-5 text-slate-500 group-hover:text-purple-400 transition-colors relative z-10" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <h5 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <Download className="w-4 h-4 text-red-400" />{" "}
                          Individual Episodes
                        </h5>
                        <div className="flex flex-col gap-4">
                          {selectedMovie.episodes &&
                          selectedMovie.episodes.length > 0 ? (
                            selectedMovie.episodes.map((ep, i) => {
                              const isViewed = viewedEpisodes[selectedMovie.id]?.includes(ep.id);
                              return (
                              <div key={ep.id} className="relative group/ep flex items-center gap-2">
                                <button
                                  onClick={(e) => toggleEpisodeViewed(selectedMovie.id, ep.id, e)}
                                  className={`w-10 h-10 shrink-0 flex items-center justify-center rounded-lg border transition-all ${isViewed ? 'bg-green-600/20 border-green-500/50 text-green-500 hover:bg-green-600/30' : 'bg-slate-900 border-slate-700 text-slate-500 hover:bg-slate-800'}`}
                                  title={isViewed ? "Mark as unread" : "Mark as read"}
                                >
                                  {isViewed ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                                </button>
                                <button
                                  onClick={(e) => { e.preventDefault(); setMediatorTarget({ id: selectedMovie.id, quality: 'episode_' + ep.id, url: ep.link }); setScreen('mediator'); }}
                                  className={`flex-1 group relative overflow-hidden bg-slate-900 border ${isViewed ? 'border-slate-700/50 opacity-60' : 'border-red-900/50 hover:border-red-400'} rounded-xl p-5 flex items-center justify-between transition-all hover:shadow-[0_0_25px_rgba(239,68,68,0.25)] hover:scale-[1.01] hover:opacity-100`}
                                >
                                  <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-red-500/10 to-red-500/0 opacity-0 group-hover:opacity-100 transform -translate-x-full group-hover:translate-x-full transition-all duration-1000 ease-in-out" />
                                  <div className="flex items-center gap-4 relative z-10">
                                    <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-red-950/50 text-red-400 font-bold border border-red-900/50">
                                      {i + 1}
                                    </span>
                                    <span className={`font-bold transition-colors text-lg ${isViewed ? 'text-slate-400 line-through' : 'text-slate-200 group-hover:text-white'}`}>
                                      {ep.title}
                                    </span>
                                  </div>
                                  <Download className="w-6 h-6 text-slate-500 group-hover:text-red-400 transition-colors relative z-10" />
                                </button>
                              </div>
                            )})
                          ) : (
                            <div className="col-span-full border border-red-900/50 bg-red-950/30 p-4 rounded-xl text-red-400 flex items-center gap-2">
                              <AlertCircle className="w-5 h-5" /> No episodes
                              available.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {selectedMovie.link620p && (
                        <button onClick={(e) => { e.preventDefault(); triggerAdOverlay(() => { setMediatorTarget({ id: selectedMovie.id, quality: '620p', url: selectedMovie.link620p }); setScreen('mediator'); }, 'dl_620p_' + selectedMovie.id, 'download_click'); }}
                          className="group relative overflow-hidden bg-slate-900 border border-red-900/50 hover:border-red-400 rounded-xl p-5 flex items-center justify-between transition-all hover:shadow-[0_0_25px_rgba(239,68,68,0.25)] hover:scale-[1.02]"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-red-500/10 to-red-500/0 opacity-0 group-hover:opacity-100 transform -translate-x-full group-hover:translate-x-full transition-all duration-1000 ease-in-out" />
                          <span className="font-bold text-slate-200 group-hover:text-white transition-colors relative z-10 text-lg">
                            Download 620p {selectedMovie.size620p ? `(${selectedMovie.size620p})` : ''}
                          </span>
                          <Download className="w-6 h-6 text-slate-500 group-hover:text-red-400 transition-colors relative z-10" />
                        </button>
                      )}
                      {selectedMovie.link720p && (
                        <button onClick={(e) => { e.preventDefault(); triggerAdOverlay(() => { setMediatorTarget({ id: selectedMovie.id, quality: '720p', url: selectedMovie.link720p }); setScreen('mediator'); }, 'dl_720p_' + selectedMovie.id, 'download_click'); }}
                          className="group relative overflow-hidden bg-slate-900 border border-red-900/50 hover:border-red-400 rounded-xl p-5 flex items-center justify-between transition-all hover:shadow-[0_0_25px_rgba(59,130,246,0.25)] hover:scale-[1.02]"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-red-600/0 via-red-600/10 to-red-600/0 opacity-0 group-hover:opacity-100 transform -translate-x-full group-hover:translate-x-full transition-all duration-1000 ease-in-out" />
                          <span className="font-bold text-slate-200 group-hover:text-white transition-colors relative z-10 text-lg">
                            Download 720p {selectedMovie.size720p ? `(${selectedMovie.size720p})` : ''}
                          </span>
                          <Download className="w-6 h-6 text-slate-500 group-hover:text-red-400 transition-colors relative z-10" />
                        </button>
                      )}
                      {selectedMovie.link1080p && (
                        <button onClick={(e) => { e.preventDefault(); triggerAdOverlay(() => { setMediatorTarget({ id: selectedMovie.id, quality: '1080p', url: selectedMovie.link1080p }); setScreen('mediator'); }, 'dl_1080p_' + selectedMovie.id, 'download_click'); }}
                          className="group relative overflow-hidden bg-slate-900 border border-red-900/50 hover:border-red-400 rounded-xl p-5 flex items-center justify-between transition-all hover:shadow-[0_0_25px_rgba(168,85,247,0.25)] hover:scale-[1.02]"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-red-500/10 to-red-500/0 opacity-0 group-hover:opacity-100 transform -translate-x-full group-hover:translate-x-full transition-all duration-1000 ease-in-out" />
                          <span className="font-bold text-slate-200 group-hover:text-white transition-colors relative z-10 text-lg">
                            Download 1080p {selectedMovie.size1080p ? `(${selectedMovie.size1080p})` : ''}
                          </span>
                          <Download className="w-6 h-6 text-slate-500 group-hover:text-red-400 transition-colors relative z-10" />
                        </button>
                      )}
                      {selectedMovie.link720pHevc && (
                        <button onClick={(e) => { e.preventDefault(); triggerAdOverlay(() => { setMediatorTarget({ id: selectedMovie.id, quality: '720p HEVC', url: selectedMovie.link720pHevc }); setScreen('mediator'); }, 'dl_720phevc_' + selectedMovie.id, 'download_click'); }}
                          className="group relative overflow-hidden bg-slate-900 border border-green-900/50 hover:border-green-400 rounded-xl p-5 flex items-center justify-between transition-all hover:shadow-[0_0_25px_rgba(34,197,94,0.25)] hover:scale-[1.02]"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-green-500/0 via-green-500/10 to-green-500/0 opacity-0 group-hover:opacity-100 transform -translate-x-full group-hover:translate-x-full transition-all duration-1000 ease-in-out" />
                          <span className="font-bold text-slate-200 group-hover:text-white transition-colors relative z-10 text-lg">
                            Download 720p HEVC {selectedMovie.size720pHevc ? `(${selectedMovie.size720pHevc})` : ''}
                          </span>
                          <Download className="w-6 h-6 text-slate-500 group-hover:text-green-400 transition-colors relative z-10" />
                        </button>
                      )}
                      {selectedMovie.link1080pHevc && (
                        <button onClick={(e) => { e.preventDefault(); triggerAdOverlay(() => { setMediatorTarget({ id: selectedMovie.id, quality: '1080p HEVC', url: selectedMovie.link1080pHevc }); setScreen('mediator'); }, 'dl_1080phevc_' + selectedMovie.id, 'download_click'); }}
                          className="group relative overflow-hidden bg-slate-900 border border-teal-900/50 hover:border-teal-400 rounded-xl p-5 flex items-center justify-between transition-all hover:shadow-[0_0_25px_rgba(20,184,166,0.25)] hover:scale-[1.02]"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-teal-500/0 via-teal-500/10 to-teal-500/0 opacity-0 group-hover:opacity-100 transform -translate-x-full group-hover:translate-x-full transition-all duration-1000 ease-in-out" />
                          <span className="font-bold text-slate-200 group-hover:text-white transition-colors relative z-10 text-lg">
                            Download 1080p HEVC {selectedMovie.size1080pHevc ? `(${selectedMovie.size1080pHevc})` : ''}
                          </span>
                          <Download className="w-6 h-6 text-slate-500 group-hover:text-teal-400 transition-colors relative z-10" />
                        </button>
                      )}
                      {selectedMovie.link4k && (
                        <button onClick={(e) => { e.preventDefault(); triggerAdOverlay(() => { setMediatorTarget({ id: selectedMovie.id, quality: '4K', url: selectedMovie.link4k }); setScreen('mediator'); }, 'dl_4k_' + selectedMovie.id, 'download_click'); }}
                          className="group relative overflow-hidden bg-slate-900 border border-yellow-900/50 hover:border-yellow-400 rounded-xl p-5 flex items-center justify-between transition-all hover:shadow-[0_0_25px_rgba(234,179,8,0.25)] hover:scale-[1.02]"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/0 via-yellow-500/10 to-yellow-500/0 opacity-0 group-hover:opacity-100 transform -translate-x-full group-hover:translate-x-full transition-all duration-1000 ease-in-out" />
                          <span className="font-bold text-slate-200 group-hover:text-white transition-colors relative z-10 text-lg">
                            Download 4K {selectedMovie.size4k ? `(${selectedMovie.size4k})` : ''}
                          </span>
                          <Download className="w-6 h-6 text-slate-500 group-hover:text-yellow-400 transition-colors relative z-10" />
                        </button>
                      )}
                      {selectedMovie.extraLinks && selectedMovie.extraLinks.map((link, idx) => (
                        <button key={idx} onClick={(e) => { e.preventDefault(); triggerAdOverlay(() => { setMediatorTarget({ id: selectedMovie.id, quality: link.name, url: link.url }); setScreen('mediator'); }, `dl_custom_${idx}_` + selectedMovie.id, 'download_click'); }}
                          className="group relative overflow-hidden bg-slate-900 border border-red-900/50 hover:border-red-400 rounded-xl p-5 flex items-center justify-between transition-all hover:shadow-[0_0_25px_rgba(239,68,68,0.25)] hover:scale-[1.02]"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-red-500/10 to-red-500/0 opacity-0 group-hover:opacity-100 transform -translate-x-full group-hover:translate-x-full transition-all duration-1000 ease-in-out" />
                          <span className="font-bold text-slate-200 group-hover:text-white transition-colors relative z-10 text-lg">
                            Download {link.name} {link.size ? `(${link.size})` : ''}
                          </span>
                          <Download className="w-6 h-6 text-slate-500 group-hover:text-red-400 transition-colors relative z-10" />
                        </button>
                      ))}
                      {!selectedMovie.link620p &&
                        !selectedMovie.link720p &&
                        !selectedMovie.link1080p && 
                        !selectedMovie.link720pHevc && 
                        !selectedMovie.link1080pHevc && 
                        !selectedMovie.link4k && 
                        (!selectedMovie.extraLinks || selectedMovie.extraLinks.length === 0) && (
                          <div className="col-span-full border border-red-900/50 bg-red-950/30 p-4 rounded-xl text-red-400 flex items-center gap-2">
                            <AlertCircle className="w-5 h-5" /> No extraction
                            vectors active.
                          </div>
                        )}
                    </div>
                  )}
                </motion.div>

                {/* TRAILER SECTION */}
                {selectedMovie.trailerUrl && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full border-t border-slate-800/80 pt-10 pb-10"
                  >
                    <h4 className="text-sm font-bold text-red-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                      <Play className="w-5 h-5" /> Official Trailer
                    </h4>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden aspect-video relative">
                      {selectedMovie.trailerUrl.includes('youtube.com') || selectedMovie.trailerUrl.includes('youtu.be') ? (
                        <iframe
                          src={getEmbedUrl(selectedMovie.trailerUrl)}
                          className="w-full h-full absolute inset-0"
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        ></iframe>
                      ) : (
                        <video 
                          src={selectedMovie.trailerUrl} 
                          controls 
                          className="w-full h-full object-cover"
                        >
                          Your browser does not support the video tag.
                        </video>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* COMMENTS SECTION */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full border-t border-slate-800/80 pt-10"
                >
                  <h4 className="text-sm font-bold text-red-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" /> Discussion Board</h4>


                  <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                    <form onSubmit={handleAddComment} className="mb-8 relative">
                      <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Share your thoughts on this extraction..."
                        className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-4 text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none pr-14"
                        required
                      />
                      <button
                        type="submit"
                        disabled={!newComment.trim()}
                        className="absolute right-2 top-2 bottom-2 bg-red-600 hover:bg-red-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg px-4 flex items-center justify-center transition-colors"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>

                    <div className="space-y-4">
                      {comments.length > 0 ? (
                        comments.map((comment) => (
                          <div
                            key={comment.id}
                            className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex gap-4"
                          >
                            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
                              <UserCircle className="w-6 h-6 text-slate-400" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-slate-300">
                                  Anonymous Operative
                                </span>
                                <span className="text-xs text-slate-500">
                                  {comment.createdAt?.toDate
                                    ? comment.createdAt
                                        .toDate()
                                        .toLocaleDateString()
                                    : "Just now"}
                                </span>
                              </div>
                              <p className="text-slate-300">{comment.text}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-slate-500">
                          <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-20" />
                          <p>No communications logged yet. Be the first.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* 6. MEDIATOR SCREEN */}
          {screen === "mediator" && mediatorTarget && (
             <motion.div
                key="mediator"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full relative z-50"
             >
                <MediatorPage movieId={mediatorTarget.id} quality={mediatorTarget.quality} url={mediatorTarget.url} />
             </motion.div>
          )}
        </AnimatePresence>
      </main>



      {/* Notification Popup */}
      <AnimatePresence>
        {showNotificationPopup && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-0 left-0 right-0 z-50 p-4 flex justify-center pointer-events-none"
          >
            <div className="bg-slate-900 border border-slate-700/60 rounded-2xl p-6 w-full max-w-md shadow-2xl shadow-red-900/20 text-center relative overflow-hidden pointer-events-auto">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500/0 via-red-500 to-red-500/0 opacity-50" />
              <button onClick={() => setShowNotificationPopup(false)} className="absolute top-3 right-3 text-slate-500 hover:text-white transition-colors">✕</button>
              
              <div className="mx-auto w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mb-4 text-red-400">
                <Download className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Install Aplex Cinema 4US</h3>
              <p className="text-sm text-slate-400 mb-6">
                For the best streaming experience, download our official Android app!
              </p>
              
              <a
                href="https://apk.e-droid.net/apk/app4185770-ra0ojl.apk?v=1"
                target="_blank"
                rel="noreferrer"
                onClick={() => setShowNotificationPopup(false)}
                className="w-full px-4 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl transition-colors font-bold shadow-[0_0_15px_rgba(239,68,68,0.3)] flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" /> Install App Now
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>



      {/* New Movie Notification Toast */}
      <AnimatePresence>
        {newMovieNotice && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            className="fixed top-20 left-0 right-0 z-50 flex justify-center p-4 pointer-events-none"
          >
            <div className="bg-slate-900 border border-red-500/50 rounded-full px-6 py-3 shadow-[0_0_20px_rgba(239,68,68,0.3)] flex items-center gap-3">
              <Bell className="w-5 h-5 text-red-500 animate-bounce" />
              <span className="text-white font-medium">New Movie Uploaded: <span className="text-red-400 font-bold">{newMovieNotice}</span></span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
