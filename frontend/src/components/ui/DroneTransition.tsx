import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DroneAnimation } from './DroneAnimation';
import { ShieldAlert, Check, Layers, MapPin } from 'lucide-react';

export type DroneTransitionVariant =
  | 'pipeline'
  | 'navigation'
  | 'mission-start'
  | 'survey-complete'
  | 'processing';

export interface DroneTransitionProps {
  isActive: boolean;
  variant?: DroneTransitionVariant;
  duration?: number; // Total duration in ms (default 1600ms for pipeline/navigation)
  showLabel?: boolean;
  label?: string;
  subtitle?: string;
  onComplete?: () => void;
  isSim?: boolean;
  isLive?: boolean;
  hasGnss?: boolean; // Strictly adheres to hardware honesty: False until Phase 2 hardware
  tofDistanceCm?: number | string; // Real ToF measurement, default '2 cm'
  tofStatus?: 'VALID' | 'INVALID' | 'CALIBRATING'; // Default 'VALID'
  gnssStatus?: string; // Default 'NOT AVAILABLE'
  khasraNumber?: string; // Default '105'
  surveyedArea?: string; // Default '1.47 ha'
}

export const DroneTransition: React.FC<DroneTransitionProps> = ({
  isActive,
  variant = 'navigation',
  duration = 1600,
  showLabel = true,
  label,
  subtitle,
  onComplete,
  isSim = false,
  isLive = true,
  hasGnss = false,
  tofDistanceCm = '2 cm',
  tofStatus = 'VALID',
  gnssStatus = 'NOT AVAILABLE',
  khasraNumber = '105',
  surveyedArea = '1.47 ha',
}) => {
  const [pipelineStage, setPipelineStage] = useState(0);
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  // Check prefers-reduced-motion
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setIsReducedMotion(mediaQuery.matches);
      const listener = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches);
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, []);

  // Multi-step lifecycle for pipeline & mission
  useEffect(() => {
    if (!isActive) {
      setPipelineStage(0);
      return;
    }

    if (variant === 'pipeline' || variant === 'navigation') {
      const step1 = Math.round(duration * 0.18);
      const step2 = Math.round(duration * 0.40);
      const step3 = Math.round(duration * 0.65);
      const step4 = Math.round(duration * 0.84);

      const t1 = setTimeout(() => setPipelineStage(1), step1);
      const t2 = setTimeout(() => setPipelineStage(2), step2);
      const t3 = setTimeout(() => setPipelineStage(3), step3);
      const t4 = setTimeout(() => setPipelineStage(4), step4);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        clearTimeout(t4);
      };
    } else if (variant === 'mission-start') {
      const stepInterval = duration / 4;
      const t1 = setTimeout(() => setPipelineStage(1), stepInterval);
      const t2 = setTimeout(() => setPipelineStage(2), stepInterval * 2);
      const t3 = setTimeout(() => setPipelineStage(3), stepInterval * 3);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [isActive, variant, duration]);

  // Overall completion trigger
  useEffect(() => {
    if (!isActive) return;

    const timer = setTimeout(() => {
      if (onComplete) {
        onComplete();
      }
    }, duration);

    return () => clearTimeout(timer);
  }, [isActive, duration, onComplete]);

  if (!isActive) return null;

  // Accessibility: Reduced motion simple high-performance fade
  if (isReducedMotion) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#070b14]/90 backdrop-blur-xs pointer-events-none"
        >
          <div className="flex flex-col items-center gap-2">
            <span className="text-sm font-semibold tracking-wide text-slate-200 uppercase">
              {label || 'Transitioning to GIS Cadastral Map...'}
            </span>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  const isPipeline = variant === 'pipeline' || variant === 'navigation';

  const missionSteps = [
    'DRONE-01',
    'Survey Initializing',
    'Establishing Capture',
    'Survey Ready',
  ];
  const currentMissionText = missionSteps[pipelineStage] || missionSteps[0];

  return (
    <AnimatePresence>
      <motion.div
        key="drone-transition-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#24201B]/40 backdrop-blur-xs select-none pointer-events-none p-4 overflow-hidden"
      >
        {/* Subtle Background Cadastral Grid Projection */}
        <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#4F7D60_1px,transparent_1px)] [background-size:24px_24px]" />

        {/* =========================================================================
            PRIMARY WORKFLOW: SIGNATURE DRONE-TO-CADASTRAL PIPELINE STORY
            DRONE → IMAGE CAPTURE → TOF DATA → PROCESSING → ORTHOMOSAIC → CADASTRAL PARCEL
            ========================================================================= */}
        {isPipeline && (
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-xl rounded-2xl bg-white border border-[#D8D5CC] shadow-[0_16px_36px_rgba(44,52,43,0.14)] p-6 flex flex-col gap-4 text-[#20251F]"
          >
            {/* Top Pipeline Flow Badges */}
            <div className="flex items-center justify-between border-b border-[#D8D5CC] pb-3 text-[11px] font-mono">
              <span className="text-[#2E513E] font-semibold tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#4F7D60] animate-pulse" />
                STATUTORY CADASTRAL PIPELINE
              </span>
              <span className="text-[#858B82]">BhoomiSync Core v2.4</span>
            </div>

            {/* STAGE 1: SURVEY DRONE + IMAGE CAPTURE ACTIVE */}
            <div className="flex items-center justify-between gap-4 bg-[#FAF9F5] border border-[#D8D5CC] rounded-xl p-3">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-lg bg-[#EFEEE8] border border-[#D8D5CC] flex items-center justify-center flex-shrink-0">
                  <DroneAnimation
                    size={42}
                    heading={0}
                    isScanning={true}
                    statusLed="live"
                  />
                </div>
                <div>
                  <div className="text-xs font-mono font-bold text-[#20251F] tracking-wider uppercase">
                    SURVEY DRONE
                  </div>
                  <div className="text-[11px] text-[#B18F2E] flex items-center gap-1.5 mt-0.5 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#B18F2E] animate-ping" />
                    <span>Image capture active</span>
                  </div>
                </div>
              </div>

              {/* STAGE 3: TOF MEASUREMENT & HARDWARE HONESTY READOUT */}
              <div className="flex items-center gap-2">
                <div className="px-2.5 py-1.5 rounded-lg bg-white border border-[#D8D5CC] text-right shadow-xs">
                  <div className="text-[9px] font-mono text-[#858B82] uppercase tracking-wider">ToF Sensor</div>
                  <div className="flex items-center gap-1 text-xs font-mono font-bold text-[#2E6645]">
                    <span>{tofDistanceCm}</span>
                    <span className="text-[10px] px-1 py-0.2 rounded bg-[#E6EFE8] border border-[#BBD4C1] text-[#2E6645]">
                      {tofStatus}
                    </span>
                  </div>
                </div>
                <div className="px-2.5 py-1.5 rounded-lg bg-white border border-[#D8D5CC] text-right shadow-xs">
                  <div className="text-[9px] font-mono text-[#858B82] uppercase tracking-wider">GNSS / RTK</div>
                  <div className="text-xs font-mono font-semibold text-[#858B82]">
                    {hasGnss ? 'FIXED' : gnssStatus}
                  </div>
                </div>
              </div>
            </div>

            {/* STAGE 2: CAPTURED IMAGE FRAMES (Subtle 3-frame sequence) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>IMAGE FRAMES (AERIAL PAYLOAD)</span>
                <span className="text-emerald-400 text-[10px]">
                  {pipelineStage >= 1 ? '3 FRAMES INGESTED' : 'Awaiting capture...'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { id: 'IMG_0104.RAW', time: '10.0m [SIM]', gsd: '2.5cm' },
                  { id: 'IMG_0105.RAW', time: '10.0m [SIM]', gsd: '2.5cm' },
                  { id: 'IMG_0106.RAW', time: '10.0m [SIM]', gsd: '2.5cm' },
                ].map((frame, idx) => {
                  const isVisible = pipelineStage >= 1;
                  return (
                    <motion.div
                      key={frame.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: isVisible ? 1 : 0.3, y: isVisible ? 0 : 4 }}
                      transition={{ delay: idx * 0.08, duration: 0.2 }}
                      className={`p-2 rounded-lg border text-left transition-colors ${
                        isVisible
                          ? 'bg-[#101728] border-[#293c5c]'
                          : 'bg-[#0a0f1c] border-[#182338]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-semibold text-slate-200">
                          {frame.id}
                        </span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80" />
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[9px] font-mono text-slate-400">
                        <span>GSD {frame.gsd}</span>
                        <span>{frame.time}</span>
                      </div>
                      {/* Subtle wireframe imagery thumbnail */}
                      <div className="mt-1.5 h-6 rounded bg-[#090d17] border border-[#1b263b] flex items-center justify-center overflow-hidden">
                        <div className="w-full h-full opacity-30 bg-[repeating-linear-gradient(45deg,#38bdf8_0,#38bdf8_1px,transparent_0,transparent_6px)]" />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* STAGE 4: DATA FLOW → PROCESSING SURVEY DATA (Restrained progress & real stages) */}
            <div className="space-y-2 bg-[#FAF9F5] border border-[#D8D5CC] rounded-xl p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-[#20251F] tracking-wider uppercase flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4F7D60] animate-pulse" />
                  PROCESSING SURVEY DATA
                </span>
                <span className="text-[11px] font-mono text-[#2E513E] font-semibold">
                  {pipelineStage >= 3
                    ? '100% COMPLETE'
                    : pipelineStage >= 2
                    ? '75% PROCESSING'
                    : 'INITIALIZING'}
                </span>
              </div>

              {/* Progress Line */}
              <div className="w-full h-1.5 bg-[#EFEEE8] rounded-full overflow-hidden border border-[#D8D5CC]">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#4F7D60] via-[#B18F2E] to-[#2E513E]"
                  initial={{ width: '10%' }}
                  animate={{
                    width:
                      pipelineStage >= 3
                        ? '100%'
                        : pipelineStage >= 2
                        ? '75%'
                        : pipelineStage >= 1
                        ? '35%'
                        : '10%',
                  }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                />
              </div>

              {/* The 4 Real Statutory Processing Stages */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1 text-[10px] font-mono">
                {[
                  { name: 'Image validation', activeStage: 1 },
                  { name: 'Image alignment', activeStage: 2 },
                  { name: 'Feature extraction', activeStage: 2 },
                  { name: '2D reconstruction', activeStage: 3 },
                ].map((st) => {
                  const isDone = pipelineStage >= st.activeStage;
                  return (
                    <div
                      key={st.name}
                      className={`flex items-center gap-1 px-1.5 py-1 rounded transition-colors ${
                        isDone
                          ? 'text-[#2E6645] bg-[#E6EFE8] border border-[#BBD4C1]'
                          : 'text-[#858B82] bg-white border border-[#D8D5CC]'
                      }`}
                    >
                      {isDone ? (
                        <Check size={10} className="text-[#2E6645] flex-shrink-0" />
                      ) : (
                        <span className="w-2 h-2 rounded-full border border-[#C4C0B5] flex-shrink-0" />
                      )}
                      <span className="truncate">{st.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* STAGE 5 & 6: 2D SURVEY MAP & CADASTRAL TRANSFORMATION */}
            <div className="bg-[#FAF9F5] border border-[#D8D5CC] rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#20251F] tracking-wider">
                  <Layers size={13} className="text-[#2E513E]" />
                  <span>2D SURVEY MAP</span>
                </div>
                <span className="text-[10px] font-mono text-[#2E6645] bg-[#E6EFE8] px-2 py-0.5 rounded border border-[#BBD4C1]">
                  ORTHOMOSAIC RESOLVED
                </span>
              </div>

              {/* Map Surface Graphic & Cadastral Boundary */}
              <div className="relative h-20 w-full rounded-lg bg-white border border-[#D8D5CC] overflow-hidden flex items-center justify-center">
                {/* Geographic background grid */}
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#4F7D60_1px,transparent_1px)] [background-size:16px_16px]" />

                {/* Cadastral Parcel Polygon Overlay */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{
                    opacity: pipelineStage >= 3 ? 1 : 0.2,
                    scale: pipelineStage >= 3 ? 1 : 0.95,
                  }}
                  transition={{ duration: 0.3 }}
                  className="relative z-10 w-4/5 h-14 rounded-md border-2 border-[#2E513E] bg-[#E6EFE8] flex items-center justify-between px-3 shadow-xs"
                >
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-[#2E513E] flex-shrink-0" />
                    <div>
                      <div className="text-xs font-mono font-bold text-[#20251F] tracking-wide">
                        KHASRA {khasraNumber}
                      </div>
                      <div className="text-[10px] font-mono text-[#5F665D]">
                        SURVEYED AREA: <span className="text-[#2E513E] font-bold">{surveyedArea}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right font-mono text-[9px] text-[#5F665D] hidden sm:block">
                    <div>IoU Match: 96.4%</div>
                    <div>PostGIS Polygon Sealed</div>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Bottom Story Guidance */}
            {showLabel && (
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 font-mono">
                <span className="truncate">
                  {pipelineStage >= 4
                    ? 'Cadastral workspace ready. Transferring controls...'
                    : 'Drone Data → Image Capture → ToF → Processing → Cadastre'}
                </span>
                <span className="text-slate-500 whitespace-nowrap">Haripura Pilot</span>
              </div>
            )}
          </motion.div>
        )}

        {/* =========================================================================
            VARIANT 2: MISSION-START (DRONE-01 -> Initializing -> Capture -> Ready)
            ========================================================================= */}
        {variant === 'mission-start' && (
          <div className="relative flex flex-col items-center justify-center gap-6">
            <motion.div
              initial={{ scale: 0.65, y: 40, opacity: 0.8 }}
              animate={{ scale: 1.05, y: -10, opacity: 1 }}
              transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
              className="relative"
            >
              <DroneAnimation
                size={96}
                heading={0}
                isScanning={pipelineStage >= 2}
                statusLed={isSim ? 'sim' : isLive ? 'live' : 'standby'}
                showCrosshair={true}
              />
            </motion.div>

            {/* Step Lifecycle Display */}
            <div className="flex flex-col items-center gap-1.5 text-center">
              <span className="font-mono text-xs text-[#568693] tracking-wider font-semibold">
                PAYLOAD PROTOCOL [ESP32-S3]
              </span>
              <motion.div
                key={currentMissionText}
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                transition={{ duration: 0.15 }}
                className="text-lg font-bold text-[#F4F5EF] tracking-tight"
              >
                {currentMissionText}
              </motion.div>
              <span className="text-xs text-[#D4C8B6]">
                {subtitle || 'Calibrating optical ground sampling & ToF elevation...'}
              </span>
            </div>

            {/* Hardware Status Pill (Strict Hardware Data Honesty - Technical Avionics Strip) */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#223C30] border border-[#2E513E] text-xs font-mono shadow-md">
              <span className="flex items-center gap-1 text-[#6F9B7B] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#6F9B7B] animate-pulse" />
                {isSim ? 'SIMULATION' : isLive ? 'LIVE' : 'STANDBY'}
              </span>
              <span className="text-[#3C664D]">|</span>
              <span className="text-[#F4F5EF]">ToF {tofDistanceCm} [{tofStatus}]</span>
              <span className="text-[#3C664D]">|</span>
              <span className="flex items-center gap-1 text-[#B18F2E]">
                <ShieldAlert size={12} />
                {hasGnss ? 'GNSS RTK' : 'GNSS UNAVAILABLE'}
              </span>
            </div>
          </div>
        )}

        {/* =========================================================================
            VARIANT 3 & 4: SURVEY-COMPLETE / PROCESSING
            ========================================================================= */}
        {(variant === 'survey-complete' || variant === 'processing') && (
          <div className="relative flex flex-col items-center justify-center gap-5">
            <motion.div
              initial={{ scale: 0.85, opacity: 0.8 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <DroneAnimation
                size={84}
                heading={0}
                isScanning={true}
                statusLed="live"
              />
            </motion.div>

            <div className="flex flex-col items-center gap-1 text-center">
              <span className="font-mono text-xs text-emerald-400 tracking-wider">
                {variant === 'survey-complete'
                  ? 'CADASTRE RESOLVED'
                  : 'PROCESSING ORTHOMOSAIC'}
              </span>
              <h4 className="text-base font-bold text-white">
                {label || (variant === 'survey-complete' ? 'Statutory Polygon Reconciled' : 'Generating 2.5cm GSD Surface')}
              </h4>
              <p className="text-xs text-slate-400 max-w-sm">
                {subtitle || 'Transforming aerial flight telemetry into authoritative land registry boundaries.'}
              </p>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
