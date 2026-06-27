import { useContext, useState } from "react";
import { ISCContext } from "../../../isc-context.js";
import {
  Alert,
  Box,
  Card,
  CardActionArea,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import BarChartIcon from "@mui/icons-material/BarChart";
import StorageIcon from "@mui/icons-material/Storage";
import TrackChangesIcon from "@mui/icons-material/TrackChanges";
import pathChoices, { PATH_META } from "../utils/utils.js";
import { LEGACY_STEP_CODE } from "../../../utils/isc-constants.js";
import {
  hasDownstreamWorkflowState,
  resetDownstreamWorkflowState,
} from "../../../utils/isc-workflow-reset.js";
import PathChangeDialog from "./path-change-dialog.jsx";

export default function PathSelectors() {
  const { requirements, visRef, setVisRef, setRequirements, setLockedStep } =
    useContext(ISCContext);

  // Pending target path while the change-confirmation dialog is open.
  const [pendingPath, setPendingPath] = useState(null);

  const handleTogglePanel = () => {
    setLockedStep((p) => ({
      ...p,
      path: { ...p.path, openPanel: !p.path.openPanel },
    }));
  };

  // Place the lockedStep for the chosen path. Dataset path → Dataset is the
  // first middle step; Visualization/Task path → Visualization is first. This
  // matches the previous transitions exactly (only the reset is new).
  const placeStepsForPath = (targetPath) => {
    const datasetFirst = targetPath === pathChoices.data;
    setLockedStep((p) => ({
      ...p,
      visualization: {
        ...p.visualization,
        locked: datasetFirst,
        openPanel: !datasetFirst,
        step: datasetFirst
          ? LEGACY_STEP_CODE.SECOND_MIDDLE
          : LEGACY_STEP_CODE.FIRST_MIDDLE,
      },
      dataset: {
        ...p.dataset,
        locked: !datasetFirst,
        openPanel: datasetFirst,
        step: datasetFirst
          ? LEGACY_STEP_CODE.FIRST_MIDDLE
          : LEGACY_STEP_CODE.SECOND_MIDDLE,
      },
      finalize: { ...p.finalize, locked: true, openPanel: false },
    }));
  };

  // Actually switch the path: collapse Choose Path, re-place the middle steps,
  // record the new path, and reset the downstream (visualization/finalize)
  // state. Requirements + dataset are preserved.
  const commitPathChange = (targetPath) => {
    handleTogglePanel();
    placeStepsForPath(targetPath);
    setRequirements((p) => ({ ...p, selectedPath: targetPath }));
    resetDownstreamWorkflowState({ setVisRef });
  };

  // Re-selecting the path you're already on: just (re)open its current middle
  // step. No reset, no re-locking of progress.
  const reopenCurrentPath = (targetPath) => {
    handleTogglePanel();
    const stepKey =
      targetPath === pathChoices.data ? "dataset" : "visualization";
    setLockedStep((p) => ({
      ...p,
      [stepKey]: { ...p[stepKey], openPanel: true },
    }));
  };

  const handleSelectPath = (targetPath) => {
    // Same path → just reopen it.
    if (requirements.selectedPath === targetPath) {
      reopenCurrentPath(targetPath);
      return;
    }
    // Different path with reset-worthy downstream state → confirm first.
    if (hasDownstreamWorkflowState(visRef)) {
      setPendingPath(targetPath);
      return;
    }
    // Different path, nothing to lose → switch immediately.
    commitPathChange(targetPath);
  };

  const handleCancelPathChange = () => setPendingPath(null);

  const handleConfirmPathChange = () => {
    if (pendingPath) commitPathChange(pendingPath);
    setPendingPath(null);
  };

  // Presentation config. Each card routes through the single handleSelectPath,
  // which decides whether to reopen, confirm, or switch immediately.
  const pathOptions = [
    {
      value: pathChoices.vis,
      title: "Visualization",
      icon: BarChartIcon,
      onSelect: () => handleSelectPath(pathChoices.vis),
    },
    {
      value: pathChoices.data,
      title: "Dataset",
      icon: StorageIcon,
      onSelect: () => handleSelectPath(pathChoices.data),
    },
    {
      value: pathChoices.task,
      title: "Task",
      icon: TrackChangesIcon,
      onSelect: () => handleSelectPath(pathChoices.task),
    },
  ];

  const selectedMeta = PATH_META[requirements.selectedPath];

  return (
    <Stack gap={2}>
      <Box>
        <Typography variant="subtitle1" component="h3" fontWeight={600}>
          How would you like to start?
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Pick the starting point that fits what you already know. You&apos;ll
          complete every step either way.
        </Typography>
      </Box>

      <Grid container spacing={2} role="group" aria-label="How would you like to start?">
        {pathOptions.map((option) => {
          const meta = PATH_META[option.value];
          const selected = requirements.selectedPath === option.value;
          const Icon = option.icon;
          return (
            <Grid key={option.value} size={{ xs: 12, md: 4 }} sx={{ display: "flex" }}>
              <Card
                variant="outlined"
                sx={(theme) => ({
                  display: "flex",
                  width: "100%",
                  borderRadius: `${theme.custom.radii.card}px`,
                  borderColor: selected ? theme.palette.primary.main : undefined,
                  borderWidth: selected ? 2 : 1,
                  backgroundColor: selected
                    ? alpha(theme.palette.primary.main, 0.06)
                    : undefined,
                })}
              >
                <CardActionArea
                  onClick={option.onSelect}
                  aria-pressed={selected}
                  aria-label={`${option.title}. ${meta.explanation} Recommended when ${meta.recommendedWhen}`}
                  sx={{ p: 2, height: "100%", alignItems: "stretch" }}
                >
                  <Stack gap={1} sx={{ height: "100%" }}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="flex-start"
                    >
                      <Box
                        aria-hidden
                        sx={(theme) => ({
                          width: 44,
                          height: 44,
                          borderRadius: 2,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "primary.main",
                          backgroundColor: alpha(
                            theme.palette.primary.main,
                            theme.palette.mode === "dark" ? 0.24 : 0.1
                          ),
                        })}
                      >
                        <Icon />
                      </Box>
                      {selected && <CheckCircleIcon color="primary" />}
                    </Stack>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {option.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {meta.explanation}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mt: "auto" }}
                    >
                      Recommended when {meta.recommendedWhen}
                    </Typography>
                  </Stack>
                </CardActionArea>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {selectedMeta ? (
        <Alert severity="info" variant="outlined">
          {selectedMeta.consequence}
        </Alert>
      ) : (
        <Typography variant="body2" color="text.secondary" align="center">
          Select an option above to continue.
        </Typography>
      )}

      <PathChangeDialog
        open={Boolean(pendingPath)}
        onCancel={handleCancelPathChange}
        onConfirm={handleConfirmPathChange}
      />
    </Stack>
  );
}
