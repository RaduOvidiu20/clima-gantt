// Logica de bază: normalizare durate, planificare cascadă/paralel, scalare grid.
// Funcții pure, fără dependențe de React — ușor de testat.

export type DurationUnit = "min" | "h" | "d";

const UNIT_HOURS: Record<DurationUnit, number> = { min: 1 / 60, h: 1, d: 24 };

/** Convertește o durată (valoare + unitate) în ore. */
export function toHours(val: number, unit: DurationUnit): number {
  const factor = UNIT_HOURS[unit] ?? 1;
  return Math.max(0, val || 0) * factor;
}

/** Etichetă scurtă pentru durata unui test (ex. „5 zile", „30 min"). */
export function formatDuration(val: number, unit: DurationUnit): string {
  const labels: Record<DurationUnit, [string, string]> = {
    min: ["min", "min"],
    h: ["h", "h"],
    d: ["zi", "zile"],
  };
  const [one, many] = labels[unit] ?? ["", ""];
  const n = val ?? 0;
  return `${trim(n)} ${n === 1 ? one : many}`;
}

export interface TestInput {
  id: string;
  name: string;
  durationVal: number;
  durationUnit: DurationUnit;
  parallel: boolean;
  equipment?: string | null;
  status?: string | null;
}

export interface ScheduledTest extends TestInput {
  startH: number;
  endH: number;
  durationH: number;
  /** true dacă face parte dintr-un grup paralel (≥2 teste bifate consecutiv). */
  inParallelGroup: boolean;
  /** indexul etapei secvențiale (un grup paralel = o singură etapă). */
  stage: number;
}

export interface Schedule {
  tests: ScheduledTest[];
  totalH: number;
}

/**
 * Planifică testele în ordinea dată.
 * - Implicit: cascadă (fiecare începe la finalul celui anterior).
 * - Testele bifate (parallel) consecutiv (≥2) formează un grup paralel: pornesc
 *   împreună, iar etapa ține cât cel mai lung test din grup.
 * - Un test bifat singur (vecini nebifați) se comportă ca în cascadă.
 */
export function schedule(tests: TestInput[]): Schedule {
  const out: ScheduledTest[] = [];
  const n = tests.length;
  let cursor = 0;
  let stage = 0;
  let i = 0;

  while (i < n) {
    const cur = tests[i];
    const next = tests[i + 1];
    const startsGroup = cur.parallel && !!next && next.parallel;

    if (startsGroup) {
      const start = cursor;
      let maxEnd = start;
      let j = i;
      while (j < n && tests[j].parallel) {
        const h = toHours(tests[j].durationVal, tests[j].durationUnit);
        out.push({
          ...tests[j],
          startH: start,
          endH: start + h,
          durationH: h,
          inParallelGroup: true,
          stage,
        });
        maxEnd = Math.max(maxEnd, start + h);
        j++;
      }
      cursor = maxEnd;
      i = j;
    } else {
      const h = toHours(cur.durationVal, cur.durationUnit);
      out.push({
        ...cur,
        startH: cursor,
        endH: cursor + h,
        durationH: h,
        inParallelGroup: false,
        stage,
      });
      cursor += h;
      i++;
    }
    stage++;
  }

  return { tests: out, totalH: cursor };
}

export interface GridTick {
  h: number; // poziția în ore
  label: string; // valoarea în unitatea de afișare
}

export interface GridAxis {
  unit: "ore" | "zile";
  unitHours: number; // 1 sau 24
  totalH: number;
  stepH: number;
  ticks: GridTick[];
}

/** Pas „nice" (1/2/5 × 10^k) astfel încât să rezulte ~targetTicks linii. */
function niceStep(range: number, targetTicks: number): number {
  if (range <= 0) return 1;
  const raw = range / targetTicks;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  let nice: number;
  if (norm < 1.5) nice = 1;
  else if (norm < 3) nice = 2;
  else if (norm < 7) nice = 5;
  else nice = 10;
  return nice * mag;
}

/**
 * Construiește axa de timp relativă, scalată dinamic.
 * Afișează în zile dacă totalul ≥ 48h, altfel în ore.
 */
export function buildAxis(totalH: number, targetTicks = 10): GridAxis {
  const useDays = totalH >= 48;
  const unitHours = useDays ? 24 : 1;
  const unit: "ore" | "zile" = useDays ? "zile" : "ore";
  const totalU = totalH / unitHours;
  const stepH = niceStep(totalU || 1, targetTicks) * unitHours;

  const ticks: GridTick[] = [];
  const last = Math.max(totalH, stepH);
  for (let h = 0; h <= last + 1e-6; h += stepH) {
    ticks.push({ h, label: trim(h / unitHours) });
  }
  return { unit, unitHours, totalH, stepH, ticks };
}

/** Curăță zecimalele inutile (3.0 -> "3", 2.5 -> "2.5"). */
function trim(n: number): string {
  if (!isFinite(n)) return "0";
  return Number.isInteger(n) ? String(n) : Number(n.toFixed(2)).toString();
}
