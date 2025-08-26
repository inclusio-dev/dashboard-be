import React, { useEffect, useMemo, useState } from "react";

// ---- Helpers ----
const API_URL =
  "https://api.accessibilitydays.it/json-storages/excel-be";

// Numeric guard that works for keys like "459"
const isNumericKey = (k: string) => !Number.isNaN(Number(String(k)));
const fmt = (n: number) => new Intl.NumberFormat("it-IT").format(n);
const pct = (n: number) => `${n.toFixed(1)}%`;

// ---- Types ----
interface Row {
  [key: string]: unknown;
}

interface LevelItem {
  level: string;
  count: number;
}

interface TouchpointItem {
  name: string;
  count: number;
}

interface ParsedPanoramica {
  totals: Record<string, number>;
  levelDist: LevelItem[];
  touchpoints: TouchpointItem[];
}

// ---- Parsing from payload.sheet["Panoramica"] ----
function parsePanoramica(raw: Row[]): ParsedPanoramica {
  const totals: Record<string, number> = {};
  const levelDist: LevelItem[] = [];
  const touchpoints: TouchpointItem[] = [];

  let section: "levels" | "touchpoints" | "totals" | null = null;

  for (const r of raw) {
    const keys = Object.keys(r);
    if (!keys.length) continue;

    // Guess the label and value columns: one human label and one numeric column header like "459"
    const labelKey = keys.find((k) => !isNumericKey(k));
    const valueKey = keys.find((k) => isNumericKey(k));

    const labelRaw = (labelKey ? r[labelKey] : undefined) as unknown;
    const valueRaw = (valueKey ? r[valueKey] : undefined) as unknown;

    const label = typeof labelRaw === "string" ? labelRaw.trim() : String(labelRaw ?? "").trim();
    const value = typeof valueRaw === "number" ? valueRaw : Number(String(valueRaw ?? ""));

    const labelLower = label.toLowerCase();

    if (!label && (Number.isNaN(value) || value === 0)) continue;

    // Detect section dividers (tolerant to typos like "segnalzioni")
    if (labelLower.includes("distribuzione") && labelLower.includes("livello")) {
      section = "levels";
      continue;
    }
    if (labelLower.includes("distribuzione") && labelLower.includes("touchpoint")) {
      section = "touchpoints";
      continue;
    }

    // Skip blank and dash rows
    if (!label || label === "-" || Number.isNaN(value)) continue;

    // Route content to the current section
    if (section === "levels") {
      levelDist.push({ level: label, count: value });
    } else if (section === "touchpoints") {
      touchpoints.push({ name: label, count: value });
    } else {
      // We are in the opening KPI area
      totals[label.replace(/\s+$/g, "")] = value;
    }
  }

  // Normalizations: remove non-sense items if any
  const cleanTouchpoints = touchpoints.filter((t) => t.name && t.count >= 0);
  cleanTouchpoints.sort((a, b) => b.count - a.count);

  return { totals, levelDist, touchpoints: cleanTouchpoints };
}

// ---- UI bits ----
const Card: React.FC<{ title: string; value: number; sr?: string }>
= ({ title, value, sr }) => (
  <div className="rounded-2xl border bg-white p-4 shadow-sm focus-within:ring-2 focus-within:ring-blue-600">
    <dl aria-label={sr ?? title}>
      <dt className="text-sm text-gray-600">{title}</dt>
      <dd className="mt-1 text-3xl font-bold text-blue-800" aria-live="polite">{fmt(value)}</dd>
    </dl>
  </div>
);

const Bar: React.FC<{ label: string; value: number; total: number; id?: string }>
= ({ label, value, total, id }) => {
  const width = total > 0 ? Math.min(100, (value / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-end justify-between gap-2">
        <span className="text-sm text-gray-700">{label}</span>
        <span className="text-sm font-medium tabular-nums">{fmt(value)} · {pct(width)}</span>
      </div>
      <div className="h-3 rounded-full bg-gray-200" role="img" aria-labelledby={id}>
        <div
          className="h-3 rounded-full bg-blue-600"
          style={{ width: `${width}%` }}
        />
      </div>
      <span id={id} className="sr-only">{label}: {fmt(value)} pari a {pct(width)} del totale</span>
    </div>
  );
};

const SkeletonRow: React.FC = () => (
  <div className="animate-pulse rounded-xl border bg-white p-4">
    <div className="mb-2 h-4 w-1/2 rounded bg-gray-200" />
    <div className="h-3 w-full rounded bg-gray-200" />
  </div>
);

// ---- Main component ----
const Panoramica: React.FC = () => {
  const [data, setData] = useState<ParsedPanoramica | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setError(null);

    fetch(API_URL, { signal: ac.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((obj) => obj.value?.data)
      .then((allSheets) => {
        const raw = allSheets?.["Panoramica"] as Row[] | undefined;
        if (!raw || !Array.isArray(raw)) throw new Error("Foglio 'Panoramica' non trovato o invalido");
        const parsed = parsePanoramica(raw);
        setData(parsed);
      })
      .catch((e) => {
        if (e?.name === "AbortError") return;
        console.error(e);
        setError("Impossibile caricare i dati");
      })
      .finally(() => setLoading(false));

    return () => ac.abort();
  }, []);

  const totals = data?.totals ?? {};
  const levelDist = data?.levelDist ?? [];
  const touchpoints = data?.touchpoints ?? [];

  // Derivations
  const totalIssues = totals["Totale Segnalazioni"]; // robust parsing already normalized the trailing space
  const toTest = totals["Totale touchpoint da testare"];
  const tested = totals["Totale touchpoint testati"];

  const totalLevels = useMemo(
    () => levelDist.reduce((acc, i) => acc + i.count, 0),
    [levelDist]
  );

  const coverage = useMemo(() => {
    if (!tested || !toTest) return null;
    const c = Math.min(100, (tested / toTest) * 100);
    return Number.isFinite(c) ? c : null;
  }, [tested, toTest]);

  return (
    <div className="p-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold tracking-tight">📊 Panoramica</h2>
        {/* <button
          type="button"
          className="rounded-xl border bg-white px-3 py-2 text-sm font-medium shadow-sm hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          onClick={() => {
            // Simple re-fetch
            setLoading(true);
            setError(null);
            fetch(API_URL)
              .then((r) => r.json())
              .then((obj) => parsePanoramica(obj.value?.data?.["Panoramica"]))
              .then((p) => setData(p))
              .catch(() => setError("Impossibile ricaricare i dati"))
              .finally(() => setLoading(false));
          }}
          aria-label="Aggiorna i dati"
        >
          Aggiorna
        </button> */}
      </header>

      {error && (
        <div role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-900">
          {error}
        </div>
      )}

      {/* KPI cards */}
      <section aria-labelledby="kpi-heading" className="mb-8">
        <h3 id="kpi-heading" className="sr-only">Indicatori principali</h3>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {typeof totalIssues === "number" && (
              <Card title="Totale segnalazioni" value={totalIssues} />
            )}
            {typeof toTest === "number" && (
              <Card title="Touchpoint da testare" value={toTest} />
            )}
            {typeof tested === "number" && (
              <Card title="Touchpoint testati" value={tested} />
            )}
          </div>
        )}

        {coverage !== null && (
          <div className="mt-4" aria-live="polite">
            <div className="mb-1 flex items-center justify-between text-sm text-gray-700">
              <span>Copertura test</span>
              <span className="font-medium">{pct(coverage)}</span>
            </div>
            <div className="h-2 rounded-full bg-gray-200" aria-hidden>
              <div className="h-2 rounded-full bg-emerald-600" style={{ width: `${coverage}%` }} />
            </div>
            <p className="sr-only">{`Sono stati testati ${fmt(tested!)} touchpoint su ${fmt(toTest!)} (${pct(coverage)} di copertura).`}</p>
          </div>
        )}
      </section>

      {/* Level distribution */}
      <section className="mb-10" aria-labelledby="level-heading">
        <h3 id="level-heading" className="text-lg font-semibold">Distribuzione per livello di conformità</h3>
        <p className="mt-1 text-sm text-gray-600">Percentuali calcolate sul totale dei livelli rilevati.</p>

        {loading ? (
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            {levelDist.map((l) => (
              <div key={l.level} className="rounded-2xl border bg-white p-4 shadow-sm">
                <Bar label={l.level} value={l.count} total={totalLevels || l.count} id={`bar-${l.level}`} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Touchpoints list */}
      <section aria-labelledby="tp-heading" className="mb-4">
        <h3 id="tp-heading" className="text-lg font-semibold">Distribuzione segnalazioni per touchpoint</h3>
        <p className="mt-1 text-sm text-gray-600">Ordinati per numero di segnalazioni.</p>

        <div className="mt-3 overflow-hidden rounded-2xl border bg-white">
          <table className="min-w-full border-separate border-spacing-0" role="table" aria-label="Segnalazioni per touchpoint">
            <thead>
              <tr className="bg-gray-50 text-left text-sm text-gray-600">
                <th className="px-4 py-3 font-medium">Touchpoint</th>
                <th className="px-4 py-3 font-medium">Segnalazioni</th>
                <th className="px-4 py-3 font-medium">Distribuzione</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="px-4 py-4" colSpan={3}><div className="h-4 w-1/2 animate-pulse rounded bg-gray-200" /></td></tr>
              ) : (
                touchpoints.map((t, i) => {
                  const share = totalIssues ? (t.count / totalIssues) * 100 : 0;
                  return (
                    <tr key={t.name} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="px-4 py-3 text-sm text-gray-900">{t.name}</td>
                      <td className="px-4 py-3 text-sm font-medium tabular-nums">{fmt(t.count)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-full rounded-full bg-gray-200">
                            <div className="h-2 rounded-full bg-indigo-600" style={{ width: `${Math.min(100, share)}%` }} />
                          </div>
                          <span className="text-xs tabular-nums text-gray-700">{pct(Math.min(100, share))}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default Panoramica;
