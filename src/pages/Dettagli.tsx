import React, { useEffect, useState } from "react";

interface ReportRow {
  [key: string]: string | number;
}

const API_URL =
  "https://script.google.com/macros/s/AKfycbzKBulKgKMUZ0JKp89x2xhlZtA4covcQQOq5fw7SsHL8j0FTLLayvmZuiCuqR4pnHAG/exec";

const Dettagli = () => {
  const [data, setData] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(API_URL)
      .then((res) => res.json())
      .then((json) => {
        const sheetData = json["Report Pagine Sito Istituzionale"];
        if (!Array.isArray(sheetData)) {
          console.error("Foglio 'Report Pagine Sito Istituzionale' non trovato o non valido");
          return;
        }
        setData(sheetData);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Errore durante il fetch:", err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-6 text-center text-gray-600">⏳ Caricamento...</div>;
  if (data.length === 0) return <div className="p-6 text-center text-gray-500">Nessun dato disponibile</div>;

  const headers = Object.keys(data[0]);

  const getBadgeClass = (val: string) => {
    switch (val.toLowerCase()) {
      case "da risolvere":
      case "non risolto":
        return "bg-red-100 text-red-800";
      case "in corso":
      case "da testare nel codice":
        return "bg-yellow-100 text-yellow-800";
      case "risolto dal team":
      case "risolto e verificato":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="w-full p-6">
      <h2 className="text-2xl font-bold mb-4">📋 Dettaglio Segnalazioni</h2>
      <table className="w-full table-auto border border-gray-200 text-sm shadow-sm rounded-xl">
        <thead className="bg-gray-50 text-gray-700">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-4 py-3 text-left font-semibold border-b">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
              {headers.map((key) => {
                const val = String(row[key] ?? "");
                const isStato = key.toLowerCase() === "stato";
                return (
                  <td key={key} className="px-4 py-2 border-b align-top">
                    {isStato ? (
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${getBadgeClass(val)}`}>
                        {val}
                      </span>
                    ) : (
                      val
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

    </div>
  );
};

export default Dettagli;
