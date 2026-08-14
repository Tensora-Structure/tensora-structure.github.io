export const shapeToPngBase64 = (shapeCode: number): Promise<string> => {
  return new Promise((resolve) => {
    let svgStr = "";
    const strokeColor = "#1e3a8a";
    const strokeWidth = 4;
    
    switch (shapeCode) {
      case 20:
        svgStr = `<svg width="100" height="60" preserveAspectRatio="xMidYMid meet" viewBox="0 0 100 20" xmlns="http://www.w3.org/2000/svg"><line x1="10" y1="10" x2="90" y2="10" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round" /></svg>`;
        break;
      case 37:
        svgStr = `<svg width="100" height="60" preserveAspectRatio="xMidYMid meet" viewBox="0 0 100 30" xmlns="http://www.w3.org/2000/svg"><path d="M 20 22 A 6 6 0 0 1 14 16 A 6 6 0 0 1 20 10 L 80 10 A 6 6 0 0 1 86 16 A 6 6 0 0 1 80 22" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round" /></svg>`;
        break;
      case 41:
        svgStr = `<svg width="100" height="60" preserveAspectRatio="xMidYMid meet" viewBox="0 0 100 40" xmlns="http://www.w3.org/2000/svg"><path d="M 15 8 L 15 26 Q 15 32 21 32 L 79 32 Q 85 32 85 26 L 85 8" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round" /></svg>`;
        break;
      case 24:
        svgStr = `<svg width="100" height="60" preserveAspectRatio="xMidYMid meet" viewBox="0 0 100 50" xmlns="http://www.w3.org/2000/svg"><path d="M 15 8 L 15 22 Q 15 28 21 28 L 79 28 Q 85 28 85 34 L 85 48" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round" /></svg>`;
        break;
      case 61:
        svgStr = `<svg width="100" height="60" preserveAspectRatio="xMidYMid meet" viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg"><path d="M 30 15 L 70 15 Q 75 15 75 20 L 75 40 Q 75 45 70 45 L 30 45 Q 25 45 25 40 L 25 20 Q 25 15 30 15" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round" /><path d="M 30 15 L 42 27 M 25 20 L 37 32" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round" /></svg>`;
        break;
      default:
        return resolve('');
    }

    const width = 100;
    const height = 60;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return resolve('');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve('');
    const b64 = btoa(unescape(encodeURIComponent(svgStr)));
    img.src = 'data:image/svg+xml;base64,' + b64;
  });
};
