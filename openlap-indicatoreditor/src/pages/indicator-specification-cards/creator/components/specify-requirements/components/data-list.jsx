import React, { useContext } from "react";
import { Button, Grid, IconButton, TextField, Typography } from "@mui/material";
import { Add, Close } from "@mui/icons-material";
import { ISCContext } from "../../../indicator-specification-card.jsx";

const DataList = () => {
  const { requirements, setRequirements } = useContext(ISCContext);

  const handleChange = (index, event) => {
    const newData = [...requirements.data];
    newData[index].value = event.target.value;
    setRequirements({ ...requirements, data: newData });
  };

  const handleAddDataRow = () => {
    setRequirements((prevState) => ({
      ...prevState,
      data: [...prevState.data, { value: "" }],
    }));
  };

  const handleDeleteDataRow = (indexToRemove) => {
    console.log(indexToRemove);
    setRequirements((prevState) => ({
      ...prevState,
      data: [...prevState.data].filter((_, index) => index !== indexToRemove),
    }));
  };

  return (
    <>
      <Grid container spacing={2}>
        {requirements.data.map((requirement, index) => {
          return (
            <Grid item xs={12} key={index}>
              <Grid container spacing={2} alignItems="center">
                <Grid item>
                  <Typography>{index + 1}</Typography>
                </Grid>
                <Grid item xs>
                  <TextField
                    fullWidth
                    required
                    label="I need data"
                    value={requirement.value}
                    onChange={(event) => handleChange(index, event)}
                    placeholder={requirement.placeholder || ""}
                  />
                </Grid>
                {index > 1 && (
                  <Grid item>
                    <IconButton
                      color="error"
                      onClick={() => handleDeleteDataRow(index)}
                    >
                      <Close />
                    </IconButton>
                  </Grid>
                )}
              </Grid>
            </Grid>
          );
        })}

        <Grid item xs={12}>
          <Button
            sx={{ ml: 3.5 }}
            startIcon={<Add />}
            onClick={handleAddDataRow}
          >
            Add more data
          </Button>
        </Grid>
      </Grid>
    </>
  );
};

export default DataList;
