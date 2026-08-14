const fs = require('fs');
let code = fs.readFileSync('src/components/StructuralDetailing.tsx', 'utf8');

const badTop = `<path d="M 25 70 L 25 45 L 575 45 L 575 70" fill="none" stroke="#1e3a8a" strokeWidth="2.5" />`;
const goodTop = `<line x1="25" y1="45" x2="575" y2="45" stroke="#1e3a8a" strokeWidth="2.5" />`;

const badBot = `<path d="M 25 80 L 25 105 L 575 105 L 575 80" fill="none" stroke="#1e3a8a" strokeWidth="3" />`;
const goodBot = `<line x1="25" y1="105" x2="575" y2="105" stroke="#1e3a8a" strokeWidth="3" />`;

code = code.replace(badTop, goodTop);
code = code.replace(badBot, goodBot);

fs.writeFileSync('src/components/StructuralDetailing.tsx', code);
