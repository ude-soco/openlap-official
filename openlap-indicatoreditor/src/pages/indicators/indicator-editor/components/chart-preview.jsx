import React, { useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { Box, Grid } from "@mui/material";
import { makeApexChartsResponsive } from "./utils/make-apex-charts-responsive";

const ChartPreview = ({ previewData, responsive = false }) => {
  const scriptRef = useRef(null);
  const containerRef = useRef(null);
  const firstCode = previewData?.displayCode?.[0];
  const scriptData = previewData?.scriptData;

  // Inject the backend-generated chart script. C3 is responsive at the plugin
  // level (height-only `size`). ApexCharts still bakes a fixed `chart.width` and
  // its plugin source is unavailable to fix, so in responsive (editor-only) mode
  // we strip that fixed width as a TEMPORARY, fail-safe fallback — a no-op for C3
  // and for any non-matching output. Remove once the ApexCharts plugin omits the
  // fixed width. The original previewData is never mutated.
  useEffect(() => {
    if (!scriptData) return undefined;
    const root = document.getElementById("root");
    if (!root) return undefined;
    const code = responsive ? makeApexChartsResponsive(scriptData) : scriptData;
    const script = document.createElement("script");
    script.innerHTML = code;
    root.appendChild(script);
    scriptRef.current = script;

    return () => {
      if (scriptRef.current && scriptRef.current.parentNode) {
        scriptRef.current.parentNode.removeChild(scriptRef.current);
      }
      scriptRef.current = null;
    };
  }, [scriptData, responsive]);

  // Responsive only: a no-fixed-width C3 chart re-fits on window resize, but not
  // when only the container changes (e.g. opening/closing the Customize panel).
  // A debounced ResizeObserver nudges C3's own resize handler via a synthetic
  // window resize event. The container width is set by the layout (not the
  // chart), so there is no feedback loop.
  useEffect(() => {
    if (!responsive) return undefined;
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;

    let lastWidth = el.clientWidth;
    let timer;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect?.width ?? el.clientWidth;
      if (Math.abs(width - lastWidth) < 1) return;
      lastWidth = width;
      clearTimeout(timer);
      timer = setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
      }, 150);
    });
    observer.observe(el);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [responsive]);

  if (!firstCode) return null;

  const chart = React.isValidElement(firstCode) ? (
    firstCode
  ) : typeof firstCode === "string" ? (
    <span dangerouslySetInnerHTML={{ __html: firstCode }} />
  ) : null;

  // Responsive: full-width block so the chart's <div> (and the C3 SVG) fill the
  // available width. overflowX guards against any non-transformed/fixed chart on
  // narrow viewports (scrolls within the box, never the page).
  if (responsive) {
    return (
      <Box
        ref={containerRef}
        sx={{
          width: "100%",
          minHeight: 360,
          p: 2,
          backgroundColor: "white",
          borderRadius: 1,
          overflowX: "auto",
          "& > div": { width: "100%" },
        }}
      >
        {chart}
      </Box>
    );
  }

  // Default (unchanged): centered, fixed-size — used by the dashboard saved
  // preview and the composite-indicator previews.
  return (
    <Grid
      container
      justifyContent="center"
      sx={{ backgroundColor: "white", p: 3 }}
    >
      {chart}
    </Grid>
  );
};

ChartPreview.propTypes = {
  previewData: PropTypes.object,
  responsive: PropTypes.bool,
};

export default ChartPreview;
