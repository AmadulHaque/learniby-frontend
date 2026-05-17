// Sales Panel — granular permissions for executive users.
// Admin role always has every permission (locked).

export const PERMISSION_KEYS = [
  "leads.create",
  "leads.edit",
  "leads.delete",
  "leads.view_all",
  "leads.reassign",
  "leads.bulk",
  "import.csv",
  "export.data",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export interface PermissionMeta {
  key: PermissionKey;
  label: string;
  description: string;
}

export interface PermissionGroup {
  title: string;
  items: PermissionMeta[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    title: "Lead Management",
    items: [
      { key: "leads.create", label: "Create leads", description: "নতুন lead যোগ করতে পারবে" },
      { key: "leads.edit", label: "Edit leads", description: "Lead detail / status update" },
      { key: "leads.delete", label: "Delete leads", description: "Single বা bulk delete" },
      { key: "leads.view_all", label: "View all leads", description: "শুধু assigned না, সব lead দেখবে" },
      { key: "leads.reassign", label: "Reassign leads", description: "অন্য rep কে lead transfer" },
      { key: "leads.bulk", label: "Bulk actions", description: "একসাথে multiple lead এ action" },
    ],
  },
  {
    title: "Import / Export",
    items: [
      { key: "import.csv", label: "Import CSV", description: "Bulk lead upload করতে পারবে" },
      { key: "export.data", label: "Export data", description: "CSV / Excel download" },
    ],
  },
];

export interface PermissionUserShape {
  role: "admin" | "executive";
  permissions?: string[] | null;
  rolePermissions?: string[] | null;
}

/**
 * Admin সব পায়; executive পায় rolePermissions ∪ user-level permissions।
 * rolePermissions = Settings → Role Permissions থেকে set করা defaults।
 * permissions = ওই user-এর জন্য admin manually যেগুলো দিয়েছে।
 */
export function hasPermission(
  user: PermissionUserShape | null | undefined,
  key: PermissionKey,
): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  const role = Array.isArray(user.rolePermissions) ? user.rolePermissions : [];
  const own = Array.isArray(user.permissions) ? user.permissions : [];
  return role.includes(key) || own.includes(key);
}
