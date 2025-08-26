// src/components/DashboardLayout.tsx
import React, { useState, useCallback } from "react";

const REFRESH_URL =
  "https://script.google.com/macros/s/AKfycbw8ORVUhWoBAZClqCF5NnNwlykkKZVrTtxVsm8wTY--gPCPVW1vZDKGHhkLrvZY787V/exec?filename=be";

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(REFRESH_URL, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // opzionale: await res.json();

      window.alert(
        "Aggiornamento completato.\nAbbiamo recuperato l’ultima versione dei dati.\nRicarica la pagina per visualizzare gli aggiornamenti."
      );
    } catch (err) {
      console.error(err);
      window.alert("Aggiornamento non riuscito. Riprova tra qualche istante.");
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <header className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 shadow-md">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Dashboard Accessibilità A11Y</h1>
            <p className="text-sm">Banca Etica – Monitoraggio segnalazioni touchpoint</p>
          </div>

          <button
            type="button"
            onClick={refreshData}
            disabled={isRefreshing}
            aria-busy={isRefreshing}
            className="bg-blue-900 px-4 py-2 rounded text-sm hover:bg-blue-950 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            title={isRefreshing ? "Aggiornamento in corso…" : "Aggiorna dati"}
          >
            {isRefreshing && (
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                aria-hidden="true"
                focusable="false"
              >
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25" />
                <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" fill="none" />
              </svg>
            )}
            <span>{isRefreshing ? "Aggiorno…" : "Aggiorna"}</span>
          </button>
        </div>
      </header>

      <main className="p-6">{children}</main>
    </div>
  );
};

export default DashboardLayout;
