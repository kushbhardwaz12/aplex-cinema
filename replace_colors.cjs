const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');
content = content.replace(/rgba\(6,182,212/g, 'rgba(239,68,68');
fs.writeFileSync('src/App.tsx', content);
console.log('Replaced rgba colors successfully!');
