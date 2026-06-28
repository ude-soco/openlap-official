import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Box, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";

// Step 3 chart preview.
//
// LIVE PREVIEW IS DEFERRED. Earlier attempts to render the selected chart with
// react-apexcharts produced an intermittently blank panel (ApexCharts measuring
// ~0 width inside the parent <Grow> scale animation, and silent empty renders).
// Per the bug-fix directive ("reliability over live rendering"), this component
// now shows the static example image, which always renders, with a guaranteed
// non-empty fallback. The pure model builder in ../../utils/preview-data.js is
// kept as the foundation for a future, properly browser-tested live preview.
//
// Guarantee: the panel is NEVER blank — it always shows the static image, the
// "preview available after data" message, or the "preview unavailable" message.
// Reads only its props — never mutates visRef/dataset/localStorage.

const PreviewShell = ({ label, children }) => (
  <Stack gap={1}>
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
    {children}
  </Stack>
);
PreviewShell.propTypes = { label: PropTypes.string, children: PropTypes.node };

const MessageBox = ({ children }) => (
  <Stack
    alignItems="center"
    justifyContent="center"
    gap={1}
    sx={(t) => ({
      p: 4,
      minHeight: 160,
      textAlign: "center",
      borderRadius: `${t.custom.radii.card}px`,
      border: `1px dashed ${t.palette.divider}`,
      backgroundColor: alpha(t.palette.text.primary, 0.02),
    })}
  >
    <InsightsOutlinedIcon color="disabled" />
    <Typography variant="body2" color="text.secondary">
      {children}
    </Typography>
  </Stack>
);
MessageBox.propTypes = { children: PropTypes.node };

const VisualizationLivePreview = ({ chart, compatible }) => {
  const [imageFailed, setImageFailed] = useState(false);

  // Reset the broken-image flag whenever the selected chart changes.
  useEffect(() => {
    setImageFailed(false);
  }, [chart?.type]);

  if (!chart?.type) return null;

  // Incompatible → preview not available yet (framed as an opportunity).
  if (!compatible) {
    return (
      <PreviewShell label="Preview available after required data is added">
        <MessageBox>
          Add the required data and a preview of this chart will appear here.
        </MessageBox>
      </PreviewShell>
    );
  }

  // Compatible → static example image (always renders). If the image is missing
  // or fails to load, show a clear unavailable message instead of blank space.
  if (chart.imageDescription && !imageFailed) {
    return (
      <PreviewShell label="Static example preview">
        <Box
          component="img"
          src={chart.imageDescription}
          alt={`Example of a ${chart.type}`}
          onError={() => setImageFailed(true)}
          sx={{ width: "100%", height: "auto", borderRadius: 2, display: "block" }}
        />
      </PreviewShell>
    );
  }

  return (
    <PreviewShell label="Preview unavailable">
      <MessageBox>A preview isn&apos;t available for this chart yet.</MessageBox>
    </PreviewShell>
  );
};

VisualizationLivePreview.propTypes = {
  chart: PropTypes.object.isRequired,
  compatible: PropTypes.bool,
};

export default VisualizationLivePreview;
