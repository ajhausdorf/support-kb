// What a #4471 report shows, not where it was merged. Pages explain it; this file is what runs.
import { causeOf, uniqueById, type Report, type Tenant } from '#lib/kb/causes';

// `parser` and `hint` are causes.ts. `shift` is a date moved by one day, not flipped: neither
// cause produces that, so a report the desk read as a one-day move (desk-notes.json) is its own problem.
export type Problem = 'parser' | 'hint' | 'shift' | 'unplaced';
export const PROBLEMS: readonly Problem[] = ['parser', 'hint', 'shift', 'unplaced'];

export function problemOf(r: Report, t: Tenant | undefined, oneDayMove: readonly string[]): Problem {
  if (oneDayMove.includes(r.id)) return 'shift';
  return causeOf(r, t) ?? 'unplaced';
}

export type ProblemGroup = {
  problem: Problem;
  reports: number;
  tenants: number;
  firstSeen: string;
  lastSeen: string;
  // How many of these intake tagged with a cause other than this one.
  mistagged: number;
};

export function splitTicket(
  all: Report[],
  ticket: number,
  tenantOf: (r: Report) => Tenant | undefined,
  oneDayMove: readonly string[],
): { merged: number; groups: ProblemGroup[] } {
  const merged = uniqueById(all).filter((r) => r.mergedInto === ticket);
  const groups = PROBLEMS.map((problem) => {
    const rs = merged.filter((r) => problemOf(r, tenantOf(r), oneDayMove) === problem);
    const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
    return {
      problem,
      reports: rs.length,
      tenants: new Set(rs.map((r) => r.tenant)).size,
      firstSeen: days[0],
      lastSeen: days[days.length - 1],
      mistagged: rs.filter((r) => r.meta.intakeTag !== problem).length,
    };
  }).filter((g) => g.reports > 0);
  return { merged: merged.length, groups };
}
