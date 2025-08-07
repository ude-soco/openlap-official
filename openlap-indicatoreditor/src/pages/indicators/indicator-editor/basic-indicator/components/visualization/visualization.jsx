import {
  Box,
  Button,
  Collapse,
  Divider,
  Paper,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import { useContext, useEffect, useState } from "react";
import { BasicContext } from "../../basic-indicator";
import { AuthContext } from "../../../../../../setup/auth-context-manager/auth-context-manager";
import VisualizationSummary from "./components/visualization-summary";
import LibrarySelection from "./components/library-selection";
import { visualizationImages } from "./utils/visualization-data";
import TypeSelection from "./components/type-selection";

export default function Dataset() {
  const { api } = useContext(AuthContext);
  const { lockedStep, setLockedStep, visualization } = useContext(BasicContext);
  const [state, setState] = useState({
    tipAnchor: null,
    tipDescription: `
      <b>Tip!</b><br/>
      To be decided!
    `,
  });

  const handleDatasetPopoverAnchor = (param) => {
    setState((p) => ({ ...p, tipAnchor: param }));
  };

  return (
    <>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <VisualizationSummary />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Collapse
              in={lockedStep.visualization.openPanel}
              timeout={{ enter: 500, exit: 250 }}
              unmountOnExit
            >
              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <Grid container spacing={2} justifyContent="center">
                    <Grid size={{ xs: 12, md: 8 }}>
                      <LibrarySelection />
                    </Grid>
                    <Grid size={{ xs: 12, md: 8 }}>
                      <TypeSelection />
                    </Grid>
                    <Grid size={{ xs: 12 }} sx={{ pt: 2 }}>
                      <Divider />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Typography>Inputs</Typography>
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Typography>Preview & Customization</Typography>
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Divider />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Grid container justifyContent="center">
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <Button
                            fullWidth
                            variant="contained"
                            // disabled={handleCheckDisabled()}
                            // onClick={handleUnlockPath}
                          >
                            Save Indicator
                          </Button>
                        </Grid>
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </Collapse>
          </Grid>
        </Grid>
      </Paper>
    </>
  );
}
