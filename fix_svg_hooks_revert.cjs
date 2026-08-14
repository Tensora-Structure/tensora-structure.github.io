const fs = require('fs');
let code = fs.readFileSync('src/components/StructuralDetailing.tsx', 'utf8');

const colSecReplace = `                    <rect x="52" y="62" width="96" height="76" fill="none" stroke="#1e3a8a" strokeWidth="2" />
                    {/* 135 deg Hooks */}
                    <path d="M 52 62 L 65 75" fill="none" stroke="#1e3a8a" strokeWidth="2" />
                    <path d="M 52 62 L 70 70" fill="none" stroke="#1e3a8a" strokeWidth="2" />
                    {/* Corner bars */}`;
const colSecTarget = `                    <rect x="52" y="62" width="96" height="76" fill="none" stroke="#1e3a8a" strokeWidth="2" />
                    {/* Corner bars */}`;                    

const beamSecReplace = `                    <rect x="45" y="40" width="60" height="120" fill="none" stroke="#1e3a8a" strokeWidth="2" />
                    {/* 135 deg Hooks */}
                    <path d="M 45 40 L 55 50" fill="none" stroke="#1e3a8a" strokeWidth="2" />
                    <path d="M 45 40 L 60 45" fill="none" stroke="#1e3a8a" strokeWidth="2" />
                    {/* Top bars */}`;
const beamSecTarget = `                    <rect x="45" y="40" width="60" height="120" fill="none" stroke="#1e3a8a" strokeWidth="2" />
                    {/* Top bars */}`;

code = code.replace(colSecReplace, colSecTarget);
code = code.replace(beamSecReplace, beamSecTarget);

fs.writeFileSync('src/components/StructuralDetailing.tsx', code);
