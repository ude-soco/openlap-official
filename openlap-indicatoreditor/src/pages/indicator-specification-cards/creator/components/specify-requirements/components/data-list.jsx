import { useContext } from "react";
import {
  Autocomplete,
  Button,
  IconButton,
  TextField,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
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
    // newData[index].type = value;
    // setRequirements({ ...requirements, data: newData });
    newData[index] = {
      ...newData[index],
      type: value || { type: "" },
    };
    setRequirements((prev) => ({ ...prev, data: newData }));
  };

  const handleAddDataRow = () => {
    setRequirements((prevState) => ({
      ...prevState,
      data: [...prevState.data, { value: "", type: DataTypes.categorical }],
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
            <Grid size={{ xs: 12 }} key={index}>
              <Grid container spacing={2} alignItems="center">
                <Grid size="auto">
                  <Typography>{index + 1}</Typography>
                </Grid>
                <Grid size="grow">
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
                <Grid size={{ xs: "grow", sm: 6 }}>
                  <Autocomplete
                    fullWidth
                    disableClearable
                    options={Object.values(DataTypes)}
                    name="type"
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
                      />
                    )}
                    onChange={(event, value) => {
                      if (value) handleChangeType(index, value);
                    }}
                  />
                </Grid>

                {index > 1 && (
                  <Grid size="auto">
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

        <Button sx={{ ml: 3.5 }} startIcon={<Add />} onClick={handleAddDataRow}>
          Add more data
        </Button>
      </Grid>
    </>
  );
};

export default DataList;
