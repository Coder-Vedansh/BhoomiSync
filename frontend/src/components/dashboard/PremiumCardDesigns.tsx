import React from 'react';
import {
  Layers,
  TrendingUp,
  ArrowRight,
  Leaf,
  Radio,
  Cpu,
  Database,
  FileText,
} from 'lucide-react';

interface PremiumCardDesignsProps {
  totalParcels?: number;
  totalHectares?: number;
  activeMissionsCount?: number;
  totalMissionsCount?: number;
  storageUsed?: string;
  storagePercent?: number;
  storageSubtitle?: string;
  storageLive?: boolean;
  storageObjectsCount?: number;
  reportsCount?: number;
  approvedReportsCount?: number;
  reviewReportsCount?: number;
  aiAccuracy?: number;
  onNavigate?: (tab: string, id?: string) => void;
}

export const PremiumCardDesigns: React.FC<PremiumCardDesignsProps> = ({
  totalParcels = 20,
  totalHectares = 125.4,
  activeMissionsCount = 0,
  totalMissionsCount = 2,
  storageUsed = '627.6 KB',
  storagePercent = 12,
  storageSubtitle,
  storageLive = true,
  storageObjectsCount = 79,
  reportsCount = 3,
  approvedReportsCount = 1,
  reviewReportsCount = 2,
  aiAccuracy = 92.7,
  onNavigate,
}) => {
  return (
    <div className="space-y-5">
      {/* SECTION 5: PREMIUM CARD DESIGNS (WITH ANIMATED BACKGROUNDS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {/* ===================================================================
            CARD 1: Total Parcels (Light with Animated Contour Lines)
            =================================================================== */}
        <div
          onClick={() => onNavigate?.('land-registry')}
          className="group relative overflow-hidden bg-white border border-[#D8D5CC] hover:border-[#BBD4C1] rounded-[var(--radius-xl)] p-5 shadow-[0_4px_20px_rgba(44,52,43,0.06)] hover:shadow-[0_8px_30px_rgba(44,52,43,0.12)] transition-all duration-300 flex flex-col justify-between min-h-[170px] cursor-pointer"
        >
          {/* Animated Contour Lines Background */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
            <svg
              className="w-[140%] h-[140%] -top-[20%] -left-[20%] absolute card-contour-flow"
              viewBox="0 0 500 300"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M-40,80 C80,20 180,140 320,60 C440,-10 520,90 600,40"
                stroke="#2E513E"
                strokeWidth="1.2"
                strokeDasharray="4 4"
                opacity="0.5"
              />
              <path
                d="M-30,140 C100,70 210,190 350,110 C480,40 540,150 620,100"
                stroke="#4F7D60"
                strokeWidth="1.5"
                opacity="0.6"
              />
              <path
                d="M-20,200 C110,130 230,240 370,160 C500,90 560,200 640,150"
                stroke="#6F9B7B"
                strokeWidth="1"
                strokeDasharray="6 3"
                opacity="0.5"
              />
              <path
                d="M-10,250 C120,180 250,290 390,210 C510,140 580,240 660,190"
                stroke="#BBD4C1"
                strokeWidth="0.8"
                opacity="0.4"
              />
            </svg>
          </div>

          {/* Top Row: Icon */}
          <div className="relative z-10 flex items-start justify-between">
            <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[#E6EFE8] text-[#2E513E] border border-[#BBD4C1] flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
              <Layers size={18} />
            </div>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#E6EFE8] text-[#2E6645] border border-[#BBD4C1]">
              PostGIS Cadastre
            </span>
          </div>

          {/* Middle: Label & Big Value */}
          <div className="relative z-10 my-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#5F665D]">
              Total Parcels
            </div>
            <div className="text-3xl font-extrabold text-[#20251F] tracking-tight font-sans mt-0.5">
              {totalParcels.toLocaleString()}
            </div>
            <div className="text-[11px] text-[#5F665D] font-mono mt-0.5">
              Revenue Village Khasras
            </div>
          </div>

          {/* Bottom Row: Trend + Arrow Circle Button */}
          <div className="relative z-10 flex items-center justify-between pt-2 border-t border-[#ECEAE2]">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#2E6645]">
              <TrendingUp size={14} />
              <span>{totalParcels} Surveyed in DB</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-[#2E513E] text-white flex items-center justify-center transition-transform duration-300 group-hover:translate-x-1 group-hover:scale-105 shadow-xs">
              <ArrowRight size={14} />
            </div>
          </div>
        </div>

        {/* ===================================================================
            CARD 2: Surveyed Area (Warm Sand with Gradient Mesh + Botanical Art)
            =================================================================== */}
        <div
          onClick={() => onNavigate?.('gis')}
          className="group relative overflow-hidden bg-gradient-to-br from-[#FAF7F0] via-[#F4EFE5] to-[#EFE7D8] border border-[#D8D5CC] hover:border-[#C4B69E] rounded-[var(--radius-xl)] p-5 shadow-[0_4px_20px_rgba(44,52,43,0.06)] hover:shadow-[0_8px_30px_rgba(44,52,43,0.12)] transition-all duration-300 flex flex-col justify-between min-h-[170px] cursor-pointer"
        >
          {/* Animated Gradient Mesh & Botanical Branch */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Soft Ambient Mesh Radial */}
            <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-[#EBD99A]/30 blur-2xl card-mesh-pulse" />
            <div className="absolute -bottom-10 -left-10 w-44 h-44 rounded-full bg-[#BBD4C1]/25 blur-2xl card-mesh-pulse-reverse" />

            {/* Botanical Leaf Silhouette Artwork (Right Side) */}
            <svg
              className="absolute right-0 top-1/2 -translate-y-1/2 h-36 w-36 opacity-30 text-[#827561] transition-transform duration-500 group-hover:scale-105"
              viewBox="0 0 120 120"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M 60,110 C 60,60 90,20 110,10 C 100,30 95,55 90,70"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path
                d="M 60,85 C 40,75 25,60 20,40 C 35,45 50,60 60,70"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
              <path
                d="M 60,65 C 75,50 85,35 90,15 C 75,22 68,38 60,50"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
              <circle cx="20" cy="40" r="3" fill="currentColor" opacity="0.5" />
              <circle cx="110" cy="10" r="3" fill="currentColor" opacity="0.5" />
              <circle cx="90" cy="15" r="2.5" fill="currentColor" opacity="0.4" />
            </svg>
          </div>

          {/* Top Row: Icon */}
          <div className="relative z-10 flex items-start justify-between">
            <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[#FAF0DC] text-[#74591D] border border-[#EBD99A] flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
              <Leaf size={18} />
            </div>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#FAF0DC] text-[#74591D] border border-[#EBD99A]">
              SVAMITVA Resurvey
            </span>
          </div>

          {/* Middle: Label & Big Value */}
          <div className="relative z-10 my-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#6B5E49]">
              Surveyed Area
            </div>
            <div className="text-3xl font-extrabold text-[#2C2416] tracking-tight font-sans mt-0.5 flex items-baseline gap-1.5">
              <span>{totalHectares.toFixed(2)}</span>
              <span className="text-sm font-semibold text-[#8C7B60]">ha</span>
            </div>
            <div className="text-[11px] text-[#6B5E49] font-mono mt-0.5">
              Haripura Revenue Footprint
            </div>
          </div>

          {/* Bottom Row: Trend + Arrow Circle Button */}
          <div className="relative z-10 flex items-center justify-between pt-2 border-t border-[#E5DED0]">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#2E6645]">
              <TrendingUp size={14} />
              <span>Georeferenced Polygon</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-white border border-[#D8D5CC] text-[#20251F] flex items-center justify-center transition-transform duration-300 group-hover:translate-x-1 group-hover:scale-105 shadow-xs">
              <ArrowRight size={14} />
            </div>
          </div>
        </div>

        {/* ===================================================================
            CARD 3: Active Missions (Deep Dark Teal with Topographic Grid)
            =================================================================== */}
        <div
          onClick={() => onNavigate?.('missions')}
          className="group relative overflow-hidden bg-gradient-to-br from-[#122A23] via-[#0E221C] to-[#081511] border border-[#1F4237] hover:border-[#3C7B65] rounded-[var(--radius-xl)] p-5 shadow-[0_8px_26px_rgba(8,21,17,0.4)] transition-all duration-300 flex flex-col justify-between min-h-[170px] text-white cursor-pointer"
        >
          {/* Animated Topographic Grid (Parallax / Tech Grid) */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-25">
            <svg
              className="w-[120%] h-[120%] -top-[10%] -left-[10%] absolute card-grid-parallax"
              viewBox="0 0 400 240"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <pattern id="card-tech-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                  <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#48BB78" strokeWidth="0.7" opacity="0.35" />
                  <circle cx="0" cy="0" r="1.2" fill="#48BB78" opacity="0.7" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#card-tech-grid)" />
              {/* Concentric radar rings */}
              <circle cx="340" cy="50" r="45" stroke="#38BDF8" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.4" />
              <circle cx="340" cy="50" r="75" stroke="#38BDF8" strokeWidth="0.8" strokeDasharray="4 4" opacity="0.25" />
            </svg>
          </div>

          {/* Top Row: Icon */}
          <div className="relative z-10 flex items-start justify-between">
            <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[#1A3B31] text-[#38BDF8] border border-[#27594B] flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
              <Radio size={18} className="text-[#38BDF8]" />
            </div>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#1A3B31] text-[#6EE7B7] border border-[#27594B] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#34D399] animate-pulse" />
              Airborne Node
            </span>
          </div>

          {/* Middle: Label & Big Value */}
          <div className="relative z-10 my-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#94B99D]">
              Active Missions
            </div>
            <div className="text-3xl font-extrabold text-white tracking-tight font-sans mt-0.5">
              {activeMissionsCount > 0 ? `${activeMissionsCount} Active` : 'Standby'}
            </div>
            <div className="text-[11px] text-[#A7C4AF] font-mono mt-0.5">
              {activeMissionsCount > 0 ? 'Live Telemetry 10 Hz' : `${totalMissionsCount} Logged Sorties`}
            </div>
          </div>

          {/* Bottom Row: Status Pill + Arrow Circle Button */}
          <div className="relative z-10 flex items-center justify-between pt-2 border-t border-[#1F4237]">
            <div className="flex items-center gap-2 text-xs font-mono text-[#A7F3D0]">
              <span className={`w-2 h-2 rounded-full ${activeMissionsCount > 0 ? 'bg-[#10B981] animate-ping' : 'bg-[#38BDF8]'} inline-block`} />
              <span>{activeMissionsCount > 0 ? 'Streaming Telemetry' : `${totalMissionsCount} Missions Recorded`}</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-transform duration-300 group-hover:translate-x-1 group-hover:scale-105 border border-white/15">
              <ArrowRight size={14} />
            </div>
          </div>
        </div>

        {/* ===================================================================
            CARD 4: AI Analysis (Deep Tech Indigo/Violet with Smooth Wave Lines)
            =================================================================== */}
        <div
          onClick={() => onNavigate?.('ai-analysis')}
          className="group relative overflow-hidden bg-gradient-to-br from-[#1C1635] via-[#16112C] to-[#0E0A1E] border border-[#31255C] hover:border-[#6349B5] rounded-[var(--radius-xl)] p-5 shadow-[0_8px_26px_rgba(14,10,30,0.4)] transition-all duration-300 flex flex-col justify-between min-h-[170px] text-white cursor-pointer"
        >
          {/* Animated Smooth Wave Lines */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-35">
            <svg
              className="w-full h-full card-wave-lines"
              viewBox="0 0 400 200"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M -20 100 C 60 40 140 160 220 100 C 300 40 380 160 460 100"
                stroke="#A78BFA"
                strokeWidth="1.8"
                opacity="0.8"
              />
              <path
                d="M -20 115 C 60 65 140 165 220 115 C 300 65 380 165 460 115"
                stroke="#C084FC"
                strokeWidth="1.2"
                strokeDasharray="4 4"
                opacity="0.6"
              />
              <path
                d="M -20 85 C 60 25 140 145 220 85 C 300 25 380 145 460 85"
                stroke="#38BDF8"
                strokeWidth="1"
                opacity="0.5"
              />
            </svg>
          </div>

          {/* Top Row: Icon */}
          <div className="relative z-10 flex items-start justify-between">
            <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[#2A1F52] text-[#C084FC] border border-[#433282] flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
              <Cpu size={18} className="text-[#C084FC]" />
            </div>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#2A1F52] text-[#DDD6FE] border border-[#433282]">
              Meta SAM ViT-H
            </span>
          </div>

          {/* Middle: Label & Big Value */}
          <div className="relative z-10 my-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#C4B5FD]">
              AI Boundary Precision
            </div>
            <div className="text-3xl font-extrabold text-white tracking-tight font-sans mt-0.5 flex items-baseline gap-2">
              <span>{aiAccuracy.toFixed(1)}%</span>
              <span className="text-xs font-normal text-[#C4B5FD]">IoU</span>
            </div>
            <div className="text-[11px] text-[#C4B5FD]/80 font-mono mt-0.5">
              Live Mean Parcel Confidence
            </div>
          </div>

          {/* Bottom Row: Subtitle + Arrow Circle Button */}
          <div className="relative z-10 flex items-center justify-between pt-2 border-t border-[#31255C]">
            <span className="text-xs text-[#DDD6FE] font-medium">Meta SAM ViT + SegFormer</span>
            <div className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-transform duration-300 group-hover:translate-x-1 group-hover:scale-105 border border-white/15">
              <ArrowRight size={14} />
            </div>
          </div>
        </div>

        {/* ===================================================================
            CARD 5: R2 Storage (Deep Misty Pine Forest Canopy)
            =================================================================== */}
        <div
          onClick={() => onNavigate?.('datasets')}
          className="group relative overflow-hidden bg-gradient-to-br from-[#14261C] via-[#0E1E16] to-[#07130D] border border-[#213F2E] hover:border-[#3C6E52] rounded-[var(--radius-xl)] p-5 shadow-[0_8px_26px_rgba(7,19,13,0.4)] transition-all duration-300 flex flex-col justify-between min-h-[170px] text-white cursor-pointer"
        >
          {/* Animated Misty Forest Canopy Silhouettes */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
            {/* Pine Canopy Silhouette SVG */}
            <svg
              className="absolute -right-4 bottom-0 w-44 h-32 text-[#2E513E] card-mist-drift"
              viewBox="0 0 200 150"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Tree 1 */}
              <polygon points="170,150 170,120 185,120 170,85 182,85 170,55 178,55 170,25 162,55 170,55 158,85 170,85 155,120 170,120" opacity="0.6" />
              {/* Tree 2 */}
              <polygon points="135,150 135,125 148,125 135,95 145,95 135,68 141,68 135,42 129,68 135,68 125,95 135,95 122,125 135,125" opacity="0.45" />
              {/* Tree 3 */}
              <polygon points="95,150 95,130 106,130 95,105 103,105 95,80 100,80 95,58 90,80 95,80 87,105 95,105 84,130 95,130" opacity="0.3" />
            </svg>
            {/* Soft Ambient Green Mist */}
            <div className="absolute top-0 right-0 w-48 h-36 bg-[#34D399]/15 blur-3xl rounded-full" />
          </div>

          {/* Top Row: Icon */}
          <div className="relative z-10 flex items-start justify-between">
            <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[#1B3627] text-[#34D399] border border-[#27533B] flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
              <Database size={18} className="text-[#34D399]" />
            </div>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#1B3627] text-[#6EE7B7] border border-[#27533B] flex items-center gap-1.5">
              {storageLive && <span className="w-1.5 h-1.5 rounded-full bg-[#34D399] animate-pulse inline-block" />}
              {storageLive ? 'LIVE R2 BUCKET' : 'Zero Egress'}
            </span>
          </div>

          {/* Middle: Label & Big Value */}
          <div className="relative z-10 my-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#94B99D]">
              Cloudflare R2 Storage
            </div>
            <div className="text-3xl font-extrabold text-white tracking-tight font-sans mt-0.5">
              {storageUsed}
            </div>
            <div className="text-[11px] text-[#A7C4AF] font-mono mt-1">
              {storageSubtitle || `${storageObjectsCount || 79} Ingested Objects · Zero Egress`}
            </div>
          </div>

          {/* Bottom Row: Custom Progress Bar & Percentage + Arrow Circle Button */}
          <div className="relative z-10 flex items-center justify-between pt-2 border-t border-[#213F2E]">
            <div className="flex items-center gap-2.5 flex-1 max-w-[170px]">
              <div className="w-full h-1.5 bg-[#0C1A13] rounded-full overflow-hidden border border-[#213F2E]">
                <div
                  className="h-full bg-gradient-to-r from-[#10B981] to-[#34D399] rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(12, storagePercent))}%` }}
                />
              </div>
              <span className="text-[11px] font-mono font-semibold text-[#6EE7B7] whitespace-nowrap">
                {storageObjectsCount ? `${storageObjectsCount} Objects` : `${storagePercent}% used`}
              </span>
            </div>
            <div className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-transform duration-300 group-hover:translate-x-1 group-hover:scale-105 border border-white/15">
              <ArrowRight size={14} />
            </div>
          </div>
        </div>

        {/* ===================================================================
            CARD 6: Reports Generated (Dark Night-Sky Cadastral Network)
            =================================================================== */}
        <div
          onClick={() => onNavigate?.('reports')}
          className="group relative overflow-hidden bg-gradient-to-br from-[#16212B] via-[#101820] to-[#0A1015] border border-[#253748] hover:border-[#4B6885] rounded-[var(--radius-xl)] p-5 shadow-[0_8px_26px_rgba(10,16,21,0.4)] transition-all duration-300 flex flex-col justify-between min-h-[170px] text-white cursor-pointer"
        >
          {/* Animated Cadastral Network Overlay with Nodes */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
            <svg
              className="w-full h-full card-cadastral-glow"
              viewBox="0 0 300 200"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Boundary polygon lines */}
              <polygon
                points="180,30 270,50 250,140 160,110"
                stroke="#F59E0B"
                strokeWidth="1.2"
                strokeDasharray="4 3"
                opacity="0.6"
              />
              <polygon
                points="160,110 250,140 220,190 130,160"
                stroke="#DFC56D"
                strokeWidth="1"
                opacity="0.5"
              />
              <line x1="180" y1="30" x2="160" y2="110" stroke="#F59E0B" strokeWidth="1.2" opacity="0.6" />
              {/* Cadastral corner nodes */}
              <circle cx="180" cy="30" r="3" fill="#FBBF24" />
              <circle cx="270" cy="50" r="3" fill="#FBBF24" />
              <circle cx="250" cy="140" r="3" fill="#FBBF24" />
              <circle cx="160" cy="110" r="3" fill="#FBBF24" />
              <circle cx="220" cy="190" r="2.5" fill="#DFC56D" />
              <circle cx="130" cy="160" r="2.5" fill="#DFC56D" />
            </svg>
          </div>

          {/* Top Row: Icon */}
          <div className="relative z-10 flex items-start justify-between">
            <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[#233140] text-[#F59E0B] border border-[#34495E] flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
              <FileText size={18} className="text-[#FBBF24]" />
            </div>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#233140] text-[#FDE68A] border border-[#34495E]">
              SHA-256 Verified
            </span>
          </div>

          {/* Middle: Label & Big Value */}
          <div className="relative z-10 my-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">
              Statutory Reports
            </div>
            <div className="text-3xl font-extrabold text-white tracking-tight font-sans mt-0.5">
              {reportsCount} Dossiers
            </div>
            <div className="text-[11px] text-[#FDE68A] font-mono mt-0.5">
              {approvedReportsCount} Approved · {reviewReportsCount} In Review
            </div>
          </div>

          {/* Bottom Row: Subtext + Arrow Circle Button */}
          <div className="relative z-10 flex items-center justify-between pt-2 border-t border-[#253748]">
            <div className="flex items-center gap-1.5 text-xs text-[#FDE68A] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
              <span>{approvedReportsCount} Official · {reportsCount} in DB</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-transform duration-300 group-hover:translate-x-1 group-hover:scale-105 border border-white/15">
              <ArrowRight size={14} />
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          PANORAMIC INSPIRATIONAL BANNER (Section 5 Wide Landscape Banner)
          "Turning Survey Data into a Better Tomorrow"
          "Accurate Maps. Transparent Land Records. Stronger India."
          ===================================================================== */}
      <div className="relative overflow-hidden rounded-[var(--radius-xl)] border border-[#D8D5CC] shadow-[0_6px_24px_rgba(44,52,43,0.07)] p-6 sm:p-8 text-center bg-gradient-to-b from-[#FAF8F3] via-[#F2EDE2] to-[#E5DDD0]">
        {/* Layered Misty Hills Horizon Illustration (SVG Vector Backdrop) */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-40">
          <svg
            className="w-full h-full absolute bottom-0 left-0"
            viewBox="0 0 1200 240"
            preserveAspectRatio="none"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Sunrise Warm Atmospheric Glow */}
            <circle cx="850" cy="90" r="140" fill="#FDF3CE" opacity="0.6" />
            <circle cx="850" cy="90" r="80" fill="#FCE79C" opacity="0.4" />

            {/* Back Mountain Silhouette */}
            <path
              d="M0,170 Q240,110 480,145 T960,115 T1200,160 L1200,240 L0,240 Z"
              fill="#94B99D"
              opacity="0.35"
            />
            {/* Mid Mountain Silhouette */}
            <path
              d="M0,185 Q200,140 440,170 T880,140 T1200,180 L1200,240 L0,240 Z"
              fill="#4F7D60"
              opacity="0.4"
            />
            {/* Front Foothill Silhouette */}
            <path
              d="M0,205 Q280,170 560,195 T1000,175 T1200,210 L1200,240 L0,240 Z"
              fill="#2E513E"
              opacity="0.45"
            />
          </svg>
        </div>

        {/* Content Container */}
        <div className="relative z-10 max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#20251F] font-serif" style={{ fontFamily: 'var(--font-display, "Fraunces", Georgia, serif)' }}>
            Turning Survey Data into a Better Tomorrow
          </h2>
          <p className="text-sm sm:text-base text-[#4F574D] font-medium tracking-wide">
            Accurate Maps. Transparent Land Records. Stronger India.
          </p>
        </div>
      </div>
    </div>
  );
};
