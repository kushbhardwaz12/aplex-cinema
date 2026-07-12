const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldDef = `  const [adTriggeredForMovies, setAdTriggeredForMovies] = useState<Set<string>>(new Set());
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

const newDef = `  const [adTriggeredKeys, setAdTriggeredKeys] = useState<Set<string>>(new Set());
  
  // type can be 'movie_click' or 'download_click'
  const triggerAdOverlay = (nextAction: () => void, adKey?: string, type: 'movie_click' | 'download_click' = 'download_click') => {
    if (screen === "admin_dashboard") {
      nextAction();
      return;
    }
    
    const isMobile = window.innerWidth <= 768;
    
    // On mobile, DO NOT show popups when clicking a movie on the home screen
    if (isMobile && type === 'movie_click') {
      nextAction();
      return;
    }
    
    // For all other cases (Desktop movie click, or ANY download click)
    if (adKey) {
      if (!adTriggeredKeys.has(adKey)) {
        window.open(DIRECT_LINK, "_blank");
        setAdTriggeredKeys(prev => new Set(prev).add(adKey));
      }
    } else {
      window.open(DIRECT_LINK, "_blank");
    }
    
    nextAction();
  };`;

code = code.replace(oldDef, newDef);
fs.writeFileSync('src/App.tsx', code);
