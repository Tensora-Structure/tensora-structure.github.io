const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  'ext: { width: 100, height: 40 }',
  'ext: { width: 100, height: 60 }'
);

// We should also increase the row height to accommodate 60 pixels.
// 1 point is ~1.33 pixels, so 60 pixels is ~45 points. 
// It was already 45. Maybe let's make it 50 to be safe.
code = code.replace(
  'row.height = 45;',
  'row.height = 50;'
);

fs.writeFileSync('src/App.tsx', code);
