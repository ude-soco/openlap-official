import { useContext } from "react";
import PropTypes from "prop-types";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import dayjs from "dayjs";
import { BasicContext } from "../../../basic-indicator";
import { Condition } from "../../../../utils/indicator-data";

const formatDate = (value) =>
  value ? dayjs(value).format("DD MMM YYYY") : "—";

const userScopeLabel = (selected) => {
  switch (selected) {
    case Condition.only_me:
      return "Only my data";
    case Condition.exclude_me:
      return "All except my data";
    default:
      return "All users";
  }
};

// One read-only "label → value" row, mirroring the ISC confirmation dialog.
const SummaryLine = ({ label, value }) => (
  <Stack
    direction="row"
    justifyContent="space-between"
    alignItems="baseline"
    gap={2}
  >
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="body2" fontWeight={600} sx={{ textAlign: "right" }}>
      {value}
    </Typography>
  </Stack>
);
SummaryLine.propTypes = { label: PropTypes.node, value: PropTypes.node };

const SummaryGroup = ({ title, children }) => (
  <Stack gap={0.75}>
    <Typography variant="overline" color="text.secondary" component="h4">
      {title}
    </Typography>
    {children}
  </Stack>
);
SummaryGroup.propTypes = { title: PropTypes.node, children: PropTypes.node };

/**
 * Rich save confirmation for the Basic Indicator, inspired by the ISC Creator
 * Finalize dialog: an editable name at the top, a compact read-only summary of
 * the current selections (from BasicContext only — no backend calls), and a
 * ready status. Save logic and validation are owned by the caller.
 */
const SaveIndicatorDialog = ({
  open,
  onClose,
  onSave,
  saving = false,
  isEdit = false,
  indicatorName = "",
  onChangeName,
}) => {
  const { dataset, filters, analysis, visualization } =
    useContext(BasicContext);

  const nameMissing = indicatorName.length === 0;

  const datasetSource =
    dataset.selectedLRSList?.map((lrs) => lrs.lrsTitle).filter(Boolean).join(", ") ||
    "Learning Analytics";
  const timeframe = `${formatDate(filters.selectedTime?.from)} – ${formatDate(
    filters.selectedTime?.until
  )}`;
  const activityFilterCount = filters.selectedActivities?.length || 0;
  const methodName =
    analysis.selectedAnalyticsMethod?.method?.name || "—";
  const chartName = visualization.selectedType?.name || "—";
  const libraryName = visualization.selectedLibrary?.name || "—";

  return (
    <Dialog
      open={open}
      fullWidth
      maxWidth="sm"
      onClose={saving ? undefined : onClose}
      aria-labelledby="save-indicator-title"
      aria-describedby="save-indicator-description"
    >
      <DialogTitle id="save-indicator-title">Save Indicator</DialogTitle>
      <DialogContent>
        <Stack gap={2.5} sx={{ pt: 0.5 }}>
          <Typography
            id="save-indicator-description"
            variant="body2"
            color="text.secondary"
          >
            You&apos;re about to save the following indicator.
          </Typography>

          {/* Read-only review (intentionally not styled like a form). */}
          <Box
            sx={(theme) => ({
              p: 2,
              borderRadius: `${theme.custom.radii.card}px`,
              border: `1px solid ${theme.palette.divider}`,
              backgroundColor: alpha(theme.palette.text.primary, 0.02),
            })}
          >
            <Stack gap={2}>
              <SummaryGroup title="Dataset">
                <SummaryLine label="Source of data" value={datasetSource} />
              </SummaryGroup>
              <SummaryGroup title="Filters">
                <SummaryLine label="Timeframe" value={timeframe} />
                <SummaryLine
                  label="User scope"
                  value={userScopeLabel(filters.selectedUserFilter)}
                />
                <SummaryLine
                  label="Activity filters"
                  value={`${activityFilterCount} filter${
                    activityFilterCount === 1 ? "" : "s"
                  }`}
                />
              </SummaryGroup>
              <SummaryGroup title="Analysis">
                <SummaryLine label="Analytics method" value={methodName} />
              </SummaryGroup>
              <SummaryGroup title="Visualization">
                <SummaryLine label="Chart" value={chartName} />
                <SummaryLine label="Library" value={libraryName} />
              </SummaryGroup>
            </Stack>
          </Box>

          <Stack direction="row" gap={1} alignItems="center">
            <CheckCircleRoundedIcon fontSize="small" color="success" />
            <Typography variant="body2" fontWeight={600}>
              Ready to save
            </Typography>
          </Stack>

          <TextField
            fullWidth
            autoFocus
            label="Indicator name"
            value={indicatorName}
            onChange={onChangeName}
            placeholder="e.g., Most frequently accessed materials in my course"
            error={nameMissing}
            helperText={
              nameMissing ? "Give your indicator a name to save it." : " "
            }
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button fullWidth variant="outlined" onClick={onClose} disabled={saving}>
          Continue editing
        </Button>
        <Button
          fullWidth
          variant="contained"
          loading={saving}
          loadingPosition="start"
          loadingIndicator={isEdit ? "Updating..." : "Saving..."}
          disabled={nameMissing}
          onClick={onSave}
        >
          {!saving && (isEdit ? "Update indicator" : "Save Indicator")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

SaveIndicatorDialog.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  onSave: PropTypes.func,
  saving: PropTypes.bool,
  isEdit: PropTypes.bool,
  indicatorName: PropTypes.string,
  onChangeName: PropTypes.func,
};

export default SaveIndicatorDialog;
