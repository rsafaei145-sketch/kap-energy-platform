/**
 * KAP Telemetry Engine — Deterministic Logic Only
 * Decodes 16-bit Hex codes → real-world values with data quality tagging.
 * NEVER produces advisory text — that is the AI layer's responsibility.
 */

// ─── Hex Code Registry ────────────────────────────────────────────────────────
export const HEX_CODES = {
  SUMMER: {
    '3000': { label: 'Voltage_V',        scale: 0.1,   unit: 'V',     min: 100, max: 500 },
    '3001': { label: 'Current_A',        scale: 0.01,  unit: 'A',     min: 0,   max: 1000 },
    '3002': { label: 'PowerFactor',      scale: 0.001, unit: '',      min: 0,   max: 1 },
    '3003': { label: 'Actual_Power_W',   scale: 1,     unit: 'W',     min: 0,   max: 500000 },
    '3004': { label: 'Actual_Demand_kW', scale: 0.001, unit: 'kW',    min: 0,   max: 500 },
    '3005': { label: 'Frequency_Hz',     scale: 0.01,  unit: 'Hz',    min: 45,  max: 65 },
    '2100': { label: 'StatusFlags',      scale: 1,     unit: 'flags', min: 0,   max: 65535 },
  },
  WINTER: {
    '3100': { label: 'GasFlow_m3h',      scale: 0.01,  unit: 'm³/h',  min: 0,   max: 10000 },
    '3101': { label: 'GasPressure_psi',  scale: 0.1,   unit: 'psi',   min: 0,   max: 300 },
    '3102': { label: 'GasTemp_C',        scale: 0.1,   unit: '°C',    min: -20, max: 80 },
    '3103': { label: 'GasEnergy_kWh',    scale: 0.1,   unit: 'kWh',   min: 0,   max: 100000 },
    '3104': { label: 'GasDemand_m3h',    scale: 0.01,  unit: 'm³/h',  min: 0,   max: 5000 },
    '2100': { label: 'StatusFlags',      scale: 1,     unit: 'flags', min: 0,   max: 65535 },
  }
};

// ─── Seasonal Profile Generators ─────────────────────────────────────────────
const SUMMER_BASE = {
  voltage: 220,   // V
  current: 150,   // A
  pf: 0.92,
  power: 30000,   // W  (baseline ~30 kW)
  demand: 30,     // kW
  freq: 50,
};

const WINTER_BASE = {
  gasFlow: 450,   // m³/h
  gasPressure: 60, // psi
  gasTemp: 18,
  gasEnergy: 150,
  gasDemand: 350,
};

/**
 * Generate one raw telemetry frame (all channels, given season).
 * @param {string} season  'SUMMER' | 'WINTER'
 * @param {Object} overrides  partial state overrides (e.g. from load shedding)
 * @returns {Object} rawFrame  { hexCode -> rawValue (integer 0-65535) }
 */
export function generateRawFrame(season, overrides = {}) {
  const t = Date.now() / 1000;
  const noise = () => (Math.random() - 0.5) * 0.04; // ±2% noise

  if (season === 'SUMMER') {
    const power = (overrides.power ?? SUMMER_BASE.power) * (1 + noise());
    const voltage = SUMMER_BASE.voltage * (1 + noise() * 0.5);
    const current = (power / (voltage * SUMMER_BASE.pf)) * (1 + noise() * 0.3);
    const pf = Math.min(1, SUMMER_BASE.pf * (1 + noise() * 0.2));
    const freq = 50 + Math.sin(t * 0.1) * 0.15;

    return {
      '3000': Math.round(voltage / 0.1),
      '3001': Math.round(current / 0.01),
      '3002': Math.round(pf / 0.001),
      '3003': Math.round(power / 1),
      '3004': Math.round((power / 1000) / 0.001),
      '3005': Math.round(freq / 0.01),
      '2100': overrides.statusFlags ?? 0x0001,
    };
  } else {
    const gasFlow = (overrides.gasFlow ?? WINTER_BASE.gasFlow) * (1 + noise());
    const gasPressure = WINTER_BASE.gasPressure * (1 + noise() * 0.3);
    const gasTemp = WINTER_BASE.gasTemp + noise() * 5;
    const gasEnergy = WINTER_BASE.gasEnergy * (1 + noise() * 0.1);
    const gasDemand = (overrides.gasFlow ?? WINTER_BASE.gasDemand) * 0.8 * (1 + noise());

    return {
      '3100': Math.round(gasFlow / 0.01),
      '3101': Math.round(gasPressure / 0.1),
      '3102': Math.round(gasTemp / 0.1),
      '3103': Math.round(gasEnergy / 0.1),
      '3104': Math.round(gasDemand / 0.01),
      '2100': overrides.statusFlags ?? 0x0001,
    };
  }
}

/**
 * Decode a raw hex frame into engineering-unit values.
 * @param {Object} rawFrame   { hexCode -> integer }
 * @param {string} season     'SUMMER' | 'WINTER'
 * @param {number} decimals   2 or 4
 * @returns {Object}          { label -> { value, unit, raw, hexCode } }
 */
export function decodeFrame(rawFrame, season, decimals = 2) {
  const registry = HEX_CODES[season];
  const result = {};

  for (const [code, raw] of Object.entries(rawFrame)) {
    const def = registry[code];
    if (!def) continue;
    const value = parseFloat((raw * def.scale).toFixed(decimals));
    result[def.label] = { value, unit: def.unit, raw, hexCode: code };
  }

  return result;
}

// ─── Data Quality Assessment ──────────────────────────────────────────────────
const RATE_OF_CHANGE_LIMITS = {
  Actual_Power_W:   50000,   // W/sample max
  Voltage_V:        30,      // V/sample max
  GasFlow_m3h:      500,     // m³/h per sample
};

/**
 * Assess data quality for a decoded frame against the previous frame.
 * @param {Object} current  decoded frame
 * @param {Object} previous decoded frame (or null)
 * @param {number} staleSampleCount consecutive missed samples
 * @returns {'GOOD'|'SUSPECT'|'INVALID'|'STALE'}
 */
export function assessQuality(current, previous, staleSampleCount = 0) {
  if (staleSampleCount >= 3) return 'STALE';

  // Check for missing or negative critical values
  const powerKey = current['Actual_Power_W'] ?? current['GasFlow_m3h'];
  if (!powerKey || powerKey.value == null || powerKey.value < 0) return 'INVALID';

  // Check rate of change
  if (previous) {
    for (const [label, limit] of Object.entries(RATE_OF_CHANGE_LIMITS)) {
      if (current[label] && previous[label]) {
        const roc = Math.abs(current[label].value - previous[label].value);
        if (roc > limit) return 'SUSPECT';
      }
    }
  }

  return 'GOOD';
}

/**
 * Format a raw integer value as a padded 4-digit hex string.
 */
export function toHexString(value) {
  return value.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Build the hex stream display string for a raw frame.
 */
export function buildHexStream(rawFrame) {
  return Object.entries(rawFrame)
    .map(([code, val]) => `[${code}] → 0x${toHexString(val)}`)
    .join('  |  ');
}

/**
 * Parse a user-entered hex string into a raw frame override.
 * Format: "3000:1A2B,3004:0F00" or just "1A2B" (applied to first channel)
 */
export function parseManualHexEntry(input, season) {
  const registry = HEX_CODES[season];
  const result = {};

  if (input.includes(':')) {
    const pairs = input.split(',');
    for (const pair of pairs) {
      const [code, hex] = pair.trim().split(':');
      if (registry[code]) {
        result[code] = parseInt(hex, 16);
      }
    }
  }

  return result;
}
