import { useContext } from "react";
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

export default function PathSelectors() {
  const { requirements, setVisRef, setRequirements, setLockedStep } =
    useContext(ISCContext);

  const handleTogglePanel = () => {
    setLockedStep((p) => ({
      ...p,
      path: { ...p.path, openPanel: !p.path.openPanel },
    }));
  };

  const handleChooseVisualizationPath = (path = pathChoices.vis) => {
    handleTogglePanel();
    if (
      requirements.selectedPath !== pathChoices.vis ||
      requirements.selectedPath !== pathChoices.task
    ) {
      setLockedStep((p) => ({
        ...p,
        visualization: {
          ...p.visualization,
          locked: false,
          openPanel: true,
          step: LEGACY_STEP_CODE.FIRST_MIDDLE,
        },
        dataset: {
          ...p.dataset,
          locked: true,
          openPanel: false,
          step: LEGACY_STEP_CODE.SECOND_MIDDLE,
        },
        finalize: {
          ...p.finalize,
          locked: true,
          openPanel: false,
        },
      }));

      setRequirements((p) => {
        if (p.selectedPath !== path)
          setVisRef((p) => ({ ...p, filter: { type: "" } }));
        return { ...p, selectedPath: path };
      });
    } else {
      setLockedStep((p) => ({
        ...p,
        visualization: { ...p.visualization, openPanel: true },
      }));
    }
  };

  const handleChooseDatasetPath = () => {
    handleTogglePanel();
    if (requirements.selectedPath !== pathChoices.data) {
      {
        setLockedStep((p) => ({
          ...p,
          dataset: {
            ...p.dataset,
            locked: false,
            openPanel: true,
            step: LEGACY_STEP_CODE.FIRST_MIDDLE,
          },
          visualization: {
            ...p.visualization,
            locked: true,
            openPanel: false,
            step: LEGACY_STEP_CODE.SECOND_MIDDLE,
          },
          finalize: {
            ...p.finalize,
            locked: true,
            openPanel: false,
          },
        }));
        setRequirements((p) => ({ ...p, selectedPath: pathChoices.data }));
      }
    } else {
      setLockedStep((p) => ({
        ...p,
        dataset: { ...p.dataset, openPanel: true },
      }));
    }
  };

  // Presentation config. Handlers above are unchanged — these cards call the
  // exact same functions the previous boxes did.
  const pathOptions = [
    {
      value: pathChoices.vis,
      title: "Visualization",
      icon: BarChartIcon,
      onSelect: () => handleChooseVisualizationPath(),
    },
    {
      value: pathChoices.data,
      title: "Dataset",
      icon: StorageIcon,
      onSelect: handleChooseDatasetPath,
    },
    {
      value: pathChoices.task,
      title: "Task",
      icon: TrackChangesIcon,
      onSelect: () => handleChooseVisualizationPath(pathChoices.task),
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
    </Stack>
  );
}
