import PropTypes from "prop-types";
import { Box, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";

/**
 * Standard header row for one wizard step, so every step in the Basic Indicator
 * wizard presents the same affordances in the same order:
 *
 *   [ step badge ]  Title   helper   summaryToggle   …   editToggle
 *
 * It only owns layout + the leading badge (a numbered circle, or a lock glyph
 * when the step is locked). The helper (tip), summary visibility toggle, and
 * expand/collapse toggle are passed in as slots so their existing behaviour is
 * preserved verbatim — this component adds no interactivity of its own.
 */
const WorkflowStepHeader = ({
  stepNumber,
  title,
  locked = false,
  helper = null,
  summaryToggle = null,
  editToggle = null,
}) => (
  <Stack
    direction="row"
    alignItems="center"
    justifyContent="space-between"
    gap={1}
  >
    <Stack direction="row" alignItems="center" gap={1} sx={{ minWidth: 0 }}>
      <Box
        aria-hidden
        sx={(theme) => ({
          width: 28,
          height: 28,
          flexShrink: 0,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          fontWeight: 600,
          color: locked ? "text.disabled" : theme.palette.primary.contrastText,
          backgroundColor: locked
            ? alpha(theme.palette.text.primary, 0.08)
            : theme.palette.primary.main,
        })}
      >
        {locked ? <LockOutlinedIcon sx={{ fontSize: 16 }} /> : stepNumber}
      </Box>
      <Typography variant="subtitle1" fontWeight={600} noWrap>
        {title}
      </Typography>
      {helper}
      {summaryToggle}
    </Stack>
    {editToggle}
  </Stack>
);

WorkflowStepHeader.propTypes = {
  stepNumber: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  title: PropTypes.string.isRequired,
  locked: PropTypes.bool,
  helper: PropTypes.node,
  summaryToggle: PropTypes.node,
  editToggle: PropTypes.node,
};

export default WorkflowStepHeader;
