import React, { useContext } from "react";
import { Grid, TextField } from "@mui/material";
import { ISCContext } from "../../indicator-specification-card.jsx";
import GoalList from "./components/goal-list.jsx";
import DataList from "./components/data-list.jsx";

const SpecifyRequirements = () => {
  const { requirements, setRequirements } = useContext(ISCContext);

  const handleFormData = (event) => {
    const { name, value } = event.target;
    setRequirements((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Grid container spacing={2} justifyContent="center">
            <Grid item xs={12} md={8}>
              <Grid container spacing={2}>
                <Grid item xs sm={4}>
                  <GoalList />
                </Grid>
                <Grid item xs={12} sm>
                  <TextField
                    fullWidth
                    required
                    name="goal"
                    value={requirements.goal}
                    label="Describe your goal"
                    placeholder="e.g., the usage of the learning materials in my course."
                    onChange={handleFormData}
                  />
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Grid>

        <Grid item xs={12}>
          <Grid container spacing={2} justifyContent="center">
            <Grid item xs={12} md={8}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs>
                  <TextField
                    fullWidth
                    required
                    name="question"
                    value={requirements.question}
                    label="I am interested in"
                    placeholder="e.g., knowing how often these learning materials are viewed by my students."
                    onChange={handleFormData}
                  />
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Grid>

        <Grid item xs={12}>
          <Grid container spacing={2} justifyContent="center">
            <Grid item xs={12} md={8}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs>
                  <TextField
                    fullWidth
                    required
                    name="indicatorName"
                    value={requirements.indicatorName}
                    label="I need an indicator showing"
                    placeholder="e.g., the number of views of learning materials and sort by the most viewed ones."
                    onChange={handleFormData}
                  />
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Grid>

        <Grid item xs={12}>
          <Grid container spacing={2} justifyContent="center">
            <Grid item xs={12} md={8}>
              <DataList />
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </>
  );
};

export default SpecifyRequirements;
