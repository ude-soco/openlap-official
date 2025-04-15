import {
  AccordionSummary,
  Chip,
  Grid,
  Typography,
  Tooltip,
  IconButton,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import EditIcon from "@mui/icons-material/Edit";
import CloseIcon from "@mui/icons-material/Close";
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
                  {!state.openPanel && (
                    <>
                      <Grid item>
                        <Tooltip title="Edit dataset selection">
                          <IconButton onClick={handleTogglePanel}>
                            <EditIcon color="primary" />
                          </IconButton>
                        </Tooltip>
                      </Grid>

                      <Grid item>
                        <Tooltip
                          title={
                            !state.showSelections
                              ? "Show summary"
                              : "Hide summary"
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
                    </>
                  )}
                </Grid>
              </Grid>
              {state.openPanel && (
                <Grid item>
                  <Tooltip title="Close panel">
                    <IconButton onClick={handleTogglePanel}>
                      <CloseIcon color="primary" />
                    </IconButton>
                  </Tooltip>
                </Grid>
              )}
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
