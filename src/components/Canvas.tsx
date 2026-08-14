import React, { useRef, useEffect, useState } from 'react';
import {
  Joint,
  Frame,
  DrawingMode,
  ViewMode,
  GridSettings,
  AnalysisResults,
  SupportType,
  Section,
} from '../types';
import {
  ZoomIn,
  ZoomOut,
  Maximize,
  HelpCircle,
  Eye,
  Settings,
} from 'lucide-react';

interface CanvasProps {
  joints: Joint[];
  frames: Frame[];
  sections: Section[];
  gridSettings: GridSettings;
  drawingMode: DrawingMode;
  viewMode: ViewMode;
  selectedJointId: string | null;
  selectedFrameId: string | null;
  results: AnalysisResults;
  setSelectedJointId: (id: string | null) => void;
  setSelectedFrameId: (id: string | null) => void;
  selectedSlabId?: string | null;
  setSelectedSlabId?: (id: string | null) => void;
  onAddJoint: (x: number, y: number, z?: number) => string;
  onAddFrame: (nodeIId: string, nodeJId: string, type: 'Beam' | 'Column') => void;
  onAddSlab?: (nodeIds: string[]) => void;
  slabs?: any[];
  onDeleteJoint: (id: string) => void;
  onDeleteFrame: (id: string) => void;
  onDeleteSlab?: (id: string) => void;
  onAssignSupport: (jointId: string, support: SupportType) => void;
  onAssignJointLoad: (jointId: string, fx: number, fy: number, mz: number, loadCaseId: string) => void;
  onAssignFrameLoad: (
    frameId: string,
    type: 'UDL' | 'Point',
    dir: 'GlobalY' | 'LocalY' | 'GlobalX',
    val: number,
    offset: number,
    loadCaseId: string
  ) => void;
  activeLoadCaseId: string;
  onAddVerticalColumn?: (x: number, z: number, yBottom: number, yTop: number) => void;
  
  // New props for viewpoint and active levels
  viewpoint: 'Top' | 'Front' | 'Side' | '3D';
  setViewpoint: (vp: 'Top' | 'Front' | 'Side' | '3D') => void;
  analysisPlane: 'XZ' | 'XY' | 'ZY';
  setAnalysisPlane: (ap: 'XZ' | 'XY' | 'ZY') => void;
}

export default function Canvas({
  joints,
  frames,
  sections,
  gridSettings,
  drawingMode,
  viewMode,
  selectedJointId,
  selectedFrameId,
  selectedSlabId,
  results,
  setSelectedJointId,
  setSelectedFrameId,
  setSelectedSlabId,
  onAddJoint,
  onAddFrame,
  onAddSlab,
  slabs,
  onDeleteJoint,
  onDeleteFrame,
  onDeleteSlab,
  onAssignSupport,
  onAssignJointLoad,
  onAssignFrameLoad,
  activeLoadCaseId,
  onAddVerticalColumn,
  viewpoint,
  setViewpoint,
  analysisPlane,
  setAnalysisPlane,
}: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Pan and Zoom States
  const [scale, setScale] = useState<number>(40); // pixels per meter
  const [panX, setPanX] = useState<number>(200);
  const [panY, setPanY] = useState<number>(300);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Active Floor Height (Y), Frame Depth (Z), and Width (X) coordinates for modeling
  const [activeYLevel, setActiveYLevel] = useState<number>(0);
  const [activeZLevel, setActiveZLevel] = useState<number>(0);
  const [activeXLevel, setActiveXLevel] = useState<number>(0);

  // Dynamic lists of existing levels computed from active joints
  const existingYLevels = Array.from(new Set(joints.map(j => Number((j.y).toFixed(3))))).sort((a, b) => a - b);
  const existingZLevels = Array.from(new Set(joints.map(j => Number((j.z || 0).toFixed(3))))).sort((a, b) => a - b);
  const existingXLevels = Array.from(new Set(joints.map(j => Number((j.x).toFixed(3))))).sort((a, b) => a - b);

  // Drawing state
  const [drawStartJointId, setDrawStartJointId] = useState<string | null>(null);
  const [slabDrawNodes, setSlabDrawNodes] = useState<string[]>([]);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 }); // screen coordinates
  const [engMousePos, setEngMousePos] = useState({ x: 0, y: 0, z: 0 }); // model meters
  const [snappedPos, setSnappedPos] = useState<{ x: number; y: number; z: number; jointId?: string } | null>(null);

  // Overlay states for quick tool assignments
  const [activeJointModal, setActiveJointModal] = useState<string | null>(null);
  const [activeFrameModal, setActiveFrameModal] = useState<string | null>(null);

  // Form states for modals
  const [jointFx, setJointFx] = useState('0');
  const [jointFy, setJointFy] = useState('-10'); // standard downward load
  const [jointMz, setJointMz] = useState('0');
  const [supportType, setSupportType] = useState<SupportType>('Pinned');

  const [frameLoadType, setFrameLoadType] = useState<'UDL' | 'Point'>('UDL');
  const [frameLoadDir, setFrameLoadDir] = useState<'GlobalY' | 'LocalY' | 'GlobalX'>('GlobalY');
  const [frameLoadVal, setFrameLoadVal] = useState('15'); // kN/m or kN
  const [frameLoadOffset, setFrameLoadOffset] = useState('0.5');

  const [diagramScale, setDiagramScale] = useState<number>(1.0);
  const isDiagram = ['Axial', 'Shear', 'Moment', 'Deflection', 'Design'].includes(viewMode);

  // 3D Dimetric isometric projection rotation angles
  const angleRot = 35 * Math.PI / 180; // 35 degrees rotation
  const angleTilt = 22 * Math.PI / 180; // 22 degrees tilt

  // 3D/View-specific coordinate transformations
  const toScreen3D = (x: number, y: number, z: number) => {
    if (viewpoint === 'Top') {
      // Top Plan View (X-Z plane)
      return {
        x: panX + x * scale,
        y: panY - z * scale,
      };
    }
    if (viewpoint === 'Front') {
      // Front Elevation View (X-Y plane)
      return {
        x: panX + x * scale,
        y: panY - y * scale,
      };
    }
    if (viewpoint === 'Side') {
      // Side Elevation View (Z-Y plane)
      return {
        x: panX + z * scale,
        y: panY - y * scale,
      };
    }
    if (viewpoint === '3D') {
      // Dimetric Isometric projection
      const cosR = Math.cos(angleRot);
      const sinR = Math.sin(angleRot);
      const cosT = Math.cos(angleTilt);
      const sinT = Math.sin(angleTilt);

      // Rotate around vertical Y axis
      const xRot = x * cosR - z * sinR;
      const zRot = x * sinR + z * cosR;

      // Project vertical Y and rotated lateral depth axis
      const scrX = panX + xRot * scale;
      const scrY = panY - (y * cosT - zRot * sinT) * scale;
      return { x: scrX, y: scrY };
    }
    return {
      x: panX + x * scale,
      y: panY - y * scale,
    };
  };

  const toEngineering3D = (scrX: number, scrY: number) => {
    if (viewpoint === 'Top') {
      return {
        x: (scrX - panX) / scale,
        y: activeYLevel,
        z: (panY - scrY) / scale,
      };
    }
    if (viewpoint === 'Front') {
      return {
        x: (scrX - panX) / scale,
        y: (panY - scrY) / scale,
        z: activeZLevel,
      };
    }
    if (viewpoint === 'Side') {
      return {
        x: activeXLevel,
        y: (panY - scrY) / scale,
        z: (scrX - panX) / scale,
      };
    }
    if (viewpoint === '3D') {
      // Project 2D screen coordinates onto active plane (Y = activeYLevel) in 3D
      const cosR = Math.cos(angleRot);
      const sinR = Math.sin(angleRot);
      const cosT = Math.cos(angleTilt);
      const sinT = Math.sin(angleTilt);

      const dx_scr = (scrX - panX) / scale;
      const dy_scr = (panY - scrY) / scale;

      const K = (activeYLevel * cosT - dy_scr) / (sinT || 1e-6);

      const x = dx_scr * cosR + K * sinR;
      const z = K * cosR - dx_scr * sinR;

      return { x, y: activeYLevel, z };
    }
    return {
      x: (scrX - panX) / scale,
      y: (panY - scrY) / scale,
      z: 0,
    };
  };

  // Determine Opacity based on whether elements lie on the active selected plane level
  const getJointOpacity = (joint: Joint) => {
    if (viewpoint === '3D') return 1.0;
    if (viewpoint === 'Top') {
      return Math.abs(joint.y - activeYLevel) < 0.05 ? 1.0 : 0.35;
    }
    if (viewpoint === 'Front') {
      return Math.abs((joint.z || 0) - activeZLevel) < 0.05 ? 1.0 : 0.35;
    }
    if (viewpoint === 'Side') {
      return Math.abs(joint.x - activeXLevel) < 0.05 ? 1.0 : 0.35;
    }
    return 1.0;
  };

  const getFrameOpacity = (frame: Frame) => {
    const nodeI = joints.find((j) => j.id === frame.nodeI);
    const nodeJ = joints.find((j) => j.id === frame.nodeJ);
    if (!nodeI || !nodeJ) return 1.0;

    if (viewpoint === '3D') return 1.0;
    if (viewpoint === 'Top') {
      const onPlaneI = Math.abs(nodeI.y - activeYLevel) < 0.05;
      const onPlaneJ = Math.abs(nodeJ.y - activeYLevel) < 0.05;
      if (onPlaneI && onPlaneJ) return 1.0;
      if (onPlaneI || onPlaneJ) return 0.6; // connecting column
      return 0.25; // on other floors
    }
    if (viewpoint === 'Front') {
      const onPlaneI = Math.abs((nodeI.z || 0) - activeZLevel) < 0.05;
      const onPlaneJ = Math.abs((nodeJ.z || 0) - activeZLevel) < 0.05;
      if (onPlaneI && onPlaneJ) return 1.0;
      if (onPlaneI || onPlaneJ) return 0.6; // perpendicular frame connecting
      return 0.25;
    }
    if (viewpoint === 'Side') {
      const onPlaneI = Math.abs(nodeI.x - activeXLevel) < 0.05;
      const onPlaneJ = Math.abs(nodeJ.x - activeXLevel) < 0.05;
      if (onPlaneI && onPlaneJ) return 1.0;
      if (onPlaneI || onPlaneJ) return 0.6;
      return 0.25;
    }
    return 1.0;
  };

  // Find nearest snapped point (Joint or Grid intersection)
  const calculateSnap3D = (scrX: number, scrY: number) => {
    // 1. Check existing joints first in screen space (filtered by active plane to avoid floor-jumping snaps in 2D views)
    for (const j of joints) {
      if (viewpoint === 'Top' && Math.abs(j.y - activeYLevel) > 0.05) continue;
      if (viewpoint === 'Front' && Math.abs((j.z || 0) - activeZLevel) > 0.05) continue;
      if (viewpoint === 'Side' && Math.abs(j.x - activeXLevel) > 0.05) continue;

      const p = toScreen3D(j.x, j.y, j.z || 0);
      const d = Math.hypot(p.x - scrX, p.y - scrY);
      if (d < 16) {
        return { x: j.x, y: j.y, z: j.z || 0, jointId: j.id };
      }
    }

    // 2. Snap to grid intersections
    const eng = toEngineering3D(scrX, scrY);
    const snappedX = Math.round(eng.x / gridSettings.xSpacing) * gridSettings.xSpacing;
    const snappedY = Math.round(eng.y / gridSettings.ySpacing) * gridSettings.ySpacing;
    const snappedZ = Math.round((eng.z || 0) / gridSettings.xSpacing) * gridSettings.xSpacing;

    if (viewpoint === 'Top') {
      const pSnap = toScreen3D(snappedX, activeYLevel, snappedZ);
      const d = Math.hypot(pSnap.x - scrX, pSnap.y - scrY);
      if (d < 18) {
        return { x: snappedX, y: activeYLevel, z: snappedZ };
      }
    } else if (viewpoint === 'Front') {
      const pSnap = toScreen3D(snappedX, snappedY, activeZLevel);
      const d = Math.hypot(pSnap.x - scrX, pSnap.y - scrY);
      if (d < 18) {
        return { x: snappedX, y: snappedY, z: activeZLevel };
      }
    } else if (viewpoint === 'Side') {
      const pSnap = toScreen3D(activeXLevel, snappedY, snappedZ);
      const d = Math.hypot(pSnap.x - scrX, pSnap.y - scrY);
      if (d < 18) {
        return { x: activeXLevel, y: snappedY, z: snappedZ };
      }
    } else if (viewpoint === '3D') {
      const pSnap = toScreen3D(snappedX, activeYLevel, snappedZ);
      const d = Math.hypot(pSnap.x - scrX, pSnap.y - scrY);
      if (d < 18) {
        return { x: snappedX, y: activeYLevel, z: snappedZ };
      }
    }

    return null;
  };

  // Viewpoint switches
  const handleSetViewpoint = (vp: 'Top' | 'Front' | 'Side' | '3D') => {
    setViewpoint(vp);
    if (vp === 'Top') {
      setAnalysisPlane('XZ');
    } else if (vp === 'Front') {
      setAnalysisPlane('XY');
    } else if (vp === 'Side') {
      setAnalysisPlane('ZY');
    } else if (vp === '3D') {
      setAnalysisPlane('XZ');
    }
  };

  // Handle resizing of the canvas
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (canvas && container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        draw();
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const styleNode = document.createElement('style');
    styleNode.innerHTML = `
      @keyframes pulse {
        0%, 100% { transform: scale(1); box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.3); }
        50% { transform: scale(1.05); box-shadow: 0 10px 25px 0px rgba(59, 130, 246, 0.5); }
      }
      .pulse-btn {
        animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
      }
    `;
    document.head.appendChild(styleNode);

    return () => {
      window.removeEventListener('resize', handleResize);
      document.head.removeChild(styleNode);
    };
  }, [joints, frames, scale, panX, panY, viewMode, drawingMode, selectedJointId, selectedFrameId, snappedPos, results, diagramScale, viewpoint, activeYLevel, activeZLevel, activeXLevel]);

  // Redraw whenever canvas updates
  useEffect(() => {
    draw();
  }, [joints, frames, scale, panX, panY, viewMode, drawingMode, selectedJointId, selectedFrameId, snappedPos, results, drawStartJointId, mousePos, diagramScale, viewpoint, activeYLevel, activeZLevel, activeXLevel]);

  // Center model view
  const handleAutoFit = () => {
    if (joints.length === 0) {
      setPanX(200);
      setPanY(300);
      setScale(40);
      return;
    }

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    joints.forEach((j) => {
      if (j.x < minX) minX = j.x;
      if (j.x > maxX) maxX = j.x;
      if (j.y < minY) minY = j.y;
      if (j.y > maxY) maxY = j.y;
      if ((j.z || 0) < minZ) minZ = (j.z || 0);
      if ((j.z || 0) > maxZ) maxZ = (j.z || 0);
    });

    const canvas = canvasRef.current;
    if (!canvas) return;

    const padding = 120;
    const modelWidth = Math.max(1, maxX - minX);
    const modelHeight = Math.max(1, maxY - minY);

    const scaleX = (canvas.width - padding * 2) / modelWidth;
    const scaleY = (canvas.height - padding * 2) / modelHeight;
    const newScale = Math.max(15, Math.min(100, Math.min(scaleX, scaleY)));

    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;

    setPanX(canvas.width / 2 - midX * newScale);
    setPanY(canvas.height / 2 + midY * newScale);
    setScale(newScale);
  };

  const handleZoom = (factor: number) => {
    setScale((prev) => Math.max(8, Math.min(300, prev * factor)));
  };

  // MAIN GRAPHICS DRAWING ENGINE
  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear background
    ctx.fillStyle = '#0f172a'; // Deep slate dark blue dark background
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const maxGridX = (gridSettings.xLines - 1) * gridSettings.xSpacing;
    const maxGridY = (gridSettings.yLines - 1) * gridSettings.ySpacing;
    const maxGridZ = maxGridX; // match depth lines to horizontal bounds

    // 1. Draw Grid Lines depending on selected Viewpoint
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = '#1e293b'; // subtle lines

    if (viewpoint === 'Top') {
      // Top Plan View (X-Z plane grid)
      for (let gx = 0; gx < gridSettings.xLines; gx++) {
        const engX = gx * gridSettings.xSpacing;
        const p1 = toScreen3D(engX, activeYLevel, 0);
        const p2 = toScreen3D(engX, activeYLevel, maxGridZ);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        ctx.fillStyle = '#475569';
        ctx.font = '10px monospace';
        ctx.fillText(`X:${engX}m`, p1.x + 5, p1.y + 12);
      }
      for (let gz = 0; gz < gridSettings.xLines; gz++) {
        const engZ = gz * gridSettings.xSpacing;
        const p1 = toScreen3D(0, activeYLevel, engZ);
        const p2 = toScreen3D(maxGridX, activeYLevel, engZ);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        ctx.fillStyle = '#475569';
        ctx.font = '10px monospace';
        ctx.fillText(`Z:${engZ}m`, p1.x - 45, p1.y + 3);
      }
    } else if (viewpoint === 'Front') {
      // Front Elevation View (X-Y plane grid)
      for (let gx = 0; gx < gridSettings.xLines; gx++) {
        const engX = gx * gridSettings.xSpacing;
        const p1 = toScreen3D(engX, 0, activeZLevel);
        const p2 = toScreen3D(engX, maxGridY, activeZLevel);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        ctx.fillStyle = '#475569';
        ctx.font = '10px monospace';
        ctx.fillText(`X:${engX}m`, p1.x + 5, canvas.height - 20);
      }
      for (let gy = 0; gy < gridSettings.yLines; gy++) {
        const engY = gy * gridSettings.ySpacing;
        const p1 = toScreen3D(0, engY, activeZLevel);
        const p2 = toScreen3D(maxGridX, engY, activeZLevel);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        ctx.fillStyle = '#475569';
        ctx.font = '10px monospace';
        ctx.fillText(`Y:${engY}m`, 10, p1.y - 5);
      }
    } else if (viewpoint === 'Side') {
      // Side Elevation View (Z-Y plane grid)
      for (let gz = 0; gz < gridSettings.xLines; gz++) {
        const engZ = gz * gridSettings.xSpacing;
        const p1 = toScreen3D(activeXLevel, 0, engZ);
        const p2 = toScreen3D(activeXLevel, maxGridY, engZ);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        ctx.fillStyle = '#475569';
        ctx.font = '10px monospace';
        ctx.fillText(`Z:${engZ}m`, p1.x + 5, canvas.height - 20);
      }
      for (let gy = 0; gy < gridSettings.yLines; gy++) {
        const engY = gy * gridSettings.ySpacing;
        const p1 = toScreen3D(activeXLevel, engY, 0);
        const p2 = toScreen3D(activeXLevel, engY, maxGridZ);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        ctx.fillStyle = '#475569';
        ctx.font = '10px monospace';
        ctx.fillText(`Y:${engY}m`, 10, p1.y - 5);
      }
    } else if (viewpoint === '3D') {
      // 3D Isometric modeling grid (rendered on active floor height Y = activeYLevel)
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 0.5;

      // X lines on current floor
      for (let gx = 0; gx < gridSettings.xLines; gx++) {
        const engX = gx * gridSettings.xSpacing;
        const p1 = toScreen3D(engX, activeYLevel, 0);
        const p2 = toScreen3D(engX, activeYLevel, maxGridZ);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
      // Z lines on current floor
      for (let gz = 0; gz < gridSettings.xLines; gz++) {
        const engZ = gz * gridSettings.xSpacing;
        const p1 = toScreen3D(0, activeYLevel, engZ);
        const p2 = toScreen3D(maxGridX, activeYLevel, engZ);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }

      // Draw light structural frame guidelines at outer grid limits
      ctx.strokeStyle = '#1e293b';
      const guidelines = [
        { x: 0, z: 0 },
        { x: maxGridX, z: 0 },
        { x: 0, z: maxGridZ },
        { x: maxGridX, z: maxGridZ },
      ];
      guidelines.forEach((gl) => {
        const p1 = toScreen3D(gl.x, 0, gl.z);
        const p2 = toScreen3D(gl.x, maxGridY, gl.z);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      });
    }

    // 2. Draw analytical diagrams
    if (results.isAnalyzed && isDiagram) {
      drawAnalysisDiagrams3D(ctx);
    }

    
    // Draw Slabs
    if (slabs) {
      slabs.forEach(slab => {
        const points = slab.nodeIds.map(id => joints.find(j => j.id === id)).filter(Boolean);
        if (points.length >= 3) {
          // Check if slab is on the active plane
          const p0 = points[0];
          if (viewpoint === 'Top' && Math.abs(p0.y - activeYLevel) > 0.01) return;
          if (viewpoint === 'Front' && Math.abs((p0.z || 0) - activeZLevel) > 0.01) return;
          if (viewpoint === 'Side' && Math.abs(p0.x - activeXLevel) > 0.01) return;

          ctx.beginPath();
          points.forEach((p, index) => {
            const pScreen = toScreen3D(p.x, p.y, p.z || 0);
            if (index === 0) ctx.moveTo(pScreen.x, pScreen.y);
            else ctx.lineTo(pScreen.x, pScreen.y);
          });
          ctx.closePath();
          const isSelected = slab.id === selectedSlabId;
          ctx.fillStyle = isSelected ? 'rgba(59, 130, 246, 0.4)' : 'rgba(128, 128, 128, 0.2)'; 
          ctx.fill();
          ctx.strokeStyle = isSelected ? '#3b82f6' : '#9ca3af';
          if (isSelected) {
            ctx.lineWidth = 2;
          } else {
            ctx.lineWidth = 1;
          }
          ctx.setLineDash([5, 5]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      });
    }

    // 3. Draw structural members
    frames.forEach((frame) => {
      const nodeI = joints.find((j) => j.id === frame.nodeI);
      const nodeJ = joints.find((j) => j.id === frame.nodeJ);
      if (!nodeI || !nodeJ) return;

      const pI = toScreen3D(nodeI.x, nodeI.y, nodeI.z || 0);
      const pJ = toScreen3D(nodeJ.x, nodeJ.y, nodeJ.z || 0);

      const isSelected = frame.id === selectedFrameId;
      const opacity = getFrameOpacity(frame);

      const isVerticalColumn = Math.abs(nodeI.x - nodeJ.x) < 0.05 && Math.abs((nodeI.z || 0) - (nodeJ.z || 0)) < 0.05;
      if (viewpoint === 'Top' && isVerticalColumn) {
        drawColumnCrossSection(ctx, frame, pI, opacity, isSelected);
        return;
      }

      if (viewMode === 'Extruded') {
        const sect = sections.find((s) => s.id === frame.sectionId);
        if (sect) {
          const depthPx = sect.depth * scale;
          const dx = pJ.x - pI.x;
          const dy = pJ.y - pI.y;
          const len = Math.hypot(dx, dy);
          const angle = Math.atan2(dy, dx);

          ctx.save();
          ctx.globalAlpha = opacity;
          ctx.translate(pI.x, pI.y);
          ctx.rotate(angle);

          ctx.fillStyle = sect.name.includes('Steel') ? '#334155' : '#475569';
          ctx.fillRect(0, -depthPx / 2, len, depthPx);

          ctx.strokeStyle = isSelected ? '#38bdf8' : '#94a3b8';
          ctx.lineWidth = isSelected ? 2.5 : 1;
          ctx.strokeRect(0, -depthPx / 2, len, depthPx);

          ctx.restore();
        }
      } else {
        // Wireframe members
        ctx.beginPath();
        ctx.moveTo(pI.x, pI.y);
        ctx.lineTo(pJ.x, pJ.y);

        ctx.strokeStyle = isSelected ? '#38bdf8' : `rgba(71, 85, 105, ${opacity})`;
        ctx.lineWidth = isSelected ? 4 : 2;
        ctx.stroke();

        // mid label
        const midX = (pI.x + pJ.x) / 2;
        const midY = (pI.y + pJ.y) / 2;
        ctx.fillStyle = isSelected ? '#38bdf8' : `rgba(148, 163, 184, ${opacity})`;
        ctx.font = '9px monospace';
        ctx.fillText(frame.id, midX + 8, midY - 4);
      }

      // Member loads
      if (!isDiagram && viewMode !== 'Extruded') {
        drawFrameLoads3D(ctx, frame, pI, pJ, opacity);
      }
    });

    // 4. Draw Joint Nodes
    joints.forEach((joint) => {
      const p = toScreen3D(joint.x, joint.y, joint.z || 0);
      const isSelected = joint.id === selectedJointId;
      const opacity = getJointOpacity(joint);

      // Support icons
      drawSupportSymbol3D(ctx, joint, p, opacity);

      // Node dot
      ctx.beginPath();
      ctx.arc(p.x, p.y, isSelected ? 6 : 4, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? '#38bdf8' : `rgba(248, 250, 252, ${opacity})`;
      ctx.fill();

      // Label Joint name
      ctx.fillStyle = isSelected ? '#38bdf8' : `rgba(148, 163, 184, ${opacity})`;
      ctx.font = '9px monospace';
      ctx.fillText(joint.id, p.x + 8, p.y - 8);

      // Node loads (if non-diagram mode)
      if (!isDiagram) {
        drawJointLoads3D(ctx, joint, p, opacity);
      }
    });

    // 5. Draw currently drawing line preview or single-click column preview
    if (drawingMode === 'AddColumn' && viewpoint === 'Top') {
      const pPreview = snappedPos ? toScreen3D(snappedPos.x, snappedPos.y, snappedPos.z) : mousePos;
      if (pPreview) {
        ctx.save();
        ctx.globalAlpha = 0.6; // high visibility hover preview
        ctx.translate(pPreview.x, pPreview.y);
        ctx.strokeStyle = '#eab308'; // vibrant engineering yellow
        ctx.fillStyle = 'rgba(234, 179, 8, 0.25)';
        ctx.lineWidth = 1.5;
        
        const size = 16;
        ctx.fillRect(-size / 2, -size / 2, size, size);
        ctx.strokeRect(-size / 2, -size / 2, size, size);

        ctx.beginPath();
        ctx.moveTo(-size / 2, -size / 2);
        ctx.lineTo(size / 2, size / 2);
        ctx.moveTo(size / 2, -size / 2);
        ctx.lineTo(-size / 2, size / 2);
        ctx.stroke();

        ctx.fillStyle = '#eab308';
        ctx.font = 'bold 9px monospace';
        ctx.fillText('CLICK TO PLACE COLUMN', size / 2 + 6, 3);
        ctx.restore();
      }
    } else if ((drawingMode === 'AddBeam' || drawingMode === 'AddColumn') && drawStartJointId) {
      const startNode = joints.find((j) => j.id === drawStartJointId);
      if (startNode) {
        const pI = toScreen3D(startNode.x, startNode.y, startNode.z || 0);
        const pJ = snappedPos ? toScreen3D(snappedPos.x, snappedPos.y, snappedPos.z) : mousePos;

        ctx.beginPath();
        ctx.moveTo(pI.x, pI.y);
        ctx.lineTo(pJ.x, pJ.y);
        ctx.strokeStyle = '#eab308'; // drawing yellow line
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // 6. Snapped position indicator dot
    if (snappedPos && drawingMode !== 'Select') {
      const snapP = toScreen3D(snappedPos.x, snappedPos.y, snappedPos.z);
      ctx.beginPath();
      ctx.arc(snapP.x, snapP.y, 6, 0, Math.PI * 2);
      ctx.strokeStyle = '#eab308'; // snap yellow circle
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#eab308';
      ctx.font = '9px monospace';
      const lbl = snappedPos.jointId ? `Snap:${snappedPos.jointId}` : `Snap Grid (${snappedPos.x.toFixed(1)}, ${snappedPos.y.toFixed(1)}, ${snappedPos.z.toFixed(1)})`;
      ctx.fillText(lbl, snapP.x + 10, snapP.y + 12);
    }
  };

  // Column cross-section plan representation
  const drawColumnCrossSection = (
    ctx: CanvasRenderingContext2D,
    frame: Frame,
    p: { x: number; y: number },
    opacity: number,
    isSelected: boolean
  ) => {
    const sect = sections.find((s) => s.id === frame.sectionId);
    const width = sect ? sect.width : 0.4;
    const depth = sect ? sect.depth : 0.4;
    const shape = sect ? sect.shape : 'Rectangular';

    // Scale dimensions to pixels, clamp to range [12, 32] for high-density rendering on screen
    const sizeX = Math.max(12, Math.min(32, width * scale));
    const sizeY = Math.max(12, Math.min(32, depth * scale));

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.translate(p.x, p.y);

    const isSteel = sect?.name.includes('Steel') || sect?.name.includes('ISMB') || sect?.name.includes('W-');
    const fillColor = isSteel ? '#1e293b' : '#334155'; // darker background fill
    const strokeColor = isSelected ? '#38bdf8' : (isSteel ? '#60a5fa' : '#94a3b8');

    ctx.fillStyle = fillColor;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = isSelected ? 2.5 : 1.5;

    if (shape === 'Rectangular') {
      ctx.fillRect(-sizeX / 2, -sizeY / 2, sizeX, sizeY);
      ctx.strokeRect(-sizeX / 2, -sizeY / 2, sizeX, sizeY);

      // Structural cross 'X' hatch
      ctx.beginPath();
      ctx.moveTo(-sizeX / 2, -sizeY / 2);
      ctx.lineTo(sizeX / 2, sizeY / 2);
      ctx.moveTo(sizeX / 2, -sizeY / 2);
      ctx.lineTo(-sizeX / 2, sizeY / 2);
      ctx.strokeStyle = isSelected ? 'rgba(56, 189, 248, 0.6)' : 'rgba(148, 163, 184, 0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else if (shape === 'Circular') {
      const radius = sizeX / 2;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-radius, 0);
      ctx.lineTo(radius, 0);
      ctx.moveTo(0, -radius);
      ctx.lineTo(0, radius);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else if (shape === 'I-Shape') {
      const bf = sizeX;
      const h = sizeY;
      const tf = Math.max(2, sizeY * 0.15);
      const tw = Math.max(2, sizeX * 0.12);

      ctx.beginPath();
      // Top flange
      ctx.moveTo(-bf / 2, -h / 2);
      ctx.lineTo(bf / 2, -h / 2);
      ctx.lineTo(bf / 2, -h / 2 + tf);
      ctx.lineTo(tw / 2, -h / 2 + tf);
      // Web
      ctx.lineTo(tw / 2, h / 2 - tf);
      // Bottom flange
      ctx.lineTo(bf / 2, h / 2 - tf);
      ctx.lineTo(bf / 2, h / 2);
      ctx.lineTo(-bf / 2, h / 2);
      ctx.lineTo(-bf / 2, h / 2 - tf);
      ctx.lineTo(-tw / 2, h / 2 - tf);
      // Web back up
      ctx.lineTo(-tw / 2, -h / 2 + tf);
      ctx.lineTo(-bf / 2, -h / 2 + tf);
      ctx.closePath();

      ctx.fill();
      ctx.stroke();
    }

    // Label Column ID
    ctx.fillStyle = isSelected ? '#38bdf8' : 'rgba(148, 163, 184, 0.95)';
    ctx.font = 'bold 9px monospace';
    ctx.fillText(frame.id, sizeX / 2 + 5, 3);

    ctx.restore();
  };

  // 3D support representation renderer
  const drawSupportSymbol3D = (ctx: CanvasRenderingContext2D, joint: Joint, p: { x: number; y: number }, opacity: number) => {
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = `rgba(245, 158, 11, ${opacity})`; // Amber boundary supports

    if (joint.support === 'Fixed') {
      // Solid base beam representation
      ctx.beginPath();
      ctx.moveTo(p.x - 12, p.y + 6);
      ctx.lineTo(p.x + 12, p.y + 6);
      ctx.stroke();

      for (let h = -10; h <= 10; h += 4) {
        ctx.beginPath();
        ctx.moveTo(p.x + h, p.y + 6);
        ctx.lineTo(p.x + h - 3, p.y + 11);
        ctx.stroke();
      }
    } else if (joint.support === 'Pinned') {
      // Triangle pin support
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - 8, p.y + 8);
      ctx.lineTo(p.x + 8, p.y + 8);
      ctx.closePath();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(p.x - 12, p.y + 8);
      ctx.lineTo(p.x + 12, p.y + 8);
      ctx.stroke();

      for (let h = -10; h <= 10; h += 5) {
        ctx.beginPath();
        ctx.moveTo(p.x + h, p.y + 8);
        ctx.lineTo(p.x + h - 4, p.y + 13);
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x, p.y + 8);
      ctx.stroke();
    } else if (joint.support === 'RollerX') {
      // Roller circle
      ctx.beginPath();
      ctx.arc(p.x, p.y + 5, 4, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(p.x - 10, p.y + 9);
      ctx.lineTo(p.x + 10, p.y + 9);
      ctx.stroke();
    } else if (joint.support === 'RollerY') {
      ctx.beginPath();
      ctx.arc(p.x - 5, p.y, 4, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(p.x - 9, p.y - 10);
      ctx.lineTo(p.x - 9, p.y + 10);
      ctx.stroke();
    }
  };

  // Node loads drawer
  const drawJointLoads3D = (ctx: CanvasRenderingContext2D, joint: Joint, p: { x: number; y: number }, opacity: number) => {
    joint.loads.forEach((l) => {
      if (l.loadCaseId !== activeLoadCaseId) return;

      // Vertical load Fy (downwards pushes at the node)
      if (Math.abs(l.fy) > 1e-3) {
        const isDown = l.fy < 0;
        const arrowL = 35;
        const startY = isDown ? p.y - arrowL : p.y + arrowL;

        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.strokeStyle = `rgba(236, 72, 153, ${opacity})`; // Pink load arrows
        ctx.moveTo(p.x, startY);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();

        ctx.beginPath();
        ctx.fillStyle = `rgba(236, 72, 153, ${opacity})`;
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - 4, isDown ? p.y - 6 : p.y + 6);
        ctx.lineTo(p.x + 4, isDown ? p.y - 6 : p.y + 6);
        ctx.fill();

        ctx.fillStyle = `rgba(244, 114, 182, ${opacity})`;
        ctx.font = '9px monospace';
        ctx.fillText(`${l.fy.toFixed(1)} kN`, p.x + 6, startY + 10);
      }

      // Horizontal load Fx
      if (Math.abs(l.fx) > 1e-3) {
        const isRight = l.fx > 0;
        const arrowL = 35;
        const startX = isRight ? p.x - arrowL : p.x + arrowL;

        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.strokeStyle = `rgba(236, 72, 153, ${opacity})`;
        ctx.moveTo(startX, p.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();

        ctx.beginPath();
        ctx.fillStyle = `rgba(236, 72, 153, ${opacity})`;
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(isRight ? p.x - 6 : p.x + 6, p.y - 4);
        ctx.lineTo(isRight ? p.x - 6 : p.x + 6, p.y + 4);
        ctx.fill();

        ctx.fillStyle = `rgba(244, 114, 182, ${opacity})`;
        ctx.font = '9px monospace';
        ctx.fillText(`${l.fx.toFixed(1)} kN`, startX + 2, p.y - 6);
      }

      // Moment Mz
      if (Math.abs(l.mz) > 1e-3) {
        ctx.beginPath();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = `rgba(236, 72, 153, ${opacity})`;
        ctx.arc(p.x, p.y, 14, 0.2, Math.PI * 1.5);
        ctx.stroke();

        ctx.beginPath();
        ctx.fillStyle = `rgba(236, 72, 153, ${opacity})`;
        ctx.moveTo(p.x, p.y - 14);
        ctx.lineTo(p.x - 4, p.y - 18);
        ctx.lineTo(p.x - 2, p.y - 10);
        ctx.fill();

        ctx.fillStyle = `rgba(244, 114, 182, ${opacity})`;
        ctx.font = '9px monospace';
        ctx.fillText(`${l.mz.toFixed(1)} kNm`, p.x - 30, p.y - 18);
      }
    });
  };

  // Distributed beam members loads drawer
  const drawFrameLoads3D = (
    ctx: CanvasRenderingContext2D,
    frame: Frame,
    pI: { x: number; y: number },
    pJ: { x: number; y: number },
    opacity: number
  ) => {
    frame.loads.forEach((l) => {
      if (l.loadCaseId !== activeLoadCaseId) return;

      if (l.type === 'UDL') {
        const dx = pJ.x - pI.x;
        const dy = pJ.y - pI.y;
        const len = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx);

        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.translate(pI.x, pI.y);
        ctx.rotate(angle);

        ctx.lineWidth = 1;
        ctx.strokeStyle = '#ec4899';
        ctx.fillStyle = 'rgba(236, 72, 153, 0.15)';

        const loadH = 15;
        ctx.fillRect(0, -loadH, len, loadH);
        ctx.beginPath();
        ctx.moveTo(0, -loadH);
        ctx.lineTo(len, -loadH);
        ctx.stroke();

        const numArrows = Math.max(3, Math.floor(len / 25));
        for (let a = 0; a <= numArrows; a++) {
          const arrowX = (a / numArrows) * len;
          ctx.beginPath();
          ctx.moveTo(arrowX, -loadH);
          ctx.lineTo(arrowX, 0);
          ctx.stroke();

          ctx.beginPath();
          ctx.fillStyle = '#ec4899';
          ctx.moveTo(arrowX, 0);
          ctx.lineTo(arrowX - 3, -4);
          ctx.lineTo(arrowX + 3, -4);
          ctx.fill();
        }

        ctx.fillStyle = '#f472b6';
        ctx.font = '9px monospace';
        ctx.fillText(`${l.value.toFixed(1)} kN/m`, len / 2 - 20, -loadH - 4);

        ctx.restore();
      } else if (l.type === 'Point') {
        const offset = l.offset || 0.5;
        const pX = pI.x + (pJ.x - pI.x) * offset;
        const pY = pI.y + (pJ.y - pI.y) * offset;

        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.strokeStyle = `rgba(236, 72, 153, ${opacity})`;
        ctx.moveTo(pX, pY - 25);
        ctx.lineTo(pX, pY);
        ctx.stroke();

        ctx.beginPath();
        ctx.fillStyle = `rgba(236, 72, 153, ${opacity})`;
        ctx.moveTo(pX, pY);
        ctx.lineTo(pX - 4, pY - 6);
        ctx.lineTo(pX + 4, pY - 6);
        ctx.fill();

        ctx.fillStyle = `rgba(244, 114, 182, ${opacity})`;
        ctx.font = '9px monospace';
        ctx.fillText(`${l.value.toFixed(1)} kN`, pX + 5, pY - 12);
      }
    });
  };

  // Diagrams drawer for all 3D or multiaxial elements
  const drawAnalysisDiagrams3D = (ctx: CanvasRenderingContext2D) => {
    frames.forEach((frame) => {
      const nodeI = joints.find((j) => j.id === frame.nodeI);
      const nodeJ = joints.find((j) => j.id === frame.nodeJ);
      if (!nodeI || !nodeJ) return;

      const pI = toScreen3D(nodeI.x, nodeI.y, nodeI.z || 0);
      const pJ = toScreen3D(nodeJ.x, nodeJ.y, nodeJ.z || 0);

      const dx = pJ.x - pI.x;
      const dy = pJ.y - pI.y;
      const angle = Math.atan2(dy, dx);

      const fForces = results.frameForces[frame.id];
      if (!fForces) return;

      const stations = fForces.stations;
      if (!stations || stations.length === 0) return;

      const opacity = getFrameOpacity(frame);

      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.translate(pI.x, pI.y);
      ctx.rotate(angle);

      const L_px = Math.hypot(dx, dy);

      if (viewMode === 'Deflection') {
        ctx.beginPath();
        ctx.setLineDash([2, 2]);
        ctx.moveTo(0, 0);

        const defMult = 0.5 * diagramScale;
        for (let s = 0; s < stations.length; s++) {
          const normX = (s / (stations.length - 1)) * L_px;
          const dy_px = -stations[s].deflection * defMult;
          ctx.lineTo(normX, dy_px);
        }

        ctx.strokeStyle = '#38bdf8'; // Sky blue
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.setLineDash([]);

        // standard base member wire
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(L_px, 0);
        ctx.strokeStyle = 'rgba(71, 85, 105, 0.25)';
        ctx.lineWidth = 1;
        ctx.stroke();

        const maxD = stations.reduce((max, st) => Math.max(max, Math.abs(st.deflection)), 0);
        ctx.fillStyle = '#38bdf8';
        ctx.font = '8px monospace';
        ctx.fillText(`Max δ: ${(maxD * 1000).toFixed(1)}mm`, L_px / 2 - 25, 12);
      } else if (viewMode === 'Moment') {
        // Bending Moment Diagram
        ctx.beginPath();
        ctx.moveTo(0, 0);

        const mScale = 0.4 * diagramScale;
        stations.forEach((st, s) => {
          const normX = (s / (stations.length - 1)) * L_px;
          ctx.lineTo(normX, -st.moment * mScale);
        });
        ctx.lineTo(L_px, 0);
        ctx.closePath();

        ctx.fillStyle = 'rgba(168, 85, 247, 0.15)'; // purple transparent
        ctx.fill();

        ctx.strokeStyle = '#a855f7'; // Purple line
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#c084fc';
        ctx.font = '8px monospace';
        ctx.fillText(`${stations[0].moment.toFixed(1)}`, 5, -stations[0].moment * mScale - 4);
        ctx.fillText(`${stations[stations.length - 1].moment.toFixed(1)}`, L_px - 25, -stations[stations.length - 1].moment * mScale - 4);
      } else if (viewMode === 'Shear') {
        // Shear Force Diagram
        ctx.beginPath();
        ctx.moveTo(0, 0);

        const sScale = 0.4 * diagramScale;
        stations.forEach((st, s) => {
          const normX = (s / (stations.length - 1)) * L_px;
          ctx.lineTo(normX, -st.shear * sScale);
        });
        ctx.lineTo(L_px, 0);
        ctx.closePath();

        ctx.fillStyle = 'rgba(236, 72, 153, 0.15)'; // Pink transparent
        ctx.fill();

        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#f472b6';
        ctx.font = '8px monospace';
        ctx.fillText(`${stations[0].shear.toFixed(1)}`, 5, -stations[0].shear * sScale - 4);
        ctx.fillText(`${stations[stations.length - 1].shear.toFixed(1)}`, L_px - 25, -stations[stations.length - 1].shear * sScale - 4);
      } else if (viewMode === 'Axial') {
        // Axial Force Diagram
        ctx.beginPath();
        ctx.moveTo(0, 0);

        const aScale = 0.4 * diagramScale;
        stations.forEach((st, s) => {
          const normX = (s / (stations.length - 1)) * L_px;
          ctx.lineTo(normX, -st.axial * aScale);
        });
        ctx.lineTo(L_px, 0);
        ctx.closePath();

        const avgAxial = stations.reduce((sum, st) => sum + st.axial, 0) / stations.length;
        ctx.fillStyle = avgAxial < 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)'; // red compression, blue tension
        ctx.fill();

        ctx.strokeStyle = avgAxial < 0 ? '#ef4444' : '#3b82f6';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = avgAxial < 0 ? '#f87171' : '#60a5fa';
        ctx.font = '8px monospace';
        ctx.fillText(`${stations[0].axial.toFixed(1)}`, 5, -stations[0].axial * aScale - 4);
        ctx.fillText(`${stations[stations.length - 1].axial.toFixed(1)}`, L_px - 25, -stations[stations.length - 1].axial * aScale - 4);
      } else if (viewMode === 'Design') {
        // Design Unity Code Capacity check ratios
        const dResult = fForces.design;
        let color = '#22c55e'; // Pass Green
        if (dResult) {
          if (dResult.ratio > 1.0) {
            color = '#ef4444'; // Fail Red
          } else if (dResult.ratio > 0.5) {
            color = '#eab308'; // Warning Amber
          } else {
            color = '#3b82f6'; // Safe Blue
          }
        }

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(L_px, 0);
        ctx.strokeStyle = color;
        ctx.lineWidth = 5;
        ctx.stroke();

        if (dResult) {
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 8px sans-serif';
          
          if (dResult.isConcrete) {
            ctx.font = 'bold 8px monospace';
            if (frame.type === 'Column' && dResult.astTotal !== undefined) {
              ctx.fillText(`${dResult.astTotal.toFixed(0)}`, L_px / 2 - 10, -5);
            } else {
              const yOffTop = -6;
              const yOffBot = 12;
              // Left
              if (dResult.astTopLeft !== undefined) ctx.fillText(`${dResult.astTopLeft.toFixed(0)}`, 4, yOffTop);
              if (dResult.astBotLeft !== undefined) ctx.fillText(`${dResult.astBotLeft.toFixed(0)}`, 4, yOffBot);
              // Mid
              if (dResult.astTopMid !== undefined) ctx.fillText(`${dResult.astTopMid.toFixed(0)}`, L_px / 2 - 8, yOffTop);
              if (dResult.astBotMid !== undefined) ctx.fillText(`${dResult.astBotMid.toFixed(0)}`, L_px / 2 - 8, yOffBot);
              // Right
              if (dResult.astTopRight !== undefined) ctx.fillText(`${dResult.astTopRight.toFixed(0)}`, L_px - 24, yOffTop);
              if (dResult.astBotRight !== undefined) ctx.fillText(`${dResult.astBotRight.toFixed(0)}`, L_px - 24, yOffBot);
            }
          } else {
            ctx.fillText(`U.C: ${dResult.ratio.toFixed(2)}`, L_px / 2 - 15, -6);
          }
        }
      }

      ctx.restore();
    });
  };

  // Click handler on CAD visual grid stage
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const engPt = toEngineering3D(clickX, clickY);

    if (drawingMode === 'AddJoint') {
      const snap = calculateSnap3D(clickX, clickY);
      const targetX = snap ? snap.x : (viewpoint === 'Side' ? activeXLevel : Math.round(engPt.x * 2) / 2);
      const targetY = snap ? snap.y : ((viewpoint === 'Top' || viewpoint === '3D') ? activeYLevel : Math.round(engPt.y * 2) / 2);
      const targetZ = snap ? snap.z : (viewpoint === 'Front' ? activeZLevel : Math.round((engPt.z || 0) * 2) / 2);
      onAddJoint(targetX, targetY, targetZ);
    } else if (drawingMode === 'AddSlab') {
      const snap = calculateSnap3D(clickX, clickY);
      if (snap && snap.jointId) {
        if (slabDrawNodes.includes(snap.jointId)) {
          // If clicking the first node again, finish drawing slab
          if (slabDrawNodes.length >= 3 && snap.jointId === slabDrawNodes[0]) {
            if (onAddSlab) onAddSlab(slabDrawNodes);
            setSlabDrawNodes([]);
          } else if (snap.jointId === slabDrawNodes[slabDrawNodes.length - 1]) {
            // double click on last point? 
            if (slabDrawNodes.length >= 3) {
              if (onAddSlab) onAddSlab(slabDrawNodes);
            }
            setSlabDrawNodes([]);
          }
        } else {
          setSlabDrawNodes([...slabDrawNodes, snap.jointId]);
        }
      }
    } else if (drawingMode === 'AddBeam' || drawingMode === 'AddColumn') {
      if (drawingMode === 'AddColumn' && viewpoint === 'Top') {
        const snap = calculateSnap3D(clickX, clickY);
        const targetX = snap ? snap.x : Math.round(engPt.x * 2) / 2;
        const targetZ = snap ? snap.z : Math.round((engPt.z || 0) * 2) / 2;

        // Determine story heights below/above from current joints
        const yLevels = Array.from(new Set(joints.map(j => j.y))).sort((a, b) => a - b);
        let Y_bottom = activeYLevel - 3.0;
        let Y_top = activeYLevel;

        if (yLevels.length > 0) {
          const idx = yLevels.findIndex(y => Math.abs(y - activeYLevel) < 0.01);
          if (idx > 0) {
            Y_bottom = yLevels[idx - 1];
            Y_top = activeYLevel;
          } else if (idx === 0) {
            if (yLevels.length > 1) {
              Y_bottom = activeYLevel;
              Y_top = yLevels[1];
            } else {
              Y_bottom = activeYLevel;
              Y_top = activeYLevel + 3.0;
            }
          } else {
            const below = yLevels.filter(y => y < activeYLevel);
            if (below.length > 0) {
              Y_bottom = below[below.length - 1];
              Y_top = activeYLevel;
            } else {
              Y_bottom = activeYLevel - 3.0;
              Y_top = activeYLevel;
            }
          }
        }

        if (onAddVerticalColumn) {
          onAddVerticalColumn(targetX, targetZ, Y_bottom, Y_top);
        }
      } else {
        const snap = calculateSnap3D(clickX, clickY);
        if (snap) {
          let nodeIId = snap.jointId;
          if (!nodeIId) {
            // Create joint if click is snapped to grid intersection but no node is placed yet
            nodeIId = onAddJoint(snap.x, snap.y, snap.z);
          }

          if (!drawStartJointId) {
            setDrawStartJointId(nodeIId);
          } else {
            if (drawStartJointId !== nodeIId) {
              onAddFrame(drawStartJointId, nodeIId, drawingMode === 'AddBeam' ? 'Beam' : 'Column');
            }
            setDrawStartJointId(null);
          }
        } else {
          // clicked in empty coordinate space
          const targetX = viewpoint === 'Side' ? activeXLevel : Math.round(engPt.x * 2) / 2;
          const targetY = (viewpoint === 'Top' || viewpoint === '3D') ? activeYLevel : Math.round(engPt.y * 2) / 2;
          const targetZ = viewpoint === 'Front' ? activeZLevel : Math.round((engPt.z || 0) * 2) / 2;
          const newJointId = onAddJoint(targetX, targetY, targetZ);

          if (!drawStartJointId) {
            setDrawStartJointId(newJointId);
          } else {
            onAddFrame(drawStartJointId, newJointId, drawingMode === 'AddBeam' ? 'Beam' : 'Column');
            setDrawStartJointId(null);
          }
        }
      }
    } else if (drawingMode === 'Select') {
      let clickedJoint = null;
      for (const j of joints) {
        const p = toScreen3D(j.x, j.y, j.z || 0);
        const d = Math.hypot(p.x - clickX, p.y - clickY);
        if (d < 12) {
          clickedJoint = j;
          break;
        }
      }

      if (clickedJoint) {
        setSelectedJointId(clickedJoint.id);
        setSelectedFrameId(null);
        if (setSelectedSlabId) setSelectedSlabId(null);
        return;
      }

      
      if (slabs) {
        let clickedSlab = null;
        for (const s of slabs) {
          const points = s.nodeIds.map(id => joints.find(j => j.id === id)).filter(Boolean);
          if (points.length >= 3) {
            // Very simple hit test: average center
            let avgX = 0, avgY = 0, avgZ = 0;
            points.forEach(p => { avgX += p.x; avgY += p.y; avgZ += (p.z || 0); });
            avgX /= points.length;
            avgY /= points.length;
            avgZ /= points.length;
            const p = toScreen3D(avgX, avgY, avgZ);
            const d = Math.hypot(p.x - clickX, p.y - clickY);
            if (d < 25) { // somewhat larger hit area
              clickedSlab = s;
              break;
            }
          }
        }

        if (clickedSlab) {
          if (setSelectedSlabId) setSelectedSlabId(clickedSlab.id);
          setSelectedJointId(null);
      setSelectedFrameId(null);
      if (setSelectedSlabId) setSelectedSlabId(null);
          return;
        }
      }

      let clickedFrame = null;
      let minDist = 12;

      for (const f of frames) {
        const nodeI = joints.find((j) => j.id === f.nodeI);
        const nodeJ = joints.find((j) => j.id === f.nodeJ);
        if (!nodeI || !nodeJ) continue;

        const pI = toScreen3D(nodeI.x, nodeI.y, nodeI.z || 0);
        const pJ = toScreen3D(nodeJ.x, nodeJ.y, nodeJ.z || 0);

        const isVerticalColumn = Math.abs(nodeI.x - nodeJ.x) < 0.05 && Math.abs((nodeI.z || 0) - (nodeJ.z || 0)) < 0.05;
        let d = 999999;
        if (viewpoint === 'Top' && isVerticalColumn) {
          d = Math.hypot(pI.x - clickX, pI.y - clickY);
        } else {
          d = distToSegment({ x: clickX, y: clickY }, pI, pJ);
        }

        if (d < minDist) {
          minDist = d;
          clickedFrame = f;
        }
      }

      if (clickedFrame) {
        setSelectedFrameId(clickedFrame.id);
        setSelectedJointId(null);
        if (setSelectedSlabId) setSelectedSlabId(null);
      } else {
        setSelectedJointId(null);
        setSelectedFrameId(null);
      }
    } else if (drawingMode === 'Delete') {
      let clickedJointId = null;
      for (const j of joints) {
        const p = toScreen3D(j.x, j.y, j.z || 0);
        const d = Math.hypot(p.x - clickX, p.y - clickY);
        if (d < 12) {
          clickedJointId = j.id;
          break;
        }
      }

      if (clickedJointId) {
        onDeleteJoint(clickedJointId);
        setSelectedJointId(null);
        setSelectedFrameId(null);
        return;
      }

      for (const f of frames) {
        const nodeI = joints.find((j) => j.id === f.nodeI);
        const nodeJ = joints.find((j) => j.id === f.nodeJ);
        if (!nodeI || !nodeJ) continue;

        const pI = toScreen3D(nodeI.x, nodeI.y, nodeI.z || 0);
        const pJ = toScreen3D(nodeJ.x, nodeJ.y, nodeJ.z || 0);

        const isVerticalColumn = Math.abs(nodeI.x - nodeJ.x) < 0.05 && Math.abs((nodeI.z || 0) - (nodeJ.z || 0)) < 0.05;
        let d = 999999;
        if (viewpoint === 'Top' && isVerticalColumn) {
          d = Math.hypot(pI.x - clickX, pI.y - clickY);
        } else {
          d = distToSegment({ x: clickX, y: clickY }, pI, pJ);
        }

        if (d < 10) {
          onDeleteFrame(f.id);
          setSelectedJointId(null);
          setSelectedFrameId(null);
          break;
        }
      }
    } else if (drawingMode === 'AssignSupport' || drawingMode === 'AssignJointLoad') {
      let clickedJoint = null;
      for (const j of joints) {
        const p = toScreen3D(j.x, j.y, j.z || 0);
        const d = Math.hypot(p.x - clickX, p.y - clickY);
        if (d < 12) {
          clickedJoint = j;
          break;
        }
      }

      if (clickedJoint) {
        setSelectedJointId(clickedJoint.id);
        setSupportType(clickedJoint.support || 'Free');
        const existingLoad = clickedJoint.loads.find((l) => l.loadCaseId === activeLoadCaseId);
        if (existingLoad) {
          setJointFx(existingLoad.fx.toString());
          setJointFy(existingLoad.fy.toString());
          setJointMz(existingLoad.mz.toString());
        } else {
          setJointFx('0');
          setJointFy('-10');
          setJointMz('0');
        }
        setActiveJointModal(clickedJoint.id);
      }
    } else if (drawingMode === 'AssignMemberLoad') {
      let clickedFrame = null;
      for (const f of frames) {
        const nodeI = joints.find((j) => j.id === f.nodeI);
        const nodeJ = joints.find((j) => j.id === f.nodeJ);
        if (!nodeI || !nodeJ) continue;

        const pI = toScreen3D(nodeI.x, nodeI.y, nodeI.z || 0);
        const pJ = toScreen3D(nodeJ.x, nodeJ.y, nodeJ.z || 0);

        const d = distToSegment({ x: clickX, y: clickY }, pI, pJ);
        if (d < 10) {
          clickedFrame = f;
          break;
        }
      }

      if (clickedFrame) {
        setSelectedFrameId(clickedFrame.id);
        const existingLoad = clickedFrame.loads.find((l) => l.loadCaseId === activeLoadCaseId);
        if (existingLoad) {
          setFrameLoadType(existingLoad.type);
          setFrameLoadDir(existingLoad.direction);
          setFrameLoadVal(existingLoad.value.toString());
          setFrameLoadOffset((existingLoad.offset ?? 0.5).toString());
        } else {
          setFrameLoadType('UDL');
          setFrameLoadDir('GlobalY');
          setFrameLoadVal('15');
          setFrameLoadOffset('0.5');
        }
        setActiveFrameModal(clickedFrame.id);
      }
    }
  };

  const distToSegment = (p: { x: number; y: number }, v: { x: number; y: number }, w: { x: number; y: number }) => {
    const l2 = Math.pow(v.x - w.x, 2) + Math.pow(v.y - w.y, 2);
    if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setMousePos({ x, y });

    const engPt = toEngineering3D(x, y);
    setEngMousePos(engPt);

    const snap = calculateSnap3D(x, y);
    setSnappedPos(snap);

    if (isPanning) {
      setPanX(x - panStart.x);
      setPanY(y - panStart.y);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1 || e.shiftKey || (drawingMode === 'Select' && e.ctrlKey)) {
      setIsPanning(true);
      setPanStart({
        x: e.clientX - canvasRef.current!.getBoundingClientRect().left - panX,
        y: e.clientY - canvasRef.current!.getBoundingClientRect().top - panY,
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const submitJointAssign = () => {
    if (activeJointModal) {
      if (drawingMode === 'AssignSupport') {
        onAssignSupport(activeJointModal, supportType);
      } else {
        onAssignJointLoad(
          activeJointModal,
          parseFloat(jointFx) || 0,
          parseFloat(jointFy) || 0,
          parseFloat(jointMz) || 0,
          activeLoadCaseId
        );
      }
      setActiveJointModal(null);
    }
  };

  const submitFrameAssign = () => {
    if (activeFrameModal) {
      onAssignFrameLoad(
        activeFrameModal,
        frameLoadType,
        frameLoadDir,
        parseFloat(frameLoadVal) || 0,
        parseFloat(frameLoadOffset) || 0.5,
        activeLoadCaseId
      );
      setActiveFrameModal(null);
    }
  };

  return (
    <div id="cad-stage-container" className="flex-1 relative bg-slate-950 flex flex-col min-h-0 overflow-hidden">
      
      {/* Top Floating View Controls & Viewpoint Selectors */}
      <div id="cad-top-toolbar" className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10 gap-3 flex-wrap">
        
        {/* VIEWPOINT MULTI-SELECTOR TABS */}
        <div className="flex items-center gap-1 bg-[#F9F9F9] border border-[#D1D1D1] rounded p-1 shadow-sm pointer-events-auto">
          {[
            { id: 'Top' as const, label: 'Plan (Top)' },
            { id: 'Front' as const, label: 'Front (Elev)' },
            { id: 'Side' as const, label: 'Side (Elev)' },
            { id: '3D' as const, label: '3D Isometric' },
          ].map((vpt) => (
            <button
              key={vpt.id}
              id={`btn-vpt-switch-${vpt.id}`}
              onClick={() => handleSetViewpoint(vpt.id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-sm transition cursor-pointer ${
                viewpoint === vpt.id
                  ? 'bg-[#004A99] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              {vpt.label}
            </button>
          ))}
        </div>

        {/* ACTIVE PLANE LEVEL INDICATOR & HEIGHT CONTROLS */}
        <div className="bg-[#F9F9F9] border border-[#D1D1D1] rounded px-3 py-1 flex items-center gap-2 text-xs text-slate-700 pointer-events-auto shadow-sm">
          {viewpoint === 'Top' || viewpoint === '3D' ? (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-500">Active Floor Height (Y):</span>
              <button
                type="button"
                id="btn-y-level-dec"
                onClick={() => {
                  const list = existingYLevels.length > 0 ? existingYLevels : [0];
                  const smaller = list.filter(y => y < activeYLevel - 0.01);
                  if (smaller.length > 0) {
                    setActiveYLevel(smaller[smaller.length - 1]);
                  } else {
                    setActiveYLevel((prev) => Math.max(-10, prev - 1));
                  }
                }}
                className="w-5 h-5 bg-slate-200 border border-[#C1C1C1] hover:bg-slate-300 rounded font-bold text-center flex items-center justify-center cursor-pointer text-xs"
                title="Go to floor below"
              >
                -
              </button>
              <select
                id="select-y-level"
                value={Number(activeYLevel.toFixed(3))}
                onChange={(e) => setActiveYLevel(parseFloat(e.target.value))}
                className="bg-white border border-[#C1C1C1] rounded px-1.5 py-0.5 text-xs font-mono font-bold text-slate-900 focus:outline-none"
              >
                {!existingYLevels.includes(Number(activeYLevel.toFixed(3))) && (
                  <option value={activeYLevel}>Custom ({activeYLevel.toFixed(2)}m)</option>
                )}
                {(existingYLevels.length > 0 ? existingYLevels : [0]).map((y, idx) => (
                  <option key={idx} value={y}>
                    {y === 0 ? 'Base / Plinth' : `Story ${idx}`} ({y.toFixed(2)}m)
                  </option>
                ))}
              </select>
              <button
                type="button"
                id="btn-y-level-inc"
                onClick={() => {
                  const list = existingYLevels.length > 0 ? existingYLevels : [0];
                  const larger = list.filter(y => y > activeYLevel + 0.01);
                  if (larger.length > 0) {
                    setActiveYLevel(larger[0]);
                  } else {
                    setActiveYLevel((prev) => Math.min(50, prev + 1));
                  }
                }}
                className="w-5 h-5 bg-slate-200 border border-[#C1C1C1] hover:bg-slate-300 rounded font-bold text-center flex items-center justify-center cursor-pointer text-xs"
                title="Go to floor above"
              >
                +
              </button>
              <span className="font-bold text-slate-400">m</span>
            </div>
          ) : viewpoint === 'Front' ? (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-500">Active Frame Depth (Z):</span>
              <button
                type="button"
                id="btn-z-level-dec"
                onClick={() => {
                  const list = existingZLevels.length > 0 ? existingZLevels : [0];
                  const smaller = list.filter(z => z < activeZLevel - 0.01);
                  if (smaller.length > 0) {
                    setActiveZLevel(smaller[smaller.length - 1]);
                  } else {
                    setActiveZLevel((prev) => Math.max(-30, prev - 1));
                  }
                }}
                className="w-5 h-5 bg-slate-200 border border-[#C1C1C1] hover:bg-slate-300 rounded font-bold text-center flex items-center justify-center cursor-pointer text-xs"
                title="Previous frame plane"
              >
                -
              </button>
              <select
                id="select-z-level"
                value={Number(activeZLevel.toFixed(3))}
                onChange={(e) => setActiveZLevel(parseFloat(e.target.value))}
                className="bg-white border border-[#C1C1C1] rounded px-1.5 py-0.5 text-xs font-mono font-bold text-slate-900 focus:outline-none"
              >
                {!existingZLevels.includes(Number(activeZLevel.toFixed(3))) && (
                  <option value={activeZLevel}>Custom ({activeZLevel.toFixed(2)}m)</option>
                )}
                {(existingZLevels.length > 0 ? existingZLevels : [0]).map((z, idx) => (
                  <option key={idx} value={z}>
                    Grid Line {String.fromCharCode(65 + idx)} ({z.toFixed(2)}m)
                  </option>
                ))}
              </select>
              <button
                type="button"
                id="btn-z-level-inc"
                onClick={() => {
                  const list = existingZLevels.length > 0 ? existingZLevels : [0];
                  const larger = list.filter(z => z > activeZLevel + 0.01);
                  if (larger.length > 0) {
                    setActiveZLevel(larger[0]);
                  } else {
                    setActiveZLevel((prev) => Math.min(30, prev + 1));
                  }
                }}
                className="w-5 h-5 bg-slate-200 border border-[#C1C1C1] hover:bg-slate-300 rounded font-bold text-center flex items-center justify-center cursor-pointer text-xs"
                title="Next frame plane"
              >
                +
              </button>
              <span className="font-bold text-slate-400">m</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-500">Active Frame Width (X):</span>
              <button
                type="button"
                id="btn-x-level-dec"
                onClick={() => {
                  const list = existingXLevels.length > 0 ? existingXLevels : [0];
                  const smaller = list.filter(x => x < activeXLevel - 0.01);
                  if (smaller.length > 0) {
                    setActiveXLevel(smaller[smaller.length - 1]);
                  } else {
                    setActiveXLevel((prev) => Math.max(-30, prev - 1));
                  }
                }}
                className="w-5 h-5 bg-slate-200 border border-[#C1C1C1] hover:bg-slate-300 rounded font-bold text-center flex items-center justify-center cursor-pointer text-xs"
                title="Previous width grid"
              >
                -
              </button>
              <select
                id="select-x-level"
                value={Number(activeXLevel.toFixed(3))}
                onChange={(e) => setActiveXLevel(parseFloat(e.target.value))}
                className="bg-white border border-[#C1C1C1] rounded px-1.5 py-0.5 text-xs font-mono font-bold text-slate-900 focus:outline-none"
              >
                {!existingXLevels.includes(Number(activeXLevel.toFixed(3))) && (
                  <option value={activeXLevel}>Custom ({activeXLevel.toFixed(2)}m)</option>
                )}
                {(existingXLevels.length > 0 ? existingXLevels : [0]).map((x, idx) => (
                  <option key={idx} value={x}>
                    Grid {idx + 1} ({x.toFixed(2)}m)
                  </option>
                ))}
              </select>
              <button
                type="button"
                id="btn-x-level-inc"
                onClick={() => {
                  const list = existingXLevels.length > 0 ? existingXLevels : [0];
                  const larger = list.filter(x => x > activeXLevel + 0.01);
                  if (larger.length > 0) {
                    setActiveXLevel(larger[0]);
                  } else {
                    setActiveXLevel((prev) => Math.min(100, prev + 1));
                  }
                }}
                className="w-5 h-5 bg-slate-200 border border-[#C1C1C1] hover:bg-slate-300 rounded font-bold text-center flex items-center justify-center cursor-pointer text-xs"
                title="Next width grid"
              >
                +
              </button>
              <span className="font-bold text-slate-400">m</span>
            </div>
          )}
        </div>

        {/* CAD STAGE INFO COORDINATES PANEL */}
        <div className="bg-[#F9F9F9] border border-[#D1D1D1] rounded px-3 py-1.5 flex items-center gap-3 text-xs text-slate-700 pointer-events-auto shadow-sm">
          <span className="font-bold uppercase tracking-wide text-[10px] text-[#004A99] bg-blue-50 px-2 py-0.5 rounded-sm border border-blue-200">
            {drawingMode} Mode
          </span>
          <span className="text-slate-300">|</span>
          <span>
            X: <strong className="text-slate-900 font-mono font-bold">{engMousePos.x.toFixed(2)}m</strong>
          </span>
          <span>
            Y: <strong className="text-slate-900 font-mono font-bold">{engMousePos.y.toFixed(2)}m</strong>
          </span>
          <span>
            Z: <strong className="text-slate-900 font-mono font-bold">{(engMousePos.z || 0).toFixed(2)}m</strong>
          </span>
        </div>

        {/* View adjustment & scaling controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {isDiagram && (
            <div className="bg-[#F9F9F9] border border-[#D1D1D1] rounded p-1.5 flex items-center gap-2 text-xs text-slate-700 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-slate-500">Scale:</span>
              <input
                id="diagram-scale-slider"
                type="range"
                min="0.1"
                max="3.0"
                step="0.1"
                value={diagramScale}
                onChange={(e) => setDiagramScale(parseFloat(e.target.value))}
                className="w-16 accent-[#004A99] cursor-pointer h-1 rounded"
              />
              <span className="text-[10px] font-mono font-bold">{diagramScale.toFixed(1)}x</span>
            </div>
          )}

          <div className="bg-[#F9F9F9] border border-[#D1D1D1] rounded p-1 flex items-center gap-0.5 shadow-sm">
            <button
              id="btn-zoom-in"
              onClick={() => handleZoom(1.2)}
              className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded transition cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              id="btn-zoom-out"
              onClick={() => handleZoom(0.83)}
              className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded transition cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              id="btn-auto-fit"
              onClick={handleAutoFit}
              className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded transition cursor-pointer"
              title="Auto Fit & Center Model"
            >
              <Maximize className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Canvas Drawing Element */}
      <div ref={containerRef} className="flex-1 w-full h-full cursor-crosshair">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onClick={handleCanvasClick}
          className="block w-full h-full"
        />
      </div>

      {/* FLOATING QUICK SETTING OVERLAYS / MODALS FOR ASSIGNING */}
      {activeJointModal && (
        <div id="joint-assign-modal" className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white border border-[#A0A0A0] rounded p-4 w-80 shadow-xl z-50 text-slate-800">
          <h3 className="font-bold text-sm text-slate-900 border-b border-[#D1D1D1] pb-2 mb-3">
            {drawingMode === 'AssignSupport'
              ? `Assign Supports to Joint ${activeJointModal}`
              : `Assign Joint Loads to Joint ${activeJointModal}`}
          </h3>

          {drawingMode === 'AssignSupport' ? (
            <div className="space-y-3">
              <label className="text-xs text-slate-600 font-medium block">Boundary Support Type</label>
              <div className="grid grid-cols-2 gap-2">
                {(['Fixed', 'Pinned', 'RollerX', 'Free'] as SupportType[]).map((type) => (
                  <button
                    key={type}
                    id={`btn-support-type-${type}`}
                    type="button"
                    onClick={() => setSupportType(type)}
                    className={`p-2 rounded text-xs font-semibold border transition cursor-pointer ${
                      supportType === type
                        ? 'bg-[#004A99] border-[#003B7A] text-white shadow'
                        : 'bg-[#F0F0F0] border-[#C1C1C1] text-slate-800 hover:bg-slate-200'
                    }`}
                  >
                    {type === 'RollerX' ? 'Roller (X)' : type}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 italic mt-1 leading-normal">
                Fixed: DX, DY, RZ locked. Pinned: DX, DY locked. Roller (X): DY locked.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-slate-600 font-medium block mb-1">Fx (kN)</label>
                  <input
                    id="joint-fx-input"
                    type="number"
                    value={jointFx}
                    onChange={(e) => setJointFx(e.target.value)}
                    className="w-full bg-white border border-[#C1C1C1] text-slate-900 rounded-sm text-xs p-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-600 font-medium block mb-1">Fy (kN)</label>
                  <input
                    id="joint-fy-input"
                    type="number"
                    value={jointFy}
                    onChange={(e) => setJointFy(e.target.value)}
                    className="w-full bg-white border border-[#C1C1C1] text-slate-900 rounded-sm text-xs p-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-600 font-medium block mb-1">Mz (kNm)</label>
                  <input
                    id="joint-mz-input"
                    type="number"
                    value={jointMz}
                    onChange={(e) => setJointMz(e.target.value)}
                    className="w-full bg-white border border-[#C1C1C1] text-slate-900 rounded-sm text-xs p-1.5 font-mono"
                  />
                </div>
              </div>
              <p className="text-[10px] text-slate-500 italic leading-normal">
                Fy load is downwards for gravity. Positive Fx pushes to the right.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-[#D1D1D1]">
            <button
              id="joint-assign-cancel"
              onClick={() => setActiveJointModal(null)}
              className="px-3 py-1.5 rounded-sm text-xs bg-[#F0F0F0] border border-[#C1C1C1] text-slate-700 hover:bg-slate-200 font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="joint-assign-submit"
              onClick={submitJointAssign}
              className="px-3 py-1.5 rounded-sm text-xs bg-[#004A99] hover:bg-[#003B7A] text-white font-bold cursor-pointer"
            >
              Assign
            </button>
          </div>
        </div>
      )}

      {activeFrameModal && (
        <div id="frame-assign-modal" className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white border border-[#A0A0A0] rounded p-4 w-80 shadow-xl z-50 text-slate-800">
          <h3 className="font-bold text-sm text-slate-900 border-b border-[#D1D1D1] pb-2 mb-3">
            Assign Loads to Frame {activeFrameModal}
          </h3>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-600 font-medium block mb-1">Load Type</label>
                <select
                  id="frame-load-type-select"
                  value={frameLoadType}
                  onChange={(e: any) => setFrameLoadType(e.target.value)}
                  className="w-full bg-white border border-[#C1C1C1] text-slate-900 rounded-sm text-xs p-1.5"
                >
                  <option value="UDL">Distributed (UDL)</option>
                  <option value="Point">Point Load</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-600 font-medium block mb-1">Direction</label>
                <select
                  id="frame-load-dir-select"
                  value={frameLoadDir}
                  onChange={(e: any) => setFrameLoadDir(e.target.value)}
                  className="w-full bg-white border border-[#C1C1C1] text-slate-900 rounded-sm text-xs p-1.5"
                >
                  <option value="GlobalY">Gravity (-Y)</option>
                  <option value="LocalY">Perpendicular</option>
                  <option value="GlobalX">Wind (+X)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-600 font-medium block mb-1">
                  {frameLoadType === 'UDL' ? 'Load Value (kN/m)' : 'Load Value (kN)'}
                </label>
                <input
                  id="frame-load-val-input"
                  type="number"
                  value={frameLoadVal}
                  onChange={(e) => setFrameLoadVal(e.target.value)}
                  className="w-full bg-white border border-[#C1C1C1] text-slate-900 rounded-sm text-xs p-1.5 font-mono"
                />
              </div>

              {frameLoadType === 'Point' && (
                <div>
                  <label className="text-[10px] text-slate-600 font-medium block mb-1">
                    Relative Offset [0-1]
                  </label>
                  <input
                    id="frame-load-offset-input"
                    type="number"
                    step="0.1"
                    min="0"
                    max="1"
                    value={frameLoadOffset}
                    onChange={(e) => setFrameLoadOffset(e.target.value)}
                    className="w-full bg-white border border-[#C1C1C1] text-slate-900 rounded-sm text-xs p-1.5 font-mono"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-[#D1D1D1]">
            <button
              id="frame-assign-cancel"
              onClick={() => setActiveFrameModal(null)}
              className="px-3 py-1.5 rounded-sm text-xs bg-[#F0F0F0] border border-[#C1C1C1] text-slate-700 hover:bg-slate-200 font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="frame-assign-submit"
              onClick={submitFrameAssign}
              className="px-3 py-1.5 rounded-sm text-xs bg-[#004A99] hover:bg-[#003B7A] text-white font-bold cursor-pointer"
            >
              Assign
            </button>
          </div>
        </div>
      )}

      {/* Visual Instruction HUD overlay */}
      {joints.length === 0 && (
        <div id="tutorial-hud" className="absolute bottom-6 left-6 bg-[#0f172a]/95 border border-[#1e293b] rounded p-4 max-w-sm pointer-events-auto shadow-xl">
          <h4 className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wide">
            <HelpCircle className="w-4 h-4 text-[#38bdf8]" />
            Quick Modeling Guide
          </h4>
          <ul className="text-[11px] text-slate-300 space-y-1.5 mt-2.5">
            <li>
              1. Choose a viewpoint tab above: <strong className="text-white font-bold">Plan (Top)</strong>, <strong className="text-white font-bold">Front (Elev)</strong>, or <strong className="text-white font-bold">3D Isometric</strong>.
            </li>
            <li>
              2. Click <strong className="text-[#38bdf8] font-bold">Draw Joint</strong> tool and click grid points to define joints on your active level.
            </li>
            <li>
              3. Use <strong className="text-[#38bdf8] font-bold">Draw Beam/Column</strong> to connect joints together. Use the active level height sliders to shift floors or elevation planes!
            </li>
            <li>
              4. Choose <strong className="text-amber-500 font-bold">Assign Supports</strong>, click base joints, and select Pinned or Fixed.
            </li>
            <li>
              5. Click <strong className="text-white bg-[#004A99] px-2 py-0.5 rounded text-[10px] font-bold">Run Solve</strong> on the top bar to run the finite element analysis!
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
