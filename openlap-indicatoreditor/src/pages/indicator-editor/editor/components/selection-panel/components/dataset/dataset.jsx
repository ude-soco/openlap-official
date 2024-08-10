import { useState, useContext } from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionActions,
  Chip,
  Button,
  AccordionDetails,
  Grid,
  Typography,
  FormGroup,
  FormControlLabel,
  Switch,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { SelectionContext } from "../../selection-panel";
import Platform from "./components/platform";
import LRS from "./components/lrs";

const Dataset = () => {
  const { indicatorQuery, setLockedStep } = useContext(SelectionContext);
  const [state, setState] = useState({
    openPanel: true,
    showSelections: true,
    lrsList: [],
    selectedLrsList: [],
    platformList: [],
    selectedPlatformList: [],
    autoCompleteValue: null,
  });

  const handleTogglePanel = () => {
    setState((prevState) => ({
      ...prevState,
      openPanel: !prevState.openPanel,
    }));
  };

  const handletoggleShowSelection = () => {
    setState((prevState) => ({
      ...prevState,
      showSelections: !prevState.showSelections,
    }));
  };

  const handleUnlockFilters = () => {
    handleTogglePanel();
    setLockedStep((prevState) => ({
      ...prevState,
      filters: false,
    }));
  };

  return (
    <>
      <Accordion sx={{ mb: 1 }} expanded={state.openPanel}>
        <AccordionSummary aria-controls="panel1-content" id="panel1-header">
          <Grid container spacing={1}>
            {/* Label */}
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
                      <Chip label="1" color="primary" />
                    </Grid>
                    <Grid item>
                      <Typography>Dataset</Typography>
                    </Grid>
                  </Grid>
                </Grid>
                <Grid item>
                  <Grid container>
                    {!state.openPanel && (
                      <FormGroup>
                        <FormControlLabel
                          control={<Switch checked={state.showSelections} />}
                          onChange={handletoggleShowSelection}
                          label="Show selections"
                        />
                      </FormGroup>
                    )}
                    <Button
                      size="small"
                      color="primary"
                      onClick={handleTogglePanel}
                    >
                      {state.openPanel ? "Close section" : "CHANGE"}
                    </Button>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
            {!state.openPanel && state.showSelections && (
              <>
                {/* LRS */}
                {indicatorQuery.lrsStores.length !== 0 && (
                  <Grid item xs={12}>
                    <Grid container alignItems="center" spacing={1}>
                      <Grid item>
                        <Typography>LRS(s):</Typography>
                      </Grid>
                      <Grid item>
                        <Grid container spacing={1}>
                          {indicatorQuery.lrsStores?.map((lrs) => (
                            <Grid item key={lrs.id}>
                              <Chip label={lrs.lrsTitle} />
                            </Grid>
                          ))}
                        </Grid>
                      </Grid>
                    </Grid>
                  </Grid>
                )}

                {/* Platform */}
                {indicatorQuery.platforms.length !== 0 && (
                  <Grid item xs={12}>
                    <Grid container alignItems="center" spacing={1}>
                      <Grid item>
                        <Typography>Platform(s):</Typography>
                      </Grid>
                      <Grid item>
                        <Grid container spacing={1}>
                          {indicatorQuery.platforms?.map((platform, index) => (
                            <Grid item key={index}>
                              <Chip label={platform} />
                            </Grid>
                          ))}
                        </Grid>
                      </Grid>
                    </Grid>
                  </Grid>
                )}
              </>
            )}
          </Grid>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <LRS state={state} setState={setState} />
            </Grid>

            <Grid item xs={12} sx={{ mb: 2 }}>
              <Platform state={state} setState={setState} />
            </Grid>
          </Grid>
        </AccordionDetails>
        <AccordionActions>
          <Grid container>
            <Button
              variant="contained"
              fullWidth
              disabled={
                !indicatorQuery.lrsStores.length ||
                !indicatorQuery.platforms.length
              }
              onClick={handleUnlockFilters}
            >
              Next
            </Button>
          </Grid>
        </AccordionActions>
      </Accordion>
    </>
  );
};

export default Dataset;
