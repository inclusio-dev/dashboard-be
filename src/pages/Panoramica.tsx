import React, { useEffect, useState } from "react";

interface KPI {
  KPI: string;
  Valore: string | number;
}

const API_URL =
  "https://api.accessibilitydays.it/json-storages/excel-be";

const Panoramica = () => {
  const [kpi, setKpi] = useState<KPI[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(API_URL)
      .then((res) => res.json())
      .then((obj) => obj.value.data)
      .then((allSheets) => {
        const raw = allSheets["Panoramica"];
        if (!Array.isArray(raw)) {
          console.error("Foglio 'Panoramica' non trovato o invalido");
          return;
        }

        // Estrarre il primo valore numerico da ogni riga
        const trasformati: KPI[] = raw
          .map((r: any) => {
            const chiavi = Object.keys(r);
            const keyLabel = chiavi.find((k) => k !== "175") || "KPI";
            const keyValue = "175";

            const nome = r[keyLabel];
            const valore = r[keyValue];

            if (!nome || valore === "") return null;

            return {
              KPI: nome,
              Valore: valore,
            };
          })
          .filter(Boolean) as KPI[];

        setKpi(trasformati);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Errore durante il fetch:", err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-4 text-center">Caricamento...</div>;
  if (kpi.length === 0) return <div className="p-4 text-center">Nessun KPI disponibile</div>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">📊 Panoramica</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpi.map((item, idx) => (
          <div
            key={idx}
            className="bg-white rounded-xl shadow border p-4 flex flex-col justify-between"
          >
            <span className="text-sm text-gray-500">{item.KPI}</span>
            <span className="text-2xl font-bold text-blue-700 mt-1">
              {item.Valore}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Panoramica;
