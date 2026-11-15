// Use the dashboard's available width, since the permanent sidebar can leave
// much less space than a viewport breakpoint suggests.
export const MEDIUM = "@container workspace-dashboard (min-width: 640px)";
export const WIDE = "@container workspace-dashboard (min-width: 820px)";

export const statusColumn = { width: 110, display: "none", [MEDIUM]: { display: "table-cell" } };
export const dateColumn = { width: 150, display: "none", [MEDIUM]: { display: "table-cell" } };
export const detailColumn = { width: "18%", display: "none", [WIDE]: { display: "table-cell" } };
export const actionColumn = { width: 120, px: 1, [MEDIUM]: { width: 155, px: 2 } };

export const dashboardDateTime = (value) => value && Number.isFinite(Date.parse(value))
  ? new Date(value).toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  }) : "—";
