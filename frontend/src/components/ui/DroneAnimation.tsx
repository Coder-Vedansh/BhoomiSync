import React from 'react';

export interface DroneAnimationProps {
  size?: number;
  heading?: number;
  isScanning?: boolean;
  statusLed?: 'live' | 'sim' | 'standby' | 'alert';
  showRotors?: boolean;
  showCrosshair?: boolean;
  className?: string;
}

export const DroneAnimation: React.FC<DroneAnimationProps> = ({
  size = 80,
  heading = 0,
  isScanning = true,
  statusLed = 'live',
  showRotors = true,
  showCrosshair = false,
  className = '',
}) => {
  const ledColor =
    statusLed === 'live'
      ? '#10b981' // Emerald
      : statusLed === 'sim'
      ? '#ea580c' // Terracotta / Amber
      : statusLed === 'alert'
      ? '#f43f5e' // Rose
      : '#38bdf8'; // Sky Standby

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{
        width: size,
        height: size,
        transform: `rotate(${heading}deg)`,
        transition: 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      aria-label="Survey Quadcopter Technical Visualization"
    >
      <svg
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full overflow-visible drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)]"
      >
        <defs>
          {/* Optical sensor lens gradient */}
          <radialGradient id="sensorLensGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#0284c7" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#0c4a6e" stopOpacity="1" />
          </radialGradient>

          {/* Fuselage metallic carbon gradient */}
          <linearGradient id="carbonChassis" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="50%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>

          {/* Survey Ground Scanning Footprint */}
          <radialGradient id="scanBeamGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
            <stop offset="70%" stopColor="#10b981" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 1. OPTIONAL: Sensor Ground Footprint Projection (Scanning cone) */}
        {isScanning && (
          <g opacity="0.85">
            {/* Ground footprint polygon */}
            <polygon
              points="20,10 100,10 115,110 5,110"
              fill="url(#scanBeamGrad)"
              className="transition-opacity duration-300"
            />
            {/* Ground scan boundary line */}
            <polygon
              points="20,10 100,10 115,110 5,110"
              stroke="#10b981"
              strokeWidth="0.75"
              strokeDasharray="4 3"
              fill="none"
              opacity="0.4"
            />
            {/* Corner survey fiducials */}
            <path
              d="M16 10 H24 M20 6 V14 M96 10 H104 M100 6 V14 M1 110 H9 M5 106 V114 M111 110 H119 M115 106 V114"
              stroke="#10b981"
              strokeWidth="1"
              opacity="0.6"
            />
          </g>
        )}

        {/* 2. OPTIONAL: Cadastral Target Crosshairs */}
        {showCrosshair && (
          <g stroke="#64748b" strokeWidth="0.75" opacity="0.4">
            <line x1="60" y1="0" x2="60" y2="120" strokeDasharray="3 3" />
            <line x1="0" y1="60" x2="120" y2="60" strokeDasharray="3 3" />
            <circle cx="60" cy="60" r="44" strokeDasharray="2 4" />
          </g>
        )}

        {/* 3. QUADCOPTER CARBON FIBER ARMS */}
        <g stroke="#0f172a" strokeWidth="6" strokeLinecap="round">
          {/* Top-Left to Bottom-Right structural spar */}
          <line x1="26" y1="26" x2="94" y2="94" />
          {/* Top-Right to Bottom-Left structural spar */}
          <line x1="94" y1="26" x2="26" y2="94" />
        </g>
        <g stroke="#334155" strokeWidth="3" strokeLinecap="round">
          <line x1="26" y1="26" x2="94" y2="94" />
          <line x1="94" y1="26" x2="26" y2="94" />
        </g>

        {/* 4. MOTOR MOUNTING PODS (4 Corners) */}
        {/* Top-Left */}
        <circle cx="26" cy="26" r="7" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
        <circle cx="26" cy="26" r="3" fill="#64748b" />

        {/* Top-Right */}
        <circle cx="94" cy="26" r="7" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
        <circle cx="94" cy="26" r="3" fill="#64748b" />

        {/* Bottom-Left */}
        <circle cx="26" cy="94" r="7" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
        <circle cx="26" cy="94" r="3" fill="#64748b" />

        {/* Bottom-Right */}
        <circle cx="94" cy="94" r="7" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
        <circle cx="94" cy="94" r="3" fill="#64748b" />

        {/* 5. ROTORS / PROPELLERS WITH SMOOTH SPIN ANIMATION */}
        {showRotors && (
          <g>
            {/* Top-Left Rotor (CW) */}
            <circle
              cx="26"
              cy="26"
              r="17"
              fill="rgba(255, 255, 255, 0.04)"
              stroke="rgba(255, 255, 255, 0.22)"
              strokeWidth="0.8"
              strokeDasharray="4 3"
            />
            <g className="drone-rotor-cw" style={{ transformOrigin: '26px 26px' }}>
              <line x1="12" y1="26" x2="40" y2="26" stroke="#f8fafc" strokeWidth="1.5" opacity="0.85" strokeLinecap="round" />
            </g>

            {/* Top-Right Rotor (CCW) */}
            <circle
              cx="94"
              cy="26"
              r="17"
              fill="rgba(255, 255, 255, 0.04)"
              stroke="rgba(255, 255, 255, 0.22)"
              strokeWidth="0.8"
              strokeDasharray="4 3"
            />
            <g className="drone-rotor-ccw" style={{ transformOrigin: '94px 26px' }}>
              <line x1="80" y1="26" x2="108" y2="26" stroke="#f8fafc" strokeWidth="1.5" opacity="0.85" strokeLinecap="round" />
            </g>

            {/* Bottom-Left Rotor (CCW) */}
            <circle
              cx="26"
              cy="94"
              r="17"
              fill="rgba(255, 255, 255, 0.04)"
              stroke="rgba(255, 255, 255, 0.22)"
              strokeWidth="0.8"
              strokeDasharray="4 3"
            />
            <g className="drone-rotor-ccw" style={{ transformOrigin: '26px 94px' }}>
              <line x1="12" y1="94" x2="40" y2="94" stroke="#f8fafc" strokeWidth="1.5" opacity="0.85" strokeLinecap="round" />
            </g>

            {/* Bottom-Right Rotor (CW) */}
            <circle
              cx="94"
              cy="94"
              r="17"
              fill="rgba(255, 255, 255, 0.04)"
              stroke="rgba(255, 255, 255, 0.22)"
              strokeWidth="0.8"
              strokeDasharray="4 3"
            />
            <g className="drone-rotor-cw" style={{ transformOrigin: '94px 94px' }}>
              <line x1="80" y1="94" x2="108" y2="94" stroke="#f8fafc" strokeWidth="1.5" opacity="0.85" strokeLinecap="round" />
            </g>
          </g>
        )}

        {/* 6. CENTRAL FUSELAGE / AVIONICS CORE */}
        <g>
          {/* Main geometric chassis polygon */}
          <polygon
            points="50,40 70,40 76,52 76,68 70,80 50,80 44,68 44,52"
            fill="url(#carbonChassis)"
            stroke="#475569"
            strokeWidth="1.5"
          />

          {/* Internal bevel lines */}
          <polyline
            points="50,40 60,48 70,40"
            stroke="#334155"
            strokeWidth="1"
            fill="none"
          />
          <polyline
            points="50,80 60,72 70,80"
            stroke="#334155"
            strokeWidth="1"
            fill="none"
          />
          <line x1="60" y1="48" x2="60" y2="72" stroke="#334155" strokeWidth="1" />

          {/* Forward Heading Vector Notch */}
          <polygon points="60,33 63,38 57,38" fill="#f8fafc" opacity="0.9" />

          {/* Optical Camera / Sensor Gimbal Pod (Front) */}
          <circle cx="60" cy="46" r="6.5" fill="#0f172a" stroke="#38bdf8" strokeWidth="1" />
          <circle cx="60" cy="46" r="4.5" fill="url(#sensorLensGrad)" />
          <circle cx="58.5" cy="44.5" r="1.2" fill="#ffffff" opacity="0.75" />

          {/* Rear Telemetry / Hardware Status LED (Terracotta or Status Color) */}
          <circle
            cx="60"
            cy="74"
            r="2.5"
            fill={ledColor}
            className="drone-beacon-pulse"
          />
          <circle
            cx="60"
            cy="74"
            r="4.5"
            stroke={ledColor}
            strokeWidth="0.75"
            opacity="0.5"
          />

          {/* Precision Flight Calibration Index */}
          <line x1="47" y1="60" x2="51" y2="60" stroke="#64748b" strokeWidth="1" />
          <line x1="69" y1="60" x2="73" y2="60" stroke="#64748b" strokeWidth="1" />
        </g>
      </svg>
    </div>
  );
};
