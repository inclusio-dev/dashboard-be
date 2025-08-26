// src/components/TabNavigation.tsx
import React from "react";

interface Props {
  currentTab: string;
  setTab: (tab: string) => void;
}

const TabNavigation = ({ currentTab, setTab }: Props) => {
  const disabledTabs = ["Dettagli"]; // qui decidi quali sono bloccati

  return (
    <div className="flex space-x-4 border-b mb-6">
      {["Panoramica", "Touchpoint", "Dettagli"].map((tab) => {
        const isActive = currentTab === tab;
        const isDisabled = disabledTabs.includes(tab);

        return (
          <button
            key={tab}
            onClick={() => !isDisabled && setTab(tab)}
            disabled={isDisabled}
            aria-disabled={isDisabled}
            className={`px-4 py-2 font-medium rounded-t
              ${
                isActive
                  ? "bg-white border-t border-l border-r text-blue-600"
                  : "text-gray-500 hover:text-blue-600"
              }
              ${isDisabled ? "opacity-50 cursor-not-allowed hover:text-gray-500" : ""}
            `}
          >
            {tab}
          </button>
        );
      })}
    </div>
  );
};

export default TabNavigation;
