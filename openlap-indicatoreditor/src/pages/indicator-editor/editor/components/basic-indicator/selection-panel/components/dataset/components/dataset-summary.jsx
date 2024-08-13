import {
  AccordionSummary,
  Chip,
  Button,
  Grid,
  Typography,
  FormGroup,
  FormControlLabel,
  Switch,
} from "@mui/material";
import LRSChips from "./lrs-chips.jsx";
import PlatformChips from "./platform-chips.jsx";

const DatasetSummary = ({
  state,
  handleToggleShowSelection,
  handleTogglePanel,
}) => {
  return (
    <>
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
                        onChange={handleToggleShowSelection}
                        label="Show selections"
                      />
                    </FormGroup>
                  )}
                  <Button color="primary" onClick={handleTogglePanel}>
                    {state.openPanel ? "Close section" : "CHANGE"}
                  </Button>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
          {!state.openPanel && state.showSelections && (
            <>
              <LRSChips />
              <PlatformChips />
            </>
          )}
        </Grid>
      </AccordionSummary>
    </>
  );
};

export default DatasetSummary;
