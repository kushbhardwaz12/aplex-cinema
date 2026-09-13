const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add "More Movies" text with an arrow pointing down
// We will add it right below the slider (the div with max-w-[1600px])
const targetDiv = `                <div 
                  className="w-full max-w-[1600px] relative h-[450px] sm:h-[500px] md:h-[550px] lg:h-[650px] mx-auto mb-8 overflow-hidden bg-[#000000] flex flex-col justify-center items-center font-sans rounded-2xl px-4"
                  onMouseEnter={() => setIsSliderHovered(true)}
                  onMouseLeave={() => setIsSliderHovered(false)}
                >`;

const newDiv = `                <div 
                  className="w-full max-w-[1600px] relative h-[450px] sm:h-[500px] md:h-[550px] lg:h-[650px] mx-auto mb-2 overflow-hidden bg-[#000000] flex flex-col justify-center items-center font-sans rounded-2xl px-4"
                  onMouseEnter={() => setIsSliderHovered(true)}
                  onMouseLeave={() => setIsSliderHovered(false)}
                >`;

code = code.replace(targetDiv, newDiv);

const oldCloseTag = `                      </>
                    );
                  })()}
                </div>
              )}
              {!searchQuery && (isLoadingMovies || movies.filter((m) => m.isHighlight).length > 0) && (`;

const newCloseTag = `                      </>
                    );
                  })()}
                </div>
              )}
              {!searchQuery && (isLoadingMovies || movies.filter((m) => m.isHighlight).length > 0) && (
                <div className="w-full flex justify-center mb-10 mt-2">
                  <div className="flex flex-col items-center animate-bounce text-red-500 cursor-pointer" onClick={() => window.scrollBy({ top: 500, behavior: 'smooth' })}>
                    <span className="text-sm font-bold tracking-widest uppercase mb-1">More Movies</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                  </div>
                </div>
              )}
              {!searchQuery && (isLoadingMovies || movies.filter((m) => m.isHighlight).length > 0) && (`;

code = code.replace(oldCloseTag, newCloseTag);

fs.writeFileSync('src/App.tsx', code);
console.log('Added more movies text and arrow');
