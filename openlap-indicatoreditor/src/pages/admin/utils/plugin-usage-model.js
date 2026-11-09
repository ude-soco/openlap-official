export const PLUGIN_CATEGORIES = [
  { key: "analyticsMethods", kind: "ANALYTICS_METHOD", label: "Analytics methods", to: "/admin/analytics-methods" },
  { key: "visualizationLibraries", kind: "VISUALIZATION_LIBRARY", label: "Visualization libraries", to: "/admin/visualizations/libraries" },
  { key: "visualizationTypes", kind: "VISUALIZATION_TYPE", label: "Chart types", to: "/admin/visualizations/types" },
];

/** Counts catalog entries (each binary version has its own IDs), never plugin families. */
export const pluginUsageModel = (catalogs, usage) => {
  const libraries = new Map((catalogs.visualizationLibraries || []).map((row) => [row.id, row]));
  const summaries = {};
  const rows = [];
  let unresolvedReferences = 0;
  for (const category of PLUGIN_CATEGORIES) {
    const catalog = catalogs[category.key];
    if (!Array.isArray(catalog)) { summaries[category.key] = null; continue; }
    const byId = new Map((usage?.[category.key] || []).map((entry) => [entry.id, entry]));
    const ids = new Set(catalog.map((entry) => entry.id));
    for (const entry of byId.values()) if (!ids.has(entry.id)) unresolvedReferences += entry.indicatorCount;
    const entries = catalog.map((entry) => {
      const count = byId.get(entry.id);
      const library = category.kind === "VISUALIZATION_TYPE" ? libraries.get(entry.libraryId) : null;
      // A failed library request or legacy missing parent ID cannot establish selectability.
      const selectable = category.kind === "VISUALIZATION_TYPE"
        ? !entry.enabled ? false : library ? library.enabled === true : null
        : entry.enabled === true;
      return { ...entry, category: category.key, kind: category.kind, selectable,
        indicatorCount: usage ? count?.indicatorCount || 0 : null,
        creatorCount: usage ? count?.uniqueUserCount || 0 : null };
    });
    summaries[category.key] = { installed: entries.length, enabled: entries.filter((row) => row.enabled).length,
      disabled: entries.filter((row) => !row.enabled).length,
      inUse: usage ? entries.filter((row) => row.indicatorCount > 0).length : null,
      unused: usage ? entries.filter((row) => row.indicatorCount === 0).length : null };
    rows.push(...entries);
  }
  return { rows, summaries, unresolvedReferences };
};

export const filterPluginUsage = (rows, { category, search = "", filter = "all", sort = "indicatorCount", direction = "desc" }) => {
  const query = search.trim().toLocaleLowerCase();
  return rows.filter((row) => row.category === category
    && (!query || `${row.name} ${row.library || ""} ${row.id}`.toLocaleLowerCase().includes(query))
    && (filter === "all" || (filter === "unused" && row.indicatorCount === 0)
      || (filter === "inUse" && row.indicatorCount > 0) || (filter === "disabled" && !row.enabled)))
    .sort((a, b) => {
      const difference = sort === "name" ? a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
        : (a[sort] ?? -1) - (b[sort] ?? -1);
      return (direction === "asc" ? difference : -difference) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
    });
};
