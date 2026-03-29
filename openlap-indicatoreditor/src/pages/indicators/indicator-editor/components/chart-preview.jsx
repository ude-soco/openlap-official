import React, { useEffect, useRef } from "react";
import { Grid } from "@mui/material";

const ChartPreview = ({ previewData }) => {
  // All hooks MUST be called before any conditional return (Rules of Hooks)
  const scriptRef = useRef(null);

  const firstCode = previewData?.displayCode?.[0];
  const scriptData = previewData?.scriptData ?? "";

  useEffect(() => {
    if (!firstCode || !scriptData) return;

    if (!scriptRef.current) {
      const script = document.createElement("script");
      script.innerHTML = scriptData;
      document.getElementById("root").appendChild(script);
      scriptRef.current = script;
    }

    return () => {
      if (scriptRef.current) {
        // Destroy all ApexCharts instances before removing the script so the
        // registry is clean for the next mount (prevents silent re-init failures
        // when the chart div ID is reused across mount/unmount cycles).
        if (window.Apex?._chartInstances) {
          window.Apex._chartInstances.forEach((inst) => {
            try {
              inst.destroy();
            } catch (_) {}
          });
          window.Apex._chartInstances = [];
        }
        document.getElementById("root").removeChild(scriptRef.current);
        scriptRef.current = null;
      }
    };
  }, [firstCode, scriptData]);

  if (!firstCode) return null;

  return (
    <Grid
      container
      justifyContent="center"
      sx={{ backgroundColor: "white", p: 3 }}
    >
      {React.isValidElement(firstCode) ? (
        firstCode
      ) : typeof firstCode === "string" ? (
        <span dangerouslySetInnerHTML={{ __html: firstCode }} />
      ) : null}
    </Grid>
  );
};

export default ChartPreview;
