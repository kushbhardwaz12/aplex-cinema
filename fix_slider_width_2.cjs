const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Expand the black box even more just to be safe
const oldSliderDiv = 'w-full max-w-[1800px] relative h-[444px] sm:h-[500px] md:h-[600px] lg:h-[700px] mx-auto mb-8 overflow-hidden bg-[#000000] flex flex-col justify-center items-center font-sans rounded-2xl px-4';
const newSliderDiv = 'w-[98%] max-w-[2000px] relative h-[450px] sm:h-[500px] md:h-[550px] lg:h-[650px] mx-auto mb-8 overflow-hidden bg-[#000000] flex flex-col justify-center items-center font-sans rounded-2xl px-4';
code = code.replace(oldSliderDiv, newSliderDiv);

// 2. Expand the inner 3D perspective wrapper
const oldInnerDiv = '<div className="relative w-full max-w-[1400px] h-[75%] sm:h-[80%] flex justify-center items-center mt-[-40px] perspective-[1200px]">';
const newInnerDiv = '<div className="relative w-full max-w-[1800px] h-[75%] sm:h-[80%] flex justify-center items-center mt-[-40px] perspective-[1200px]">';
code = code.replace(oldInnerDiv, newInnerDiv);

// 3. Make xPos wider for side cards so they fill the gap more
code = code.replace('xPos = 90; // Move 90% of its width to the right', 'xPos = 110; // Move 110% of its width to the right');
code = code.replace('xPos = -90; // Move 90% to the left', 'xPos = -110; // Move 110% to the left');

fs.writeFileSync('src/App.tsx', code);
console.log('Fixed slider width and spread');
