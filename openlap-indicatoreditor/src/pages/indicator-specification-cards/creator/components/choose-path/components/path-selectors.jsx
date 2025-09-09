import { useContext } from "react";
import { ISCContext } from "../../../indicator-specification-card.jsx";
import { Paper, Grid, Typography } from "@mui/material";
import { blue, orange } from "@mui/material/colors";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

const VISUALIZATION = "Visualization";
const DATASET = "Dataset";

export default function PathSelectors() {
  const { requirements, setRequirements, setLockedStep } =
    useContext(ISCContext);

  const handleTogglePanel = () => {
    setLockedStep((p) => ({
      ...p,
      path: { ...p.path, openPanel: !p.path.openPanel },
    }));
  };

  const handleChooseVisualizationPath = () => {
    handleTogglePanel();
    if (requirements.selectedPath !== VISUALIZATION) {
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
      setRequirements((p) => ({ ...p, selectedPath: VISUALIZATION }));
    } else {
      setLockedStep((p) => ({
        ...p,
        visualization: { ...p.visualization, openPanel: true },
      }));
    }
  };

  const handleChooseDatasetPath = () => {
    handleTogglePanel();
    if (requirements.selectedPath !== DATASET) {
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
        setRequirements((p) => ({ ...p, selectedPath: DATASET }));
      }
    } else {
      setLockedStep((p) => ({
        ...p,
        dataset: { ...p.dataset, openPanel: true },
      }));
    }
  };

  const buttonStyle = (type = VISUALIZATION) => {
    return {
      height: 150,
      width: 150,
      border: "3px solid",
      borderColor: type === DATASET ? blue[200] : orange[200],
      "&:hover": {
        boxShadow: 5,
        borderColor: type === DATASET ? blue[900] : orange[800],
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
      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>
          <Grid container justifyContent="center" spacing={4} sx={{ py: 2 }}>
            <Paper
              elevation={0}
              sx={buttonStyle()}
              onClick={handleChooseVisualizationPath}
            >
              <Grid
                container
                direction="column"
                alignItems="center"
                spacing={1}
              >
                {requirements.selectedPath === VISUALIZATION && (
                  <CheckCircleIcon color="success" />
                )}
                <Typography variant="h6" align="center">
                  Select Visualization
                </Typography>
              </Grid>
            </Paper>

            <Paper
              variant="outlined"
              sx={buttonStyle(DATASET)}
              onClick={handleChooseDatasetPath}
            >
              <Grid
                container
                direction="column"
                alignItems="center"
                spacing={1}
              >
                {requirements.selectedPath === DATASET && (
                  <CheckCircleIcon color="success" />
                )}
                <Typography variant="h6" align="center">
                  Select Data
                </Typography>
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      </Grid>
    </>
  );
}
