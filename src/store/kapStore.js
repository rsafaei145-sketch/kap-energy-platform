/**
 * KAP Global Store — Zustand with LocalStorage Persistence
 *
 * Single source of truth for all platform state.
 * Engine ticks update this store; UI reads from it.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { buildInitialLoadState } from '../engine/loadControlEngine.js';
import { buildInitialGVLState  } from '../engine/gvlMappingEngine.js';
import {
  createHysteresisState,
  tickHysteresis,
  acknowledgeTrip,
  setThreshold,
  ALERT_STATES,
} from '../engine/hysteresisEngine.js';
import {
  generateRawFrame,
  decodeFrame,
  assessQuality,
  buildHexStream,
} from '../engine/telemetryEngine.js';
import { computeDeviation } from '../engine/hysteresisEngine.js';
import { computeMVReport }  from '../engine/mvEngine.js';
import { generateAdvisory } from '../engine/aiAdvisoryEngine.js';
import { toggleLoad, computeTotalLoad } from '../engine/loadControlEngine.js';
import { isPeakWindow }     from '../engine/loadControlEngine.js';
import {
  applyManualMapping,
  resetToAuto,
  autoDetectActive,
} from '../engine/gvlMappingEngine.js';

// ─── Constants ────────────────────────────────────────────────────────────────
const BASELINE_POWER_W = 35000;
const INITIAL_TARGET_W = 28000;
const MAX_HISTORY = 500;

const INITIAL_SIM_HOUR = 17; // Start at peak window for demo

// ─── Initial State ────────────────────────────────────────────────────────────
const getInitialState = () => ({
  // Meta
  persona:       'expert',  // 'user' | 'expert' | 'technician'
  season:        'SUMMER',  // 'SUMMER' | 'WINTER'
  decimals:      2,
  simulatedHour: INITIAL_SIM_HOUR,
  simulatedMinute: 0,
  running:       true,

  // Telemetry
  rawFrame:          {},
  decodedFrame:      {},
  hexStream:         '',
  manualHexOverride: null,
  lastQuality:       'GOOD',
  staleSampleCount:  0,

  // Power state
  actual_Power_W:   BASELINE_POWER_W * 0.9,
  baseline_Power_W: BASELINE_POWER_W,
  target_Power_W:   INITIAL_TARGET_W,
  deviation_W:      0,

  // Hysteresis
  hysteresisState: createHysteresisState(),
  alertState: ALERT_STATES.NORMAL,

  // Loads
  loadState: buildInitialLoadState(),

  // GVL Mapping
  gvlState: buildInitialGVLState(),

  // History (telemetry log)
  history: [],

  // M&V Report
  mvReport: null,

  // AI Advisory
  advisory: { message: '', severity: 'info', ruleId: 'R00' },
  advisoryLog: [],

  // Network / expert stats
  payloadSizeKB:  0,
  onlineClients:  3,
  connectedFleets: 4,

  // Dispatching zones
  zones: [
    { id: 'Z1', name: 'زون ۱ – غرب', status: 'healthy',  devices: 12, load_kW: 45 },
    { id: 'Z2', name: 'زون ۲ – مرکز', status: 'warning', devices: 8,  load_kW: 62 },
    { id: 'Z3', name: 'زون ۳ – شمال', status: 'healthy', devices: 15, load_kW: 38 },
    { id: 'Z4', name: 'زون ۴ – جنوب', status: 'critical',devices: 6,  load_kW: 71 },
    { id: 'Z5', name: 'زون ۵ – شرق',  status: 'healthy', devices: 10, load_kW: 29 },
    { id: 'Z6', name: 'زون ۶ – پایلوت A', status: 'warning', devices: 9, load_kW: 55 },
  ],
});

// ─── Store Definition ─────────────────────────────────────────────────────────
export const useKapStore = create(
  persist(
    (set, get) => ({
      ...getInitialState(),

      // ── Persona / Settings ───────────────────────────────────────────────
      setPersona: (persona) => set({ persona }),
      setSeason:  (season)  => set({ season }),
      setDecimals:(decimals)=> set({ decimals }),
      setTarget:  (target_Power_W) => set({ target_Power_W }),
      toggleRunning: () => set(s => ({ running: !s.running })),

      // ── Simulated Clock ──────────────────────────────────────────────────
      tickClock: () => set(s => {
        let min = s.simulatedMinute + 1;
        let hr  = s.simulatedHour;
        if (min >= 60) { min = 0; hr = (hr + 1) % 24; }
        return { simulatedHour: hr, simulatedMinute: min };
      }),
      setSimulatedHour: (h) => set({ simulatedHour: h, simulatedMinute: 0 }),

      // ── Manual Hex Entry ─────────────────────────────────────────────────
      setManualHexOverride: (frame) => set({ manualHexOverride: frame }),
      clearManualHex:       ()      => set({ manualHexOverride: null }),

      // ── Main Telemetry Tick ──────────────────────────────────────────────
      // Called every 2 seconds by the simulator interval
      telemetryTick: () => {
        const s = get();
        if (!s.running) return;

        const { season, decimals, loadState, hysteresisState,
                target_Power_W, history, manualHexOverride,
                simulatedHour, staleSampleCount, gvlState } = s;

        // 1. Generate or use manual frame
        const totalLoad_W = computeTotalLoad(loadState);
        const rawFrame = manualHexOverride
          ? { ...generateRawFrame(season, { power: totalLoad_W }), ...manualHexOverride }
          : generateRawFrame(season, { power: totalLoad_W });

        const hexStream   = buildHexStream(rawFrame);
        const decodedFrame = decodeFrame(rawFrame, season, decimals);

        // 2. Extract key metrics from decoded frame
        const actual_Power_W = season === 'SUMMER'
          ? (decodedFrame['Actual_Power_W']?.value ?? totalLoad_W)
          : (decodedFrame['GasFlow_m3h']?.value ?? 0) * 9.5; // gas kW equiv

        // 3. Data quality
        const lastFrame = history[history.length - 1];
        const lastDecoded = lastFrame?.decodedFrame ?? null;
        const quality = assessQuality(decodedFrame, lastDecoded, staleSampleCount);
        const newStale = quality === 'STALE' ? staleSampleCount + 1 : 0;

        // 4. Deviation
        const deviation_W = computeDeviation(actual_Power_W, target_Power_W);

        // 5. Hysteresis tick
        const newHysteresis = tickHysteresis(
          { ...hysteresisState },
          actual_Power_W,
          target_Power_W
        );

        // 6. Payload size estimate (bytes of raw JSON frame)
        const payloadSizeKB = parseFloat(
          (JSON.stringify(rawFrame).length / 1024).toFixed(2)
        );

        // 7. Build history record
        const record = {
          timestamp: Date.now(),
          simulatedHour,
          quality,
          Actual_Power_W:   actual_Power_W,
          Baseline_Power_W: s.baseline_Power_W,
          Target_Power_W:   target_Power_W,
          deviation_W,
          decodedFrame,
          alertState: newHysteresis.alertState,
        };

        const newHistory = [...history.slice(-MAX_HISTORY + 1), record];

        // 8. Update M&V report (every 10 samples or on demand)
        const mvReport = newHistory.length % 10 === 0
          ? computeMVReport(newHistory)
          : s.mvReport;

        // 9. Generate AI advisory
        const advisory = generateAdvisory({
          alertState:       newHysteresis.alertState,
          simulatedHour,
          season,
          loadState,
          deviation_W,
          actual_Power_W,
          target_Power_W,
          baseline_Power_W: s.baseline_Power_W,
          dataCoverage_pct: mvReport?.dataCoverage_pct,
          totalSaving_kWh:  mvReport?.totalSaving_kWh,
          peakReduction_kW: mvReport?.peakReduction_kW,
          gvlState,
        });

        // 10. Update GVL active status
        const updatedGvlState = autoDetectActive(gvlState, loadState);

        set({
          rawFrame,
          decodedFrame,
          hexStream,
          actual_Power_W,
          deviation_W,
          lastQuality:    quality,
          staleSampleCount: newStale,
          hysteresisState: newHysteresis,
          alertState:     newHysteresis.alertState,
          history:        newHistory,
          mvReport:       mvReport ?? s.mvReport,
          advisory,
          payloadSizeKB,
          onlineClients:  Math.max(1, s.onlineClients + Math.round((Math.random() - 0.5))),
          gvlState:       updatedGvlState,
        });
      },

      // ── Load Control ─────────────────────────────────────────────────────
      toggleLoadSwitch: (address, command) => {
        const s = get();
        const voltage = s.decodedFrame['Voltage_V']?.value ?? 220;
        const newLoadState = toggleLoad(s.loadState, address, command, voltage);
        set({ loadState: newLoadState });
      },

      // ── Hysteresis Control ────────────────────────────────────────────────
      acknowledgeTrip: () => set(s => ({
        hysteresisState: acknowledgeTrip({ ...s.hysteresisState }),
      })),
      setEnterThreshold: (w) => set(s => ({
        hysteresisState: setThreshold({ ...s.hysteresisState }, w),
      })),

      // ── GVL Mapping ───────────────────────────────────────────────────────
      applyGVLMapping: (address, farsiLabel) => set(s => ({
        gvlState: applyManualMapping(s.gvlState, address, farsiLabel),
      })),
      resetGVLMapping: (address) => set(s => ({
        gvlState: resetToAuto(s.gvlState, address),
      })),

      // ── M&V Report ────────────────────────────────────────────────────────
      recomputeMVReport: () => set(s => ({
        mvReport: computeMVReport(s.history),
      })),

      // ── Reset ─────────────────────────────────────────────────────────────
      hardReset: () => set(getInitialState()),
    }),

    {
      name: 'kap-platform-state',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        // Persist only essential state (avoid persisting large history arrays)
        persona:        s.persona,
        season:         s.season,
        decimals:       s.decimals,
        target_Power_W: s.target_Power_W,
        gvlState:       s.gvlState,
        simulatedHour:  s.simulatedHour,
        loadState:      s.loadState,
      }),
    }
  )
);
