const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldLogic = `                            const isActive = offsetDiff === 0;
                            const isNext = offsetDiff === 1;
                            const isPrev = offsetDiff === -1;

                            let xPos = 0;
                            let zPos = 0;
                            let scale = 1;
                            let zIndex = 20;
                            let opacity = 1;

                            if (isActive) {
                              xPos = 0;
                              zPos = 0;
                              scale = 1;
                              zIndex = 50;
                              opacity = 1;
                            } else if (isNext) {
                              xPos = 110; // Move 110% of its width to the right
                              zPos = -150;
                              scale = 0.85;
                              zIndex = 40;
                              opacity = 0.5;
                            } else if (isPrev) {
                              xPos = -110; // Move 110% to the left
                              zPos = -150;
                              scale = 0.85;
                              zIndex = 40;
                              opacity = 0.5;
                            } else {
                              xPos = offsetDiff > 0 ? 150 : -150;
                              zPos = -300;
                              scale = 0.6;
                              zIndex = 30;
                              opacity = 0;
                            }`;

const newLogic = `                            const isActive = offsetDiff === 0;
                            const isNext = offsetDiff === 1;
                            const isPrev = offsetDiff === -1;
                            const isNextNext = offsetDiff === 2;
                            const isPrevPrev = offsetDiff === -2;

                            let xPos = 0;
                            let zPos = 0;
                            let scale = 1;
                            let zIndex = 20;
                            let opacity = 1;

                            if (isActive) {
                              xPos = 0;
                              zPos = 0;
                              scale = 1;
                              zIndex = 50;
                              opacity = 1;
                            } else if (isNext) {
                              xPos = 90; // Move right
                              zPos = -100;
                              scale = 0.85;
                              zIndex = 40;
                              opacity = 0.6;
                            } else if (isPrev) {
                              xPos = -90; // Move left
                              zPos = -100;
                              scale = 0.85;
                              zIndex = 40;
                              opacity = 0.6;
                            } else if (isNextNext) {
                              xPos = 180; // Move further right
                              zPos = -200;
                              scale = 0.7;
                              zIndex = 30;
                              opacity = 0.3;
                            } else if (isPrevPrev) {
                              xPos = -180; // Move further left
                              zPos = -200;
                              scale = 0.7;
                              zIndex = 30;
                              opacity = 0.3;
                            } else {
                              xPos = offsetDiff > 0 ? 250 : -250;
                              zPos = -300;
                              scale = 0.5;
                              zIndex = 20;
                              opacity = 0;
                            }`;

code = code.replace(oldLogic, newLogic);
fs.writeFileSync('src/App.tsx', code);
console.log('Fixed 3D slider logic');
