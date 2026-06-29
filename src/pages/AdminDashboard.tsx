import React, { useState, useRef } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, handleFirestoreError } from '../lib/firebase';
import { OperationType } from '../types';
import { Upload, Film, Link as LinkIcon, CheckCircle2, Loader2, Tag, Image as ImageIcon } from 'lucide-react';
import { motion } from 'motion/react';

export function AdminDashboard() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    genres: '',
    quality620: '',
    quality720: '',
    quality1080: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setSuccess(false);
    setError('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be less than 5MB');
        return;
      }
      setPosterFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError('');
    }
  };

  const uploadPoster = async (): Promise<string> => {
    if (!posterFile) throw new Error("No poster selected");
    
    // Unique filename
    const filename = `posters/${Date.now()}_${posterFile.name}`;
    const storageRef = ref(storage, filename);
    
    await uploadBytes(storageRef, posterFile);
    const downloadUrl = await getDownloadURL(storageRef);
    return downloadUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!posterFile) {
      setError('Please select a movie poster image.');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const genresArray = formData.genres
        .split(',')
        .map(g => g.trim())
        .filter(g => g.length > 0);
        
      const posterUrl = await uploadPoster();

      const movieData = {
        title: formData.title,
        description: formData.description,
        posterUrl,
        genres: genresArray,
        links: {
          ...(formData.quality620 && { quality620: formData.quality620 }),
          ...(formData.quality720 && { quality720: formData.quality720 }),
          ...(formData.quality1080 && { quality1080: formData.quality1080 }),
        },
        createdAt: serverTimestamp()
      };

      const path = 'movies';
      try {
        await addDoc(collection(db, path), movieData);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }

      setSuccess(true);
      setFormData({
        title: '', description: '', genres: '', quality620: '', quality720: '', quality1080: ''
      });
      setPosterFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to add movie');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
        <p className="text-slate-400">Add new movies into the database.</p>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl"
      >
        <div className="flex items-center gap-3 mb-8 pb-6 border-b border-slate-800">
          <div className="bg-blue-600/20 p-3 rounded-xl border border-blue-500/20">
            <Film className="w-6 h-6 text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-white">Add New Movie</h2>
        </div>

        {success && (
          <div className="mb-6 p-4 bg-emerald-950/50 border border-emerald-900/50 rounded-xl flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            <p className="text-emerald-200 font-medium">Movie added successfully!</p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-950/50 border border-red-900/50 rounded-xl flex items-start gap-3">
            <p className="text-red-200 text-sm whitespace-pre-wrap">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-1">Movie Title *</label>
                <input
                  required
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600"
                  placeholder="e.g. Inception"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-1">Description / Storyline *</label>
                <textarea
                  required
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600 resize-none"
                  placeholder="A thief who steals corporate secrets through the use of dream-sharing technology..."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" /> Poster Image *
                  </div>
                </label>
                
                <div 
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${previewUrl ? 'border-slate-700 bg-slate-900/50' : 'border-slate-800 hover:border-slate-600 bg-slate-950'}`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {previewUrl ? (
                    <div className="flex flex-col items-center">
                      <img src={previewUrl} alt="Preview" className="h-48 object-contain rounded-lg mb-4 shadow-lg" />
                      <p className="text-sm text-slate-400">Click to change image</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-slate-500 hover:text-slate-400">
                      <Upload className="w-10 h-10 mb-3" />
                      <p className="text-sm font-medium">Click to select an image from your gallery</p>
                      <p className="text-xs mt-1">(Max 5MB)</p>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  required={!posterFile}
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4" /> Genres (Comma separated)
                  </div>
                </label>
                <input
                  name="genres"
                  value={formData.genres}
                  onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600"
                  placeholder="Action, Sci-Fi, Thriller"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-6 border-t border-slate-800">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <LinkIcon className="w-5 h-5 text-blue-400" /> Download Links
            </h3>
            <p className="text-sm text-slate-400">Provide direct download links for the available qualities. At least one is required.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-300 mb-1">620p Link</label>
                <input
                  name="quality620"
                  type="url"
                  value={formData.quality620}
                  onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600"
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-300 mb-1">720p Link</label>
                <input
                  name="quality720"
                  type="url"
                  value={formData.quality720}
                  onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600"
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-300 mb-1">1080p Link</label>
                <input
                  name="quality1080"
                  type="url"
                  value={formData.quality1080}
                  onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600"
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>

          <div className="pt-6">
            <button
              type="submit"
              disabled={loading}
              className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center justify-center gap-2 px-8 py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
              Publish Movie
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
