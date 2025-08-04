import { useContext, useState } from "react";
import { ISCContext } from "../../indicator-specification-card.jsx";
import {
  Accordion,
  AccordionActions,
  AccordionDetails,
  AccordionSummary,
  Button,
  Chip,
  Divider,
  IconButton,
  Grid,
  Tooltip,
  Typography,
  Popover,
  Box,
} from "@mui/material";

import NameDialog from "./components/name-dialog.jsx";
import LockIcon from "@mui/icons-material/Lock";
import EditIcon from "@mui/icons-material/Edit";
import CloseIcon from "@mui/icons-material/Close";
import TipsAndUpdatesIcon from "@mui/icons-material/TipsAndUpdates";
import VisSelection from "../visualization/components/visualization-filter/vis-selection.jsx";

const Finalize = () => {
  const { dataset, lockedStep, setLockedStep } = useContext(ISCContext);
  const [state, setState] = useState({
    showSelections: true,
    openSaveDialog: false,
    tipAnchor: null,
  });

  const [showCustomize, setShowCustomize] = useState(true);

  const handleTogglePanel = () => {
    setLockedStep((prevState) => ({
      ...prevState,
      finalize: {
        ...prevState.finalize,
        openPanel: !prevState.finalize.openPanel,
      },
    }));
  };

  const handleToggleShowSelection = () => {
    setState((prevState) => ({
      ...prevState,
      showSelections: !prevState.showSelections,
    }));
  };

  const handleOpenSaveDialog = () => {
    setState((prevState) => ({
      ...prevState,
      openSaveDialog: !prevState.openSaveDialog,
    }));
  };

  const handleToggleCustomizePanel = () => {
    setShowCustomize(!showCustomize);
  };

  return (
    <>
      <Accordion
        expanded={lockedStep.finalize.openPanel}
        disabled={lockedStep.finalize.locked}
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
                      {!lockedStep.finalize.locked ? (
                        <Chip
                          label={lockedStep.finalize.step}
                          color="primary"
                        />
                      ) : (
                        <IconButton size="small">
                          <LockIcon />
                        </IconButton>
                      )}
                    </Grid>
                    <Grid item>
                      <Typography>Preview & Finalize</Typography>
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
                            <b>Tip:</b>
                          </Typography>
                          <Typography>
                            Take a final look at your indicator with the chosen
                            data. Customize the chart by adding a title,
                            subtitle, and choosing colors that highlight your
                            message. Make sure everything looks clear and
                            meaningful before you finish.
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
                    {!lockedStep.finalize.openPanel && (
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
                    )}
                  </Grid>
                </Grid>
                {lockedStep.finalize.openPanel && (
                  <Grid item>
                    <Tooltip title={<Typography>Close panel</Typography>}>
                      <Button
                        onClick={handleTogglePanel}
                        startIcon={<CloseIcon />}
                      >
                        Close Edit
                      </Button>
                    </Tooltip>
                  </Grid>
                )}
              </Grid>
            </Grid>
          </Grid>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <VisSelection
                customize={showCustomize}
                handleToggleCustomizePanel={handleToggleCustomizePanel}
              />
            </Grid>
            <Grid item xs={12}>
              <Divider />
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
                    dataset.rows.length === 0 || dataset.columns.length === 0
                  }
                  onClick={handleOpenSaveDialog}
                >
                  Save indicator
                </Button>
              </Grid>
            </Grid>
          </Grid>
          <NameDialog
            open={state.openSaveDialog}
            toggleOpen={handleOpenSaveDialog}
          />
        </AccordionActions>
      </Accordion>
    </>
  );
};

export default Finalize;
