/**
 * KAP GVL Mapping Engine — MX Register ↔ Farsi Label Mapping
 *
 * PRINCIPLE: Only coded MX addresses travel over the network.
 * Farsi labels are resolved ONLY at UI rendering time.
 * Supports auto-detection of active registers and manual technician overrides.
 */

// ─── Default GVL Binding Table ────────────────────────────────────────────────
export const DEFAULT_GVL_MAP = {
  MX54: { farsiLabel: 'کمپرسور باد',        englishLabel: 'Air Compressor',       type: 'Motor',    area: 'سالن تولید' },
  MX55: { farsiLabel: 'لامپ سالن',           englishLabel: 'Hall Lights',          type: 'Lighting', area: 'سالن اصلی'  },
  MX56: { farsiLabel: 'دستگاه جوش',         englishLabel: 'Welding Machine',      type: 'Process',  area: 'کارگاه'     },
  MX57: { farsiLabel: 'روشنایی اضطراری',    englishLabel: 'Emergency Lighting',   type: 'Safety',   area: 'کل ساختمان' },
  MX58: { farsiLabel: 'دتکتور آتش',         englishLabel: 'Fire Alarm',           type: 'Safety',   area: 'کل ساختمان' },
  MX59: { farsiLabel: 'تهویه مطبوع',        englishLabel: 'HVAC Unit',            type: 'HVAC',     area: 'دفتر'       },
  MX60: { farsiLabel: 'سیستم اعلام حریق',   englishLabel: 'Fire Suppression Sys', type: 'Safety',   area: 'کل ساختمان' },
  MX61: { farsiLabel: 'پمپ آب خنک‌کننده',   englishLabel: 'Cooling Water Pump',   type: 'Utility',  area: 'موتورخانه'  },
  MX62: { farsiLabel: 'ماشین صنعتی شماره ۱', englishLabel: 'Industrial Machine 1', type: 'Process',  area: 'کارگاه'     },
};

/**
 * Create the initial mapping state.
 * @returns {Object}  { MX54: { ...binding, source: 'AUTO'|'MANUAL', active: bool }, ... }
 */
export function buildInitialGVLState() {
  const state = {};
  for (const [addr, binding] of Object.entries(DEFAULT_GVL_MAP)) {
    state[addr] = {
      ...binding,
      address: addr,
      source: 'AUTO',      // 'AUTO' | 'MANUAL'
      active: true,
      customFarsiLabel: null,
    };
  }
  return state;
}

/**
 * Resolve the display label for an MX address.
 * Manual overrides take precedence over auto-detection.
 */
export function resolveLabel(gvlState, address, lang = 'fa') {
  const entry = gvlState[address];
  if (!entry) return address; // Fallback to raw address

  if (entry.source === 'MANUAL' && entry.customFarsiLabel) {
    return lang === 'fa' ? entry.customFarsiLabel : entry.englishLabel;
  }
  return lang === 'fa' ? entry.farsiLabel : entry.englishLabel;
}

/**
 * Apply a technician manual override.
 */
export function applyManualMapping(gvlState, address, farsiLabel) {
  if (!gvlState[address]) return gvlState;
  return {
    ...gvlState,
    [address]: {
      ...gvlState[address],
      source: 'MANUAL',
      customFarsiLabel: farsiLabel,
    },
  };
}

/**
 * Reset a mapping to AUTO (remove manual override).
 */
export function resetToAuto(gvlState, address) {
  if (!gvlState[address]) return gvlState;
  return {
    ...gvlState,
    [address]: {
      ...gvlState[address],
      source: 'AUTO',
      customFarsiLabel: null,
    },
  };
}

/**
 * Auto-detect active registers from load state.
 * Marks registers with any activity in the last N samples as 'active'.
 */
export function autoDetectActive(gvlState, loadState) {
  const updated = { ...gvlState };
  for (const addr of Object.keys(updated)) {
    if (loadState[addr]) {
      updated[addr] = { ...updated[addr], active: loadState[addr].state === 'ON' };
    }
  }
  return updated;
}

/**
 * Add a new custom register (technician adds unknown MX address).
 */
export function addCustomRegister(gvlState, address, farsiLabel, englishLabel = '') {
  return {
    ...gvlState,
    [address]: {
      address,
      farsiLabel,
      englishLabel,
      type: 'Custom',
      area: 'نامشخص',
      source: 'MANUAL',
      active: false,
      customFarsiLabel: farsiLabel,
    },
  };
}

/**
 * Export GVL mapping as JSON string (for backup/download).
 */
export function exportGVLMap(gvlState) {
  return JSON.stringify(gvlState, null, 2);
}

/**
 * Import GVL mapping from JSON string.
 */
export function importGVLMap(jsonStr) {
  try {
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}
