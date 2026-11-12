import { useContext } from "react";
import { Collapse, Grid } from "@mui/material";
import { ISCContext } from "../../isc-context.js";
import ChoosePathSummary from "./components/choose-path-summary.jsx";
import PathSelectors from "./components/path-selectors.jsx";
import WorkflowSection from "../../../../../common/components/workflow-section/workflow-section.jsx";
import { isPathComplete } from "../../utils/isc-selectors.js";

const ChoosePath = () => {
  const { lockedStep, requirements } = useContext(ISCContext);

  const status = lockedStep.path.locked
    ? "locked"
    : lockedStep.path.openPanel
      ? "active"
      : isPathComplete({ requirements })
        ? "completed"
        : "available";

  return (
    <>
      <WorkflowSection
        status={status}
        ariaLabel="Step 2: Choose path"
        lockedHint="Complete Specify Requirements to choose how you want to start."
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
      </WorkflowSection>
    </>
  );
};

export default ChoosePath;
