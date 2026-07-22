"use client";

import { useMemo, useRef, useState } from "react";
import {
  buildAxis,
  formatDuration,
  type ScheduledTest,
} from "@/lib/schedule";
import {
  colorForEquipment,
  STATUS_COLORS,
  STATUS_LABELS,
} from "@/lib/types";
import { ExportButton } from "./ExportButton";

interface Props {
  scheduled: ScheduledTest[];
  totalH: number;
}

const NAMES_W = 200;
const BASE_TIMELINE_W = 760;
const ROW_H = 34;
const ZOOM_STEP = 1.4;
const ZOOM_MIN = 0.4;
const ZOOM_MAX = 8;

export function GanttChart({ scheduled, totalH }: Props) {
  const [zoom, setZoom] = useState(1);
  const [equipFilter, setEquipFilter] = useState("");
  const captureRef = useRef<HTMLDivElement>(null);

  const equipments = useMemo(() => {
    const set = new Set<string>();
    for (const t of scheduled) {
      const e = (t.equipment ?? "").trim();
      if (e) set.add(e);
    }
    return [...set].sort();
  }, [scheduled]);

  const axis = useMemo(() => buildAxis(totalH), [totalH]);

  if (scheduled.length === 0 || totalH <= 0) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-400 shadow-sm">
        Adaugă teste cu durată &gt; 0 ca să se genereze diagrama.
      </section>
    );
  }

  const pxPerHour = (BASE_TIMELINE_W / totalH) * zoom;
  const timelineW = Math.round(totalH * pxPerHour);
  const gridPx = axis.stepH * pxPerHour;

  const gridStyle = {
    backgroundImage: `repeating-linear-gradient(to right, #eef2f7 0, #eef2f7 1px, transparent 1px, transparent ${gridPx}px)`,
  } as const;

  const totalDays = totalH / 24;
  const totalLabel =
    totalH >= 48
      ? `${round(totalDays)} zile (${round(totalH)} h)`
      : `${round(totalH)} h`;

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div>
          <h2 className="font-semibold">Diagramă Gantt</h2>
          <p className="text-xs text-slate-500">Durată totală: {totalLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {equipments.length > 0 && (
            <select
              value={equipFilter}
              onChange={(e) => setEquipFilter(e.target.value)}
              className="rounded border border-slate-300 px-2 py-1 text-sm"
              title="Filtrează după echipament"
            >
              <option value="">Toate echipamentele</option>
              {equipments.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          )}
          <div className="flex items-center gap-1 rounded border border-slate-300">
            <button
              onClick={() => setZoom((z) => Math.max(ZOOM_MIN, z / ZOOM_STEP))}
              className="px-2 py-1 text-sm hover:bg-slate-100"
              title="Zoom out"
            >
              −
            </button>
            <span className="w-12 text-center text-xs text-slate-500">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(ZOOM_MAX, z * ZOOM_STEP))}
              className="px-2 py-1 text-sm hover:bg-slate-100"
              title="Zoom in"
            >
              +
            </button>
            <button
              onClick={() => setZoom(1)}
              className="border-l border-slate-300 px-2 py-1 text-xs hover:bg-slate-100"
              title="Resetează zoom"
            >
              Fit
            </button>
          </div>
          <ExportButton nodeRef={captureRef} filename="gantt.png" />
        </div>
      </div>

      <div className="overflow-x-auto">
        <div ref={captureRef} style={{ width: NAMES_W + timelineW }} className="bg-white">
          {/* Header axă */}
          <div className="flex border-b border-slate-200" style={{ height: ROW_H }}>
            <div
              className="sticky left-0 z-10 flex items-center bg-slate-50 px-3 text-xs font-medium text-slate-500"
              style={{ width: NAMES_W, minWidth: NAMES_W }}
            >
              Test ({axis.unit})
            </div>
            <div className="relative" style={{ width: timelineW }}>
              {axis.ticks.map((tk, i) => (
                <div
                  key={i}
                  className="absolute top-0 flex h-full items-center text-[10px] text-slate-400"
                  style={{ left: tk.h * pxPerHour }}
                >
                  <span className="-translate-x-1/2 whitespace-nowrap px-1">
                    {tk.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Rânduri teste */}
          {scheduled.map((t) => {
            const dim =
              equipFilter !== "" && (t.equipment ?? "").trim() !== equipFilter;
            const color = colorForEquipment(t.equipment);
            const statusColor = STATUS_COLORS[t.status ?? "Planned"] ?? "#94a3b8";
            const barW = Math.max(3, t.durationH * pxPerHour);
            const showLabel = barW > 46;
            return (
              <div
                key={t.id}
                className="flex border-b border-slate-100"
                style={{ height: ROW_H }}
              >
                <div
                  className="sticky left-0 z-10 flex items-center gap-2 truncate border-r border-slate-100 bg-white px-3"
                  style={{ width: NAMES_W, minWidth: NAMES_W }}
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-sm"
                    style={{ backgroundColor: color }}
                  />
                  <span className="truncate text-sm" title={t.name}>
                    {t.name}
                  </span>
                  {t.inParallelGroup && (
                    <span
                      className="ml-auto shrink-0 rounded bg-violet-100 px-1 text-[10px] font-medium text-violet-700"
                      title="Rulează în paralel"
                    >
                      ∥
                    </span>
                  )}
                </div>
                <div className="relative" style={{ width: timelineW, ...gridStyle }}>
                  <div
                    className="absolute top-1/2 flex -translate-y-1/2 items-center overflow-hidden rounded px-1.5 text-[11px] font-medium text-white shadow-sm"
                    style={{
                      left: t.startH * pxPerHour,
                      width: barW,
                      height: 20,
                      backgroundColor: color,
                      borderLeft: `3px solid ${statusColor}`,
                      opacity: dim ? 0.2 : 1,
                    }}
                    title={`${t.name}\n${formatDuration(
                      t.durationVal,
                      t.durationUnit,
                    )}${t.equipment ? `\nEchipament: ${t.equipment}` : ""}\nStatus: ${
                      STATUS_LABELS[t.status ?? "Planned"] ?? t.status
                    }`}
                  >
                    {showLabel && (
                      <span className="truncate">
                        {formatDuration(t.durationVal, t.durationUnit)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function round(n: number): string {
  return Number.isInteger(n) ? String(n) : Number(n.toFixed(1)).toString();
}
