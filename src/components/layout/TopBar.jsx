import React from 'react';
import { useKapStore } from '../../store/kapStore.js';
import {
  Activity, Sun, Snowflake, Play, Pause, RotateCcw,
  Zap, Clock, Wifi, Shield
} from 'lucide-react';

export default function TopBar() {
  const persona        = useKapStore(s => s.persona);
  const season         = useKapStore(s => s.season);
  const running        = useKapStore(s => s.running);
  const simulatedHour  = useKapStore(s => s.simulatedHour);
  const simulatedMinute= useKapStore(s => s.simulatedMinute);
  const alertState     = useKapStore(s => s.alertState);
  const onlineClients  = useKapStore(s => s.onlineClients);

  const setPersona     = useKapStore(s => s.setPersona);
  const setSeason      = useKapStore(s => s.setSeason);
  const toggleRunning  = useKapStore(s => s.toggleRunning);
  const hardReset      = useKapStore(s => s.hardReset);

  const inPeak = simulatedHour >= 17 && simulatedHour < 22;

  const timeStr = `${String(simulatedHour).padStart(2,'0')}:${String(simulatedMinute).padStart(2,'0')}`;

  const alertColors = {
    NORMAL: '#22c55e', ALARM: '#eab308', ERROR: '#f97316', TRIP: '#ef4444'
  };

  return (
    <header className="flex items-center justify-between px-4 lg:px-6 h-14 border-b border-[#1e2d45] bg-[#0d1526]/95 backdrop-blur-sm shrink-0 z-50">
      {/* Left: Logo + System Status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center pulse-glow">
            <Zap size={16} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-white tracking-wide font-['Inter']">KAP</div>
            <div className="text-[10px] text-[#475569] font-['Inter']">پلتفرم هوشمند انرژی</div>
          </div>
        </div>

        {/* Alert Status Pill */}
        <div
          className="flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold font-['JetBrains_Mono'] transition-all"
          style={{
            borderColor: alertColors[alertState],
            color: alertColors[alertState],
            background: `${alertColors[alertState]}18`,
            animation: alertState === 'TRIP' ? 'pulse-red 0.8s infinite' : 'none',
          }}
        >
          <span className="w-2 h-2 rounded-full" style={{ background: alertColors[alertState] }} />
          {alertState}
        </div>

        {/* Simulated Clock */}
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-['JetBrains_Mono'] border ${
          inPeak
            ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400'
            : 'border-[#1e2d45] bg-[#111827] text-[#94a3b8]'
        }`}>
          <Clock size={12} />
          <span>{timeStr}</span>
          {inPeak && <span className="text-[10px] font-bold animate-pulse">اوج</span>}
        </div>
      </div>

      {/* Center: Persona Switcher */}
      <div className="flex items-center gap-1 bg-[#111827] border border-[#1e2d45] rounded-lg p-1">
        {[
          { id: 'user',       label: 'کاربر نهایی', icon: Shield },
          { id: 'expert',     label: 'متخصص',       icon: Activity },
          { id: 'technician', label: 'تکنیسین',      icon: Wifi },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setPersona(id)}
            className={`persona-btn flex items-center gap-1.5 ${persona === id ? 'active' : ''}`}
            style={{ padding: '5px 12px' }}
          >
            <Icon size={13} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-3">
        {/* Season Toggle */}
        <div className="flex items-center gap-1 bg-[#111827] border border-[#1e2d45] rounded-lg p-1">
          <button
            onClick={() => setSeason('SUMMER')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-all ${
              season === 'SUMMER'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            <Sun size={13} /> تابستان
          </button>
          <button
            onClick={() => setSeason('WINTER')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-all ${
              season === 'WINTER'
                ? 'bg-blue-400/20 text-blue-300 border border-blue-400/40'
                : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            <Snowflake size={13} /> زمستان
          </button>
        </div>

        {/* Online Clients */}
        <div className="flex items-center gap-1.5 text-xs text-[#94a3b8] font-['Inter']">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span>{onlineClients} آنلاین</span>
        </div>

        {/* Run/Pause */}
        <button
          onClick={toggleRunning}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
            running
              ? 'border-green-500/40 text-green-400 bg-green-500/10 hover:bg-green-500/20'
              : 'border-red-500/40 text-red-400 bg-red-500/10 hover:bg-red-500/20'
          }`}
        >
          {running ? <Pause size={12} /> : <Play size={12} />}
          {running ? 'توقف' : 'شروع'}
        </button>

        {/* Reset */}
        <button
          onClick={hardReset}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#1e2d45] text-[#94a3b8] hover:text-white hover:border-[#2d4a6e] transition-all"
        >
          <RotateCcw size={12} />
        </button>
      </div>
    </header>
  );
}
