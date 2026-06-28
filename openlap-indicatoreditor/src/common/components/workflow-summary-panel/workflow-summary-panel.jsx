import PropTypes from "prop-types";
import { Box, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";

/**
 * Compact "review card" used for a collapsed wizard step's selection summary,
 * so every step presents what the user chose in the same calm, tinted panel
 * (mirrors the ISC finalize/review look). Presentational only — callers pass
 * their existing summary rows as children.
 */
const WorkflowSummaryPanel = ({ title = "Selection summary", children }) => (
  <Box
    sx={(theme) => ({
      p: 2,
      borderRadius: `${theme.custom.radii.card}px`,
      border: `1px solid ${theme.palette.divider}`,
      backgroundColor: alpha(theme.palette.text.primary, 0.02),
    })}
  >
    <Stack gap={1}>
      {title && (
        <Typography variant="overline" color="text.secondary">
          {title}
        </Typography>
      )}
      {children}
    </Stack>
  </Box>
);

WorkflowSummaryPanel.propTypes = {
  title: PropTypes.string,
  children: PropTypes.node,
};

export default WorkflowSummaryPanel;
