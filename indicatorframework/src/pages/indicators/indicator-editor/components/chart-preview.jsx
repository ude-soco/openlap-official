import React, { useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import PropTypes from "prop-types";
import { Alert, Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import { AuthContext } from "../../../../setup/auth-context-manager/auth-context-manager";
import { makeApexChartsResponsive } from "./utils/make-apex-charts-responsive";
import { makeC3ChartsResponsive } from "./utils/make-c3-charts-responsive";

/** Renderer dependencies live in an OpenLAP frame, isolated from the host page. */
const ChartPreview = ({ previewData, visualizationTypeId, responsive = false, onStatusChange }) => {
  const auth = useContext(AuthContext);
  const frame = useRef(null);
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState({});
  const firstCode = previewData?.displayCode?.[0];
  const typeId = visualizationTypeId || previewData?.visualizationTypeId;
  const originalScript = typeof previewData?.scriptData === "string" ? previewData.scriptData : "";
  const script = responsive
    ? originalScript.includes("c3.generate(") ? makeC3ChartsResponsive(originalScript) : makeApexChartsResponsive(originalScript)
    : originalScript;
  const html = useMemo(() => previewData?.html ?? (React.isValidElement(firstCode)
    ? renderToStaticMarkup(firstCode) : typeof firstCode === "string" ? firstCode : ""), [previewData?.html, firstCode]);
  // Static SVG may still need declared CSS. Every chart gets its own document;
  // no generated markup or executable handlers are inserted into the app page.
  const channel = useMemo(() => {
    // Selections and retries receive a fresh document: legacy plugins declare
    // global variables and may keep resize listeners after rendering.
    void html; void script; void typeId; void retry;
    return crypto.randomUUID();
  }, [html, script, typeId, retry]);
  const base = auth?.api?.defaults?.baseURL || import.meta.env.VITE_BACKEND_URL || "/api/";
  const url = new URL("v1/code/render", new URL(base.endsWith("/") ? base : base + "/", window.location.href));
  url.searchParams.set("typeId", typeId || ""); url.searchParams.set("channel", channel);
  const src = url.href;
  const origin = url.origin;
  const current = state.channel === channel ? state : {};

  useEffect(() => {
    onStatusChange?.(Boolean(html && typeId && current.ready && !current.error));
  }, [html, typeId, current.ready, current.error, onStatusChange]);

  useLayoutEffect(() => {
    if (!typeId || !html) return undefined;
    const timer = setTimeout(() => setState({ channel, error: "The chart did not finish loading. Retry the preview." }), 45000);
    const receive = (event) => {
      if (event.source !== frame.current?.contentWindow || event.origin !== origin || event.data?.channel !== channel) return;
      const { kind, height, message } = event.data;
      if (kind === "openlap:ready") {
        frame.current.contentWindow.postMessage({ kind: "openlap:render", channel, typeId, html, script }, origin);
      }
      if (kind === "openlap:rendered") { clearTimeout(timer); setState((previous) => ({ ...(previous.channel === channel ? previous : {}), channel, ready: true, error: undefined })); }
      if (kind === "openlap:error") { clearTimeout(timer); setState({ channel, error: message || "The chart could not be loaded." }); }
      if (kind === "openlap:height" && Number.isFinite(height)) setState((previous) => ({ ...(previous.channel === channel ? previous : {}), channel, height: Math.max(320, Math.min(2000, height)) }));
    };
    window.addEventListener("message", receive);
    return () => { clearTimeout(timer); window.removeEventListener("message", receive); };
  }, [channel, typeId, html, script, origin]);

  if (!html) return null;
  const oversized = html.length + script.length > 4000000;
  const error = !typeId ? "This chart is missing its visualization type. Reload the indicator to refresh its metadata."
    : oversized ? "This chart is too large to preview. Narrow the data filters and try again." : current.error;
  return (
    <Box sx={{ width: "100%", minWidth: 0, backgroundColor: "white", borderRadius: 1 }}>
      {error ? (
        <Alert severity="error" action={typeId && !oversized && <Button color="inherit" size="small" onClick={() => setRetry((value) => value + 1)}>Retry chart</Button>}>
          {error}
        </Alert>
      ) : !current.ready && (
        <Stack direction="row" sx={{ gap: 1.5, alignItems: "center", p: 2 }} role="status">
          <CircularProgress size={20} /><Typography variant="body2">Loading chart…</Typography>
        </Stack>
      )}
      {typeId && !oversized && <iframe key={channel} ref={frame} src={src} title="OpenLAP chart preview"
        sandbox="allow-scripts allow-same-origin allow-downloads" aria-busy={!current.ready}
        onLoad={() => frame.current?.contentWindow?.postMessage({ kind: "openlap:hello", channel }, origin)}
        style={{ display: error ? "none" : "block", width: "100%", height: current.height || 500, border: 0 }} />}
    </Box>
  );
};
ChartPreview.propTypes = { previewData: PropTypes.object, visualizationTypeId: PropTypes.string, responsive: PropTypes.bool, onStatusChange: PropTypes.func };
export default ChartPreview;
