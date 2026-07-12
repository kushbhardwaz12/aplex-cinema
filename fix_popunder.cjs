const fs = require('fs');
let code = fs.readFileSync('src/components/AdsterraAd.tsx', 'utf8');

code = code.replace(`  useEffect(() => {
    if (type === 'popunder') {`, `  useEffect(() => {
    if (type === 'popunder' && !isMobile) {`);

fs.writeFileSync('src/components/AdsterraAd.tsx', code);
