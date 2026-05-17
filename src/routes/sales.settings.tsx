import { createFileRoute } from "@tanstack/react-router";
import SettingsPage from "@/components/sales/settings/SettingsPage";

export const Route = createFileRoute("/sales/settings")({
  component: SettingsPage,
});
