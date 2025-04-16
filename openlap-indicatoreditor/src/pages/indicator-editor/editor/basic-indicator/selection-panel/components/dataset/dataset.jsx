import { useState, useContext, useEffect } from "react";
import {
  Accordion,
  AccordionActions,
  Button,
  AccordionDetails,
  Grid,
} from "@mui/material";
import Platform from "./components/platform.jsx";
import LRS from "./components/lrs.jsx";
import { BasicIndicatorContext } from "../../../basic-indicator.jsx";
import DatasetSummary from "./components/dataset-summary.jsx";

const Dataset = () => {
  const { indicatorQuery, setLockedStep } = useContext(BasicIndicatorContext);
  const [state, setState] = useState(() => {
    const savedState = sessionStorage.getItem("dataset");
    return savedState
      ? JSON.parse(savedState)
      : {
          openPanel: true,
          showSelections: true,
          lrsList: [],
          selectedLrsList: [],
          platformList: [],
          selectedPlatformList: [],
          autoCompleteValue: null,
        };
  });

  useEffect(() => {
    sessionStorage.setItem("dataset", JSON.stringify(state));
  }, [state]);

  const handleTogglePanel = () => {
    setState((prevState) => ({
      ...prevState,
      openPanel: !prevState.openPanel,
    }));
  };

  const handleToggleShowSelection = () => {
    setState((prevState) => ({
      ...prevState,
      showSelections: !prevState.showSelections,
    }));
  };

  const handleUnlockFilters = () => {
    handleTogglePanel();
    setLockedStep((prevState) => ({
      ...prevState,
      filter: {
        ...prevState,
        locked: false,
        openPanel: true,
      },
    }));
  };

  return (
    <>
      <Accordion expanded={state.openPanel}>
        <DatasetSummary
          state={state}
          handleToggleShowSelection={handleToggleShowSelection}
          handleTogglePanel={handleTogglePanel}
        />
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
          <Grid container justifyContent="center">
            <Grid item xs={12} md={6}>
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
          </Grid>
        </AccordionActions>
      </Accordion>
    </>
  );
};

export default Dataset;
