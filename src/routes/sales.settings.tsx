import { defineRoute } from "@/lib/router-compat";
import SettingsPage from "@/components/sales/settings/SettingsPage";

export const Route = defineRoute("/sales/settings")({
  component: SettingsPage,
});
