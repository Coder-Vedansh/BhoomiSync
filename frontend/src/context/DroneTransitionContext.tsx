import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { DroneTransition, DroneTransitionVariant } from '../components/ui/DroneTransition';

export interface TriggerTransitionOptions {
  targetTab?: string;
  variant?: DroneTransitionVariant;
  duration?: number;
  label?: string;
  subtitle?: string;
  isSim?: boolean;
  isLive?: boolean;
  hasGnss?: boolean;
  tofDistanceCm?: number | string;
  tofStatus?: 'VALID' | 'INVALID' | 'CALIBRATING';
  gnssStatus?: string;
  khasraNumber?: string;
  surveyedArea?: string;
  onComplete?: () => void;
}

interface DroneTransitionContextType {
  triggerDroneTransition: (options: TriggerTransitionOptions) => void;
  isTransitioning: boolean;
}

const DroneTransitionContext = createContext<DroneTransitionContextType | undefined>(undefined);

interface DroneTransitionProviderProps {
  children: ReactNode;
  onNavigateTab?: (tab: string) => void;
}

export const DroneTransitionProvider: React.FC<DroneTransitionProviderProps> = ({
  children,
  onNavigateTab,
}) => {
  const [isActive, setIsActive] = useState(false);
  const [options, setOptions] = useState<TriggerTransitionOptions>({
    variant: 'navigation',
    duration: 1600,
  });

  const triggerDroneTransition = useCallback(
    (opts: TriggerTransitionOptions) => {
      const isPipeline = opts.variant === 'pipeline' || opts.variant === 'navigation';
      const defaultDuration = isPipeline ? 1600 : 950;
      const dur = opts.duration || defaultDuration;

      setOptions({
        variant: opts.variant || 'navigation',
        duration: dur,
        label: opts.label,
        subtitle: opts.subtitle,
        isSim: opts.isSim ?? false,
        isLive: opts.isLive ?? true,
        hasGnss: opts.hasGnss ?? false,
        tofDistanceCm: opts.tofDistanceCm ?? '2 cm',
        tofStatus: opts.tofStatus ?? 'VALID',
        gnssStatus: opts.gnssStatus ?? 'NOT AVAILABLE',
        khasraNumber: opts.khasraNumber ?? '105',
        surveyedArea: opts.surveyedArea ?? '1.47 ha',
      });
      setIsActive(true);

      // Perform workspace route switch midway through transition (at 65% mark)
      // so the new map / workbench is mounted and rendered before overlay dissolves
      const switchDelay = Math.round(dur * 0.65);
      const switchTimer = setTimeout(() => {
        if (opts.targetTab && onNavigateTab) {
          onNavigateTab(opts.targetTab);
        }
      }, switchDelay);

      // Transition complete cleanup
      const endTimer = setTimeout(() => {
        setIsActive(false);
        if (opts.onComplete) {
          opts.onComplete();
        }
      }, dur);

      return () => {
        clearTimeout(switchTimer);
        clearTimeout(endTimer);
      };
    },
    [onNavigateTab]
  );

  return (
    <DroneTransitionContext.Provider
      value={{
        triggerDroneTransition,
        isTransitioning: isActive,
      }}
    >
      {children}
      <DroneTransition
        isActive={isActive}
        variant={options.variant}
        duration={options.duration}
        label={options.label}
        subtitle={options.subtitle}
        isSim={options.isSim}
        isLive={options.isLive}
        hasGnss={options.hasGnss}
        tofDistanceCm={options.tofDistanceCm}
        tofStatus={options.tofStatus}
        gnssStatus={options.gnssStatus}
        khasraNumber={options.khasraNumber}
        surveyedArea={options.surveyedArea}
      />
    </DroneTransitionContext.Provider>
  );
};

export const useDroneTransition = (): DroneTransitionContextType => {
  const context = useContext(DroneTransitionContext);
  if (!context) {
    throw new Error('useDroneTransition must be used within a DroneTransitionProvider');
  }
  return context;
};
