const fs = require('fs');
let code = fs.readFileSync('src/components/AdsterraAd.tsx', 'utf8');

const oldScale = `        if (parentWidth > 0 && parentWidth < width) {
          setScale(parentWidth / width);
        } else if (parentWidth > 0) {
          // Fill the div size horizontally!
          setScale(parentWidth / width);
        } else {
          setScale(1);
        }`;

const newScale = `        if (parentWidth > 0 && parentWidth < width) {
          setScale(parentWidth / width);
        } else {
          setScale(1); // Do not scale up, just center it. Prevents mobile click issues.
        }`;

code = code.replace(oldScale, newScale);
fs.writeFileSync('src/components/AdsterraAd.tsx', code);
