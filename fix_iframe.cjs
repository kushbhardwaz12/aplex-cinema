const fs = require('fs');
let code = fs.readFileSync('src/components/AdsterraAd.tsx', 'utf8');

code = code.replace(/sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-same-origin"/g, '');

fs.writeFileSync('src/components/AdsterraAd.tsx', code);
