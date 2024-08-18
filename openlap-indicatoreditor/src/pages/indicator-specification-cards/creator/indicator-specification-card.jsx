import React, { createContext, useState } from "react";
import { Divider, Grid, Typography } from "@mui/material";
import SpecifyRequirements from "./components/specify-requirements/specify-requirements.jsx";
import ChoosePath from "./components/choose-path/choose-path.jsx";
import Visualization from "./components/visualization/visualization.jsx";
import Dataset from "./components/dataset/dataset.jsx";
import Finalize from "./components/finalize/finalize.jsx";

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

  const [dataset, setDataset] = useState({
    file: { name: "" },
    rows: [],
    columns: [],
  });

  const [visRef, setVisRef] = useState({
    filter: {
      type: "",
    },
    chart: {
      type: "",
    },
  });

  const [lockedStep, setLockedStep] = useState({
    requirements: {
      openPanel: true,
      step: "1",
    },
    path: {
      locked: true,
      openPanel: false,
      step: "2",
    },
    visualization: {
      locked: true,
      openPanel: false,
      step: "0",
    },
    dataset: {
      locked: true,
      openPanel: false,
      step: "0",
    },
    finalize: {
      locked: true,
      openPanel: false,
      step: "5",
    },
  });

  return (
    <>
      <ISCContext.Provider
        value={{
          requirements,
          setRequirements,
          lockedStep,
          setLockedStep,
          visRef,
          setVisRef,
          dataset,
          setDataset,
        }}
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
          {lockedStep.visualization.step === "3" && (
            <Grid item xs={12}>
              <Visualization />
            </Grid>
          )}
          {lockedStep.dataset.step === "4" && (
            <Grid item xs={12}>
              <Dataset />
            </Grid>
          )}
          {lockedStep.dataset.step === "3" && (
            <Grid item xs={12}>
              <Dataset />
            </Grid>
          )}
          {lockedStep.visualization.step === "4" && (
            <Grid item xs={12}>
              <Visualization />
            </Grid>
          )}
          {lockedStep.visualization.step !== "0" &&
            lockedStep.dataset.step !== "0" && (
              <Grid item xs={12}>
                <Finalize />
              </Grid>
            )}
        </Grid>
      </ISCContext.Provider>
    </>
  );
};

export default IndicatorSpecificationCard;
