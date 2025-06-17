// src/App.tsx
import React, { useState } from "react";
import DashboardLayout from "./components/DashboardLayout";
import TabNavigation from "./components/TabNavigation";
import Panoramica from "./pages/Panoramica";
import Touchpoint from "./pages/Touchpoint";
import Dettagli from "./pages/Dettagli";

function App() {
  const [tab, setTab] = useState("Panoramica");

  const renderTab = () => {
    switch (tab) {
      case "Panoramica":
        return <Panoramica />;
      case "Touchpoint":
        return <Touchpoint />;
      case "Dettagli":
        return <Dettagli />;
      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <TabNavigation currentTab={tab} setTab={setTab} />
      {renderTab()}
    </DashboardLayout>
  );
}

export default App;
