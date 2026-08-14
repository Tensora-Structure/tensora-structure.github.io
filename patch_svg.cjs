const fs = require('fs');
let code = fs.readFileSync('src/utils/shapeToPng.ts', 'utf8');

code = code.replace(/<svg viewBox/g, '<svg width="100" height="60" preserveAspectRatio="xMidYMid meet" viewBox');

fs.writeFileSync('src/utils/shapeToPng.ts', code);
