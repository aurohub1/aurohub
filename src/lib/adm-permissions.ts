export interface AdmPermissions {
  can_use_editor: boolean;
  can_manage_plans: boolean;
  can_manage_configs: boolean;
  can_manage_clients: boolean;
  can_manage_users: boolean;
  can_view_logs: boolean;
  can_view_vault: boolean;
  can_view_health: boolean;
  can_manage_library: boolean;
}

export const ADM_FULL_PERMISSIONS: AdmPermissions = {
  can_use_editor: true,
  can_manage_plans: true,
  can_manage_configs: true,
  can_manage_clients: true,
  can_manage_users: true,
  can_view_logs: true,
  can_view_vault: true,
  can_view_health: true,
  can_manage_library: true,
};

export function rowToAdmPermissions(row: Record<string, unknown>): AdmPermissions {
  return {
    can_use_editor:     (row.can_use_editor     as boolean | null) ?? true,
    can_manage_plans:   (row.can_manage_plans    as boolean | null) ?? true,
    can_manage_configs: (row.can_manage_configs  as boolean | null) ?? true,
    can_manage_clients: (row.can_manage_clients  as boolean | null) ?? true,
    can_manage_users:   (row.can_manage_users    as boolean | null) ?? true,
    can_view_logs:      (row.can_view_logs       as boolean | null) ?? true,
    can_view_vault:     (row.can_view_vault      as boolean | null) ?? true,
    can_view_health:    (row.can_view_health     as boolean | null) ?? true,
    can_manage_library: (row.can_manage_library  as boolean | null) ?? true,
  };
}

export const ADM_PERMISSIONS_SELECT =
  "can_use_editor,can_manage_plans,can_manage_configs,can_manage_clients,can_manage_users,can_view_logs,can_view_vault,can_view_health,can_manage_library";
