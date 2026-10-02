import React from 'react';
import { Cpu, HardDrive, MemoryStick, X } from 'lucide-react';

interface WidgetProps {
  cpuUsage: number;
  ramUsage: number;
  diskUsage: number;
  timeString: string;
  dateString: string;
  onClose?: () => void;
}

export const Widget: React.FC<WidgetProps> = ({
  cpuUsage,
  ramUsage,
  diskUsage,
  timeString,
  dateString,
  onClose,
}) => {
  return (
    <div className="absolute right-6 top-5 w-[220px] bg-white/70 hover:bg-white/80 backdrop-blur-xl border border-white/60 shadow-xl rounded-[22px] p-4 flex flex-col justify-between select-none z-10 transition-all group">
      {/* Time & Date Header with optional close */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[28px] font-bold text-slate-800 tracking-tight leading-none font-mono">
            {timeString}
          </div>
          <div className="text-xs font-medium text-slate-600 mt-1">
            {dateString}
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-black/5"
            title="Hide Widget"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Metrics Rows */}
      <div className="space-y-3 pt-3">
        {/* CPU */}
        <div>
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 mb-1">
            <div className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-blue-600" />
              <span>CPU</span>
            </div>
            <span className="font-mono text-slate-600 tabular-nums">{cpuUsage}%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-200/80 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${cpuUsage}%` }}
            />
          </div>
        </div>

        {/* RAM */}
        <div>
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 mb-1">
            <div className="flex items-center gap-1.5">
              <MemoryStick className="w-3.5 h-3.5 text-indigo-600" />
              <span>RAM</span>
            </div>
            <span className="font-mono text-slate-600 tabular-nums">{ramUsage}%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-200/80 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${ramUsage}%` }}
            />
          </div>
        </div>

        {/* Disk */}
        <div>
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 mb-1">
            <div className="flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-sky-600" />
              <span>Disk</span>
            </div>
            <span className="font-mono text-slate-600 tabular-nums">{diskUsage}%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-200/80 rounded-full overflow-hidden">
            <div
              className="h-full bg-sky-500 rounded-full transition-all duration-500"
              style={{ width: `${diskUsage}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
