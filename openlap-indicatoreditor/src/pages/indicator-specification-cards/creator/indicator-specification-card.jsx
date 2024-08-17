import React, { createContext, useState } from "react";
import { Divider, Grid, Typography } from "@mui/material";
import SpecifyRequirements from "./components/specify-requirements/specify-requirements.jsx";
import ChoosePath from "./components/choose-path/choose-path.jsx";

export const ISCContext = createContext(undefined);

const IndicatorSpecificationCard = () => {
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

  const [lockedStep, setLockedStep] = useState({
    requirements: {
      locked: false,
      openPanel: true,
    },
    path: {
      locked: true,
      openPanel: false,
    },
    visualization: {
      locked: true,
      openPanel: false,
    },
    dataset: {
      locked: true,
      openPanel: false,
    },
    finalize: {
      locked: true,
      openPanel: false,
    },
  });

  return (
    <>
      <ISCContext.Provider
        value={{ requirements, setRequirements, lockedStep, setLockedStep }}
      >
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Typography>ISC Creator</Typography>
          </Grid>
          <Grid item xs={12} sx={{ mb: 2 }}>
            <Divider />
          </Grid>

          <Grid item xs={12}>
            <SpecifyRequirements />
          </Grid>
          <Grid item xs={12}>
            <ChoosePath />
          </Grid>
        </Grid>
      </ISCContext.Provider>
    </>
  );
};

export default IndicatorSpecificationCard;
