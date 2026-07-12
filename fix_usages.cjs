const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/triggerAdOverlay\(\(\) => \{\n\s*setSelectedMovie\(movie\);\n\s*setScreen\("movie_detail"\);\n\s*\}, movie\.id\);/g, 
`triggerAdOverlay(() => {
                                setSelectedMovie(movie);
                                setScreen("movie_detail");
                              }, movie.id, 'movie_click');`);

code = code.replace(/triggerAdOverlay\(\(\) => \{\n\s*setSelectedMovie\(item\);\n\s*setScreen\("movie_detail"\);\n\s*\}, item\.id\);/g, 
`triggerAdOverlay(() => {
                                setSelectedMovie(item);
                                setScreen("movie_detail");
                              }, item.id, 'movie_click');`);

// Update download button usages to also pass a unique key so the ad only triggers ONCE per download click!
// The user said: "mobile par 1 ad par se back jake dubara click karte hi ad aa rahi hai"
// This indicates the download buttons were triggering an ad EVERY time on mobile.
// We should give each download button a unique key like: `download_620p_${selectedMovie.id}`
code = code.replace(/triggerAdOverlay\(\(\) => { localStorage\.setItem\('movieUrl_620p_' \+ selectedMovie\.id, selectedMovie\.link620p \|\| ''\); setMediatorTarget\(\{ id: selectedMovie\.id, quality: '620p' \}\); setScreen\('mediator'\); }\);/g, 
`triggerAdOverlay(() => { localStorage.setItem('movieUrl_620p_' + selectedMovie.id, selectedMovie.link620p || ''); setMediatorTarget({ id: selectedMovie.id, quality: '620p' }); setScreen('mediator'); }, 'dl_620p_' + selectedMovie.id, 'download_click');`);

code = code.replace(/triggerAdOverlay\(\(\) => { localStorage\.setItem\('movieUrl_720p_' \+ selectedMovie\.id, selectedMovie\.link720p \|\| ''\); setMediatorTarget\(\{ id: selectedMovie\.id, quality: '720p' \}\); setScreen\('mediator'\); }\);/g, 
`triggerAdOverlay(() => { localStorage.setItem('movieUrl_720p_' + selectedMovie.id, selectedMovie.link720p || ''); setMediatorTarget({ id: selectedMovie.id, quality: '720p' }); setScreen('mediator'); }, 'dl_720p_' + selectedMovie.id, 'download_click');`);

code = code.replace(/triggerAdOverlay\(\(\) => { localStorage\.setItem\('movieUrl_1080p_' \+ selectedMovie\.id, selectedMovie\.link1080p \|\| ''\); setMediatorTarget\(\{ id: selectedMovie\.id, quality: '1080p' \}\); setScreen\('mediator'\); }\);/g, 
`triggerAdOverlay(() => { localStorage.setItem('movieUrl_1080p_' + selectedMovie.id, selectedMovie.link1080p || ''); setMediatorTarget({ id: selectedMovie.id, quality: '1080p' }); setScreen('mediator'); }, 'dl_1080p_' + selectedMovie.id, 'download_click');`);

fs.writeFileSync('src/App.tsx', code);
