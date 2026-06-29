import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Movie } from '../types';
import { ArrowLeft, Download, Film, Tag } from 'lucide-react';
import { motion } from 'motion/react';

export function MovieDetail() {
  const { id } = useParams<{ id: string }>();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchMovie() {
      if (!id) return;
      try {
        const docRef = doc(db, 'movies', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setMovie({ id: docSnap.id, ...docSnap.data() } as Movie);
        } else {
          setError('Movie not found');
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load movie details');
      } finally {
        setLoading(false);
      }
    }
    fetchMovie();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">{error || 'Movie not found'}</h2>
        <Link to="/" className="text-blue-400 hover:text-blue-300 flex items-center justify-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8">
        <ArrowLeft className="w-5 h-5" /> Back to Movies
      </Link>

      <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full md:w-1/3 lg:w-1/4 shrink-0"
        >
          <div className="aspect-[2/3] bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative">
            {movie.posterUrl ? (
              <img 
                src={movie.posterUrl} 
                alt={movie.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Film className="w-16 h-16 text-slate-700" />
              </div>
            )}
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full md:w-2/3 lg:w-3/4 py-4"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            {movie.title}
          </h1>

          {movie.genres && movie.genres.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <Tag className="w-4 h-4 text-slate-500" />
              {movie.genres.map((genre, i) => (
                <span key={i} className="px-3 py-1 bg-slate-800 text-slate-300 rounded-lg text-sm font-medium border border-slate-700">
                  {genre}
                </span>
              ))}
            </div>
          )}

          <div className="mb-8">
            <h3 className="text-lg font-semibold text-white mb-2">Storyline</h3>
            <p className="text-slate-300 leading-relaxed max-w-3xl whitespace-pre-line">
              {movie.description}
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 lg:p-8 max-w-2xl">
            <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
              <Download className="w-5 h-5 text-blue-400" /> Download Links
            </h3>
            
            <div className="space-y-4">
              {movie.links?.quality620 && (
                <a 
                  href={movie.links.quality620}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-800 hover:border-blue-500/50 hover:bg-slate-800 transition-all group"
                >
                  <span className="font-semibold text-slate-200 group-hover:text-white">620p Quality</span>
                  <Download className="w-5 h-5 text-slate-500 group-hover:text-blue-400" />
                </a>
              )}
              
              {movie.links?.quality720 && (
                <a 
                  href={movie.links.quality720}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-800 hover:border-blue-500/50 hover:bg-slate-800 transition-all group"
                >
                  <span className="font-semibold text-slate-200 group-hover:text-white">720p HD</span>
                  <Download className="w-5 h-5 text-slate-500 group-hover:text-blue-400" />
                </a>
              )}

              {movie.links?.quality1080 && (
                <a 
                  href={movie.links.quality1080}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-800 hover:border-blue-500/50 hover:bg-slate-800 transition-all group"
                >
                  <span className="font-semibold text-slate-200 group-hover:text-white">1080p Full HD</span>
                  <Download className="w-5 h-5 text-slate-500 group-hover:text-blue-400" />
                </a>
              )}

              {(!movie.links || Object.keys(movie.links).every(k => !movie.links[k as keyof typeof movie.links])) && (
                <p className="text-slate-500 italic">No download links available yet.</p>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
