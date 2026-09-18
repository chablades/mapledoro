import type { Metadata } from "next";
import MaintenanceContent from "./MaintenanceContent";

export const metadata: Metadata = {
  title: "MapleDoro is under maintenance",
};

export default function MaintenancePage() {
  return <MaintenanceContent />;
}
