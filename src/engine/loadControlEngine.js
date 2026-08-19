/**
 * KAP Load Control Engine — Peak Window & Priority Shedding
 *
 * All MX register addresses are the ONLY identifiers transmitted over network.
 * Farsi labels are applied ONLY at UI rendering time via GVL mapping.
 * Priority 3 (life-safety) loads are hard-coded as NON-SHEDDABLE.
 */

// ─── MX Register Definitions ─────────────────────────────────────────────────
export const MX_REGISTERS = {
  MX54: { address: 'MX54', priority: 2, sheddable: true,  isLifeSafety: false, defaultPower_W: 7500  },
  MX55: { address: 'MX55', priority: 1, sheddable: true,  isLifeSafety: false, defaultPower_W: 3200  },
  MX56: { address: 'MX56', priority: 2, sheddable: true,  isLifeSafety: false, defaultPower_W: 5400  },
  MX57: { address: 'MX57', priority: 3, sheddable: false, isLifeSafety: true,  defaultPower_W: 800   },
  MX58: { address: 'MX58', priority: 3, sheddable: false, isLifeSafety: true,  defaultPower_W: 400   },
  MX59: { address: 'MX59', priority: 1, sheddable: true,  isLifeSafety: false, defaultPower_W: 2100  },
  MX60: { address: 'MX60', priority: 3, sheddable: false, isLifeSafety: true,  defaultPower_W: 1200  },
  MX61: { address: 'MX61', priority: 1, sheddable: true,  isLifeSafety: false, defaultPower_W: 1800  },
  MX62: { address: 'MX62', priority: 2, sheddable: true,  isLifeSafety: false, defaultPower_W: 9800  },
};

// ─── Peak Window Configuration ────────────────────────────────────────────────
export const PEAK_WINDOW_START = 17;  // 17:00
export const PEAK_WINDOW_END   = 22;  // 22:00

/**
 * Determine if simulated time is within the peak window.
 * @param {number} simulatedHour  0-23
 * @returns {boolean}
 */
export function isPeakWindow(simulatedHour) {
  return simulatedHour >= PEAK_WINDOW_START && simulatedHour < PEAK_WINDOW_END;
}

/**
 * Build the initial load state for all MX registers.
 * @returns {Object}  { MX54: { ...def, state: 'ON', power_W }, ... }
 */
export function buildInitialLoadState() {
  const state = {};
  for (const [addr, def] of Object.entries(MX_REGISTERS)) {
    state[addr] = {
      ...def,
      state: 'ON',
      power_W: def.defaultPower_W,
      lastToggleTime: null,
      preShutdownPower_W: null,
      postShutdownVoltage_V: null,
    };
  }
  return state;
}

/**
 * Compute total active load power.
 */
export function computeTotalLoad(loadState) {
  return Object.values(loadState)
    .filter(l => l.state === 'ON')
    .reduce((sum, l) => sum + l.power_W, 0);
}

/**
 * Toggle a specific MX register ON/OFF (shared memory command).
 * Life-safety loads CANNOT be toggled off regardless of command.
 *
 * @param {Object} loadState   Current load state
 * @param {string} address     e.g. 'MX54'
 * @param {string} command     'ON' | 'OFF'
 * @param {number} voltage_V   Current voltage reading (for recording post-shutdown)
 * @returns {Object}           Updated load state (new object)
 */
export function toggleLoad(loadState, address, command, voltage_V = 220) {
  const load = loadState[address];
  if (!load) return loadState;

  // HARD BLOCK: Life-safety loads can never be shed
  if (load.isLifeSafety && command === 'OFF') {
    console.warn(`[LoadControl] BLOCKED: ${address} is life-safety — cannot shed.`);
    return loadState;
  }

  const newLoad = { ...load };
  const prevState = load.state;

  if (command === 'OFF' && prevState === 'ON') {
    newLoad.preShutdownPower_W    = load.power_W;
    newLoad.postShutdownVoltage_V = voltage_V;
    newLoad.lastToggleTime        = Date.now();
    newLoad.state = 'OFF';
  } else if (command === 'ON' && prevState === 'OFF') {
    newLoad.lastToggleTime = Date.now();
    newLoad.state = 'ON';
  }

  return { ...loadState, [address]: newLoad };
}

/**
 * Auto-shed loads by priority during peak window.
 * Sheds Priority 1 first, then Priority 2. NEVER sheds Priority 3.
 *
 * @param {Object} loadState
 * @param {number} targetReduction_W  How much power to shed
 * @param {number} voltage_V
 * @returns {{ newLoadState, shedLog: Array }}
 */
export function autoShedLoads(loadState, targetReduction_W, voltage_V = 220) {
  const shedLog = [];
  let shedded = 0;
  let newState = { ...loadState };

  // Sort sheddable ON-loads by priority (1 = shed first)
  const candidates = Object.entries(newState)
    .filter(([, l]) => l.sheddable && !l.isLifeSafety && l.state === 'ON')
    .sort(([, a], [, b]) => a.priority - b.priority);

  for (const [addr, load] of candidates) {
    if (shedded >= targetReduction_W) break;
    newState = toggleLoad(newState, addr, 'OFF', voltage_V);
    shedded += load.power_W;
    shedLog.push({ address: addr, power_W: load.power_W, action: 'SHED' });
  }

  return { newLoadState: newState, shedLog, totalShed_W: shedded };
}

/**
 * Compute load summary for display.
 */
export function getLoadSummary(loadState) {
  const loads = Object.values(loadState);
  return {
    total:   loads.length,
    on:      loads.filter(l => l.state === 'ON').length,
    off:     loads.filter(l => l.state === 'OFF').length,
    total_W: computeTotalLoad(loadState),
    p1_on:   loads.filter(l => l.priority === 1 && l.state === 'ON').length,
    p2_on:   loads.filter(l => l.priority === 2 && l.state === 'ON').length,
    p3_on:   loads.filter(l => l.priority === 3 && l.state === 'ON').length,
  };
}
