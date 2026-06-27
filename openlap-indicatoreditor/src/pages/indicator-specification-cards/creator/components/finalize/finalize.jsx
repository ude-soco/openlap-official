import { useContext, useState } from "react";
import { ISCContext } from "../../isc-context.js";
import { Button, Divider, Grid, Collapse } from "@mui/material";
import NameDialog from "./components/name-dialog.jsx";
import VisSelection from "../visualization/components/visualization-filter/vis-selection";
import FinalizeSummary from "./components/finalize-summary/finalize-summary";
import WorkflowSection from "../workflow-section/workflow-section.jsx";
import { useParams } from "react-router-dom";

const Finalize = () => {
  const params = useParams();
  const { dataset, lockedStep } = useContext(ISCContext);
  const [state, setState] = useState({
    openSaveDialog: false,
  });

  const [showCustomize, setShowCustomize] = useState(true);

  const handleOpenSaveDialog = () => {
    setState((prevState) => ({
      ...prevState,
      openSaveDialog: !prevState.openSaveDialog,
    }));
  };

  const handleToggleCustomizePanel = () => {
    setShowCustomize(!showCustomize);
  };

  const handleCheckDisabled = () => {
    return dataset.rows.length === 0 || dataset.columns.length === 0;
  };

  const status = lockedStep.finalize.locked
    ? "locked"
    : lockedStep.finalize.openPanel
      ? "active"
      : "available";

  return (
    <>
      <WorkflowSection
        status={status}
        ariaLabel="Finalize indicator"
        lockedHint="Complete the previous steps to finalize your indicator."
      >
        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <FinalizeSummary />
          </Grid>
          <Grid size={{ xs: 12 }} sx={{ pt: 1 }}>
            <Collapse
              in={lockedStep.finalize.openPanel}
              timeout={{ enter: 500, exit: 250 }}
              unmountOnExit
            >
              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <VisSelection
                    customize={showCustomize}
                    handleToggleCustomizePanel={handleToggleCustomizePanel}
                  />
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
                        disabled={handleCheckDisabled()}
                        onClick={handleOpenSaveDialog}
                      >
                        {params.id ? "Update indicator" : "Save indicator"}
                      </Button>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </Collapse>
          </Grid>
        </Grid>
      </WorkflowSection>
      <NameDialog
        open={state.openSaveDialog}
        toggleOpen={handleOpenSaveDialog}
      />
    </>
  );
};

export default Finalize;
