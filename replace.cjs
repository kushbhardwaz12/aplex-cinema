const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf8');

let newContent = content
  .replace(/MovieSync/g, 'APLEX')
  .replace(/movieSync/g, 'aplex')
  .replace(/text-blue-500/g, 'text-red-500')
  .replace(/hover:text-blue-400/g, 'hover:text-red-400')
  .replace(/bg-blue-500/g, 'bg-red-500')
  .replace(/bg-blue-min/g, 'bg-red-min')
  .replace(/cyan/g, 'red')
  .replace(/purple/g, 'red')
  .replace(/blue-500/g, 'red-600')
  .replace(/blue-400/g, 'red-400')
  .replace(/blue-900/g, 'red-900');

fs.writeFileSync('src/App.tsx', newContent);
console.log('Replaced successfully!');
