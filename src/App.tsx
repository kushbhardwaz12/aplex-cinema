import React, { useState, useRef, useEffect } from "react";
import { MediatorPage } from './components/MediatorPage';

import {Film,
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
  Plus,
  MessageSquare,
  Send,
  Clock,
  Bookmark,
  Bell,
  Pencil,
  Activity,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import { db, auth, googleProvider } from "./firebase";

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
  ratings?: number[];
  episodes?: Episode[];
  isHighlight?: boolean;
  isLiveStream?: boolean;
  liveStreamLink?: string;
  createdAt?: any;
}

const CATEGORIES = [
  "Action",
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
}: {
  src: string;
  alt: string;
  className?: string;
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
        className={`${className} ${loaded ? "opacity-100" : "opacity-0"} transition-opacity duration-300`}
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
};

export default function App() {
  // Navigation & Auth State
  const [screen, setScreen] = useState<
    "login" | "pin_check" | "admin_dashboard" | "public_home" | "movie_detail"
  >("public_home");
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [isAdminAuth, setIsAdminAuth] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showNotificationPopup, setShowNotificationPopup] = useState(false);
  const [showLoginReminderPopup, setShowLoginReminderPopup] = useState(false);
  const [newMovieNotice, setNewMovieNotice] = useState<string | null>(null);
  const initialLoadComplete = useRef(false);
  const [watchLaterList, setWatchLaterList] = useState<string[]>(() => {
    const saved = localStorage.getItem("watchLaterList");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("watchLaterList", JSON.stringify(watchLaterList));
  }, [watchLaterList]);

  const toggleWatchLater = (movieId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setWatchLaterList(prev => 
        prev.includes(movieId) ? prev.filter(id => id !== movieId) : [...prev, movieId]
    );
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (!auth.currentUser) {
        setShowLoginReminderPopup(true);
      }
    }, 120000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUserEmail(user.email);
        if (user.email === "lalitasuraj27@gmail.com") {
          setIsAdminAuth(true);
        } else {
          setIsAdminAuth(false);
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
  const [link620p, setLink620p] = useState("");
  const [link720p, setLink720p] = useState("");
  const [link1080p, setLink1080p] = useState("");

  const [adminError, setAdminError] = useState("");
  const [adminSuccess, setAdminSuccess] = useState("");
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
  const [episodes, setEpisodes] = useState<{ link: string }[]>([{ link: "" }]);
  const [seriesLink620p, setSeriesLink620p] = useState("");
  const [seriesLink720p, setSeriesLink720p] = useState("");
  const [seriesLink1080p, setSeriesLink1080p] = useState("");

  const [starClicks, setStarClicks] = useState(0);
  const [showAdminLoginForm, setShowAdminLoginForm] = useState(false);

  // UI States
  const fileInputRef = useRef<HTMLInputElement>(null);
  const screenshotsInputRef = useRef<HTMLInputElement>(null);
  const seriesFileInputRef = useRef<HTMLInputElement>(null);
  const seriesScreenshotsInputRef = useRef<HTMLInputElement>(null);

  // App Data State
  const [movies, setMovies] = useState<Movie[]>([]);

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
    // 🔥 Humne query mein 'orderBy' jod diya hai taaki Instagram jaisa live setup bane
    const q = query(collection(db, "movies"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
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
      },
      (error) => {
        console.error("Firestore Error in App.tsx movies onSnapshot:", error);
      },
    );
    return () => unsubscribe();
  }, []);

  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [movieCategory, setMovieCategory] = useState<string[]>(["Action"]);

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
    });
    return () => unsubscribe();
  }, [selectedMovie]);

  // --- Handlers ---
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

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCurrentUserEmail(null);
      setIsAdminAuth(false);
      setEmail("");
      setPassword("");
      setPin("");
      setScreen("public_home");
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
      setLoginError("Google Sign-In failed. Please try again.");
    }
  };

  const handleSeriesImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSeriesImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSeriesScreenshotsChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length > 0) {
      const readers = files.map((file) => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
          reader.readAsDataURL(file);
        });
      });

      Promise.all(readers).then((results) => {
        setSeriesScreenshots(results);
      });
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
    setAdminError("");
    setAdminSuccess("");

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
          isHighlight: isSeriesHighlight,
        };
        await updateDoc(doc(db, "movies", editingMovieId), updateData);
        setAdminSuccess("Web Series updated successfully!");
        setEditingMovieId(null);
      } else {
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
          ratings: [],
          createdAt: new Date(),
          isHighlight: isSeriesHighlight,
        };

        await addDoc(collection(db, "movies"), newSeries);
        setAdminSuccess("Web Series published successfully!");
      }

      setSeriesTitle("");
      setSeriesDesc("");
      setSeriesImage(null);
      setSeriesScreenshots([]);
      setIsSeriesHighlight(false);
      setEpisodes([{ link: "" }]);
      setSeriesLink620p("");
      setSeriesLink720p("");
      setSeriesLink1080p("");
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
    setIsSeriesHighlight(movie.isHighlight || false);
    setEpisodes(movie.episodes?.length ? movie.episodes.map(ep => ({ link: ep.link })) : [{ link: "" }]);
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMovieImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleScreenshotsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length > 0) {
      const readers = files.map((file) => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
          reader.readAsDataURL(file);
        });
      });

      Promise.all(readers).then((results) => {
        setMovieScreenshots(results);
      });
    }
  };

  const handleAddMovie = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError("");
    setAdminSuccess("");

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
        const updateData = {
          title: movieTitle,
          description: movieDesc,
          image: movieImage || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&q=80",
          category: movieCategory,
          screenshots: movieScreenshots,
          link620p,
          link720p,
          link1080p,
          isHighlight: isMovieHighlight,
          isLiveStream,
          liveStreamLink,
        };
        await updateDoc(doc(db, "movies", editingMovieId), updateData);
        setAdminSuccess("Movie updated successfully!");
        setEditingMovieId(null);
      } else {
        const newMovie = {
          title: movieTitle,
          description: movieDesc,
          image:
            movieImage ||
            "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&q=80",
          category: movieCategory,
          screenshots: movieScreenshots,
          type: "movie",
          // 🎯 Asli movie aur live stream links ko memory mein save kar rahe hain
      // 1. 🎯 Pehle object ke BAAHAR hi saare links ko memory mein save kar lo (Object se upar)
      if (link620p) localStorage.setItem('movieUrl_620p', link620p);
      if (link720p) localStorage.setItem('movieUrl_720p', link720p);
      if (link1080p) localStorage.setItem('movieUrl_1080p', link1080p);
      if (liveStreamLink) localStorage.setItem('movieUrl_live', liveStreamLink);

      // Naye page ka raasta
      const mediatorUrl = `${window.location.origin}/download-gateway`;

      // 2. 🎯 Ab database ke liye data tayyar karo aur bhej do
      await addDoc(collection(db, "movies"), {
        title: movieTitle,
        desc: movieDesc,
        type: "movie", // 👈 Jo tumhaari line 746 par tha
        isLiveStream: isLiveStream,
        
        // Links ki jagah mediator url chala jayega
        liveStreamLink: liveStreamLink ? mediatorUrl : "",
        link620p: link620p ? mediatorUrl : "",
        link720p: link720p ? mediatorUrl : "",
        link1080p: link1080p ? mediatorUrl : "",
        
        createdAt: serverTimestamp(), // ya jo bhi tumhara purana code tha
      });

      setMovieTitle("");
      setMovieDesc("");
      setMovieImage(null);
      setMovieScreenshots([]);
      setLink620p("");
      setLink720p("");
      setLink1080p("");
      setIsMovieHighlight(false);
      setIsLiveStream(false);
      setLiveStreamLink("");
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
    setIsMovieHighlight(movie.isHighlight || false);
    setIsLiveStream(movie.isLiveStream || false);
    setLiveStreamLink(movie.liveStreamLink || "");
    
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
    <div className="min-h-screen bg-slate-950 font-sans text-slate-50 selection:bg-red-500/30">
      {/* NAVBAR */}
      <nav className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div
              className="flex items-center gap-2 group cursor-pointer"
              onClick={() => setScreen("public_home")}
            >
              <img
                src="YOUR_LOGO_IMAGE_URL_HERE"
                alt="Aplex Cinema"
                className="h-8 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  const textLogo = document.getElementById("text-logo");
                  if (textLogo) {
                    textLogo.classList.remove("hidden");
                    textLogo.classList.add("flex");
                  }
                }}
              />
              <div
                id="text-logo"
                className="hidden items-center text-xl font-black tracking-tighter text-white"
              >
                APLEX{" "}
                <span className="text-red-600 font-bold ml-1">CINEMA</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
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
                  <button
                    onClick={() => {
                      setScreen("login");
                      setEmail("");
                      setPassword("");
                      setPin("");
                    }}
                    className="flex items-center gap-2 text-sm font-medium bg-red-600 hover:bg-red-500 text-white transition-all px-5 py-2 rounded-lg shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                  >
                    <UserCircle className="w-4 h-4" />
                    Sign-In
                  </button>
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

                {showAdminLoginForm && (
                  <>
                    <form onSubmit={handleLogin} className="space-y-5">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                          Admin Username
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Mail className="h-5 w-5 text-slate-500" />
                          </div>
                          <input
                            type="text"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="admin_username"
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
                )}

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
                           <a href={report.url} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:text-blue-300 underline break-all max-w-[200px]">
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
                {adminSuccess && (
                  <div className="bg-green-900/50 border border-green-500/50 text-green-200 px-4 py-3 rounded-lg mb-6">
                    {adminSuccess}
                  </div>
                )}

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
                        <input
                          required
                          type="text"
                          value={movieTitle}
                          onChange={(e) => setMovieTitle(e.target.value)}
                          placeholder="e.g., The Matrix Protocol"
                          className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all shadow-inner"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Category (Select up to 3) *
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {CATEGORIES.map((category) => (
                            <button
                              key={category}
                              type="button"
                              onClick={() => {
                                setMovieCategory(prev => {
                                  if (prev.includes(category)) {
                                    return prev.filter(c => c !== category);
                                  } else if (prev.length < 3) {
                                    return [...prev, category];
                                  }
                                  return prev;
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
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Data Narrative (Storyline) *
                        </label>
                        <textarea
                          required
                          rows={4}
                          value={movieDesc}
                          onChange={(e) => setMovieDesc(e.target.value)}
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
                                  <img
                                    key={i}
                                    src={img}
                                    alt={`Screenshot ${i + 1}`}
                                    className="h-24 w-full object-cover rounded-lg shadow-xl border border-slate-800"
                                  />
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
                      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <LinkIcon className="w-5 h-5 text-red-400" />{" "}
                        Transmission Vectors (Links)
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-400 mb-1">
                            620p Package
                          </label>
                          <input
                            type="url"
                            value={link620p}
                            onChange={(e) => setLink620p(e.target.value)}
                            placeholder="https://..."
                            className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-400 mb-1">
                            720p Package
                          </label>
                          <input
                            type="url"
                            value={link720p}
                            onChange={(e) => setLink720p(e.target.value)}
                            placeholder="https://..."
                            className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-400 mb-1">
                            1080p Package
                          </label>
                          <input
                            type="url"
                            value={link1080p}
                            onChange={(e) => setLink1080p(e.target.value)}
                            placeholder="https://..."
                            className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 flex flex-col gap-4">
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
                          <input
                            type="url"
                            value={liveStreamLink}
                            onChange={(e) => setLiveStreamLink(e.target.value)}
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
                              setIsMovieHighlight(false);
                              setIsLiveStream(false);
                              setLiveStreamLink("");
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
                        <input
                          required
                          type="text"
                          value={seriesTitle}
                          onChange={(e) => setSeriesTitle(e.target.value)}
                          placeholder="e.g., Stranger Things"
                          className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all shadow-inner"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Category (Select up to 3) *
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {CATEGORIES.map((category) => (
                            <button
                              key={category}
                              type="button"
                              onClick={() => {
                                setSeriesCategory(prev => {
                                  if (prev.includes(category)) {
                                    return prev.filter(c => c !== category);
                                  } else if (prev.length < 3) {
                                    return [...prev, category];
                                  }
                                  return prev;
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
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Series Description *
                        </label>
                        <textarea
                          required
                          rows={4}
                          value={seriesDesc}
                          onChange={(e) => setSeriesDesc(e.target.value)}
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
                                  <img
                                    key={i}
                                    src={img}
                                    alt={`Screenshot ${i + 1}`}
                                    className="h-24 w-full object-cover rounded-lg shadow-xl border border-slate-800"
                                  />
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
                      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <LinkIcon className="w-5 h-5 text-red-400" /> Combo Pack
                        Packages (Links)
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div>
                          <label className="block text-sm font-medium text-slate-400 mb-1">
                            620p Combo Pack
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
                            720p Combo Pack
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
                            1080p Combo Pack
                          </label>
                          <input
                            type="url"
                            value={seriesLink1080p}
                            onChange={(e) => setSeriesLink1080p(e.target.value)}
                            placeholder="https://..."
                            className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-sm"
                          />
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
                              setIsSeriesHighlight(false);
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
                <h3 className="text-xl font-bold text-white mb-6 border-b border-slate-800 pb-2">
                  Active Data Streams
                </h3>
                {movies.length === 0 ? (
                  <div className="text-center py-12 bg-slate-900/50 rounded-2xl border border-slate-800 border-dashed">
                    <p className="text-slate-500">
                      No media streams initialized.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {movies.map((movie) => (
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
                            </h4>
                            <p className="text-xs text-slate-500 font-mono">
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
          {screen === "public_home" && (
            <motion.div
              key="public_home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full"
            >
              {/* Highlights Slider full width */}
              {!searchQuery &&
                movies.filter((m) => m.isHighlight).length > 0 && (
                  <div className="w-full bg-slate-950/50 mb-8 border-b border-slate-800">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2">
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <span 
                          className="text-white cursor-pointer select-none"
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
                          ⭐
                        </span> Top Highlights
                      </h2>
                    </div>
                    <div className="flex overflow-x-auto gap-1 pb-4 pt-2 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                      {movies
                        .filter((m) => m.isHighlight)
                        .slice(0, 10)
                        .map((movie, index) => (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.05 }}
                            key={`highlight-${movie.id}`}
                            onClick={() => {
                              setSelectedMovie(movie);
                              setScreen("movie_detail");
                            }}
                            className="w-[110px] sm:w-[130px] md:w-[150px] lg:w-[170px] xl:w-[190px] aspect-[2/3] bg-slate-900 cursor-pointer relative group flex-shrink-0 snap-center transition-all duration-300 hover:scale-[1.03] hover:z-10 shadow-lg overflow-hidden rounded-xl"
                          >
                            <img
                              src={movie.image}
                              alt={movie.title}
                              className="w-full h-full object-cover group-hover:brightness-110 transition-all duration-300 border border-transparent group-hover:border-red-500/50"
                            />
                            {movie.isLiveStream && (
                              <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-600/90 backdrop-blur text-white text-[9px] sm:text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-sm animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)] z-20 pointer-events-none">
                                <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                                Live
                              </div>
                            )}
                          </motion.div>
                        ))}
                    </div>
                  </div>
                )}

              {/* Notification Bar */}
              <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 mt-0 mb-8">
                <div className="bg-gradient-to-r from-red-950/20 via-slate-900/60 to-slate-900/20 border border-slate-800 rounded-lg py-3 px-4 shadow-[0_4px_20px_rgba(0,0,0,0.5)] flex items-center justify-center text-center">
                  <p className="text-slate-300 text-xs sm:text-sm md:text-base font-medium">
                    <span className="text-yellow-500 font-bold mr-1 sm:mr-2 text-base sm:text-lg">
                      ×
                    </span>
                    <span className="text-red-500">
                      Avoid FAKE Copies of APLEX CINEMA on Google,
                    </span>{" "}
                    Always use{" "}
                    <a
                      href="#"
                      className="text-red-500 hover:text-red-400 transition-colors"
                    >
                      APLEXCINEMA.Tv
                    </a>{" "}
                    |{" "}
                    <a
                      href="#"
                      className="text-red-500 hover:text-red-400 transition-colors"
                    >
                      APLEXCINEMA.med
                    </a>{" "}
                    With VPN to get Official Domain &amp; Follow us on{" "}
                    <a
                      href="#"
                      className="text-red-500 hover:text-red-400 transition-colors inline-flex items-center gap-1"
                    >
                      WhatsApp{" "}
                      <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 text-red-500 bg-white rounded-full" />
                    </a>{" "}
                    For Latest Updates.
                  </p>
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
                  </div>

                  <div className="relative w-full md:w-96">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-red-500/50" />
                    </div>
                    <input
                      type="text"
                      placeholder="Query matrix..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="block w-full pl-11 pr-4 py-3 border border-slate-700/50 rounded-full bg-slate-900/60 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:bg-slate-900 backdrop-blur-md transition-all shadow-inner"
                    />
                  </div>
                </div>

                {filteredMovies.length > 0 ? (
                  <div className="mb-12">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                      {filteredMovies.map((item, index) => (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          key={item.id}
                          onClick={() => {
                            setSelectedMovie(item);
                            setScreen("movie_detail");
                          }}
                          className="group cursor-pointer bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 hover:border-red-500/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(239,68,68,0.15)] flex flex-col relative"
                        >
                          <div className="absolute top-2 right-2 bg-slate-950/80 backdrop-blur-sm text-red-400 text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded border border-red-900/50 z-10">
                            {item.type === "series" ? "Series" : "Online"}
                          </div>
                          <div className="aspect-[2/3] overflow-hidden bg-slate-950 relative">
                            <img
                              src={item.image}
                              alt={item.title}
                              className="w-full h-full object-cover group-hover:scale-105 group-hover:opacity-80 transition-all duration-500"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-90" />
                          </div>
                          <div className="p-4 flex flex-col justify-end transform -translate-y-4 group-hover:translate-y-0 transition-transform bg-slate-900 relative z-10 flex-grow mt-[-2rem]">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold text-white text-lg truncate bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent group-hover:from-red-300 group-hover:to-red-600 transition-colors">
                                {item.title}
                              </h3>
                              {item.isLiveStream && (
                                <a
                                  href={item.liveStreamLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-1 bg-red-600 text-white text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)] whitespace-nowrap"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                                  Live Stream
                                </a>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mb-1">
                              {item.category && (
                                <div className="text-xs text-red-400 font-medium">
                                  {Array.isArray(item.category) ? item.category.join(", ") : item.category}
                                </div>
                              )}
                              <div className="flex items-center gap-1 text-xs text-yellow-400 bg-slate-950/50 px-1.5 py-0.5 rounded">
                                <Star className="w-3 h-3 fill-yellow-400" />
                                <span>
                                  {item.ratings && item.ratings.length > 0
                                    ? (
                                        item.ratings.reduce(
                                          (a, b) => a + b,
                                          0,
                                        ) / item.ratings.length
                                      ).toFixed(1)
                                    : "0"}
                                </span>
                              </div>
                            </div>

                            <div className="flex justify-between items-center mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              {item.type === "series" ? (
                                <div className="flex gap-1.5 text-xs text-slate-400 font-medium">
                                  {item.episodes?.length || 0} Episodes
                                </div>
                              ) : (
                                <div className="flex gap-1.5">
                                  {item.link620p && (
                                    <span
                                      className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.8)]"
                                      title="620p Available"
                                    />
                                  )}
                                  {item.link720p && (
                                    <span
                                      className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_5px_rgba(59,130,246,0.8)]"
                                      title="720p Available"
                                    />
                                  )}
                                  {item.link1080p && (
                                    <span
                                      className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_5px_rgba(168,85,247,0.8)]"
                                      title="1080p Available"
                                    />
                                  )}
                                </div>
                              )}
                              <button 
                                onClick={(e) => toggleWatchLater(item.id, e)}
                                className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded bg-slate-950/50 hover:bg-slate-800 transition-colors"
                              >
                                {watchLaterList.includes(item.id) ? (
                                  <><Bookmark className="w-3.5 h-3.5 fill-red-500 text-red-500" /> <span className="text-red-400">Saved</span></>
                                ) : (
                                  <><Clock className="w-3.5 h-3.5 text-slate-400" /> <span className="text-slate-300">Watch Later</span></>
                                )}
                              </button>
                            </div>
                          </div>
                        </motion.div>
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
              <button
                onClick={() => setScreen("public_home")}
                className="mb-8 inline-flex items-center gap-2 text-slate-400 hover:text-red-400 transition-colors font-medium bg-slate-900 px-4 py-2 rounded-full border border-slate-800 hover:border-red-900 shadow-md"
              >
                <ArrowLeft className="w-5 h-5" /> Return to Manifest
              </button>

              <div className="flex flex-col gap-10">
                {/* UP: Poster & Description Layout */}
                <div className="flex flex-col md:flex-row gap-8 lg:gap-16">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="w-full md:w-1/3 lg:w-[350px] shrink-0"
                  >
                    <div className="aspect-[2/3] bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 shadow-[0_0_30px_rgba(0,0,0,0.5)] relative group">
                      <img
                        src={selectedMovie.image}
                        alt={selectedMovie.title}
                        className="w-full h-full object-cover"
                        style={{
                          paddingTop: "0px",
                          paddingBottom: "0px",
                          paddingRight: "-5px",
                          paddingLeft: "-5px",
                          marginTop: "5px",
                          marginBottom: "14px",
                        }}
                      />
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
                          className="flex items-center gap-2 bg-red-600 text-white text-[14px] uppercase tracking-wider font-bold px-4 py-1.5 rounded-full animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)] transition-transform hover:scale-105"
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
                        Narrative Context
                      </h4>
                      <p className="text-slate-300 leading-relaxed text-lg font-light">
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
                        <ImageIcon className="w-5 h-5" /> Quality Proof / Assets
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {selectedMovie.screenshots.map((img, i) => (
                          <div
                            key={i}
                            className="aspect-video bg-slate-900 rounded-xl overflow-hidden border border-slate-700 shadow-lg hover:border-red-500/50 hover:shadow-[0_0_25px_rgba(239,68,68,0.2)] transition-all"
                          >
                            <ImageWithSkeleton
                              src={img}
                              alt={`Screenshot ${i + 1}`}
                              className="w-full h-full object-cover"
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
                    <Download className="w-5 h-5" /> Extraction Protocols
                  </h4>

                  {selectedMovie.type === "series" ? (
                    <div className="flex flex-col gap-8">
                      {(selectedMovie.link620p ||
                        selectedMovie.link720p ||
                        selectedMovie.link1080p) && (
                        <div>
                          <h5 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Download className="w-4 h-4 text-red-400" /> Combo
                            Packs
                          </h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {selectedMovie.link620p && (
                              <a
                                href={selectedMovie.link620p}
                                target="_blank"
                                rel="noreferrer"
                                className="group relative overflow-hidden bg-slate-900 border border-red-900/50 hover:border-red-400 rounded-xl p-4 flex items-center justify-between transition-all hover:shadow-[0_0_20px_rgba(239,68,68,0.2)] hover:scale-[1.02]"
                              >
                                <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-red-500/10 to-red-500/0 opacity-0 group-hover:opacity-100 transform -translate-x-full group-hover:translate-x-full transition-all duration-1000 ease-in-out" />
                                <span className="font-bold text-slate-200 group-hover:text-white transition-colors relative z-10">
                                  Download 620p
                                </span>
                                <Download className="w-5 h-5 text-slate-500 group-hover:text-red-400 transition-colors relative z-10" />
                              </a>
                            )}
                            {selectedMovie.link720p && (
                              <a
                                href={selectedMovie.link720p}
                                target="_blank"
                                rel="noreferrer"
                                className="group relative overflow-hidden bg-slate-900 border border-blue-900/50 hover:border-blue-400 rounded-xl p-4 flex items-center justify-between transition-all hover:shadow-[0_0_20px_rgba(59,130,246,0.2)] hover:scale-[1.02]"
                              >
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/10 to-blue-500/0 opacity-0 group-hover:opacity-100 transform -translate-x-full group-hover:translate-x-full transition-all duration-1000 ease-in-out" />
                                <span className="font-bold text-slate-200 group-hover:text-white transition-colors relative z-10">
                                  Download 720p
                                </span>
                                <Download className="w-5 h-5 text-slate-500 group-hover:text-blue-400 transition-colors relative z-10" />
                              </a>
                            )}
                            {selectedMovie.link1080p && (
                              <a
                                href={selectedMovie.link1080p}
                                target="_blank"
                                rel="noreferrer"
                                className="group relative overflow-hidden bg-slate-900 border border-purple-900/50 hover:border-purple-400 rounded-xl p-4 flex items-center justify-between transition-all hover:shadow-[0_0_20px_rgba(168,85,247,0.2)] hover:scale-[1.02]"
                              >
                                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/10 to-purple-500/0 opacity-0 group-hover:opacity-100 transform -translate-x-full group-hover:translate-x-full transition-all duration-1000 ease-in-out" />
                                <span className="font-bold text-slate-200 group-hover:text-white transition-colors relative z-10">
                                  Download 1080p
                                </span>
                                <Download className="w-5 h-5 text-slate-500 group-hover:text-purple-400 transition-colors relative z-10" />
                              </a>
                            )}
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
                            selectedMovie.episodes.map((ep, i) => (
                              <a
                                key={ep.id}
                                href={ep.link}
                                target="_blank"
                                rel="noreferrer"
                                className="group relative overflow-hidden bg-slate-900 border border-red-900/50 hover:border-red-400 rounded-xl p-5 flex items-center justify-between transition-all hover:shadow-[0_0_25px_rgba(239,68,68,0.25)] hover:scale-[1.01]"
                              >
                                <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-red-500/10 to-red-500/0 opacity-0 group-hover:opacity-100 transform -translate-x-full group-hover:translate-x-full transition-all duration-1000 ease-in-out" />
                                <div className="flex items-center gap-4 relative z-10">
                                  <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-red-950/50 text-red-400 font-bold border border-red-900/50">
                                    {i + 1}
                                  </span>
                                  <span className="font-bold text-slate-200 group-hover:text-white transition-colors text-lg">
                                    {ep.title}
                                  </span>
                                </div>
                                <Download className="w-6 h-6 text-slate-500 group-hover:text-red-400 transition-colors relative z-10" />
                              </a>
                            ))
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
                        <a
                          href={selectedMovie.link620p}
                          target="_blank"
                          rel="noreferrer"
                          className="group relative overflow-hidden bg-slate-900 border border-red-900/50 hover:border-red-400 rounded-xl p-5 flex items-center justify-between transition-all hover:shadow-[0_0_25px_rgba(239,68,68,0.25)] hover:scale-[1.02]"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-red-500/10 to-red-500/0 opacity-0 group-hover:opacity-100 transform -translate-x-full group-hover:translate-x-full transition-all duration-1000 ease-in-out" />
                          <span className="font-bold text-slate-200 group-hover:text-white transition-colors relative z-10 text-lg">
                            Download 620p
                          </span>
                          <Download className="w-6 h-6 text-slate-500 group-hover:text-red-400 transition-colors relative z-10" />
                        </a>
                      )}

                      {selectedMovie.link720p && (
                        <a
                          href={selectedMovie.link720p}
                          target="_blank"
                          rel="noreferrer"
                          className="group relative overflow-hidden bg-slate-900 border border-red-900/50 hover:border-red-400 rounded-xl p-5 flex items-center justify-between transition-all hover:shadow-[0_0_25px_rgba(59,130,246,0.25)] hover:scale-[1.02]"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-red-600/0 via-red-600/10 to-red-600/0 opacity-0 group-hover:opacity-100 transform -translate-x-full group-hover:translate-x-full transition-all duration-1000 ease-in-out" />
                          <span className="font-bold text-slate-200 group-hover:text-white transition-colors relative z-10 text-lg">
                            Download 720p
                          </span>
                          <Download className="w-6 h-6 text-slate-500 group-hover:text-red-400 transition-colors relative z-10" />
                        </a>
                      )}

                      {selectedMovie.link1080p && (
                        <a
                          href={selectedMovie.link1080p}
                          target="_blank"
                          rel="noreferrer"
                          className="group relative overflow-hidden bg-slate-900 border border-red-900/50 hover:border-red-400 rounded-xl p-5 flex items-center justify-between transition-all hover:shadow-[0_0_25px_rgba(168,85,247,0.25)] hover:scale-[1.02]"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-red-500/10 to-red-500/0 opacity-0 group-hover:opacity-100 transform -translate-x-full group-hover:translate-x-full transition-all duration-1000 ease-in-out" />
                          <span className="font-bold text-slate-200 group-hover:text-white transition-colors relative z-10 text-lg">
                            Download 1080p
                          </span>
                          <Download className="w-6 h-6 text-slate-500 group-hover:text-red-400 transition-colors relative z-10" />
                        </a>
                      )}

                      {!selectedMovie.link620p &&
                        !selectedMovie.link720p &&
                        !selectedMovie.link1080p && (
                          <div className="col-span-full border border-red-900/50 bg-red-950/30 p-4 rounded-xl text-red-400 flex items-center gap-2">
                            <AlertCircle className="w-5 h-5" /> No extraction
                            vectors active.
                          </div>
                        )}
                    </div>
                  )}
                </motion.div>

                {/* COMMENTS SECTION */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full border-t border-slate-800/80 pt-10"
                >
                  <h4 className="text-sm font-bold text-red-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" /> Discussion Board
                  </h4>

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
        </AnimatePresence>
      </main>

      {/* Notification Popup */}
      <AnimatePresence>
        {showNotificationPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-slate-900 border border-slate-700/60 rounded-2xl p-6 w-full max-w-sm shadow-2xl shadow-red-900/20 text-center relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500/0 via-red-500 to-red-500/0 opacity-50" />
              <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 text-red-400">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Enable Notifications?</h3>
              <p className="text-sm text-slate-400 mb-6">
                Would you like to be notified when we add new movies or web series?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowNotificationPopup(false)}
                  className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors font-medium text-sm"
                >
                  Not Now
                </button>
                <button
                  onClick={() => {
                    // Here we'd request notification permission in a real PWA
                    if ('Notification' in window) {
                      Notification.requestPermission();
                    }
                    setShowNotificationPopup(false);
                  }}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors font-medium text-sm shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                >
                  Allow
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Login Reminder Popup */}
      <AnimatePresence>
        {showLoginReminderPopup && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-0 left-0 right-0 z-50 p-4 flex justify-center pointer-events-none"
          >
            <div className="bg-slate-900 border border-slate-700/60 rounded-2xl p-6 w-full max-w-md shadow-2xl shadow-red-900/20 text-center relative overflow-hidden pointer-events-auto">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500/0 via-red-500 to-red-500/0 opacity-50" />
              <button onClick={() => setShowLoginReminderPopup(false)} className="absolute top-3 right-3 text-slate-500 hover:text-white transition-colors">✕</button>
              <h3 className="text-xl font-bold text-white mb-2">Login Required for Full Experience</h3>
              <p className="text-sm text-slate-400 mb-6">
                Log in to access high quality extraction protocols, comments, and real-time updates!
              </p>
              <button
                onClick={() => {
                  setShowLoginReminderPopup(false);
                  setScreen("login");
                }}
                className="w-full px-4 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl transition-colors font-bold shadow-[0_0_15px_rgba(239,68,68,0.3)]"
              >
                Go to Login
              </button>
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
