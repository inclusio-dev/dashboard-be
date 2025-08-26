import React, { useEffect, useState } from "react";

interface RigaTouchpoint {
  [key: string]: string | number;
}

interface MappaTouchpoint {
  [touchpoint: string]: {
    A: number;
    AA: number;
    AAA: number;
    totale: number;
  };
}

const API_URL =
  "https://api.accessibilitydays.it/json-storages/excel-be";

const Touchpoint = () => {
  const [mappa, setMappa] = useState<MappaTouchpoint>({});

  useEffect(() => {
    fetch(API_URL)
      .then((res) => res.json())
      .then((obj) => obj.value.data)
      .then((allSheets: Record<string, RigaTouchpoint[]>) => {
        const rows = allSheets["Touchpoint"];
        if (!Array.isArray(rows)) return;

        const aggregato: MappaTouchpoint = {};

        rows.forEach((r) => {
          const tp = String(r["Touchpoint"] || "").trim();
          if (!tp) return;

          const A = parseInt(r["Gravità A"] as string) || 0;
          const AA = parseInt(r["Gravità AA"] as string) || 0;
          const AAA = parseInt(r["Gravità AAA"] as string) || 0;
          const totale = A + AA + AAA;

          aggregato[tp] = { A, AA, AAA, totale };
        });

        setMappa(aggregato);
      })
      .catch((err) => {
        console.error("Errore durante il fetch:", err);
      });
  }, []);

  const badgeColor = (val: number) => {
    if (val === 0) return "bg-gray-100 text-gray-500";
    if (val <= 20) return "bg-yellow-100 text-yellow-800";
    if (val <= 40) return "bg-orange-300 text-orange-900";
    return "bg-red-500 text-white";
  };

  return (
    <div className="bg-white shadow rounded-2xl p-6">
      <h2 className="text-2xl font-bold mb-2">🔥 Heatmap Touchpoint per Gravità</h2>
      <p className="text-sm text-gray-500 mb-4">
        Numero di segnalazioni classificate per livello di gravità (A, AA, AAA) su ciascun touchpoint.
      </p>

      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-200 rounded-xl text-sm text-center">
          <thead>
            <tr className="bg-gray-50 text-gray-700">
              <th className="px-4 py-3 text-left">Touchpoint</th>
              <th className="px-4 py-3"> A</th>
              <th className="px-4 py-3"> AA</th>
              <th className="px-4 py-3"> AAA</th>
              <th className="px-4 py-3">Totale</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(mappa).map(([tp, dati], idx) => (
              <tr key={tp} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="text-left px-4 py-3 font-medium">{tp}</td>
                <td>
                  <span
                    className={`inline-block px-3 py-1 rounded-full font-semibold ${badgeColor(dati.A)}`}
                  >
                    {dati.A}
                  </span>
                </td>
                <td>
                  <span
                    className={`inline-block px-3 py-1 rounded-full font-semibold ${badgeColor(dati.AA)}`}
                  >
                    {dati.AA}
                  </span>
                </td>
                <td>
                  <span
                    className={`inline-block px-3 py-1 rounded-full font-semibold ${badgeColor(dati.AAA)}`}
                  >
                    {dati.AAA}
                  </span>
                </td>
                <td className="text-blue-700 font-bold">{dati.totale}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Touchpoint;
