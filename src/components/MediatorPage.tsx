import React, { useState, useEffect } from 'react';

export const MediatorPage: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState<number>(15); // 15 seconds ka timer
  const [isReady, setIsReady] = useState<boolean>(false);
  const [realMovieUrl, setRealMovieUrl] = useState<string>('');

  useEffect(() => {
    // Browser ki memory (localStorage) se asli link nikaalna
    const savedUrl = localStorage.getItem('movieUrl');
    if (savedUrl) {
      setRealMovieUrl(savedUrl);
    }

    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setIsReady(true);
    }
  }, [timeLeft]);

  const handleDownloadClick = () => {
    // ⚠️ YAHAN APNA ADSTERRA SMARTLINK PASTE KARNA HAI
    window.open("https://www.effectivecpmnetwork.com/tuu7ayb7n?key=26cd331c63229d8724baf9fcb37d894b", "_blank");
    
    // Ad khulne ke turant baad user asli link par chala jayega
    setTimeout(() => {
      if (realMovieUrl) {
        window.location.href = realMovieUrl;
      } else {
        alert("Link expired! Please go back and click again.");
      }
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center p-4 justify-center">
      <div className="max-w-2xl w-full bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-2xl text-center">
        <h1 className="text-2xl md:text-3xl font-bold text-blue-400 mb-4">
          Securing Your Premium High-Speed Download Link
        </h1>
        <p className="text-gray-400 text-sm mb-6 leading-relaxed">
          Please wait while our secure servers bypass extraction protocols. Do not close or refresh this tab.
        </p>

        <div className="flex flex-col items-center justify-center p-6 bg-gray-900 border border-gray-700 rounded-lg mb-6">
          {!isReady ? (
            <div>
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-lg font-semibold text-yellow-400">
                Link is generating... Please wait <span className="text-xl font-bold">{timeLeft}</span> seconds.
              </p>
            </div>
          ) : (
            <p className="text-lg font-semibold text-green-400">🎉 Your Link is Successfully Verified!</p>
          )}
        </div>

        <button 
          onClick={handleDownloadClick} 
          disabled={!isReady} 
          className={`w-full md:w-auto px-8 py-4 rounded-lg font-bold text-lg transition duration-300 shadow-md ${
            isReady ? 'bg-green-600 hover:bg-green-700 text-white cursor-pointer' : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isReady ? '⚡ CLICK HERE TO DOWNLOAD NOW' : '🔒 PLEASE WAIT...'}
        </button>
      </div>
    </div>
  );
};
