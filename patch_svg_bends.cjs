const fs = require('fs');
let code = fs.readFileSync('src/components/StructuralDetailing.tsx', 'utf8');

const oldBeamSvg = `                    {/* Top Bars */}
                    <line x1="25" y1="45" x2="575" y2="45" stroke="#1e3a8a" strokeWidth="2.5" />
                    {/* Bottom Bars */}
                    <line x1="25" y1="105" x2="575" y2="105" stroke="#1e3a8a" strokeWidth="3" />`;

const newBeamSvg = `                    {/* Top Bars */}
                    <path d="M 25 70 L 25 45 L 575 45 L 575 70" fill="none" stroke="#1e3a8a" strokeWidth="2.5" />
                    <line x1="25" y1="48" x2="180" y2="48" stroke="#e11d48" strokeWidth="2" />
                    <line x1="420" y1="48" x2="575" y2="48" stroke="#e11d48" strokeWidth="2" />
                    {/* Bottom Bars */}
                    <path d="M 25 80 L 25 105 L 575 105 L 575 80" fill="none" stroke="#1e3a8a" strokeWidth="3" />`;

const oldColSvg = `                    {/* Main Bars */}
                    <line x1="38" y1="20" x2="38" y2="330" stroke="#1e3a8a" strokeWidth="3" />
                    <line x1="82" y1="20" x2="82" y2="330" stroke="#1e3a8a" strokeWidth="3" />`;

const newColSvg = `                    {/* Main Bars */}
                    <path d="M 20 330 L 38 330 L 38 20" fill="none" stroke="#1e3a8a" strokeWidth="3" />
                    <path d="M 100 330 L 82 330 L 82 20" fill="none" stroke="#1e3a8a" strokeWidth="3" />`;

code = code.replace(oldBeamSvg, newBeamSvg);
code = code.replace(oldColSvg, newColSvg);
fs.writeFileSync('src/components/StructuralDetailing.tsx', code);
