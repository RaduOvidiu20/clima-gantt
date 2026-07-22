"use client";

import type { TestRow, TestPatch } from "@/lib/types";
import { STATUSES, STATUS_LABELS } from "@/lib/types";
import type { DurationUnit } from "@/lib/schedule";

const UNITS: { value: DurationUnit; label: string }[] = [
  { value: "min", label: "min" },
  { value: "h", label: "ore" },
  { value: "d", label: "zile" },
];

interface Props {
  tests: TestRow[];
  onLocal: (id: string, patch: Partial<TestRow>) => void;
  onSave: (id: string, patch: TestPatch) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onMove: (id: string, dir: "up" | "down") => void;
  pending: boolean;
  canEdit: boolean;
}

const inputCls =
  "w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:border-blue-500 focus:outline-none";

export function TestTable({
  tests,
  onLocal,
  onSave,
  onAdd,
  onDelete,
  onMove,
  pending,
  canEdit,
}: Props) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h2 className="font-semibold">Teste</h2>
        {canEdit && (
          <button
            onClick={onAdd}
            disabled={pending}
            className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            + Adaugă test
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="w-16 px-2 py-2">Ordine</th>
              <th className="w-16 px-2 py-2 text-center" title="Rulează în paralel">
                Paralel
              </th>
              <th className="px-2 py-2">Nume</th>
              <th className="px-2 py-2">Descriere</th>
              <th className="w-40 px-2 py-2">Durată</th>
              <th className="px-2 py-2">Notă</th>
              <th className="w-32 px-2 py-2">Status</th>
              <th className="px-2 py-2">Echipament</th>
              <th className="w-12 px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {tests.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                  Niciun test. Apasă &bdquo;Adaugă test&rdquo; pentru a începe.
                </td>
              </tr>
            ) : (
              tests.map((t, i) => (
                <tr
                  key={t.id}
                  className="border-t border-slate-100 align-top hover:bg-slate-50/60"
                >
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-1">
                      <span className="w-5 text-slate-400">{i + 1}</span>
                      <div className="flex flex-col">
                        <button
                          onClick={() => onMove(t.id, "up")}
                          disabled={i === 0 || !canEdit}
                          className="leading-none text-slate-400 hover:text-slate-700 disabled:opacity-30"
                          title="Sus"
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => onMove(t.id, "down")}
                          disabled={i === tests.length - 1 || !canEdit}
                          className="leading-none text-slate-400 hover:text-slate-700 disabled:opacity-30"
                          title="Jos"
                        >
                          ▼
                        </button>
                      </div>
                    </div>
                  </td>

                  <td className="px-2 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={t.parallel}
                      onChange={(e) => onSave(t.id, { parallel: e.target.checked })}
                      disabled={!canEdit}
                      className="h-4 w-4 accent-blue-600 disabled:opacity-50"
                    />
                  </td>

                  <td className="px-2 py-2">
                    <input
                      value={t.name}
                      onChange={(e) => onLocal(t.id, { name: e.target.value })}
                      onBlur={(e) => onSave(t.id, { name: e.target.value })}
                      disabled={!canEdit}
                      className={`${inputCls} disabled:bg-slate-50 disabled:text-slate-500`}
                    />
                  </td>

                  <td className="px-2 py-2">
                    <input
                      value={t.description ?? ""}
                      onChange={(e) =>
                        onLocal(t.id, { description: e.target.value })
                      }
                      onBlur={(e) => onSave(t.id, { description: e.target.value })}
                      disabled={!canEdit}
                      className={`${inputCls} disabled:bg-slate-50 disabled:text-slate-500`}
                      placeholder="…"
                    />
                  </td>

                  <td className="px-2 py-2">
                    <div className="flex gap-1">
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={t.durationVal}
                        onChange={(e) =>
                          onLocal(t.id, {
                            durationVal: e.target.valueAsNumber || 0,
                          })
                        }
                        onBlur={(e) =>
                          onSave(t.id, {
                            durationVal: e.target.valueAsNumber || 0,
                          })
                        }
                        disabled={!canEdit}
                        className={`${inputCls} w-20 disabled:bg-slate-50 disabled:text-slate-500`}
                      />
                      <select
                        value={t.durationUnit}
                        onChange={(e) =>
                          onSave(t.id, {
                            durationUnit: e.target.value as DurationUnit,
                          })
                        }
                        disabled={!canEdit}
                        className={`${inputCls} w-20 disabled:bg-slate-50 disabled:text-slate-500`}
                      >
                        {UNITS.map((u) => (
                          <option key={u.value} value={u.value}>
                            {u.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>

                  <td className="px-2 py-2">
                    <input
                      value={t.note ?? ""}
                      onChange={(e) => onLocal(t.id, { note: e.target.value })}
                      onBlur={(e) => onSave(t.id, { note: e.target.value })}
                      disabled={!canEdit}
                      className={`${inputCls} disabled:bg-slate-50 disabled:text-slate-500`}
                      placeholder="mesaj…"
                    />
                  </td>

                  <td className="px-2 py-2">
                    <select
                      value={t.status}
                      onChange={(e) => onSave(t.id, { status: e.target.value })}
                      disabled={!canEdit}
                      className={`${inputCls} disabled:bg-slate-50 disabled:text-slate-500`}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="px-2 py-2">
                    <input
                      value={t.equipment ?? ""}
                      onChange={(e) =>
                        onLocal(t.id, { equipment: e.target.value })
                      }
                      onBlur={(e) => onSave(t.id, { equipment: e.target.value })}
                      disabled={!canEdit}
                      className={`${inputCls} disabled:bg-slate-50 disabled:text-slate-500`}
                      placeholder="ex. Camera climatică 1"
                    />
                  </td>

                  <td className="px-2 py-2 text-center">
                    {canEdit && (
                      <button
                        onClick={() => onDelete(t.id)}
                        className="text-slate-400 hover:text-red-600"
                        title="Șterge"
                      >
                        ✕
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
