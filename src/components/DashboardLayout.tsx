// src/components/DashboardLayout.tsx
import React from "react";

const DashboardLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-gray-50 text-gray-800">
    <header className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 shadow-md">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Accessibilità A11Y</h1>
          <p className="text-sm">Banca Etica – Monitoraggio segnalazioni touchpoint</p>
        </div>
        {/* <button className="bg-blue-900 px-4 py-2 rounded text-sm hover:bg-blue-950">
          Esporta PDF
        </button> */}
      </div>
    </header>
    <main className="p-6">{children}</main>
  </div>
);

export default DashboardLayout;
