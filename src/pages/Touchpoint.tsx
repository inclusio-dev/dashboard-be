import React, { useEffect, useMemo, useState } from "react";

// -------------------- Config & utils --------------------
const API_URL = "https://api.accessibilitydays.it/json-storages/excel-be";
const fmt = (n: number) => new Intl.NumberFormat("it-IT").format(n);

// Normalize keys helper (case/accents/typos tolerant)
const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();

// -------------------- Types --------------------
interface Row { [key: string]: unknown }
interface TpRow { name: string; A: number; AA: number; AAA: number; total: number; unresolved?: number; resolved?: number; recheck?: number }

// -------------------- Parsing --------------------
function parseTouchpoint(raw: Row[]): TpRow[] {
  const rows: TpRow[] = [];

  for (const r of raw) {
    const entries = Object.entries(r);
    if (!entries.length) continue;

    // Detect columns (tolerant to mis-spellings like "Segnalzioni")
    const findKey = (needles: RegExp[]) => {
      for (const [k] of entries) {
        const kN = norm(String(k));
        if (needles.some((rx) => rx.test(kN))) return k as string;
      }
      return undefined;
    };

    const nameKey = findKey([/^(touchpoint)$/]);
    const aKey = findKey([/(gravita|livello).*\ba\b/, /(segnal[a-z]*).*\blivello a\b/]);
    const aaKey = findKey([/(gravita|livello).*\baa\b/, /(segnal[a-z]*).*\blivello aa\b/]);
    const aaaKey = findKey([/(gravita|livello).*\baaa\b/, /(segnal[a-z]*).*\blivello aaa\b/]);

    const unresolvedKey = findKey([/non risolt/]);
    const resolvedKey = findKey([/risolt[ei]\b(?!.*non)/]);
    const recheckKey = findKey([/recheck/]);

    const name = String((nameKey ? r[nameKey] : "") ?? "").trim();
    if (!name) continue;

    const A = Number(r[aKey as string] ?? 0) || 0;
    const AA = Number(r[aaKey as string] ?? 0) || 0;
    const AAA = Number(r[aaaKey as string] ?? 0) || 0;

    // Prefer computed total from levels; fallback to provided totals if any
    const levelTotal = A + AA + AAA;

    const row: TpRow = {
      name,
      A,
      AA,
      AAA,
      total: levelTotal,
    };

    if (unresolvedKey) row.unresolved = Number(r[unresolvedKey] ?? 0) || 0;
    if (resolvedKey) row.resolved = Number(r[resolvedKey] ?? 0) || 0;
    if (recheckKey) row.recheck = Number(r[recheckKey] ?? 0) || 0;

    rows.push(row);
  }

  // Sort by total desc by default
  rows.sort((a, b) => b.total - a.total);
  return rows;
}

// -------------------- UI primitives --------------------
const Badge: React.FC<{ label: string; value: number; className: string; title?: string }>
= ({ label, value, className, title }) => (
  <span
    className={
      "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold " +
      className
    }
    title={title}
  >
    <span className="sr-only">{label}: </span>
    {fmt(value)}
  </span>
);

const StackedBar: React.FC<{ A: number; AA: number; AAA: number; total: number; id: string }>
= ({ A, AA, AAA, total, id }) => {
  const aPct = total ? (A / total) * 100 : 0;
  const aaPct = total ? (AA / total) * 100 : 0;
  const aaaPct = total ? (AAA / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3" aria-labelledby={id} role="img">
      <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
        <div className="h-2 bg-red-600" style={{ width: `${aPct}%` }} />
        <div className="h-2 bg-orange-500" style={{ width: `${aaPct}%` }} />
        <div className="h-2 bg-amber-400" style={{ width: `${aaaPct}%` }} />
      </div>
      <span id={id} className="sr-only">
        Distribuzione livelli: A {Math.round(aPct)}%, AA {Math.round(aaPct)}%, AAA {Math.round(aaaPct)}%
      </span>
    </div>
  );
};

// -------------------- Main component --------------------
const Touchpoint: React.FC = () => {
  const [rows, setRows] = useState<TpRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"total" | "A" | "AA" | "AAA" | "name">("total");
  const [dir, setDir] = useState<"desc" | "asc">("desc");

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setError(null);

    fetch(API_URL, { signal: ac.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((obj) => obj.value?.data?.["Touchpoint"])
      .then((raw) => {
        if (!raw || !Array.isArray(raw)) throw new Error("Foglio 'Touchpoint' non trovato o invalido");
        setRows(parseTouchpoint(raw));
      })
      .catch((e) => {
        if (e?.name === "AbortError") return;
        console.error(e);
        setError("Impossibile caricare i dati");
      })
      .finally(() => setLoading(false));

    return () => ac.abort();
  }, []);

  const totals = useMemo(() => {
    const sum = (k: keyof TpRow) => rows.reduce((acc, r) => acc + (r[k] as number || 0), 0);
    return { A: sum("A"), AA: sum("AA"), AAA: sum("AAA"), total: sum("total"), unresolved: sum("unresolved") };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = norm(query);
    const base = q ? rows.filter((r) => norm(r.name).includes(q)) : rows.slice();
    base.sort((a, b) => {
      let res: number;
      if (sortBy === "name") res = a.name.localeCompare(b.name);
      else res = (b[sortBy] as number) - (a[sortBy] as number);
      return dir === "desc" ? res : -res;
    });
    return base;
  }, [rows, query, sortBy, dir]);

  return (
    <div className="p-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">🔥 Touchpoint per livello</h2>
          <p className="text-sm text-gray-600">Segnalazioni classificate per livello (A, AA, AAA) su ciascun touchpoint.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="search"
              placeholder="Cerca touchpoint…"
              aria-label="Cerca touchpoint"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-56 rounded-xl border px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="sort" className="sr-only">Ordina per</label>
            <select
              id="sort"
              className="rounded-xl border bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              value={`${sortBy}:${dir}`}
              onChange={(e) => {
                const [k, d] = e.target.value.split(":");
                setSortBy(k as typeof sortBy);
                setDir(d as typeof dir);
              }}
            >
              <option value="total:desc">Totale ↓</option>
              <option value="total:asc">Totale ↑</option>
              <option value="A:desc">A ↓</option>
              <option value="A:asc">A ↑</option>
              <option value="AA:desc">AA ↓</option>
              <option value="AA:asc">AA ↑</option>
              <option value="AAA:desc">AAA ↓</option>
              <option value="AAA:asc">AAA ↑</option>
              <option value="name:asc">Nome A→Z</option>
              <option value="name:desc">Nome Z→A</option>
            </select>
          </div>
          {/* <button
            type="button"
            className="rounded-xl border bg-white px-3 py-2 text-sm font-medium shadow-sm hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            onClick={() => {
              setLoading(true);
              setError(null);
              fetch(API_URL)
                .then((r) => r.json())
                .then((obj) => parseTouchpoint(obj.value?.data?.["Touchpoint"]))
                .then((rows) => setRows(rows))
                .catch(() => setError("Impossibile ricaricare i dati"))
                .finally(() => setLoading(false));
            }}
            aria-label="Aggiorna i dati"
          >
            Aggiorna
          </button> */}
        </div>
      </header>

      {error && (
        <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-900">{error}</div>
      )}

      {/* Totals strip */}
      <section aria-labelledby="totali-heading" className="mb-4">
        <h3 id="totali-heading" className="sr-only">Totali</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <div className="rounded-2xl border bg-white p-3 shadow-sm"><p className="text-xs text-gray-600">Totale A</p><p className="text-xl font-bold text-red-700">{fmt(totals.A)}</p></div>
          <div className="rounded-2xl border bg-white p-3 shadow-sm"><p className="text-xs text-gray-600">Totale AA</p><p className="text-xl font-bold text-orange-700">{fmt(totals.AA)}</p></div>
          <div className="rounded-2xl border bg-white p-3 shadow-sm"><p className="text-xs text-gray-600">Totale AAA</p><p className="text-xl font-bold text-amber-700">{fmt(totals.AAA)}</p></div>
          <div className="rounded-2xl border bg-white p-3 shadow-sm"><p className="text-xs text-gray-600">Totale livelli</p><p className="text-xl font-bold text-blue-800">{fmt(totals.total)}</p></div>
          {Number.isFinite(totals.unresolved) && <div className="rounded-2xl border bg-white p-3 shadow-sm"><p className="text-xs text-gray-600">Segnalazioni non risolte</p><p className="text-xl font-bold text-rose-800">{fmt(totals.unresolved || 0)}</p></div>}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-700">
          <span className="inline-flex items-center gap-1"><span className="h-2 w-3 rounded bg-red-600" /> A</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-3 rounded bg-orange-500" /> AA</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-3 rounded bg-amber-400" /> AAA</span>
        </div>
      </section>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="max-h-[60vh] overflow-auto">
          <table className="min-w-full border-separate border-spacing-0" role="table" aria-label="Touchpoint per livello">
            <thead className="sticky top-0 z-10 bg-gray-50 text-left text-sm text-gray-600">
              <tr>
                <th className="px-4 py-3 font-medium">Touchpoint</th>
                <th className="px-4 py-3 font-medium text-center">A</th>
                <th className="px-4 py-3 font-medium text-center">AA</th>
                <th className="px-4 py-3 font-medium text-center">AAA</th>
                <th className="px-4 py-3 font-medium text-center">Conteggio WCAG</th>
                {/* <th className="px-4 py-3 font-medium">Distribuzione</th> */}
                <th className="px-4 py-3 font-medium text-center">Non risolte</th>
                <th className="px-4 py-3 font-medium text-center">In attesa di recheck</th>
                <th className="px-4 py-3 font-medium text-center">Risolte</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className={i % 2 ? "bg-gray-50" : "bg-white"}>
                    <td className="px-4 py-3"><div className="h-4 w-48 animate-pulse rounded bg-gray-200" /></td>
                    <td className="px-4 py-3 text-center"><div className="h-4 w-10 animate-pulse rounded bg-gray-200" /></td>
                    <td className="px-4 py-3 text-center"><div className="h-4 w-10 animate-pulse rounded bg-gray-200" /></td>
                    <td className="px-4 py-3 text-center"><div className="h-4 w-10 animate-pulse rounded bg-gray-200" /></td>
                    <td className="px-4 py-3 text-center"><div className="h-4 w-12 animate-pulse rounded bg-gray-200" /></td>
{/*                     <td className="px-4 py-3"><div className="h-2 w-full animate-pulse rounded bg-gray-200" /></td>
 */}                    <td className="px-4 py-3 text-center"><div className="h-4 w-12 animate-pulse rounded bg-gray-200" /></td>
                    <td className="px-4 py-3 text-center"><div className="h-4 w-12 animate-pulse rounded bg-gray-200" /></td>
                    <td className="px-4 py-3 text-center"><div className="h-4 w-12 animate-pulse rounded bg-gray-200" /></td>
                  </tr>
                ))
              ) : (
                filtered.map((r, idx) => (
                  <tr key={r.name} className={idx % 2 ? "bg-gray-50" : "bg-white"}>
                    <td className="px-4 py-3 text-sm text-gray-900">{r.name}</td>
                    <td className="px-4 py-3 text-center"><Badge label="A" value={r.A} className="bg-red-50 text-red-700 ring-1 ring-inset ring-red-200" /></td>
                    <td className="px-4 py-3 text-center"><Badge label="AA" value={r.AA} className="bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-200" /></td>
                    <td className="px-4 py-3 text-center"><Badge label="AAA" value={r.AAA} className="bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200" /></td>
                    <td className="px-4 py-3 text-center text-sm font-semibold tabular-nums text-blue-800">{fmt(r.total)}</td>
{/*                     <td className="px-4 py-3"><StackedBar A={r.A} AA={r.AA} AAA={r.AAA} total={r.total} id={`bar-${idx}`} /></td>
 */}                <td className="px-4 py-3 text-center text-sm tabular-nums">{fmt(r.unresolved ?? 0)}</td>
                    <td className="px-4 py-3 text-center text-sm tabular-nums">{fmt(r.recheck ?? 0)}</td>
                    <td className="px-4 py-3 text-center text-sm tabular-nums">{fmt(r.resolved ?? 0)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Touchpoint;