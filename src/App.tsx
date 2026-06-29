import React, { useState, useRef, useEffect } from "react";
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
  Plus,
  MessageSquare,
  Send,
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
import { db } from "./firebase";

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
}

const CATEGORIES = [
  "Action",
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
  const [link620p, setLink620p] = useState("");
  const [link720p, setLink720p] = useState("");
  const [link1080p, setLink1080p] = useState("");

  const [adminError, setAdminError] = useState("");
  const [adminSuccess, setAdminSuccess] = useState("");

  // Series Form States
  const [activeAdminTab, setActiveAdminTab] = useState<"movie" | "series">(
    "movie",
  );
  const [seriesTitle, setSeriesTitle] = useState("");
  const [seriesDesc, setSeriesDesc] = useState("");
  const [seriesImage, setSeriesImage] = useState<string | null>(null);
  const [seriesImageUrlInput, setSeriesImageUrlInput] = useState("");
  const [seriesCategory, setSeriesCategory] = useState(CATEGORIES[0]);
  const [seriesScreenshots, setSeriesScreenshots] = useState<string[]>([]);
  const [seriesScreenshotUrlInput, setSeriesScreenshotUrlInput] = useState("");
  const [isSeriesHighlight, setIsSeriesHighlight] = useState(false);
  const [episodes, setEpisodes] = useState<{ link: string }[]>([{ link: "" }]);
  const [seriesLink620p, setSeriesLink620p] = useState("");
  const [seriesLink720p, setSeriesLink720p] = useState("");
  const [seriesLink1080p, setSeriesLink1080p] = useState("");

  // UI States
  const fileInputRef = useRef<HTMLInputElement>(null);
  const screenshotsInputRef = useRef<HTMLInputElement>(null);
  const seriesFileInputRef = useRef<HTMLInputElement>(null);
  const seriesScreenshotsInputRef = useRef<HTMLInputElement>(null);

  // App Data State
  const [movies, setMovies] = useState<Movie[]>([]);

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
  const [movieCategory, setMovieCategory] = useState<string>("Action");

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

  const handleLogout = () => {
    setCurrentUserEmail(null);
    setIsAdminAuth(false);
    setEmail("");
    setPassword("");
    setPin("");
    setScreen("public_home");
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setLoginError("Please enter a valid email address.");
      return;
    }

    if (!email || !password) {
      setLoginError("Please fill in all fields.");
      return;
    }

    const emailLower = email.toLowerCase();

    if (emailLower === "lalitasuraj27@gmail.com") {
      if (pin === "1983") {
        setCurrentUserEmail(emailLower);
        setIsAdminAuth(true);
        setScreen("admin_dashboard");
      } else {
        setLoginError("Invalid Admin Credentials! Access Denied.");
      }
    } else if (emailLower === "kala.15qwe@gmail.com") {
      if (password === "104325") {
        setCurrentUserEmail(emailLower);
        setScreen("public_home");
        setShowSignInPopup(false);
      } else {
        setLoginError("Invalid Email or Password. Please try again!");
      }
    } else {
      setLoginError("Invalid Email or Password. Please try again!");
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
        setScreen("public_home");
      }, 1500);
    } catch (error) {
      setAdminError("Failed to add series to network.");
      console.error(error);
    }
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
      const newMovie = {
        title: movieTitle,
        description: movieDesc,
        image:
          movieImage ||
          "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&q=80",
        category: movieCategory,
        screenshots: movieScreenshots,
        type: "movie",
        link620p,
        link720p,
        link1080p,
        ratings: [],
        createdAt: new Date(),
        isHighlight: isMovieHighlight,
      };

      await addDoc(collection(db, "movies"), newMovie);
      setAdminSuccess("Movie published successfully!");

      setMovieTitle("");
      setMovieDesc("");
      setMovieImage(null);
      setMovieScreenshots([]);
      setLink620p("");
      setLink720p("");
      setLink1080p("");
      setIsMovieHighlight(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (screenshotsInputRef.current) screenshotsInputRef.current.value = "";

      setTimeout(() => {
        setAdminSuccess("");
        setScreen("public_home");
      }, 1500);
    } catch (error) {
      setAdminError("Failed to add movie to network.");
      console.error(error);
    }
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
      selectedCategory === "All" || movie.category === selectedCategory;
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

                <form onSubmit={handleLogin} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Email Identification
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-slate-500" />
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="user@system.net"
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
                    Authenticate
                  </button>
                </form>
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
                          Category *
                        </label>
                        <select
                          value={movieCategory}
                          onChange={(e) => setMovieCategory(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all shadow-inner"
                        >
                          {CATEGORIES.map((category) => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                        </select>
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

                    <div className="pt-4 flex flex-col md:flex-row items-center gap-4 justify-between">
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
                      <button
                        type="submit"
                        className="w-full md:w-auto bg-red-600 hover:bg-red-500 text-white font-bold px-8 py-4 rounded-xl shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:shadow-[0_0_30px_rgba(239,68,68,0.5)] transition-all flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                        Publish to Network
                      </button>
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
                          Category *
                        </label>
                        <select
                          value={seriesCategory}
                          onChange={(e) => setSeriesCategory(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all shadow-inner"
                        >
                          {CATEGORIES.map((category) => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                        </select>
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
                      <button
                        type="submit"
                        className="w-full md:w-auto bg-red-600 hover:bg-red-500 text-white font-bold px-8 py-4 rounded-xl shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:shadow-[0_0_30px_rgba(239,68,68,0.5)] transition-all flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                        Publish Series to Network
                      </button>
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
                            <h4 className="font-bold text-white mb-1">
                              {movie.title}
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
                        <button
                          onClick={() => handleDeleteMovie(movie.id)}
                          className="w-full sm:w-auto bg-red-950/40 text-red-400 hover:bg-red-900/60 hover:text-red-300 border border-red-900/50 px-4 py-2 rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" /> Terminate
                        </button>
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
                        <span className="text-white">⭐</span> Top Highlights
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
                            className="w-[110px] sm:w-[130px] md:w-[150px] lg:w-[170px] xl:w-[190px] aspect-[2/3] bg-slate-900 cursor-pointer relative group flex-shrink-0 snap-center transition-all duration-300 hover:scale-[1.03] hover:z-10 shadow-lg"
                          >
                            <img
                              src={movie.image}
                              alt={movie.title}
                              className="w-full h-full object-cover group-hover:brightness-110 transition-all duration-300 border border-transparent group-hover:border-red-500/50"
                            />
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
                            <h3 className="font-bold text-white text-lg truncate mb-1 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent group-hover:from-red-300 group-hover:to-red-600 transition-colors">
                              {item.title}
                            </h3>
                            <div className="flex items-center gap-2 mb-1">
                              {item.category && (
                                <div className="text-xs text-red-400 font-medium">
                                  {item.category}
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

                            {item.type === "series" ? (
                              <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity mt-2 text-xs text-slate-400 font-medium">
                                {item.episodes?.length || 0} Episodes
                              </div>
                            ) : (
                              <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity mt-2">
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
                      className="text-4xl md:text-5xl font-extrabold text-white mb-2 drop-shadow-md"
                      style={{
                        color: "#f4d6d6",
                        fontSize: "35px",
                        fontFamily: "Courier New",
                      }}
                    >
                      {selectedMovie.title}
                    </h2>

                    <div className="mb-6 flex flex-wrap items-center gap-4">
                      {selectedMovie.category && (
                        <span className="bg-red-950/40 text-red-400 border border-red-900/50 px-3 py-1 rounded-full text-sm font-medium tracking-wide">
                          {selectedMovie.category}
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
    </div>
  );
}
