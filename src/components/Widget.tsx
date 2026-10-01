import React from 'react';
import { Cpu, HardDrive, MemoryStick } from 'lucide-react';

interface WidgetProps {
  cpuUsage: number;
  ramUsage: number;
  diskUsage: number;
  timeString: string;
  dateString: string;
}

export const Widget: React.FC<WidgetProps> = ({
  cpuUsage,
  ramUsage,
  diskUsage,
  timeString,
  dateString
}) => {
  return (
    <div
      style={{
        left: '1297px',
        top: '62px',
        width: '222px',
        height: '269px'
      }}
      className="absolute bg-white/75 backdrop-blur-xl border border-white/60 shadow-xl rounded-[20px] p-5 flex flex-col justify-between select-none z-10 transition-all hover:bg-white/80"
    >
      {/* Time & Date Header */}
      <div>
        <div className="text-[32px] font-bold text-slate-800 tracking-tight leading-none">
          {timeString}
        </div>
        <div className="text-[14px] font-medium text-slate-600 mt-1.5">
          {dateString}
        </div>
      </div>

      {/* Resource Metrics Rows */}
      <div className="space-y-4 pt-1">
        {/* CPU Row */}
        <div>
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
            <div className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-blue-600" />
              <span>CPU</span>
            </div>
            <span className="font-mono text-slate-600 tabular-nums">{cpuUsage}%</span>
          </div>
          <div className="h-2 w-full bg-slate-200/80 rounded-full overflow-hidden p-0.5">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${cpuUsage}%` }}
            />
          </div>
        </div>

        {/* RAM Row */}
        <div>
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
            <div className="flex items-center gap-1.5">
              <MemoryStick className="w-3.5 h-3.5 text-blue-600" />
              <span>RAM</span>
            </div>
            <span className="font-mono text-slate-600 tabular-nums">{ramUsage}%</span>
          </div>
          <div className="h-2 w-full bg-slate-200/80 rounded-full overflow-hidden p-0.5">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${ramUsage}%` }}
            />
          </div>
        </div>

        {/* Disk Row */}
        <div>
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
            <div className="flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-blue-600" />
              <span>Disk</span>
            </div>
            <span className="font-mono text-slate-600 tabular-nums">{diskUsage}%</span>
          </div>
          <div className="h-2 w-full bg-slate-200/80 rounded-full overflow-hidden p-0.5">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${diskUsage}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
