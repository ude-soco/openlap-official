import { useContext, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  IconButton,
  Popover,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import CloseIcon from "@mui/icons-material/Close";
import WarningIcon from "@mui/icons-material/Warning";
import AddIcon from "@mui/icons-material/Add";
import { ISCContext } from "../../../../indicator-specification-card.jsx";
import { DataTypes } from "../../../../utils/data/config.js";
import { v4 as uuidv4 } from "uuid";

const DataList = () => {
  const { lockedStep, requirements, setRequirements } = useContext(ISCContext);
  const [state, setState] = useState({
    tipAnchor: null,
  });

  const handleChangeValue = (index, event) => {
    const { name, value } = event.target;
    const newData = [...requirements.data];
    newData[index][name] = value;
    setRequirements({ ...requirements, data: newData });
  };

  const handleChangeType = (index, value) => {
    const newData = [...requirements.data];
    newData[index] = {
      ...newData[index],
      type: value || { type: "" },
    };
    setRequirements((prev) => ({ ...prev, data: newData }));
  };

  const handleAddDataRow = () => {
    setRequirements((prevState) => ({
      ...prevState,
      data: [
        ...prevState.data,
        {
          id: uuidv4(),
          value: "",
          placeholder: undefined,
          type: DataTypes.categorical,
        },
      ],
    }));
  };

  const handleDeleteDataRow = (indexToRemove) => {
    setRequirements((prevState) => ({
      ...prevState,
      data: [...prevState.data].filter((_, index) => index !== indexToRemove),
    }));
  };

  // * Helper functions to find duplicates
  const valueCounts = requirements.data.reduce((acc, req) => {
    acc[req.value] = (acc[req.value] || 0) + 1;
    return acc;
  }, {});

  const duplicateValues = new Set(
    Object.keys(valueCounts).filter((key) => valueCounts[key] > 1)
  );

  return (
    <>
      <Grid container spacing={2}>
        <Typography>I need the following data</Typography>
        {requirements.data.map((requirement, index) => {
          const isDuplicate = duplicateValues.has(requirement.value);
          return (
            <Grid size={{ xs: 12 }} key={index}>
              <Grid container spacing={2}>
                <Grid size="grow">
                  <TextField
                    fullWidth
                    required
                    name="value"
                    label={`${index + 1}. Name of data`}
                    error={requirement.value === "" || isDuplicate}
                    value={requirement.value}
                    onChange={(event) => handleChangeValue(index, event)}
                    placeholder={requirement.placeholder || ""}
                    helperText={
                      requirement.value === ""
                        ? ""
                        : isDuplicate
                        ? "Duplicate name detected"
                        : ""
                    }
                  />
                </Grid>
                <Grid size={{ xs: "grow", sm: 6 }}>
                  <Grid container alignItems="center" spacing={2}>
                    <Grid size={{ xs: "grow" }}>
                      <Autocomplete
                        fullWidth
                        disableClearable
                        options={Object.values(DataTypes)}
                        value={
                          Object.values(DataTypes).find(
                            (dt) => dt.value === requirement.type?.value
                          ) || null
                        }
                        getOptionLabel={(option) => {
                          return option?.value || "Unknown";
                        }}
                        renderOption={(props, option) => {
                          const { key, ...restProps } = props;
                          return (
                            <li key={key} {...restProps}>
                              <Grid container sx={{ py: 0.5 }}>
                                <Typography>{option.value}</Typography>
                                <Typography
                                  variant="body2"
                                  sx={{ fontStyle: "italic" }}
                                >
                                  {option.description}
                                </Typography>
                              </Grid>
                            </li>
                          );
                        }}
                        groupBy={() => "Column types"}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            placeholder="Select a data column type"
                            label="Type of data *"
                          />
                        )}
                        onChange={(event, value) => {
                          if (value) handleChangeType(index, value);
                        }}
                      />
                    </Grid>
                    <Grid size="auto">
                      {!lockedStep.dataset.locked && (
                        <>
                          <Tooltip
                            arrow
                            title={
                              <Typography>Click to view warning</Typography>
                            }
                          >
                            <IconButton
                              color="warning"
                              onClick={(e) =>
                                setState((prevState) => ({
                                  ...prevState,
                                  tipAnchor: e.currentTarget,
                                }))
                              }
                            >
                              <WarningIcon />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                      <Tooltip
                        arrow
                        title={
                          <Typography>
                            Remove <b>{requirement.value}</b>
                          </Typography>
                        }
                      >
                        <IconButton
                          color="error"
                          onClick={() => handleDeleteDataRow(index)}
                        >
                          <CloseIcon />
                        </IconButton>
                      </Tooltip>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
              <Popover
                open={Boolean(state.tipAnchor)}
                anchorEl={state.tipAnchor}
                onClose={() =>
                  setState((prevState) => ({
                    ...prevState,
                    tipAnchor: null,
                  }))
                }
                anchorOrigin={{
                  vertical: "bottom",
                  horizontal: "left",
                }}
                PaperProps={{
                  sx: {
                    backgroundColor: "error.dark",
                    color: "primary.contrastText",
                    position: "absolute",
                    p: 1,
                  },
                }}
              >
                <Box sx={{ p: 2, maxWidth: 350 }}>
                  <Typography gutterBottom>
                    <b>Attention!</b>
                  </Typography>
                  <Typography>
                    Changing the type of this data will reset the data of{" "}
                    <b>{requirement.value}</b> column in the <b>Dataset</b> step
                    below.
                  </Typography>
                  <Typography>
                    It will cause the loss of data <b>only</b> in this column!
                    Other columns remain uneffected.
                  </Typography>
                  <Typography>Please proceed with caution!</Typography>
                </Box>

                <Grid container justifyContent="flex-end">
                  <Button
                    size="small"
                    onClick={() =>
                      setState((prevState) => ({
                        ...prevState,
                        tipAnchor: null,
                      }))
                    }
                    color="text"
                    variant="outlined"
                  >
                    Close
                  </Button>
                </Grid>
              </Popover>
            </Grid>
          );
        })}

        <Button size="large" startIcon={<AddIcon />} onClick={handleAddDataRow}>
          Add more data
        </Button>
      </Grid>
    </>
  );
};

export default DataList;
