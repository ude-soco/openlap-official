import { useContext, useState } from "react";
import { ISCContext } from "../../indicator-specification-card.jsx";
import {
  Accordion,
  AccordionActions,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  Grid,
  Grow,
  IconButton,
  Popover,
  Tooltip,
  Typography,
} from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import DataTableManager from "./data-table-manager/data-table-manager.jsx";
import DataTable from "./components/data-table.jsx";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import EditIcon from "@mui/icons-material/Edit";
import CloseIcon from "@mui/icons-material/Close";
import TipsAndUpdatesIcon from "@mui/icons-material/TipsAndUpdates";

const Dataset = () => {
  const { requirements, dataset, lockedStep, setLockedStep } =
    useContext(ISCContext);
  const [state, setState] = useState({
    showSelections: true,
    tipAnchor: null,
  });

  const handleTogglePanel = () => {
    setLockedStep((prevState) => ({
      ...prevState,
      dataset: {
        ...prevState.dataset,
        openPanel: !prevState.dataset.openPanel,
      },
    }));
  };

  const handleToggleShowSelection = () => {
    setState((prevState) => ({
      ...prevState,
      showSelections: !prevState.showSelections,
    }));
  };

  const handleUnlockVisualization = () => {
    handleTogglePanel();
    setLockedStep((prevState) => ({
      ...prevState,
      visualization: {
        ...prevState.visualization,
        locked: false,
        openPanel: true,
        step: "4",
      },
    }));
  };

  const handleUnlockFinalize = () => {
    handleTogglePanel();
    setLockedStep((prevState) => ({
      ...prevState,
      finalize: {
        ...prevState.finalize,
        locked: false,
        openPanel: true,
      },
    }));
  };

  return (
    <>
      <Accordion
        expanded={lockedStep.dataset.openPanel}
        disabled={lockedStep.dataset.locked}
      >
        <AccordionSummary>
          <Grid container spacing={1}>
            <Grid item xs={12}>
              <Grid
                container
                alignItems="center"
                justifyContent="space-between"
                spacing={1}
              >
                <Grid item xs>
                  <Grid container alignItems="center" spacing={1}>
                    <Grid item>
                      {!lockedStep.dataset.locked ? (
                        <Chip label={lockedStep.dataset.step} color="primary" />
                      ) : (
                        <IconButton size="small">
                          <LockIcon />
                        </IconButton>
                      )}
                    </Grid>
                    <Grid item>
                      <Typography>Dataset</Typography>
                    </Grid>
                    <Grid item>
                      <Tooltip title={<Typography>Tips</Typography>} arrow>
                        <IconButton
                          onClick={(e) =>
                            setState((prevState) => ({
                              ...prevState,
                              tipAnchor: e.currentTarget,
                            }))
                          }
                        >
                          <TipsAndUpdatesIcon color="warning" />
                        </IconButton>
                      </Tooltip>
                      <Popover
                        open={Boolean(state.tipAnchor)}
                        anchorEl={state.tipAnchor}
                        onClose={() =>
                          setState((prevState) => ({
                            ...prevState,
                            tipAnchor: null,
                          }))
                        }
                        anchorOrigin={{
                          vertical: "bottom",
                          horizontal: "left",
                        }}
                        PaperProps={{
                          sx: {
                            backgroundColor: "primary.main",
                            color: "primary.contrastText",
                            position: "absolute",
                            p: 1,
                          },
                        }}
                      >
                        <Box sx={{ p: 2, maxWidth: 400 }}>
                          <Typography gutterBottom>
                            <b>Tip!</b>
                          </Typography>
                          <Typography>
                            Create your own data by filling in the table.
                          </Typography>
                          <Typography>
                            <ul>
                              <li>
                                You can add new columns and rows based on your
                                needs
                              </li>
                              <li>
                                Double click on the cells in each row to enter
                                the values you want to analyze
                              </li>
                              <li>
                                Click the column header to access the menu
                                options
                              </li>
                            </ul>
                          </Typography>
                          <Typography gutterBottom>
                            If you have an existing dataset (.csv data), you can
                            upload it here easily.
                          </Typography>
                        </Box>

                        <Grid container justifyContent="flex-end">
                          <Button
                            size="small"
                            onClick={() =>
                              setState((prevState) => ({
                                ...prevState,
                                tipAnchor: null,
                              }))
                            }
                            color="text"
                            variant="outlined"
                          >
                            Close
                          </Button>
                        </Grid>
                      </Popover>
                    </Grid>
                    {!lockedStep.dataset.openPanel && (
                      <>
                        <Grid item>
                          <Tooltip
                            title={
                              <Typography>
                                {!state.showSelections
                                  ? "Show summary"
                                  : "Hide summary"}
                              </Typography>
                            }
                          >
                            <IconButton onClick={handleToggleShowSelection}>
                              {!state.showSelections ? (
                                <VisibilityIcon color="primary" />
                              ) : (
                                <VisibilityOffIcon color="primary" />
                              )}
                            </IconButton>
                          </Tooltip>
                        </Grid>
                        <Grid item xs>
                          <Grid container justifyContent="flex-end">
                            <Button
                              onClick={handleTogglePanel}
                              startIcon={<EditIcon />}
                            >
                              Edit
                            </Button>
                          </Grid>
                        </Grid>
                      </>
                    )}
                  </Grid>
                </Grid>
                {lockedStep.dataset.openPanel && (
                  <Grid item>
                    <Button
                      onClick={handleTogglePanel}
                      startIcon={<CloseIcon />}
                    >
                      Close Edit
                    </Button>
                  </Grid>
                )}
              </Grid>
            </Grid>
            <Grow
              in={
                !lockedStep.dataset.locked &&
                !lockedStep.dataset.openPanel &&
                state.showSelections
              }
              timeout={{ enter: 500, exit: 0 }}
              unmountOnExit
            >
              {requirements.data.length > 0 ? (
                <Grid item xs={12}>
                  <DataTable rows={dataset.rows} columns={dataset.columns} />
                </Grid>
              ) : (
                <Grid item>
                  <Typography>
                    <em>No dataset created yet!</em>
                  </Typography>
                </Grid>
              )}
            </Grow>
          </Grid>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <DataTableManager />
            </Grid>
          </Grid>
        </AccordionDetails>
        <AccordionActions sx={{ py: 2 }}>
          <Grid item xs={12}>
            <Grid container spacing={2} justifyContent="center">
              <Grid item xs={12} md={6}>
                <Button
                  fullWidth
                  variant="contained"
                  disabled={
                    dataset.rows.length === 0 && dataset.columns.length === 0
                  }
                  onClick={
                    lockedStep.dataset.step === "3"
                      ? handleUnlockVisualization
                      : lockedStep.dataset.step === "4"
                      ? handleUnlockFinalize
                      : undefined
                  }
                >
                  Next
                </Button>
              </Grid>
            </Grid>
          </Grid>
        </AccordionActions>
      </Accordion>
    </>
  );
};

export default Dataset;
