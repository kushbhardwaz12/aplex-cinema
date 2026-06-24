const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf8');

let newContent = content
  .replace(/MovieSync/g, 'APLEX')
  .replace(/movieSync/g, 'aplex')
  .replace(/cyan/g, 'red')
  .replace(/blue-500/g, 'red-600')
  .replace(/blue-400/g, 'red-400')
  .replace(/blue-900/g, 'red-900')
  .replace(/purple-500/g, 'red-700')
  .replace(/purple-400/g, 'red-400')
  .replace(/purple-900/g, 'red-900');

fs.writeFileSync('src/App.tsx', newContent);
console.log('Replaced successfully!');
