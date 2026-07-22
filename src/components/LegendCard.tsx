import {
  STATUSES,
  STATUS_COLORS,
  STATUS_LABELS,
  colorForEquipment,
} from "@/lib/types";

interface Props {
  equipments: string[];
}

export function LegendCard({ equipments }: Props) {
  return (
    <details
      open
      className="rounded-lg border border-slate-200 bg-white shadow-sm"
    >
      <summary className="cursor-pointer select-none px-4 py-3 font-semibold">
        Legendă & cum se folosește
      </summary>
      <div className="grid gap-5 border-t border-slate-200 px-4 py-4 text-sm md:grid-cols-2">
        <div>
          <h3 className="mb-2 font-medium text-slate-700">Cum se folosește</h3>
          <ol className="list-decimal space-y-1 pl-5 text-slate-600">
            <li>Adaugă testele în ordinea dorită cu &bdquo;Adaugă test&rdquo;.</li>
            <li>
              Completează durata (min / ore / zile). Implicit testele rulează în{" "}
              <strong>cascadă</strong> — fiecare începe când se termină cel
              anterior.
            </li>
            <li>
              Bifează <strong>Paralel</strong> la ≥2 teste consecutive ca să
              ruleze simultan; grupul ține cât cel mai lung test.
            </li>
            <li>
              Diagrama de jos se generează automat; grila se scalează singură
              (ore↔zile). Folosește zoom-ul și exportă în PNG.
            </li>
          </ol>
        </div>
        <div className="space-y-4">
          <div>
            <h3 className="mb-2 font-medium text-slate-700">
              Status (bordura barei)
            </h3>
            <div className="flex flex-wrap gap-3">
              {STATUSES.map((s) => (
                <span key={s} className="flex items-center gap-1.5 text-slate-600">
                  <span
                    className="inline-block h-3 w-3 rounded-sm"
                    style={{ backgroundColor: STATUS_COLORS[s] }}
                  />
                  {STATUS_LABELS[s]}
                </span>
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-2 font-medium text-slate-700">
              Echipament (culoarea barei)
            </h3>
            {equipments.length === 0 ? (
              <p className="text-slate-400">
                Niciun echipament alocat încă.
              </p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {equipments.map((e) => (
                  <span
                    key={e}
                    className="flex items-center gap-1.5 text-slate-600"
                  >
                    <span
                      className="inline-block h-3 w-3 rounded-sm"
                      style={{ backgroundColor: colorForEquipment(e) }}
                    />
                    {e}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </details>
  );
}
