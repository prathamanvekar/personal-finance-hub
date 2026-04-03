import { useContext } from "react";
import { DashboardContext } from "./dashboardContext.js";

export function useFinanceDashboard() {
  const context = useContext(DashboardContext);

  if (!context) {
    throw new Error(
      "useFinanceDashboard must be used inside FinanceDashboardProvider",
    );
  }

  return context;
}
