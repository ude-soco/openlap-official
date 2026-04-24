import React, { useEffect, useRef } from "react";
import { Grid } from "@mui/material";

const ChartPreview = ({ previewData, isReferenceView = false }) => {
  // All hooks MUST be called before any conditional return (Rules of Hooks)
  const scriptRef = useRef(null);

  const firstCode = previewData?.displayCode?.[0];
  const scriptData = previewData?.scriptData ?? "";
  const chartContainerId = isReferenceView
    ? "apex-chart-reference-view"
    : "apex-chart-edit-view";

  const getChartContainerSourceId = (code) => {
    if (React.isValidElement(code)) {
      return code.props?.id || "";
    }

    if (typeof code === "string") {
      const idMatch = code.match(/id\s*=\s*['\"]([^'\"]+)['\"]/i);
      return idMatch?.[1] || "";
    }

    return "";
  };

  const normalizeChartMarkup = (html, targetId) => {
    if (typeof html !== "string") return html;

    const idMatch = html.match(/id\s*=\s*['\"]([^'\"]+)['\"]/i);
    if (!idMatch) return html;

    const originalId = idMatch[1];
    const escapedOriginalId = originalId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    return html
      .replace(new RegExp(`id\\s*=\\s*['\"]${escapedOriginalId}['\"]`, "i"), `id=\"${targetId}\"`)
      .replace(new RegExp(`for\\s*=\\s*['\"]${escapedOriginalId}['\"]`, "gi"), `for=\"${targetId}\"`);
  };

  const normalizeChartScript = (script, sourceId, targetId) => {
    if (typeof script !== "string") return script;
    if (!sourceId) return script;

    const originalId = sourceId;
    if (originalId === targetId) return script;

    const escapedOriginalId = originalId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    return script
      .replace(new RegExp(`#${escapedOriginalId}`, "g"), `#${targetId}`)
      .replace(new RegExp(`['\"]${escapedOriginalId}['\"]`, "g"), `\"${targetId}\"`);
  };

  const sourceContainerId = getChartContainerSourceId(firstCode);

  const normalizedFirstCode = React.isValidElement(firstCode)
    ? React.cloneElement(firstCode, { id: chartContainerId })
    : normalizeChartMarkup(firstCode, chartContainerId);

  const normalizedScriptData = normalizeChartScript(
    scriptData,
    sourceContainerId,
    chartContainerId
  );
  const scopedScriptData = normalizedScriptData
    ? `(function(){\n${normalizedScriptData}\n})();`
    : "";

  const clearChartContainer = (containerId) => {
    const chartContainer = document.getElementById(containerId);
    if (chartContainer) {
      chartContainer.innerHTML = "";
    }
  };

  const destroyChartsForContainer = (containerId) => {
    const chartInstances = window.Apex?._chartInstances;
    if (!Array.isArray(chartInstances)) return;

    chartInstances
      .filter((instance) => instance?.el?.id === containerId)
      .forEach((instance) => {
        try {
          instance.destroy();
        } catch (_) {}
      });
  };

  useEffect(() => {
    if (!normalizedFirstCode || !scopedScriptData) return;

    const root = document.getElementById("root");
    if (!root) return;

    destroyChartsForContainer(chartContainerId);
    clearChartContainer(chartContainerId);

    if (!scriptRef.current) {
      const script = document.createElement("script");
      script.innerHTML = scopedScriptData;
      root.appendChild(script);
      scriptRef.current = script;
    }

    return () => {
      if (scriptRef.current) {
        destroyChartsForContainer(chartContainerId);
        clearChartContainer(chartContainerId);

        if (scriptRef.current.parentNode) {
          scriptRef.current.parentNode.removeChild(scriptRef.current);
        }

        scriptRef.current = null;
      }
    };
  }, [normalizedFirstCode, scopedScriptData, chartContainerId, isReferenceView]);

  if (!normalizedFirstCode) return null;

  return (
    <Grid
      container
      justifyContent="center"
      sx={{ backgroundColor: "white", p: 3 }}
    >
      {React.isValidElement(normalizedFirstCode) ? (
        normalizedFirstCode
      ) : typeof normalizedFirstCode === "string" ? (
        <span dangerouslySetInnerHTML={{ __html: normalizedFirstCode }} />
      ) : null}
    </Grid>
  );
};

export default ChartPreview;
