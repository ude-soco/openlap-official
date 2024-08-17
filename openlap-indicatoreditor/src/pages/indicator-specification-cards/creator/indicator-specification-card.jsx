import React, { createContext, useState } from "react";
import {
  Button,
  Divider,
  Grid,
  Step,
  StepLabel,
  Stepper,
  Typography,
} from "@mui/material";
import SpecifyRequirements from "./components/specify-requirements/specify-requirements.jsx";

export const ISCContext = createContext(undefined);

const IndicatorSpecificationCard = () => {
  const [state, setState] = useState({
    activeStep: 0,
    steps: ["Specify ISC Requirements", "Choose path", "Customize"],
  });
  const [requirements, setRequirements] = useState({
    goalType: {
      name: "",
    },
    goal: "",
    question: "",
    indicatorName: "",
    data: [
      {
        value: "",
        placeholder: "e.g., name of materials",
      },
      { value: "", placeholder: "e.g., number of downloads" },
    ],
  });

  const handleCreatorStep = (step = "next") => {
    if (step === "next") {
      setState((prevState) => ({
        ...prevState,
        activeStep: prevState.activeStep + 1,
      }));
    }
    if (step === "previous") {
      setState((prevState) => ({
        ...prevState,
        activeStep:
          prevState.activeStep === 0
            ? prevState.activeStep
            : prevState.activeStep - 1,
      }));
    }
  };

  return (
    <>
      <ISCContext.Provider value={{ requirements, setRequirements }}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Typography>ISC Creator</Typography>
          </Grid>
          <Grid item xs={12} sx={{ mb: 2 }}>
            <Divider />
          </Grid>
          <Grid item xs={12} sx={{ mb: 2 }}>
            <Grid container spacing={2} justifyContent="center">
              <Grid item xs={12} md={8}>
                <Stepper activeStep={state.activeStep}>
                  {state.steps.map((label, index) => (
                    <Step key={label}>
                      <StepLabel>{label}</StepLabel>
                    </Step>
                  ))}
                </Stepper>
              </Grid>
            </Grid>
          </Grid>

          <Grid item xs={12}>
            {state.activeStep === 0 && <SpecifyRequirements />}
            {state.activeStep === 1 && <Typography>Step 2</Typography>}
            {state.activeStep === 2 && <Typography>Step 3</Typography>}
          </Grid>

          <Grid item xs={12} sx={{ mb: 2 }}>
            <Grid container spacing={2} justifyContent="center">
              <Grid item xs={12} md={8}>
                <Grid
                  container
                  spacing={2}
                  justifyContent={
                    state.activeStep === 0 ? "flex-end" : "space-between"
                  }
                >
                  {state.activeStep > 0 && (
                    <Grid item>
                      <Button
                        variant="contained"
                        onClick={() => handleCreatorStep("previous")}
                      >
                        Previous
                      </Button>
                    </Grid>
                  )}
                  {state.activeStep < state.steps.length - 1 && (
                    <Grid item>
                      <Button
                        variant="contained"
                        onClick={() => handleCreatorStep("next")}
                      >
                        Next
                      </Button>
                    </Grid>
                  )}
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </ISCContext.Provider>
    </>
  );
};

export default IndicatorSpecificationCard;
