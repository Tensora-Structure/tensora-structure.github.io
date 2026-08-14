import React from 'react';
import { 
  MousePointer,
  CircleDot,
  GitCommit,
  ArrowDownToLine,
  Trash2,
  Anchor,
  SquareDot,
  Wrench, Square } from 'lucide-react';
import { DrawingMode } from '../types';

interface ToolbarProps {
  activeMode: DrawingMode;
  setActiveMode: (mode: DrawingMode) => void;
}

export default function Toolbar({
  activeMode,
  setActiveMode,
}: ToolbarProps) {
  const tools = [
    {
      id: 'Select' as DrawingMode,
      name: 'Select & Edit',
      description: 'Select nodes or frames to view and edit properties',
      icon: MousePointer,
      color: 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200',
    },
    {
      id: 'AddJoint' as DrawingMode,
      name: 'Draw Joint',
      description: 'Click on grid or canvas to place structural joints (Nodes)',
      icon: CircleDot,
      color: 'hover:bg-blue-50 hover:text-blue-600 text-slate-700 dark:text-slate-200',
    },
    {
      id: 'AddBeam' as DrawingMode,
      name: 'Draw Beam',
      description: 'Click and drag from joint to joint to draw a horizontal structural beam',
      icon: GitCommit,
      color: 'hover:bg-emerald-50 hover:text-emerald-600 text-slate-700 dark:text-slate-200',
    },
    {
      id: 'AddColumn' as DrawingMode,
      name: 'Draw Column',
      description: 'Draw a vertical frame column member snapped to grid heights',
      icon: SquareDot,
      color: 'hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 dark:text-slate-200',
    },
    {
      id: 'AddSlab' as DrawingMode,
      name: 'Draw Slab',
      description: 'Click on 4 joints to draw a slab element',
      icon: Square,
      color: 'hover:bg-teal-50 hover:text-teal-600 text-slate-700 dark:text-slate-200',
    },
    {
      id: 'AssignSupport' as DrawingMode,
      name: 'Assign Supports',
      description: 'Assign boundary conditions: Fixed, Pinned, or Roller supports',
      icon: Anchor,
      color: 'hover:bg-amber-50 hover:text-amber-600 text-slate-700 dark:text-slate-200',
    },
    {
      id: 'AssignJointLoad' as DrawingMode,
      name: 'Assign Joint Load',
      description: 'Apply force in X, Y, or concentrated Moment to a selected joint',
      icon: ArrowDownToLine,
      color: 'hover:bg-cyan-50 hover:text-cyan-600 text-slate-700 dark:text-slate-200',
    },
    {
      id: 'AssignMemberLoad' as DrawingMode,
      name: 'Assign Member Load',
      description: 'Apply distributed (UDL) or concentrated loads to a frame member',
      icon: Wrench,
      color: 'hover:bg-purple-50 hover:text-purple-600 text-slate-700 dark:text-slate-200',
    },
    {
      id: 'Delete' as DrawingMode,
      name: 'Delete Element',
      description: 'Click elements or joints to erase them from the structural model',
      icon: Trash2,
      color: 'hover:bg-rose-50 hover:text-rose-600 text-slate-700 dark:text-slate-200',
    },
  ];

  return (
    <div id="cad-toolbar" className="w-12 md:w-16 bg-white border-r border-[#D1D1D1] flex flex-col p-1.5 flex-shrink-0 text-slate-800 overflow-y-auto overflow-x-hidden">
      {/* CAD Draw buttons */}
      <div className="flex flex-col gap-1">
        <div className="text-[10px] font-bold text-[#004A99] text-center uppercase tracking-wider mb-1">
          Draw
        </div>
        {tools.map((t) => {
          const Icon = t.icon;
          const isActive = activeMode === t.id;
          return (
            <button
              key={t.id}
              id={`tool-btn-${t.id}`}
              onClick={() => setActiveMode(t.id)}
              className={`group relative flex flex-col items-center justify-center w-full py-2 px-1 rounded border transition-all duration-100 cursor-pointer ${
                isActive
                  ? 'bg-[#E8F0FE] border-[#7BAAF7] text-[#004A99] font-bold shadow-sm'
                  : 'border-[#D1D1D1] bg-white text-slate-700 hover:bg-[#F3F3F3] hover:text-[#004A99]'
              }`}
              title={`${t.name}: ${t.description}`}
            >
              <Icon className="w-3.5 h-3.5 mb-1" />
              <span className="text-[9px] text-center font-medium truncate max-w-full leading-tight">
                {t.id === 'AssignJointLoad'
                  ? 'N-Load'
                  : t.id === 'AssignMemberLoad'
                  ? 'F-Load'
                  : t.id === 'AssignSupport'
                  ? 'Support'
                  : t.name.split(' ')[1] || t.name}
              </span>

              {/* Advanced Tooltip */}
              <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 hidden group-hover:flex flex-col bg-white text-slate-800 text-[11px] rounded border border-[#D1D1D1] py-2 px-3 w-48 z-50 pointer-events-none shadow-xl">
                <span className="font-bold text-[#004A99] text-xs">{t.name}</span>
                <span className="text-slate-500 text-[10px] mt-1 leading-normal">
                  {t.description}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
