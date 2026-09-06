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
    <div className={`bg-white border border-[#D8D5CC] rounded-[var(--radius-lg)] p-4 shadow-sm ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="text-sm font-bold text-[#20251F] flex items-center gap-2">
            <span>11-Stage Cloud Processing Pipeline</span>
            <span className="text-[11px] font-mono text-[#2E6645] bg-[#E6EFE8] px-2 py-0.5 rounded border border-[#BBD4C1]">
              {completedCount} / {stages.length} Completed
            </span>
          </h4>
          <p className="text-xs text-[#5F665D] mt-0.5">
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
                  ? 'bg-[#E8F1F3] border-[#BDD7DE] shadow-xs'
                  : isCompleted
                  ? 'bg-[#F1F6F2] border-[#BBD4C1]'
                  : isFailed
                  ? 'bg-[#FAF2EE] border-[#E6C0B1]'
                  : 'bg-[#FAF9F5] border-[#D8D5CC]'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1.5">
                <div className="flex items-center gap-1.5 font-semibold">
                  {isCompleted ? (
                    <CheckCircle2 size={13} className="text-[#2E6645] flex-shrink-0" />
                  ) : isRunning ? (
                    <Loader2 size={13} className="text-[#385963] animate-spin flex-shrink-0" />
                  ) : isFailed ? (
                    <AlertCircle size={13} className="text-[#914B38] flex-shrink-0" />
                  ) : (
                    <Clock size={13} className="text-[#5F665D] flex-shrink-0" />
                  )}
                  <span className="text-[#20251F] truncate">
                    {stage.stage_number}. {stage.stage_name}
                  </span>
                </div>
                <span
                  className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                    isCompleted
                      ? 'bg-[#DCEADF] text-[#2E513E]'
                      : isRunning
                      ? 'bg-[#DCEAED] text-[#385963] animate-pulse'
                      : isFailed
                      ? 'bg-[#F2DDD3] text-[#914B38]'
                      : 'bg-[#EFEEE8] text-[#5F665D]'
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
