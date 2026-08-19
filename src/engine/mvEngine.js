/**
 * KAP M&V Engine — Measurement & Verification Savings Report
 *
 * Computes energy savings using Iran's progressive tariff structure.
 * All calculations are deterministic — no AI/LLM involvement.
 *
 * Tariff tiers based on Iran Ministry of Energy 2023/1402 residential tariff.
 * Pattern baseline: 300 kWh/month.
 */

// ─── Iran Progressive Tariff Structure (Rial/kWh) ────────────────────────────
// Tier multipliers relative to pattern baseline (300 kWh)
export const TARIFF_TIERS = [
  { upToRatio: 1.0,  rialPerKwh: 5_000,  label: 'Tier 1 (≤100%)' },
  { upToRatio: 1.5,  rialPerKwh: 15_000, label: 'Tier 2 (100–150%)' },
  { upToRatio: 2.0,  rialPerKwh: 30_000, label: 'Tier 3 (150–200%)' },
  { upToRatio: Infinity, rialPerKwh: 70_000, label: 'Tier 4 (>200%)' },
];

export const PATTERN_BASELINE_KWH = 300;     // monthly baseline
export const SAMPLE_INTERVAL_SEC  = 10;      // raw sample every 10 seconds
export const AGGREGATION_MIN      = 15;      // 15-minute intervals for decisions
export const PEAK_WINDOW_START_H  = 17;
export const PEAK_WINDOW_END_H    = 22;

/**
 * Compute the Rial price per kWh given a consumption ratio.
 * @param {number} ratio  actual / baseline  (e.g. 1.3 = 130% of pattern)
 */
export function getTariffRate(ratio) {
  for (const tier of TARIFF_TIERS) {
    if (ratio <= tier.upToRatio) return tier.rialPerKwh;
  }
  return TARIFF_TIERS[TARIFF_TIERS.length - 1].rialPerKwh;
}

/**
 * Convert power reading + elapsed time → energy in kWh.
 * @param {number} power_W      Watts
 * @param {number} duration_sec Elapsed seconds
 */
export function powerToKwh(power_W, duration_sec) {
  return (power_W / 1000) * (duration_sec / 3600);
}

/**
 * Compute the M&V savings report from the telemetry history array.
 *
 * @param {Array} history  Array of { timestamp, quality,
 *                           Baseline_Power_W, Actual_Power_W,
 *                           Target_Power_W,  simulatedHour }
 * @returns {Object}  Full M&V report
 */
export function computeMVReport(history) {
  if (!history || history.length < 2) {
    return emptyReport();
  }

  let totalSaving_kWh   = 0;
  let peakReduction_kW  = 0;
  let goodSamples       = 0;
  let peakSamples       = 0;
  let peakSaving_kWh    = 0;
  let totalBaseline_kWh = 0;
  let totalActual_kWh   = 0;

  const intervalLog = [];

  for (let i = 1; i < history.length; i++) {
    const prev = history[i - 1];
    const curr = history[i];
    const dt   = (curr.timestamp - prev.timestamp) / 1000; // seconds

    if (curr.quality !== 'GOOD' && curr.quality !== 'SUSPECT') continue;
    if (curr.quality === 'GOOD') goodSamples++;

    const baseline_kWh = powerToKwh(curr.Baseline_Power_W ?? 35000, dt);
    const actual_kWh   = powerToKwh(curr.Actual_Power_W   ?? 30000, dt);
    const saving_kWh   = baseline_kWh - actual_kWh;

    totalBaseline_kWh += baseline_kWh;
    totalActual_kWh   += actual_kWh;
    totalSaving_kWh   += saving_kWh;

    // Peak window stats
    const inPeak = curr.simulatedHour >= PEAK_WINDOW_START_H &&
                   curr.simulatedHour <  PEAK_WINDOW_END_H;
    if (inPeak) {
      peakSamples++;
      peakSaving_kWh += saving_kWh;

      // Peak reduction = max demand shaved (kW)
      const reduction_kW = (curr.Baseline_Power_W - curr.Actual_Power_W) / 1000;
      if (reduction_kW > peakReduction_kW) peakReduction_kW = reduction_kW;
    }

    intervalLog.push({
      timestamp:    curr.timestamp,
      hour:         curr.simulatedHour,
      saving_kWh:   parseFloat(saving_kWh.toFixed(4)),
      actual_kW:    parseFloat((curr.Actual_Power_W / 1000).toFixed(2)),
      baseline_kW:  parseFloat((curr.Baseline_Power_W / 1000).toFixed(2)),
      inPeak,
      quality:      curr.quality,
    });
  }

  // Determine tariff tier for monetary calculation
  const consumptionRatio = totalActual_kWh / PATTERN_BASELINE_KWH;
  const rialPerKwh       = getTariffRate(consumptionRatio);
  const monetarySaving_R = totalSaving_kWh * rialPerKwh;
  const dataCoverage_pct = history.length > 0
    ? parseFloat(((goodSamples / history.length) * 100).toFixed(1))
    : 0;

  return {
    totalSaving_kWh:   parseFloat(totalSaving_kWh.toFixed(3)),
    peakReduction_kW:  parseFloat(peakReduction_kW.toFixed(2)),
    monetarySaving_R:  Math.round(monetarySaving_R),
    dataCoverage_pct,
    totalBaseline_kWh: parseFloat(totalBaseline_kWh.toFixed(3)),
    totalActual_kWh:   parseFloat(totalActual_kWh.toFixed(3)),
    consumptionRatio:  parseFloat(consumptionRatio.toFixed(2)),
    rialPerKwh,
    sampleCount:       history.length,
    goodSamples,
    peakSamples,
    peakSaving_kWh:    parseFloat(peakSaving_kWh.toFixed(3)),
    intervalLog,
    generatedAt:       Date.now(),
  };
}

function emptyReport() {
  return {
    totalSaving_kWh: 0, peakReduction_kW: 0, monetarySaving_R: 0,
    dataCoverage_pct: 0, totalBaseline_kWh: 0, totalActual_kWh: 0,
    consumptionRatio: 0, rialPerKwh: 5000, sampleCount: 0,
    goodSamples: 0, peakSamples: 0, peakSaving_kWh: 0,
    intervalLog: [], generatedAt: Date.now(),
  };
}

/**
 * Format a number as Farsi Rial string.
 */
export function formatRial(amount) {
  return new Intl.NumberFormat('fa-IR').format(Math.round(amount)) + ' ریال';
}

/**
 * Generate a CSV string from the interval log.
 */
export function exportReportCSV(report) {
  const header = 'Timestamp,Hour,Actual_kW,Baseline_kW,Saving_kWh,InPeak,Quality\n';
  const rows = report.intervalLog.map(r =>
    [
      new Date(r.timestamp).toISOString(),
      r.hour,
      r.actual_kW,
      r.baseline_kW,
      r.saving_kWh,
      r.inPeak ? 'YES' : 'NO',
      r.quality,
    ].join(',')
  );
  return header + rows.join('\n');
}
