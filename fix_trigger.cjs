const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldDef = `  const [adTriggeredForMovies, setAdTriggeredForMovies] = useState<Set<string>>(new Set());
  const triggerAdOverlay = (nextAction: () => void, movieId?: string) => {
    if (screen === "admin_dashboard") {
      nextAction();
      return;
    }
    
    if (movieId) {
      if (!adTriggeredForMovies.has(movieId)) {
        window.open(DIRECT_LINK, "_blank");
        setAdTriggeredForMovies(prev => new Set(prev).add(movieId));
      }
    } else {
      window.open(DIRECT_LINK, "_blank");
    }
    nextAction();
  };`;

const newDef = `  const [adTriggeredForMovies, setAdTriggeredForMovies] = useState<Set<string>>(new Set());
  const triggerAdOverlay = (nextAction: () => void, movieId?: string) => {
    if (screen === "admin_dashboard") {
      nextAction();
      return;
    }
    
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
      // No popup ads on mobile anymore
    } else {
      if (movieId) {
        if (!adTriggeredForMovies.has(movieId)) {
          window.open(DIRECT_LINK, "_blank");
          setAdTriggeredForMovies(prev => new Set(prev).add(movieId));
        }
      } else {
        window.open(DIRECT_LINK, "_blank");
      }
    }
    nextAction();
  };`;

code = code.replace(oldDef, newDef);
fs.writeFileSync('src/App.tsx', code);
