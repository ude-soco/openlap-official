import React, { useContext } from "react";
import {
  Autocomplete,
  Button,
  Grid,
  IconButton,
  TextField,
  Typography,
} from "@mui/material";
import { Add, Close } from "@mui/icons-material";
import { ISCContext } from "../../../indicator-specification-card.jsx";
import { DataTypes } from "../../../utils/data/config.js";

const DataList = () => {
  const { requirements, setRequirements } = useContext(ISCContext);

  const handleChangeValue = (index, event) => {
    const { name, value } = event.target;
    const newData = [...requirements.data];
    newData[index][name] = value;
    setRequirements({ ...requirements, data: newData });
  };

  const handleChangeType = (index, value) => {
    const newData = [...requirements.data];
    newData[index].type = value;
    setRequirements({ ...requirements, data: newData });
  };

  const handleAddDataRow = () => {
    setRequirements((prevState) => ({
      ...prevState,
      data: [...prevState.data, { value: "" }],
    }));
  };

  const handleDeleteDataRow = (indexToRemove) => {
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
                <Grid item xs>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item>
                      <Typography>{index + 1}</Typography>
                    </Grid>
                    <Grid item xs>
                      <TextField
                        fullWidth
                        required
                        name="value"
                        label="I need data"
                        value={requirement.value}
                        onChange={(event) => handleChangeValue(index, event)}
                        placeholder={requirement.placeholder || ""}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Autocomplete
                        fullWidth
                        options={Object.values(DataTypes)}
                        name="type"
                        getOptionLabel={(option) => {
                          return option?.value || "Unknown";
                        }}
                        renderOption={(props, option) => {
                          const { key, ...restProps } = props;
                          return (
                            <li key={key} {...restProps}>
                              <Grid container sx={{ py: 0.5 }}>
                                <Grid item xs={12}>
                                  <Typography>{option.value}</Typography>
                                </Grid>
                                <Grid item xs={12}>
                                  <Typography
                                    variant="body2"
                                    sx={{ fontStyle: "italic" }}
                                  >
                                    {option.description}
                                  </Typography>
                                </Grid>
                              </Grid>
                            </li>
                          );
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            placeholder="Select a column type"
                          />
                        )}
                        onChange={(event, value) => {
                          if (value) handleChangeType(index, value);
                        }}
                      />
                    </Grid>
                  </Grid>
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
