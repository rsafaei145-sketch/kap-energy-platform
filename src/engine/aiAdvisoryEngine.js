/**
 * KAP AI Advisory Engine — Deterministic Farsi Advisory Generator
 *
 * ARCHITECTURE: This module is READ-ONLY with respect to the state engine.
 * It reads engine state and produces Farsi advisory strings.
 * It CANNOT modify state, override thresholds, or generate numbers.
 * All output is advisory/explanatory only.
 */

import { ALERT_STATES } from './hysteresisEngine.js';
import { PEAK_WINDOW_START, PEAK_WINDOW_END } from './loadControlEngine.js';

// ─── Rule Evaluation ─────────────────────────────────────────────────────────

/**
 * Generate Farsi advisory message based on current system state.
 * Rules are evaluated in priority order; first matching rule wins.
 *
 * @param {Object} state  Full KAP state snapshot
 * @returns {{ message: string, severity: 'info'|'warning'|'critical', ruleId: string }}
 */
export function generateAdvisory(state) {
  const {
    alertState,
    simulatedHour,
    season,
    loadState = {},
    deviation_W,
    actual_Power_W,
    target_Power_W,
    baseline_Power_W,
    dataCoverage_pct,
    totalSaving_kWh,
    peakReduction_kW,
    gvlState = {},
  } = state;

  const inPeak    = simulatedHour >= PEAK_WINDOW_START && simulatedHour < PEAK_WINDOW_END;
  const p1OnLoads = Object.entries(loadState).filter(([, l]) => l.priority === 1 && l.state === 'ON');
  const p2OnLoads = Object.entries(loadState).filter(([, l]) => l.priority === 2 && l.state === 'ON');
  const allShed   = Object.values(loadState).filter(l => l.sheddable).every(l => l.state === 'OFF');

  // ── Rule R01: TRIP state ──────────────────────────────────────────────────
  if (alertState === ALERT_STATES.TRIP) {
    return {
      ruleId: 'R01',
      severity: 'critical',
      message:
        `⚠️ سیستم در وضعیت تریپ (TRIP) قرار دارد. مصرف به‌صورت پیوسته از حد مجاز فراتر رفته است. ` +
        `برای بازنشانی، دکمه «تأیید اپراتور» را فشار دهید. ` +
        `انحراف جاری: ${formatW(deviation_W)} نسبت به هدف.`,
    };
  }

  // ── Rule R02: ERROR state ─────────────────────────────────────────────────
  if (alertState === ALERT_STATES.ERROR) {
    return {
      ruleId: 'R02',
      severity: 'critical',
      message:
        `🔴 وضعیت ارور فعال است. مصرف برای چندین نمونه پیوسته بالاتر از آستانه باقی مانده. ` +
        `توصیه می‌شود بارهای اولویت ۲ را بررسی کنید. ` +
        `انحراف: ${formatW(deviation_W)} | هدف: ${formatKW(target_Power_W)}.`,
    };
  }

  // ── Rule R03: Peak window + sheddable loads on ────────────────────────────
  if (inPeak && p1OnLoads.length > 0 && alertState !== ALERT_STATES.NORMAL) {
    const labels = p1OnLoads
      .map(([addr]) => gvlState[addr]?.farsiLabel ?? addr)
      .join('، ');
    return {
      ruleId: 'R03',
      severity: 'warning',
      message:
        `⚡ در پنجره اوج مصرف (${PEAK_WINDOW_START}:۰۰ تا ${PEAK_WINDOW_END}:۰۰) هستیم. ` +
        `خاموش کردن بارهای اولویت ۱ (مانند ${labels}) جهت دستیابی به تارگت توصیه می‌شود. ` +
        `ظرفیت قابل کاهش: ${formatKW(p1OnLoads.reduce((s, [,l]) => s + l.power_W, 0))}.`,
    };
  }

  // ── Rule R04: Peak window active, loads OK ────────────────────────────────
  if (inPeak && alertState === ALERT_STATES.NORMAL) {
    return {
      ruleId: 'R04',
      severity: 'info',
      message:
        `✅ پنجره اوج مصرف فعال است (${PEAK_WINDOW_START}:۰۰–${PEAK_WINDOW_END}:۰۰). ` +
        `مصرف جاری در محدوده هدف قرار دارد. ` +
        `صرفه‌جویی تاکنون: ${totalSaving_kWh?.toFixed(2) ?? '—'} کیلووات‌ساعت.`,
    };
  }

  // ── Rule R05: ALARM state ─────────────────────────────────────────────────
  if (alertState === ALERT_STATES.ALARM) {
    return {
      ruleId: 'R05',
      severity: 'warning',
      message:
        `🟡 آلارم فعال شد. مصرف از خط پایه فراتر رفته. ` +
        `انحراف: ${formatW(deviation_W)} | مصرف واقعی: ${formatKW(actual_Power_W)} ` +
        `| پایه: ${formatKW(baseline_Power_W)}. ` +
        `در صورت ادامه، وضعیت به ارور ارتقا می‌یابد.`,
    };
  }

  // ── Rule R06: Winter season specific ─────────────────────────────────────
  if (season === 'WINTER') {
    return {
      ruleId: 'R06',
      severity: 'info',
      message:
        `🌨️ پروفایل زمستانی (گاز) فعال است. پارامترهای دبی گاز و فشار در حال پایش هستند. ` +
        `این معماری نشان‌دهنده قابلیت «یک معماری، دو فصل» پلتفرم KAP است.`,
    };
  }

  // ── Rule R07: Poor data quality ───────────────────────────────────────────
  if (dataCoverage_pct !== undefined && dataCoverage_pct < 70) {
    return {
      ruleId: 'R07',
      severity: 'warning',
      message:
        `⚠️ پوشش داده GOOD پایین است (${dataCoverage_pct}%). ` +
        `گزارش M&V ممکن است دقت لازم را نداشته باشد. ` +
        `توصیه می‌شود اتصال سنسور و کانال ارتباطی بررسی شود.`,
    };
  }

  // ── Rule R08: All sheddable loads shed ────────────────────────────────────
  if (allShed && inPeak) {
    return {
      ruleId: 'R08',
      severity: 'info',
      message:
        `✅ تمام بارهای قابل خاموشی در پنجره اوج کاهش یافته‌اند. ` +
        `کاهش پیک حداکثری: ${peakReduction_kW?.toFixed(1) ?? '—'} کیلووات. ` +
        `بارهای ایمنی (اولویت ۳) همچنان فعال و محافظت‌شده هستند.`,
    };
  }

  // ── Default: Normal operation ─────────────────────────────────────────────
  return {
    ruleId: 'R00',
    severity: 'info',
    message:
      `✅ سیستم در وضعیت عادی است. ` +
      `مصرف جاری: ${formatKW(actual_Power_W)} | هدف: ${formatKW(target_Power_W)}. ` +
      `صرفه‌جویی تاکنون: ${totalSaving_kWh?.toFixed(2) ?? '0'} کیلووات‌ساعت.`,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatW(w) {
  if (w == null) return '—';
  return `${Math.abs(w).toFixed(0)} W`;
}
function formatKW(w) {
  if (w == null) return '—';
  return `${(w / 1000).toFixed(1)} kW`;
}

/**
 * Generate full advisory history log (for technician view).
 * Returns last N advisories with timestamps.
 */
export function generateAdvisoryLog(stateHistory, maxEntries = 10) {
  return stateHistory
    .slice(-maxEntries)
    .map((s, i) => ({
      index: i,
      timestamp: s.timestamp,
      ...generateAdvisory(s),
    }))
    .reverse();
}
