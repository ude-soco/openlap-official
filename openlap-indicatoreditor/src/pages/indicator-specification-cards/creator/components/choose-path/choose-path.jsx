import { useContext } from "react";
import { Paper, Collapse } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { ISCContext } from "../../indicator-specification-card.jsx";
import ChoosePathSummary from "./components/choose-path-summary/choose-path-summary.jsx";
import PathSelectors from "./components/path-selectors/path-selectors.jsx";

const ChoosePath = () => {
  const { lockedStep } = useContext(ISCContext);

  return (
    <>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <ChoosePathSummary />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Collapse
              in={lockedStep.path.openPanel}
              timeout={{ enter: 500, exit: 250 }}
              unmountOnExit
            >
              <PathSelectors />
            </Collapse>
          </Grid>
        </Grid>
      </Paper>
    </>
  );
};

export default ChoosePath;
