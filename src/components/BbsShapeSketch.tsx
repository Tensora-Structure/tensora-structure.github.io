import React from 'react';

interface BbsShapeSketchProps {
  shapeCode: number;
}

export const BbsShapeSketch: React.FC<BbsShapeSketchProps> = ({ shapeCode }) => {
  const strokeColor = "#1e3a8a"; // text-blue-900
  const strokeWidth = 4;

  switch (shapeCode) {
    case 20: // Straight bar
      return (
        <svg viewBox="0 0 100 20" className="w-full h-8" preserveAspectRatio="xMidYMid meet">
          <line x1="10" y1="10" x2="90" y2="10" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
        </svg>
      );
    case 37: // 180 degree hooks
      return (
        <svg viewBox="0 0 100 30" className="w-full h-8" preserveAspectRatio="xMidYMid meet">
          <path 
            d="M 20 22 A 6 6 0 0 1 14 16 A 6 6 0 0 1 20 10 L 80 10 A 6 6 0 0 1 86 16 A 6 6 0 0 1 80 22" 
            fill="none" 
            stroke={strokeColor} 
            strokeWidth={strokeWidth} 
            strokeLinecap="round" 
          />
        </svg>
      );
    case 41: // U bar / Bottom rebar with 90 degree hooks upwards
      return (
        <svg viewBox="0 0 100 40" className="w-full h-10" preserveAspectRatio="xMidYMid meet">
          <path 
            d="M 15 8 L 15 26 Q 15 32 21 32 L 79 32 Q 85 32 85 26 L 85 8" 
            fill="none" 
            stroke={strokeColor} 
            strokeWidth={strokeWidth} 
            strokeLinecap="round" 
          />
        </svg>
      );
    case 24: // Cranked bar / Z-shape
      return (
        <svg viewBox="0 0 100 50" className="w-full h-12" preserveAspectRatio="xMidYMid meet">
          <path 
            d="M 15 8 L 15 22 Q 15 28 21 28 L 79 28 Q 85 28 85 34 L 85 48" 
            fill="none" 
            stroke={strokeColor} 
            strokeWidth={strokeWidth} 
            strokeLinecap="round" 
          />
        </svg>
      );
    case 61: // Rectangular link / Stirrup
      return (
        <svg viewBox="0 0 100 60" className="w-full h-12" preserveAspectRatio="xMidYMid meet">
          <path 
            d="M 30 15 L 70 15 Q 75 15 75 20 L 75 40 Q 75 45 70 45 L 30 45 Q 25 45 25 40 L 25 20 Q 25 15 30 15" 
            fill="none" 
            stroke={strokeColor} 
            strokeWidth={strokeWidth} 
            strokeLinecap="round" 
          />
          {/* Stirrup hooks projecting inwards at 135 degrees */}
          <path d="M 30 15 L 42 27 M 25 20 L 37 32" fill="none" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <span className="text-xs font-mono text-blue-900 font-bold">Code {shapeCode}</span>
      );
  }
};
