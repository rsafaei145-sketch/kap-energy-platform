import React, { useEffect, useState } from 'react';
import { useKapStore } from '../../store/kapStore.js';
import { generateAdvisoryLog } from '../../engine/aiAdvisoryEngine.js';
import { MessageSquare, Bot, Clock, ChevronDown, ChevronUp } from 'lucide-react';

const SEVERITY_STYLES = {
  info:     { border: '#3b82f6', bg: 'rgba(59,130,246,0.07)', icon: '🤖', label: 'اطلاعات' },
  warning:  { border: '#eab308', bg: 'rgba(234,179,8,0.07)',  icon: '⚠️', label: 'هشدار'   },
  critical: { border: '#ef4444', bg: 'rgba(239,68,68,0.07)',  icon: '🚨', label: 'بحرانی'  },
};

export default function AIAdvisoryPanel() {
  const advisory     = useKapStore(s => s.advisory);
  const history      = useKapStore(s => s.history);
  const alertState   = useKapStore(s => s.alertState);
  const actual_Power_W = useKapStore(s => s.actual_Power_W);
  const target_Power_W = useKapStore(s => s.target_Power_W);
  const simulatedHour  = useKapStore(s => s.simulatedHour);
  const season         = useKapStore(s => s.season);

  const [showLog, setShowLog]   = useState(false);
  const [logEntries, setLog]    = useState([]);

  // Build advisory log from history snapshots
  useEffect(() => {
    const entries = generateAdvisoryLog(
      history.map(h => ({
        ...h,
        alertState: h.alertState,
        actual_Power_W: h.Actual_Power_W,
        target_Power_W: h.Target_Power_W,
        baseline_Power_W: h.Baseline_Power_W,
        simulatedHour: h.simulatedHour,
        season,
      })),
      8
    );
    setLog(entries);
  }, [history.length, season]);

  const style = SEVERITY_STYLES[advisory.severity] ?? SEVERITY_STYLES.info;
  const inPeak = simulatedHour >= 17 && simulatedHour < 22;

  return (
    <div className="glass-card p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
          <Bot size={16} className="text-violet-400" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">مشاور هوشمند KAP · AI Advisory Agent</h3>
          <p className="text-[11px] text-[#94a3b8] font-['Inter']">Read-only · Deterministic Farsi Rule Engine · Mock LLM Layer</p>
        </div>
        <div className="mr-auto flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
          <span className="text-[10px] text-[#94a3b8] font-['JetBrains_Mono']">RULE: {advisory.ruleId}</span>
        </div>
      </div>

      {/* System Prompt Display */}
      <div className="bg-[#0d1117] border border-[#1e2d45] rounded-lg p-3">
        <div className="text-[9px] text-[#475569] mb-2 font-['JetBrains_Mono']">
          // SYSTEM_PROMPT :: deterministic_rule_engine v1.0
        </div>
        <div className="text-[10px] text-[#94a3b8] font-['JetBrains_Mono'] space-y-1">
          <div>season: <span className="text-blue-400">{season}</span></div>
          <div>alertState: <span style={{ color: alertState === 'NORMAL' ? '#22c55e' : alertState === 'ALARM' ? '#eab308' : alertState === 'ERROR' ? '#f97316' : '#ef4444' }}>{alertState}</span></div>
          <div>simulatedHour: <span className="text-amber-400">{simulatedHour}:00</span> | peakWindow: <span className={inPeak ? 'text-yellow-400' : 'text-gray-500'}>{inPeak ? 'ACTIVE' : 'INACTIVE'}</span></div>
          <div>actual: <span className="text-white">{(actual_Power_W/1000).toFixed(1)}kW</span> | target: <span className="text-green-400">{(target_Power_W/1000).toFixed(1)}kW</span></div>
        </div>
      </div>

      {/* Current Advisory */}
      <div
        className="rounded-xl p-4 border-r-4 animate-fade-in"
        style={{
          background: style.bg,
          borderRightColor: style.border,
          borderTopColor: `${style.border}30`,
          borderBottomColor: `${style.border}30`,
          borderLeftColor: `${style.border}30`,
          borderWidth: '1px',
          borderRightWidth: '4px',
        }}
      >
        <div className="flex items-start gap-3" dir="rtl">
          <div className="text-xl shrink-0 mt-0.5">{style.icon}</div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span
                className="text-[9px] font-bold px-2 py-0.5 rounded-full font-['JetBrains_Mono']"
                style={{ background: `${style.border}20`, color: style.border, border: `1px solid ${style.border}50` }}
              >
                {advisory.ruleId}
              </span>
              <span className="text-[10px] font-bold" style={{ color: style.border }}>{style.label}</span>
            </div>
            <p className="text-sm leading-relaxed text-[#e2e8f0] font-['Vazirmatn']">
              {advisory.message || 'در حال بررسی وضعیت سیستم...'}
            </p>
          </div>
        </div>
      </div>

      {/* Advisory Log Toggle */}
      <button
        onClick={() => setShowLog(s => !s)}
        className="flex items-center gap-2 text-[11px] text-[#94a3b8] hover:text-white transition-colors"
      >
        <Clock size={12} />
        تاریخچه مشاوره ({logEntries.length} مورد)
        {showLog ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {showLog && (
        <div className="space-y-2 max-h-48 overflow-y-auto animate-fade-in">
          {logEntries.map((entry, i) => {
            const s2 = SEVERITY_STYLES[entry.severity] ?? SEVERITY_STYLES.info;
            return (
              <div
                key={i}
                className="flex items-start gap-2 py-2 border-b border-[#1e2d45] last:border-0"
                dir="rtl"
              >
                <span className="text-sm shrink-0">{s2.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[9px] font-['JetBrains_Mono'] text-[#475569]">{entry.ruleId}</span>
                    {entry.timestamp && (
                      <span className="text-[9px] text-[#334155] font-['JetBrains_Mono']">
                        {new Date(entry.timestamp).toLocaleTimeString('fa-IR', { hour12: false })}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#94a3b8] font-['Vazirmatn'] leading-snug line-clamp-2">
                    {entry.message}
                  </p>
                </div>
              </div>
            );
          })}
          {logEntries.length === 0 && (
            <p className="text-center text-[11px] text-[#334155] font-['Vazirmatn']">سابقه‌ای ثبت نشده است</p>
          )}
        </div>
      )}

      {/* Read-only disclaimer */}
      <div className="bg-[#111827] border border-[#1e2d45] rounded-lg px-3 py-2 text-[10px] text-[#475569] font-['JetBrains_Mono']" dir="rtl">
        ⚠️ این پنل فقط خواندنی است. هیچ عددی توسط این لایه تولید نمی‌شود.
        تمام مقادیر از موتور منطق قطعی خوانده می‌شوند.
      </div>
    </div>
  );
}
