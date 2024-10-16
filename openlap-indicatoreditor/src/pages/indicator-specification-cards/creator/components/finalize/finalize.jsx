import React, { useContext, useState } from "react";
import { ISCContext } from "../../indicator-specification-card.jsx";
import {
  Accordion,
  AccordionActions,
  AccordionDetails,
  AccordionSummary,
  Button,
  Chip,
  Divider,
  FormControlLabel,
  FormGroup,
  Grid,
  Switch,
  Typography,
} from "@mui/material";
import IconButton from "@mui/material/IconButton";
import LockIcon from "@mui/icons-material/Lock";
import VisSelection from "../visualization/components/vis-selection.jsx";
import NameDialog from "./components/name-dialog.jsx";
import PaletteIcon from "@mui/icons-material/Palette";

const Finalize = () => {
  const { visRef, setVisRef, dataset, lockedStep, setLockedStep } =
    useContext(ISCContext);
  const [state, setState] = useState({
    showSelections: true,
    openSaveDialog: false,
  });

  const [showCustomize, setShowCustomize] = useState(false);

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

  const handleCustomize = () => {
    setShowCustomize(!showCustomize);
  }

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
                      <Typography>Finalize</Typography>
                    </Grid>
                  </Grid>
                </Grid>
                {!lockedStep.finalize.locked && (
                  <Grid item>
                    <Grid container>
                      {!lockedStep.finalize.openPanel && (
                        <FormGroup>
                          <FormControlLabel
                            control={<Switch checked={state.showSelections} />}
                            onChange={handleToggleShowSelection}
                            label="Show selections"
                          />
                        </FormGroup>
                      )}
                      <Button color="primary" onClick={handleTogglePanel}>
                        {lockedStep.finalize.openPanel
                          ? "Close section"
                          : "CHANGE"}
                      </Button>
                    </Grid>
                    <Grid item xs={12}>
                      {showCustomize && ( <Button onClick={handleCustomize} color="primary">
                        Close customization
                      </Button>)}
                      {!showCustomize && (
                          <Button onClick={handleCustomize} color="primary" endIcon={<PaletteIcon />}>
                            Customize
                          </Button>
                      )}

                    </Grid>
                  </Grid>
                )}
              </Grid>
            </Grid>
            {!lockedStep.finalize.locked &&
            !lockedStep.finalize.openPanel &&
            state.showSelections ? (
              <>{/*  TODO: Summary? */}</>
            ) : undefined}
          </Grid>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <VisSelection
                dataset={dataset}
                visRef={visRef}
                setVisRef={setVisRef}
                customize={showCustomize}
                setCustomize={setShowCustomize}
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
