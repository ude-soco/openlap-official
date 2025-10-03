import { useContext } from "react";
import { ISCContext } from "../../../indicator-specification-card.jsx";
import { Paper, Grid, Typography, Stack, Tooltip } from "@mui/material";
import { blue, orange, green } from "@mui/material/colors";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import pathChoices from "../utils/utils.js";

export default function PathSelectors() {
  const { requirements, setRequirements, setLockedStep } =
    useContext(ISCContext);

  const handleTogglePanel = () => {
    setLockedStep((p) => ({
      ...p,
      path: { ...p.path, openPanel: !p.path.openPanel },
    }));
  };

  const handleChooseVisualizationPath = (path = pathChoices.vis) => {
    console.log(path);
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
          step: "3",
        },
        dataset: {
          ...p.dataset,
          locked: true,
          openPanel: false,
          step: "4",
        },
        finalize: {
          ...p.finalize,
          locked: true,
          openPanel: false,
        },
      }));
      setRequirements((p) => ({ ...p, selectedPath: path }));
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
            step: "3",
          },
          visualization: {
            ...p.visualization,
            locked: true,
            openPanel: false,
            step: "4",
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

  const buttonStyle = (type = pathChoices.task) => {
    return {
      height: 150,
      width: 150,
      border: "3px solid",
      borderColor:
        type === pathChoices.data
          ? blue[200]
          : type === pathChoices.vis
          ? orange[200]
          : green[200],
      "&:hover": {
        boxShadow: 5,
        borderColor:
          type === pathChoices.data
            ? blue[900]
            : type === pathChoices.vis
            ? orange[800]
            : green[200],
      },
      p: 2,
      borderRadius: 2,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      cursor: "pointer",
    };
  };

  return (
    <>
      <Stack gap={2}>
        <Typography align="center" color="textSecondary">
          Select a path
        </Typography>
        <Grid container justifyContent="center" spacing={4}>
          <Tooltip
            arrow
            title={
              <Typography align="center">
                Choose if you know how your chart should look like
              </Typography>
            }
          >
            <Paper
              elevation={0}
              sx={buttonStyle(pathChoices.vis)}
              onClick={() => handleChooseVisualizationPath()}
            >
              <Grid
                container
                direction="column"
                alignItems="center"
                spacing={1}
              >
                {requirements.selectedPath === pathChoices.vis && (
                  <CheckCircleIcon color="success" />
                )}
                <Typography variant="h6" align="center">
                  Visualization
                </Typography>
              </Grid>
            </Paper>
          </Tooltip>
          <Tooltip
            arrow
            title={
              <Typography align="center">
                Choose if you know how your dataset should look like
              </Typography>
            }
          >
            <Paper
              variant="outlined"
              sx={buttonStyle(pathChoices.data)}
              onClick={handleChooseDatasetPath}
            >
              <Grid
                container
                direction="column"
                alignItems="center"
                spacing={1}
              >
                {requirements.selectedPath === pathChoices.data && (
                  <CheckCircleIcon color="success" />
                )}
                <Typography variant="h6" align="center">
                  Dataset
                </Typography>
              </Grid>
            </Paper>
          </Tooltip>
          <Tooltip
            arrow
            title={
              <Typography align="center">
                Choose if you know why you are analyzing your data
              </Typography>
            }
          >
            <Paper
              elevation={0}
              sx={buttonStyle()}
              onClick={() => handleChooseVisualizationPath(pathChoices.task)}
            >
              <Grid
                container
                direction="column"
                alignItems="center"
                spacing={1}
              >
                {requirements.selectedPath === pathChoices.task && (
                  <CheckCircleIcon color="success" />
                )}
                <Typography variant="h6" align="center">
                  Task
                </Typography>
              </Grid>
            </Paper>
          </Tooltip>
        </Grid>
      </Stack>
    </>
  );
}
