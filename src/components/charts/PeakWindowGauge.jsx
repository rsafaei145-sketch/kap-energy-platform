import React from 'react';
import { useKapStore } from '../../store/kapStore.js';

export default function PeakWindowGauge({ size = 180 }) {
  const actual_Power_W = useKapStore(s => s.actual_Power_W);
  const target_Power_W = useKapStore(s => s.target_Power_W);
  const baseline_Power_W = useKapStore(s => s.baseline_Power_W);
  const alertState     = useKapStore(s => s.alertState);
  const season         = useKapStore(s => s.season);

  const max = baseline_Power_W * 1.3;
  const pct = Math.min(1, Math.max(0, actual_Power_W / max));
  const targetPct = Math.min(1, target_Power_W / max);

  const r = size / 2 - 16;
  const cx = size / 2;
  const cy = size / 2;
  const strokeWidth = 12;

  // Arc angles: 210° sweep starting from 195° (bottom-left)
  const startAngle = 215;
  const sweepAngle = 290;

  const polarToXY = (angleDeg, radius) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  };

  const describeArc = (pctFill, offset = 0) => {
    const sweepEnd = startAngle + sweepAngle * pctFill;
    const start = polarToXY(startAngle, r - offset);
    const end   = polarToXY(sweepEnd,   r - offset);
    const large = sweepAngle * pctFill > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${r - offset} ${r - offset} 0 ${large} 1 ${end.x} ${end.y}`;
  };

  const fullArcLen = 2 * Math.PI * r;
  const circumference = (sweepAngle / 360) * fullArcLen;
  const dashOffset = circumference * (1 - pct);
  const targetDash = circumference * (1 - targetPct);

  const alertColor = {
    NORMAL: '#3b82f6', ALARM: '#eab308', ERROR: '#f97316', TRIP: '#ef4444'
  }[alertState];

  const unit = season === 'SUMMER' ? 'kW' : 'm³/h';
  const displayVal = season === 'SUMMER'
    ? (actual_Power_W / 1000).toFixed(1)
    : (actual_Power_W / 9500).toFixed(1);

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="overflow-visible">
        {/* Background arc track */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="#1e2d45"
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${fullArcLen}`}
          strokeDashoffset={-(fullArcLen - circumference) * 0.5 - circumference * (startAngle / 360)}
          strokeLinecap="round"
          style={{ transform: `rotate(${startAngle - 90}deg)`, transformOrigin: `${cx}px ${cy}px` }}
        />

        {/* Filled arc */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={alertColor}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${fullArcLen}`}
          strokeDashoffset={dashOffset + (fullArcLen - circumference)}
          strokeLinecap="round"
          style={{
            transform: `rotate(${startAngle - 90}deg)`,
            transformOrigin: `${cx}px ${cy}px`,
            transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4,0,0.2,1), stroke 0.4s',
            filter: `drop-shadow(0 0 6px ${alertColor}66)`,
          }}
        />

        {/* Target marker */}
        {(() => {
          const targetAngle = startAngle + sweepAngle * targetPct;
          const p = polarToXY(targetAngle, r);
          return (
            <circle cx={p.x} cy={p.y} r={5} fill="#22c55e"
              style={{ filter: 'drop-shadow(0 0 4px #22c55e)' }} />
          );
        })()}

        {/* Center text */}
        <text x={cx} y={cy - 10} textAnchor="middle" fontSize={size * 0.18} fontWeight="700"
          fill="white" fontFamily="JetBrains Mono">
          {displayVal}
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize={size * 0.07}
          fill="#94a3b8" fontFamily="JetBrains Mono">
          {unit}
        </text>
        <text x={cx} y={cy + 26} textAnchor="middle" fontSize={size * 0.065}
          fill={alertColor} fontFamily="Vazirmatn" fontWeight="600">
          {alertState === 'NORMAL' ? 'عادی' : alertState === 'ALARM' ? 'آلارم' : alertState === 'ERROR' ? 'ارور' : 'تریپ'}
        </text>
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] font-['JetBrains_Mono'] mt-1">
        <div className="flex items-center gap-1">
          <div className="w-3 h-1 rounded-full" style={{ background: alertColor }} />
          <span className="text-[#94a3b8]">Actual</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-1 rounded-full bg-green-400" />
          <span className="text-[#94a3b8]">Target</span>
        </div>
      </div>
    </div>
  );
}
