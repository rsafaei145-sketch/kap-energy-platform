/**
 * KAP Hysteresis Engine — Deterministic Alert State Machine
 *
 * Uses ABSOLUTE DIFFERENCE checks (not == ) for all threshold comparisons.
 * Implements 3-stage industrial pipeline: NORMAL → ALARM → ERROR → TRIP
 * with configurable dwell counters and hysteresis band.
 */

// ─── Constants ────────────────────────────────────────────────────────────────
export const HYSTERESIS_FACTOR = 0.7;     // Exit threshold = Enter × 0.7
export const DEFAULT_DWELL = 3;           // Samples before entering BREACH
export const DEFAULT_ENTER_THRESHOLD = 2000; // W above target to trigger ALARM
export const ERROR_DWELL = 5;             // Consecutive ALARM samples → ERROR
export const TRIP_DWELL = 10;            // Consecutive ERROR samples → TRIP

export const ALERT_STATES = {
  NORMAL: 'NORMAL',
  ALARM:  'ALARM',   // Stage 1 — Yellow
  ERROR:  'ERROR',   // Stage 2 — Orange
  TRIP:   'TRIP',    // Stage 3 — Red flashing (virtual safety trip)
};

/**
 * Create a fresh hysteresis state object.
 */
export function createHysteresisState() {
  return {
    alertState:    ALERT_STATES.NORMAL,
    dwellCount:    0,          // Consecutive confirming samples in BREACH
    exitCount:     0,          // Consecutive samples below exit threshold
    alarmDwell:    0,          // Samples in ALARM state → escalate to ERROR
    errorDwell:    0,          // Samples in ERROR state → escalate to TRIP
    enterThreshold: DEFAULT_ENTER_THRESHOLD,
    exitThreshold:  DEFAULT_ENTER_THRESHOLD * HYSTERESIS_FACTOR,
    lastDeviation: 0,
    inBreach:      false,
  };
}

/**
 * Compute signed deviation.
 * Positive → over-consuming (breach), Negative → conserving
 */
export function computeDeviation(actual_W, target_W) {
  return actual_W - target_W;
}

/**
 * ABSOLUTE DIFFERENCE threshold check — rocket-safe, no exact equality.
 * Returns true if deviation exceeds the enter threshold.
 */
export function isAboveThreshold(actual_W, target_W, enterThreshold) {
  const deviation = computeDeviation(actual_W, target_W);
  // Breach when actual is significantly above target (positive deviation > threshold)
  return deviation > 0 && Math.abs(deviation) > enterThreshold;
}

/**
 * Check if deviation is below exit threshold (for leaving BREACH state).
 */
export function isBelowExitThreshold(actual_W, target_W, exitThreshold) {
  const deviation = computeDeviation(actual_W, target_W);
  return deviation <= 0 || Math.abs(deviation) <= exitThreshold;
}

/**
 * Main state machine tick — call once per telemetry sample.
 *
 * @param {Object} state    Mutable hysteresis state (from createHysteresisState)
 * @param {number} actual_W Current actual power in Watts
 * @param {number} target_W Current target power in Watts
 * @param {number} dwell    Override dwell samples (default DEFAULT_DWELL)
 * @returns {Object}        Updated state (same object, mutated)
 */
export function tickHysteresis(state, actual_W, target_W, dwell = DEFAULT_DWELL) {
  const deviation = computeDeviation(actual_W, target_W);
  state.lastDeviation = deviation;

  const enterThreshold = state.enterThreshold;
  const exitThreshold  = state.exitThreshold;

  const overThreshold = isAboveThreshold(actual_W, target_W, enterThreshold);
  const underExit     = isBelowExitThreshold(actual_W, target_W, exitThreshold);

  // ── Breach detection (dwell-gated entry) ─────────────────────────────────
  if (overThreshold) {
    state.dwellCount++;
    state.exitCount = 0;
  } else if (underExit) {
    state.exitCount++;
    state.dwellCount = 0;
  } else {
    // In hysteresis band — do nothing, maintain current state
    state.exitCount = 0;
    state.dwellCount = 0;
  }

  // ── State transitions ──────────────────────────────────────────────────────
  switch (state.alertState) {
    case ALERT_STATES.NORMAL:
      if (state.dwellCount >= dwell) {
        state.alertState = ALERT_STATES.ALARM;
        state.alarmDwell = 0;
        state.inBreach = true;
      }
      break;

    case ALERT_STATES.ALARM:
      if (state.exitCount > 0) {
        // Reset to NORMAL only after sustained exit
        if (state.exitCount >= dwell) {
          state.alertState = ALERT_STATES.NORMAL;
          state.inBreach = false;
          state.alarmDwell = 0;
        }
      } else {
        state.alarmDwell++;
        if (state.alarmDwell >= ERROR_DWELL) {
          state.alertState = ALERT_STATES.ERROR;
          state.errorDwell = 0;
        }
      }
      break;

    case ALERT_STATES.ERROR:
      if (state.exitCount >= dwell) {
        state.alertState = ALERT_STATES.ALARM; // Step down, not jump to NORMAL
        state.inBreach = true;
        state.alarmDwell = 0;
      } else {
        state.errorDwell++;
        if (state.errorDwell >= TRIP_DWELL) {
          state.alertState = ALERT_STATES.TRIP;
        }
      }
      break;

    case ALERT_STATES.TRIP:
      // TRIP can only be reset by operator acknowledge
      if (state.manualReset) {
        state.alertState = ALERT_STATES.NORMAL;
        state.dwellCount = 0;
        state.exitCount  = 0;
        state.alarmDwell = 0;
        state.errorDwell = 0;
        state.inBreach   = false;
        state.manualReset = false;
      }
      break;
  }

  return state;
}

/**
 * Operator-acknowledge: reset TRIP state.
 */
export function acknowledgeTrip(state) {
  state.manualReset = true;
  return { ...state };
}

/**
 * Reconfigure thresholds and recalculate exit threshold.
 */
export function setThreshold(state, enterThreshold_W) {
  state.enterThreshold = enterThreshold_W;
  state.exitThreshold  = enterThreshold_W * HYSTERESIS_FACTOR;
  return { ...state };
}

/**
 * Get human-readable alert state info for display.
 */
export function getAlertInfo(alertState) {
  const map = {
    NORMAL: { label: 'عادی',  labelEn: 'Normal', color: '#22c55e', bg: '#052e16', flash: false },
    ALARM:  { label: 'آلارم', labelEn: 'Alarm',  color: '#eab308', bg: '#422006', flash: false },
    ERROR:  { label: 'ارور',  labelEn: 'Error',  color: '#f97316', bg: '#431407', flash: false },
    TRIP:   { label: 'تریپ', labelEn: 'Trip',   color: '#ef4444', bg: '#450a0a', flash: true  },
  };
  return map[alertState] ?? map.NORMAL;
}
