import PropTypes from "prop-types";
import { Chip, IconButton, Stack, Typography } from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";

/**
 * Standard header row for one wizard step. Mirrors the ISC Creator step header
 * exactly (see indicator-specification-cards/.../dataset-summary.jsx) so the
 * Basic Indicator wizard and the ISC Creator read as the same product:
 *
 *   [ step Chip | lock ]  Title   helper   summaryToggle      editToggle
 *
 * It owns layout + the leading badge only (a primary Chip with the step number,
 * or a lock IconButton when the step is locked). The helper (tip), summary
 * visibility toggle, and the Open/Close edit toggle are passed in as slots so
 * their existing behaviour is preserved verbatim — this component adds no
 * interactivity of its own.
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
    justifyContent="space-between"
    alignItems="center"
    sx={{ pb: 2 }}
  >
    <Stack direction="row" alignItems="center" gap={1}>
      {locked ? (
        <IconButton size="small">
          <LockIcon />
        </IconButton>
      ) : (
        <Chip label={stepNumber} color="primary" />
      )}
      <Typography>{title}</Typography>
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
