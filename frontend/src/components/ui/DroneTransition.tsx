import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DroneAnimation } from './DroneAnimation';
import { Radio, ShieldAlert } from 'lucide-react';

export type DroneTransitionVariant =
  | 'navigation'
  | 'mission-start'
  | 'survey-complete'
  | 'processing';

export interface DroneTransitionProps {
  isActive: boolean;
  variant?: DroneTransitionVariant;
  duration?: number; // Total duration in ms (default 850ms)
  showLabel?: boolean;
  label?: string;
  subtitle?: string;
  onComplete?: () => void;
  isSim?: boolean;
  isLive?: boolean;
  hasGnss?: boolean;
}

export const DroneTransition: React.FC<DroneTransitionProps> = ({
  isActive,
  variant = 'navigation',
  duration = 850,
  showLabel = true,
  label,
  subtitle,
  onComplete,
  isSim = false,
  isLive = true,
  hasGnss = false, // Strictly adheres to hardware honesty: False until Phase 2 hardware
}) => {
  const [missionStepIndex, setMissionStepIndex] = useState(0);
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

  // Multi-step lifecycle for "mission-start"
  useEffect(() => {
    if (!isActive) {
      setMissionStepIndex(0);
      return;
    }

    if (variant === 'mission-start') {
      const stepInterval = duration / 4;
      const t1 = setTimeout(() => setMissionStepIndex(1), stepInterval);
      const t2 = setTimeout(() => setMissionStepIndex(2), stepInterval * 2);
      const t3 = setTimeout(() => setMissionStepIndex(3), stepInterval * 3);
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

  // Reduced motion: simple high-performance fade
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
              {label || 'Transitioning Workspace...'}
            </span>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  const missionSteps = [
    'DRONE-01',
    'Survey Initializing',
    'Establishing Capture',
    'Survey Ready',
  ];

  const currentMissionText = missionSteps[missionStepIndex] || missionSteps[0];

  return (
    <AnimatePresence>
      <motion.div
        key="drone-transition-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#070b14]/85 backdrop-blur-xs select-none pointer-events-none overflow-hidden"
      >
        {/* Subtle Background Cadastral Grid Projection */}
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px]" />

        {/* =========================================================================
            VARIANT 1: NAVIGATION (Flight Path -> Cadastral Boundary -> Map)
            ========================================================================= */}
        {variant === 'navigation' && (
          <div className="relative w-full max-w-lg h-64 flex items-center justify-center">
            {/* SVG Flight Path evolving into Cadastral Boundary */}
            <svg
              className="absolute inset-0 w-full h-full overflow-visible"
              viewBox="0 0 500 240"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Step A: Dotted Flight Path */}
              <motion.path
                d="M 50 140 C 150 90, 220 160, 320 100 L 420 110"
                stroke="#38bdf8"
                strokeWidth="1.75"
                strokeDasharray="6 4"
                initial={{ pathLength: 0, opacity: 0.3 }}
                animate={{ pathLength: 1, opacity: 0.85 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />

              {/* Waypoint nodes */}
              <motion.circle
                cx="50"
                cy="140"
                r="3.5"
                fill="#38bdf8"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.05 }}
              />
              <motion.circle
                cx="200"
                cy="130"
                r="3.5"
                fill="#38bdf8"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.25 }}
              />
              <motion.circle
                cx="320"
                cy="100"
                r="3.5"
                fill="#10b981"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.45 }}
              />

              {/* Step B: Morphing into Cadastral Boundary Polygon */}
              <motion.polygon
                points="240,70 380,50 410,140 260,160"
                stroke="#10b981"
                strokeWidth="2"
                strokeDasharray="4 2"
                fill="rgba(16, 185, 129, 0.09)"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.42, duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              />

              {/* Cadastral Parcel Label */}
              <motion.text
                x="330"
                y="110"
                fill="#10b981"
                fontSize="10"
                fontFamily="monospace"
                textAnchor="middle"
                fontWeight="600"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                KHASRA #102 [0.82 HA]
              </motion.text>
            </svg>

            {/* The Traversing Survey Drone */}
            <motion.div
              className="absolute"
              initial={{ x: -180, y: 30, scale: 0.85 }}
              animate={{ x: 140, y: -20, scale: 0.95 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <DroneAnimation
                size={76}
                heading={24}
                isScanning={true}
                statusLed="live"
              />
            </motion.div>
          </div>
        )}

        {/* =========================================================================
            VARIANT 2: MISSION-START (DRONE-01 -> Initializing -> Capture -> Ready)
            ========================================================================= */}
        {variant === 'mission-start' && (
          <div className="relative flex flex-col items-center justify-center gap-6">
            {/* Drone Launching and Ascending to 10.0m Ceiling */}
            <motion.div
              initial={{ scale: 0.65, y: 40, opacity: 0.8 }}
              animate={{ scale: 1.05, y: -10, opacity: 1 }}
              transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
              className="relative"
            >
              <DroneAnimation
                size={96}
                heading={0}
                isScanning={missionStepIndex >= 2}
                statusLed={isSim ? 'sim' : isLive ? 'live' : 'standby'}
                showCrosshair={true}
              />
            </motion.div>

            {/* Step Lifecycle Display */}
            <div className="flex flex-col items-center gap-1.5 text-center">
              <span className="font-mono text-xs text-sky-400 tracking-wider">
                PAYLOAD PROTOCOL [ESP32-S3]
              </span>
              <motion.div
                key={currentMissionText}
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                transition={{ duration: 0.15 }}
                className="text-lg font-bold text-white tracking-tight"
              >
                {currentMissionText}
              </motion.div>
              <span className="text-xs text-slate-400">
                {subtitle || 'Calibrating optical ground sampling & ToF elevation...'}
              </span>
            </div>

            {/* Hardware Status Pill (Strict Hardware Data Honesty) */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#131b2e] border border-[#22334d] text-xs font-mono">
              <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {isSim ? 'SIMULATION' : isLive ? 'LIVE' : 'STANDBY'}
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">ToF 2.0 cm [VALID]</span>
              <span className="text-slate-600">|</span>
              <span className="flex items-center gap-1 text-amber-400">
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

        {/* Bottom Status / Guidance Label */}
        {showLabel && variant === 'navigation' && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.25 }}
            className="mt-4 flex flex-col items-center gap-1"
          >
            <div className="flex items-center gap-2">
              <Radio size={14} className="text-sky-400 animate-pulse" />
              <span className="text-xs font-mono uppercase tracking-wider text-slate-200">
                {label || 'Drone Data → Cadastral Map'}
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              {subtitle || 'Synchronizing aerial vector with PostGIS parcel boundary'}
            </span>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
