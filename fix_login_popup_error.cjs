const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const effectRegex = /  useEffect\(\(\) => \{\s*if \(screen === "admin_dashboard"\) \{\s*setShowLoginReminderPopup\(false\);\s*return;\s*\}\s*\/\/ Only for public \(non-admin\)\s*if \(\!currentUserEmail\) \{\s*const timer = setTimeout\(\(\) => \{\s*const hasSeen = sessionStorage\.getItem\("loginPopupShown"\);\s*if \(\!hasSeen\) \{\s*setShowLoginReminderPopup\(true\);\s*sessionStorage\.setItem\("loginPopupShown", "true"\);\s*\}\s*\}, 15000\);\s*return \(\) => clearTimeout\(timer\);\s*\}\s*\}, \[screen, currentUserEmail\]\);/g;

// If the regex didn't catch it previously because of spacing/formatting, let's just wipe out that entire useEffect manually using string split.
const oldCodeStart = '  useEffect(() => {\n    if (screen === "admin_dashboard") {\n      setShowLoginReminderPopup(false);\n      return;\n    }';

const parts = code.split('  useEffect(() => {\n    if (screen === "admin_dashboard") {\n      setShowLoginReminderPopup(false);');

if (parts.length > 1) {
    let secondPart = parts[1];
    let endOfEffect = secondPart.indexOf('}, [screen, currentUserEmail]);');
    if(endOfEffect !== -1) {
        code = parts[0] + secondPart.substring(endOfEffect + '}, [screen, currentUserEmail]);'.length);
        fs.writeFileSync('src/App.tsx', code);
        console.log('Fixed reference error');
    } else {
        console.log('Could not find end of effect');
    }
} else {
    console.log('Could not find start of effect');
}
