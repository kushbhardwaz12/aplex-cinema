import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { OperationType, Movie } from '../types';
import { Link } from 'react-router-dom';
import { Search, Film, Calendar, Clapperboard } from 'lucide-react';
import { motion } from 'motion/react';

export function Home() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const path = 'movies';
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Movie[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Movie);
      });
      setMovies(data);
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
      // Wait: handleFirestoreError throws, which might break the UI if not caught or handled gracefully by error boundaries.
      // But we just log it here to avoid crashing the whole page for normal users if rules fail slightly.
    });

    return () => unsubscribe();
  }, []);

  const filteredMovies = movies.filter(movie => 
    movie.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    movie.genres.some(g => g.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-white mb-2 flex items-center gap-3">
            <Clapperboard className="w-8 h-8 text-blue-500" />
            Latest Releases
          </h1>
          <p className="text-slate-400">Discover and download your favorite movies in high quality.</p>
        </div>

        <div className="relative w-full md:w-96">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-500" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-3 border border-slate-800 rounded-xl leading-5 bg-slate-900 text-slate-100 placeholder-slate-500 focus:outline-none focus:bg-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors sm:text-sm"
            placeholder="Search movies by title or genre..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="animate-pulse bg-slate-800 rounded-2xl aspect-[2/3]"></div>
          ))}
        </div>
      ) : filteredMovies.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {filteredMovies.map((movie, index) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              key={movie.id}
            >
              <Link 
                to={`/movie/${movie.id}`}
                className="group flex flex-col bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 hover:border-blue-500/50 transition-all hover:shadow-2xl hover:shadow-blue-900/20"
              >
                <div className="aspect-[2/3] relative overflow-hidden bg-slate-950">
                  {movie.posterUrl ? (
                    <img 
                      src={movie.posterUrl} 
                      alt={movie.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Film className="w-12 h-12 text-slate-700" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />
                </div>
                <div className="p-4 flex-grow flex flex-col justify-end transform -translate-y-2 group-hover:translate-y-0 transition-transform bg-slate-900 z-10 relative">
                  <h3 className="text-lg font-bold text-white truncate mb-1" title={movie.title}>
                    {movie.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-400 truncate">
                    {movie.genres && movie.genres.slice(0, 2).map((genre, i) => (
                      <span key={i} className="bg-slate-800 px-2 py-0.5 rounded-full">{genre}</span>
                    ))}
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <Film className="w-16 h-16 text-slate-800 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white">No movies found</h3>
          <p className="text-slate-400 mt-2">Try adjusting your search or check back later.</p>
        </div>
      )}
    </div>
  );
}
