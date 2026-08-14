const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  "base64: imgBase64.replace(/^data:image\\\\/\\\\w+;base64,/, ''),",
  "base64: imgBase64.replace(/^data:image\\/\\w+;base64,/, ''),"
);

fs.writeFileSync('src/App.tsx', code);
