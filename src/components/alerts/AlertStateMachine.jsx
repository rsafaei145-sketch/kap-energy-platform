import React from 'react';
import { useKapStore } from '../../store/kapStore.js';
import { getAlertInfo, ALERT_STATES } from '../../engine/hysteresisEngine.js';
import { AlertTriangle, ShieldAlert, Zap, CheckCircle, RotateCcw } from 'lucide-react';

const STAGE_ICONS = {
  NORMAL: CheckCircle,
  ALARM:  AlertTriangle,
  ERROR:  ShieldAlert,
  TRIP:   Zap,
};

const STAGES = ['NORMAL', 'ALARM', 'ERROR', 'TRIP'];

export default function AlertStateMachine() {
  const alertState    = useKapStore(s => s.alertState);
  const hysteresisState = useKapStore(s => s.hysteresisState);
  const deviation_W   = useKapStore(s => s.deviation_W);
  const actual_Power_W= useKapStore(s => s.actual_Power_W);
  const target_Power_W= useKapStore(s => s.target_Power_W);
  const acknowledgeTrip = useKapStore(s => s.acknowledgeTrip);
  const setEnterThreshold = useKapStore(s => s.setEnterThreshold);

  const currentIdx = STAGES.indexOf(alertState);
  const info = getAlertInfo(alertState);

  return (
    <div className="glass-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">زنجیره آلارم صنعتی · Alert State Machine</h3>
        {alertState === 'TRIP' && (
          <button
            onClick={acknowledgeTrip}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 transition-all animate-pulse"
          >
            <RotateCcw size={12} />
            تأیید اپراتور / Reset
          </button>
        )}
      </div>

      {/* Stage Pipeline */}
      <div className="flex items-center gap-0">
        {STAGES.map((stage, idx) => {
          const stageInfo = getAlertInfo(stage);
          const Icon = STAGE_ICONS[stage];
          const isActive  = stage === alertState;
          const isPassed  = idx < currentIdx;
          const isFuture  = idx > currentIdx;

          return (
            <React.Fragment key={stage}>
              <div className={`flex-1 relative`}>
                <div
                  className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all ${
                    isActive
                      ? `border-2 ${stage === 'TRIP' ? 'trip-flash' : ''}`
                      : isPassed
                      ? 'border-[#1e2d45] opacity-60'
                      : 'border-[#1e2d45] opacity-30'
                  }`}
                  style={isActive ? {
                    borderColor: stageInfo.color,
                    background: `${stageInfo.color}12`,
                    boxShadow: `0 0 20px ${stageInfo.color}30`,
                  } : {}}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center mb-2"
                    style={{
                      background: isActive ? `${stageInfo.color}25` : 'rgba(30,45,69,0.5)',
                      border: `2px solid ${isActive ? stageInfo.color : '#1e2d45'}`,
                    }}
                  >
                    <Icon
                      size={18}
                      style={{ color: isActive ? stageInfo.color : '#475569' }}
                    />
                  </div>
                  <div
                    className="text-xs font-bold font-['JetBrains_Mono']"
                    style={{ color: isActive ? stageInfo.color : '#475569' }}
                  >
                    {stage}
                  </div>
                  <div className="text-[11px] mt-0.5 font-['Vazirmatn']" style={{ color: isActive ? stageInfo.color : '#334155' }}>
                    {stageInfo.label}
                  </div>

                  {/* Dwell counters */}
                  {isActive && stage === 'ALARM' && (
                    <div className="mt-2 text-[10px] font-['JetBrains_Mono'] text-[#94a3b8]">
                      {hysteresisState.alarmDwell}/5 نمونه
                    </div>
                  )}
                  {isActive && stage === 'ERROR' && (
                    <div className="mt-2 text-[10px] font-['JetBrains_Mono'] text-[#94a3b8]">
                      {hysteresisState.errorDwell}/10 نمونه
                    </div>
                  )}
                </div>
              </div>

              {/* Connector Arrow */}
              {idx < STAGES.length - 1 && (
                <div className="w-6 flex items-center justify-center shrink-0">
                  <div
                    className="h-0.5 w-full"
                    style={{
                      background: idx < currentIdx
                        ? getAlertInfo(STAGES[idx + 1]).color
                        : '#1e2d45'
                    }}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Deviation Metrics */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#111827] border border-[#1e2d45] rounded-lg p-3">
          <div className="text-[10px] text-[#475569] mb-1 font-['Inter']">Actual_Power_W</div>
          <div className="text-sm font-bold font-['JetBrains_Mono'] text-white">
            {(actual_Power_W / 1000).toFixed(1)} kW
          </div>
        </div>
        <div className="bg-[#111827] border border-[#1e2d45] rounded-lg p-3">
          <div className="text-[10px] text-[#475569] mb-1 font-['Inter']">Target_Power_W</div>
          <div className="text-sm font-bold font-['JetBrains_Mono'] text-green-400">
            {(target_Power_W / 1000).toFixed(1)} kW
          </div>
        </div>
        <div className="bg-[#111827] border border-[#1e2d45] rounded-lg p-3">
          <div className="text-[10px] text-[#475569] mb-1 font-['Inter']">Deviation_W</div>
          <div
            className="text-sm font-bold font-['JetBrains_Mono']"
            style={{ color: deviation_W > 0 ? '#ef4444' : '#22c55e' }}
          >
            {deviation_W > 0 ? '+' : ''}{deviation_W.toFixed(0)} W
          </div>
        </div>
      </div>

      {/* Threshold Controls */}
      <div className="border-t border-[#1e2d45] pt-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] text-[#94a3b8] font-['Inter']">
            Enter Threshold: {hysteresisState.enterThreshold.toFixed(0)} W
          </span>
          <span className="text-[11px] text-[#475569] font-['Inter']">
            Exit (×0.7): {hysteresisState.exitThreshold.toFixed(0)} W
          </span>
        </div>
        <input
          type="range"
          min={500}
          max={10000}
          step={100}
          value={hysteresisState.enterThreshold}
          onChange={e => setEnterThreshold(Number(e.target.value))}
          className="w-full accent-blue-500"
        />
        <div className="flex justify-between text-[9px] text-[#334155] font-['JetBrains_Mono'] mt-1">
          <span>500 W</span>
          <span>|Δ| ≤ threshold → NORMAL</span>
          <span>10,000 W</span>
        </div>
      </div>
    </div>
  );
}
