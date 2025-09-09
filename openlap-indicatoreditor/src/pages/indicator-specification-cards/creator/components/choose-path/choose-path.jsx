import { useContext } from "react";
import { Collapse, Grid, Paper } from "@mui/material";
import { ISCContext } from "../../indicator-specification-card.jsx";
import ChoosePathSummary from "./components/choose-path-summary.jsx";
import PathSelectors from "./components/path-selectors.jsx";
import { CustomThemeContext } from "../../../../../setup/theme-manager/theme-context-manager.jsx";

const ChoosePath = () => {
  const { darkMode } = useContext(CustomThemeContext);
  const { lockedStep } = useContext(ISCContext);

  return (
    <>
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          position: "relative",
          opacity: lockedStep.path.locked ? "0.5" : "1",
          pointerEvents: lockedStep.path.locked ? "none" : "auto",
          backgroundColor: lockedStep.path.locked
            ? darkMode
              ? "grey.800"
              : "grey.400"
            : "background.paper",
        }}
      >
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
