import React, { useState, useRef, useEffect } from 'react';
import { useKapStore } from '../../store/kapStore.js';
import { parseManualHexEntry, toHexString } from '../../engine/telemetryEngine.js';
import { Radio, Terminal, AlertCircle, CheckCircle, Clock } from 'lucide-react';

const QUALITY_COLORS = {
  GOOD: '#22c55e', SUSPECT: '#eab308', INVALID: '#ef4444', STALE: '#6b7280'
};

export default function DataMakerPanel() {
  const rawFrame    = useKapStore(s => s.rawFrame);
  const hexStream   = useKapStore(s => s.hexStream);
  const season      = useKapStore(s => s.season);
  const lastQuality = useKapStore(s => s.lastQuality);
  const decodedFrame= useKapStore(s => s.decodedFrame);
  const decimals    = useKapStore(s => s.decimals);
  const running     = useKapStore(s => s.running);

  const setManualHexOverride = useKapStore(s => s.setManualHexOverride);
  const clearManualHex       = useKapStore(s => s.clearManualHex);
  const setDecimals          = useKapStore(s => s.setDecimals);

  const [manualInput, setManualInput] = useState('');
  const [manualError, setManualError]  = useState('');
  const [logs, setLogs] = useState([]);
  const logRef = useRef(null);

  // Stream log entries
  useEffect(() => {
    if (!running || Object.keys(rawFrame).length === 0) return;
    const entry = {
      ts: new Date().toLocaleTimeString('fa-IR', { hour12: false }),
      quality: lastQuality,
      stream: hexStream,
    };
    setLogs(prev => [...prev.slice(-30), entry]);
  }, [hexStream]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  const handleManualSend = () => {
    if (!manualInput.trim()) return;
    const parsed = parseManualHexEntry(manualInput, season);
    if (Object.keys(parsed).length === 0) {
      setManualError('فرمت نامعتبر. مثال: 3000:1A2B,3004:0F00');
      return;
    }
    setManualError('');
    setManualHexOverride(parsed);
    setTimeout(clearManualHex, 5000); // auto-clear after 5 s
    setManualInput('');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <Radio size={16} className="text-emerald-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Data Maker — شبیه‌ساز سخت‌افزار</h2>
            <p className="text-[11px] text-[#94a3b8]">Black Box Edge Simulator · {season === 'SUMMER' ? 'پروفایل تابستانی (برق)' : 'پروفایل زمستانی (گاز)'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Data Quality Badge */}
          <span className={`quality-badge ${lastQuality}`}>{lastQuality}</span>
          {/* Decimal selector */}
          <select
            value={decimals}
            onChange={e => setDecimals(Number(e.target.value))}
            className="bg-[#111827] border border-[#1e2d45] text-[#94a3b8] text-xs rounded px-2 py-1 outline-none"
          >
            <option value={2}>2 رقم اعشار</option>
            <option value={4}>4 رقم اعشار</option>
          </select>
          {/* Live indicator */}
          <div className={`flex items-center gap-1.5 text-xs font-['JetBrains_Mono'] ${running ? 'text-green-400' : 'text-gray-500'}`}>
            <div className={`w-2 h-2 rounded-full ${running ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
            {running ? 'LIVE' : 'PAUSED'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Hex Decode Table */}
        <div className="glass-card p-4">
          <div className="section-header mb-3">کانال‌های تله‌متری · Decoded Channels</div>
          <div className="space-y-2">
            {Object.entries(decodedFrame).map(([label, { value, unit, raw, hexCode }]) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-[#1e2d45] last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-['JetBrains_Mono'] text-[#475569] bg-[#111827] px-1.5 py-0.5 rounded">
                    {hexCode}
                  </span>
                  <span className="text-xs text-[#94a3b8] font-['Inter']">{label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-['JetBrains_Mono'] text-[#475569]">
                    0x{toHexString(raw)}
                  </span>
                  <span className="text-sm font-bold font-['JetBrains_Mono'] text-white tabular-nums">
                    {value.toFixed(decimals)}
                    <span className="text-[10px] text-[#94a3b8] font-normal ml-1">{unit}</span>
                  </span>
                </div>
              </div>
            ))}
            {Object.keys(decodedFrame).length === 0 && (
              <div className="text-center text-[#475569] text-xs py-8">
                <Clock size={24} className="mx-auto mb-2 opacity-40" />
                در انتظار فریم اول…
              </div>
            )}
          </div>
        </div>

        {/* Terminal Log */}
        <div className="glass-card p-4 flex flex-col">
          <div className="section-header mb-3">جریان هگز خام · Raw Hex Stream</div>
          <div
            ref={logRef}
            className="hex-terminal flex-1 min-h-[180px] max-h-[280px] overflow-y-auto space-y-1"
          >
            {logs.map((log, i) => (
              <div key={i} className="flex items-start gap-2 text-[11px]">
                <span className="text-[#475569] shrink-0">[{log.ts}]</span>
                <span className={`shrink-0 font-bold`} style={{ color: QUALITY_COLORS[log.quality] }}>
                  {log.quality}
                </span>
                <span className="text-green-300 truncate">{log.stream}</span>
              </div>
            ))}
            {logs.length === 0 && (
              <span className="text-[#475569]">// جریان داده آغاز نشده...</span>
            )}
          </div>

          {/* Manual Entry */}
          <div className="mt-3 pt-3 border-t border-[#1e2d45]">
            <div className="section-header mb-2">ورودی دستی Hex · Manual Hex Entry</div>
            <div className="flex gap-2">
              <input
                className="kap-input flex-1 text-xs"
                value={manualInput}
                onChange={e => setManualInput(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handleManualSend()}
                placeholder="3000:1A2B,3004:0F00"
                spellCheck={false}
              />
              <button onClick={handleManualSend} className="btn-primary text-xs px-3">
                ارسال
              </button>
            </div>
            {manualError && (
              <p className="text-red-400 text-[10px] mt-1 flex items-center gap-1">
                <AlertCircle size={10} /> {manualError}
              </p>
            )}
            <p className="text-[#475569] text-[10px] mt-1">
              فرمت: CODE:HEX,CODE:HEX — مثال: 3003:7530,3004:001E
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
