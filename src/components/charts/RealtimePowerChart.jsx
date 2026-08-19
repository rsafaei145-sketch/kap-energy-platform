import React, { useMemo } from 'react';
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend
} from 'recharts';
import { useKapStore } from '../../store/kapStore.js';
import { PEAK_WINDOW_START, PEAK_WINDOW_END } from '../../engine/loadControlEngine.js';

const CustomTooltip = ({ active, payload, label, season }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#111827] border border-[#2d4a6e] rounded-lg px-3 py-2 text-xs font-['Inter']">
      <p className="text-[#94a3b8] mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-bold">
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
          {season === 'SUMMER' ? ' kW' : ' m³/h'}
        </p>
      ))}
    </div>
  );
};

export default function RealtimePowerChart({ compact = false }) {
  const history = useKapStore(s => s.history);
  const season  = useKapStore(s => s.season);

  const chartData = useMemo(() => {
    const step = history.length > 100 ? Math.floor(history.length / 100) : 1;
    return history
      .filter((_, i) => i % step === 0)
      .slice(-60)
      .map(h => ({
        time: `${String(h.simulatedHour).padStart(2,'0')}:${String(new Date(h.timestamp).getMinutes()).padStart(2,'0')}`,
        actual: parseFloat((h.Actual_Power_W / 1000).toFixed(2)),
        baseline: parseFloat((h.Baseline_Power_W / 1000).toFixed(2)),
        target: parseFloat((h.Target_Power_W / 1000).toFixed(2)),
        hour: h.simulatedHour,
      }));
  }, [history]);

  const yLabel = season === 'SUMMER' ? 'kW' : 'm³/h';
  const height  = compact ? 160 : 240;

  if (chartData.length < 2) {
    return (
      <div className="flex items-center justify-center text-[#475569] text-xs" style={{ height }}>
        در انتظار داده…
      </div>
    );
  }

  return (
    <div className="chart-container" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="baselineGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#94a3b8" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,45,69,0.5)" />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 10, fill: '#475569', fontFamily: 'JetBrains Mono' }}
            interval="preserveStartEnd"
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#475569', fontFamily: 'JetBrains Mono' }}
            tickLine={false}
            axisLine={false}
            unit={` ${yLabel}`}
          />
          <Tooltip content={<CustomTooltip season={season} />} />
          {!compact && (
            <Legend
              formatter={(value) => ({
                actual: 'مصرف واقعی', baseline: 'خط پایه', target: 'هدف'
              }[value] ?? value)}
              wrapperStyle={{ fontSize: 11, fontFamily: 'Vazirmatn' }}
            />
          )}

          {/* Peak window reference band — annotate if data contains peak */}
          {chartData.some(d => d.hour >= PEAK_WINDOW_START) && (
            <ReferenceLine
              x={chartData.find(d => d.hour >= PEAK_WINDOW_START)?.time}
              stroke="#eab308"
              strokeDasharray="4 2"
              label={{ value: 'اوج', fill: '#eab308', fontSize: 10, position: 'top' }}
            />
          )}

          <Area
            type="monotone"
            dataKey="baseline"
            stroke="#475569"
            strokeWidth={1.5}
            strokeDasharray="4 2"
            fill="url(#baselineGrad)"
            dot={false}
            name="baseline"
          />
          <Area
            type="monotone"
            dataKey="target"
            stroke="#22c55e"
            strokeWidth={1.5}
            strokeDasharray="6 3"
            fill="none"
            dot={false}
            name="target"
          />
          <Area
            type="monotone"
            dataKey="actual"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#actualGrad)"
            dot={false}
            name="actual"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
