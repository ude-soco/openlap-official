// Pure change summary between a saved ISC and an edit draft (Update-review phase).
//
// Both inputs are the parsed domain envelope { requirements, dataset, visRef,
// lockedStep }. Detection is practical and robust (no deep per-ApexOption diff):
// it reports human-readable changes grouped by concept. Pure + testable.

const req = (isc) => isc?.requirements || {};
const ds = (isc) => isc?.dataset || {};
const vis = (isc) => isc?.visRef || {};

const truncate = (value, max = 40) => {
  const s = value == null ? "" : String(value);
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
};

const safeStringify = (value) => {
  try {
    return JSON.stringify(value ?? null);
  } catch {
    return "";
  }
};

// Stable signature of the declared data requirements (name + precise type).
const dataSignature = (requirements) =>
  (Array.isArray(requirements.data) ? requirements.data : [])
    .map((d) => `${d?.value ?? ""}:${d?.type?.value ?? d?.type?.type ?? ""}`)
    .join("|");

// Stable signature of dataset columns (header + precise/coarse type).
const columnsSignature = (dataset) =>
  (Array.isArray(dataset.columns) ? dataset.columns : [])
    .map((c) => `${c?.headerName ?? ""}:${c?.dataType?.value ?? c?.type ?? ""}`)
    .join("|");

const axisSignature = (visRef) => {
  const axis = visRef?.data?.axisOptions || {};
  return Object.keys(axis)
    .filter((k) => k.startsWith("selected"))
    .sort()
    .map((k) => `${k}=${Array.isArray(axis[k]) ? axis[k].join(",") : axis[k] ?? ""}`)
    .join("|");
};

/**
 * @param {{requirements,dataset,visRef,lockedStep}} savedIsc
 * @param {{requirements,dataset,visRef,lockedStep}} draftIsc
 * @returns {{ hasChanges: boolean, groups: { title: string, changes: string[] }[] }}
 */
export const getIscChangeSummary = (savedIsc, draftIsc) => {
  const groups = [];
  const addGroup = (title, changes) => {
    const real = changes.filter(Boolean);
    if (real.length) groups.push({ title, changes: real });
  };

  const sReq = req(savedIsc);
  const dReq = req(draftIsc);
  const sDs = ds(savedIsc);
  const dDs = ds(draftIsc);
  const sVis = vis(savedIsc);
  const dVis = vis(draftIsc);

  // ---- Indicator definition ----
  addGroup("Indicator definition", [
    sReq.indicatorName !== dReq.indicatorName &&
      `Name: “${truncate(sReq.indicatorName)}” → “${truncate(dReq.indicatorName)}”`,
    sReq.goal !== dReq.goal && "Goal changed",
    sReq.question !== dReq.question && "Question changed",
    dataSignature(sReq) !== dataSignature(dReq) && "Required data changed",
  ]);

  // ---- Path / visualization ----
  addGroup("Path & visualization", [
    sReq.selectedPath !== dReq.selectedPath &&
      `Starting point: ${sReq.selectedPath || "—"} → ${dReq.selectedPath || "—"}`,
    (sVis.filter?.type || "") !== (dVis.filter?.type || "") &&
      `Analytical task: ${sVis.filter?.type || "—"} → ${dVis.filter?.type || "—"}`,
    (sVis.chart?.type || "") !== (dVis.chart?.type || "") &&
      `Visualization: ${sVis.chart?.type || "—"} → ${dVis.chart?.type || "—"}`,
  ]);

  // ---- Dataset ----
  const sRows = (sDs.rows || []).length;
  const dRows = (dDs.rows || []).length;
  const sCols = (sDs.columns || []).length;
  const dCols = (dDs.columns || []).length;
  const sizeChanged = sRows !== dRows || sCols !== dCols;
  const columnsChanged = columnsSignature(sDs) !== columnsSignature(dDs);
  // Only check values when shape is unchanged (cheap, avoids noise on resize).
  const valuesChanged =
    !sizeChanged &&
    !columnsChanged &&
    safeStringify(sDs.rows) !== safeStringify(dDs.rows);
  addGroup("Dataset", [
    sizeChanged &&
      `Size: ${sRows} row${sRows === 1 ? "" : "s"} × ${sCols} column${
        sCols === 1 ? "" : "s"
      } → ${dRows} row${dRows === 1 ? "" : "s"} × ${dCols} column${
        dCols === 1 ? "" : "s"
      }`,
    !sizeChanged && columnsChanged && "Column names or types changed",
    valuesChanged && "Data values changed",
  ]);

  // ---- Chart setup ----
  addGroup("Chart setup", [
    axisSignature(sVis) !== axisSignature(dVis) && "Axis mapping changed",
    safeStringify(sVis.data?.options) !== safeStringify(dVis.data?.options) &&
      "Chart appearance changed",
  ]);

  return { hasChanges: groups.length > 0, groups };
};
