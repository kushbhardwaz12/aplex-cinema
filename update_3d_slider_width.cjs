const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldSliderDiv = 'w-[98%] max-w-[2000px] relative h-[450px] sm:h-[500px] md:h-[550px] lg:h-[650px] mx-auto mb-8 overflow-hidden bg-[#000000] flex flex-col justify-center items-center font-sans rounded-2xl px-4';
const newSliderDiv = 'w-full max-w-[1600px] relative h-[450px] sm:h-[500px] md:h-[550px] lg:h-[650px] mx-auto mb-8 overflow-hidden bg-[#000000] flex flex-col justify-center items-center font-sans rounded-2xl px-4';

code = code.replace(oldSliderDiv, newSliderDiv);
fs.writeFileSync('src/App.tsx', code);
console.log('Fixed container width');
