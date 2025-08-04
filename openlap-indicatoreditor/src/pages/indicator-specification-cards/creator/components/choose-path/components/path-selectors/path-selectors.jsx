import { useContext } from "react";
import { ISCContext } from "../../../../indicator-specification-card";
import Grid from "@mui/material/Grid2";
import { Paper, Typography } from "@mui/material";
import { blue, orange } from "@mui/material/colors";

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
    let vis = "Visualization";
    handleTogglePanel();
    if (requirements.selectedPath !== vis) {
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
      }));
      setRequirements((prevState) => ({
        ...prevState,
        selectedPath: vis,
      }));
    } else {
      setLockedStep((prevState) => ({
        ...prevState,
        visualization: {
          ...prevState.visualization,
          openPanel: true,
        },
      }));
    }
  };

  const handleChooseDatasetPath = () => {
    handleTogglePanel();
    let data = "Dataset";
    if (requirements.selectedPath !== data) {
      {
        setLockedStep((prevState) => ({
          ...prevState,
          dataset: {
            ...prevState.dataset,
            locked: false,
            openPanel: true,
            step: "3",
          },
          visualization: {
            ...prevState.visualization,
            locked: true,
            openPanel: false,
            step: "4",
          },
        }));
        setRequirements((prevState) => ({
          ...prevState,
          selectedPath: data,
        }));
      }
    } else {
      setLockedStep((prevState) => ({
        ...prevState,
        dataset: {
          ...prevState.dataset,
          openPanel: true,
        },
      }));
    }
  };

  const buttonStyle = (type = "visualization") => {
    return {
      height: 150,
      width: 150,
      border: "3px solid",
      borderColor: type === "dataset" ? blue[200] : orange[200],
      "&:hover": {
        boxShadow: 5,
        borderColor: type === "dataset" ? blue[900] : orange[800],
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
              <Typography variant="h6" align="center">
                Select Visualization
              </Typography>
            </Paper>

            <Paper
              elevation={0}
              sx={buttonStyle("dataset")}
              onClick={handleChooseDatasetPath}
            >
              <Typography variant="h6" align="center">
                Select Data
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Grid>
    </>
  );
}
