const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldSliderDiv = 'w-full max-w-[944px] relative h-[444px] mx-auto mb-8 overflow-hidden bg-[#000000] flex flex-col justify-center items-center font-sans rounded-2xl';

const newSliderDiv = 'w-full max-w-[1800px] relative h-[444px] sm:h-[500px] md:h-[600px] lg:h-[700px] mx-auto mb-8 overflow-hidden bg-[#000000] flex flex-col justify-center items-center font-sans rounded-2xl px-4';

code = code.replace(oldSliderDiv, newSliderDiv);
fs.writeFileSync('src/App.tsx', code);
console.log('Fixed slider width');
