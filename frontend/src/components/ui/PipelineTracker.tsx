import React from 'react';
import { CheckCircle2, Clock, Loader2, AlertCircle } from 'lucide-react';
import { ProgressBar } from './ProgressBar';

export interface StageInfo {
  stage_number: number;
  stage_name: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  progress: number;
  message?: string;
  output_asset_type?: string;
}

export interface PipelineTrackerProps {
  stages: StageInfo[];
  currentStage?: number;
  overallProgress?: number;
  className?: string;
}

export const PipelineTracker: React.FC<PipelineTrackerProps> = ({
  stages,
  overallProgress,
  className = '',
}) => {
  const completedCount = stages.filter((s) => s.status === 'COMPLETED').length;
  const computedProgress = overallProgress ?? (stages.length > 0 ? (completedCount / stages.length) * 100 : 0);

  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <span>11-Stage Cloud Processing Pipeline</span>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              {completedCount} / {stages.length} Completed
            </span>
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Photogrammetry, LiDAR, AI classification, boundary extraction, and cadastral report generation.
          </p>
        </div>
        <div className="w-36 text-right">
          <ProgressBar progress={computedProgress} height="sm" variant="emerald" showLabel />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 mt-3">
        {stages.map((stage) => {
          const isCompleted = stage.status === 'COMPLETED';
          const isRunning = stage.status === 'RUNNING';
          const isFailed = stage.status === 'FAILED';

          return (
            <div
              key={stage.stage_number}
              className={`p-2.5 rounded-lg border transition-all ${
                isRunning
                  ? 'bg-cyan-500/10 border-cyan-500/40 shadow-sm'
                  : isCompleted
                  ? 'bg-emerald-500/5 border-emerald-500/20'
                  : isFailed
                  ? 'bg-rose-500/10 border-rose-500/30'
                  : 'bg-slate-950/40 border-slate-800/80 opacity-70'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1.5">
                <div className="flex items-center gap-1.5 font-semibold">
                  {isCompleted ? (
                    <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" />
                  ) : isRunning ? (
                    <Loader2 size={13} className="text-cyan-400 animate-spin flex-shrink-0" />
                  ) : isFailed ? (
                    <AlertCircle size={13} className="text-rose-400 flex-shrink-0" />
                  ) : (
                    <Clock size={13} className="text-slate-500 flex-shrink-0" />
                  )}
                  <span className="text-slate-200 truncate">
                    {stage.stage_number}. {stage.stage_name}
                  </span>
                </div>
                <span
                  className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                    isCompleted
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : isRunning
                      ? 'bg-cyan-500/20 text-cyan-300 animate-pulse'
                      : isFailed
                      ? 'bg-rose-500/20 text-rose-300'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {stage.status}
                </span>
              </div>
              <ProgressBar
                progress={stage.progress}
                height="sm"
                variant={isFailed ? 'rose' : isRunning ? 'cyan' : 'emerald'}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
