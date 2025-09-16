import { useContext, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  IconButton,
  Popover,
  Grid,
  TextField,
  Tooltip,
  Typography,
  Stack,
  Paper,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import WarningIcon from "@mui/icons-material/Warning";
import AddIcon from "@mui/icons-material/Add";
import { ISCContext } from "../../../../indicator-specification-card.jsx";
import { DataTypes } from "../../../../utils/data/config.js";
import { v4 as uuidv4 } from "uuid";
import CustomTooltip from "../../../../../../../common/components/custom-tooltip/custom-tooltip.jsx";
import TipPopover from "../../../../../../../common/components/tip-popover/tip-popover.jsx";

const DataList = () => {
  const { lockedStep, requirements, setRequirements } = useContext(ISCContext);
  const [state, setState] = useState({
    indicatorPopoverAnchor: null,
    indicatorDescription: `
      There are three types of data to choose from:
      <ul>
        ${Object.values(DataTypes)
          .map(
            (option) =>
              `<li><b>${option.value}:</b> <br/>${option.description}</li>`
          )
          .join("")}
      </ul>   
    `,
  });

  const handleIndicatorPopoverAnchor = (param) => {
    setState((p) => ({ ...p, indicatorPopoverAnchor: param }));
  };

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
    setRequirements((p) => ({
      ...p,
      data: [
        ...p.data,
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
    setRequirements((p) => ({
      ...p,
      data: [...p.data].filter((_, index) => index !== indexToRemove),
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
      <Stack gap={2} sx={{ width: "100%" }}>
        <Grid container spacing={1} alignItems="center">
          <Typography>I need the following data</Typography>
          <TipPopover
            tipAnchor={state.indicatorPopoverAnchor}
            toggleTipAnchor={handleIndicatorPopoverAnchor}
            description={state.indicatorDescription}
          />
        </Grid>
        {requirements.data.map((requirement, index) => {
          const isDuplicate = duplicateValues.has(requirement.value);
          return (
            <Stack
              component={Paper}
              variant="outlined"
              gap={3}
              key={index}
              sx={{ p: 2 }}
            >
              <Grid
                container
                justifyContent="space-between"
                alignItems="center"
              >
                <Grid size="grow">
                  <Stack direction="row" alignItems="center">
                    <Typography fontWeight="500">
                      {requirement.value
                        ? `${requirement.value} ` +
                          (requirement.type?.value
                            ? `(${requirement.type?.value})`
                            : "")
                        : `Data ${index + 1}`}
                    </Typography>
                    {!lockedStep.dataset.locked && (
                      <CustomTooltip
                        type="warning"
                        message={`
                      Changing the type of this data will reset the data of
                      <b>${requirement.value}</b> column in the <b>Dataset</b> step
                      below.<br/>
                      It will cause the loss of data <b>only</b> in this column!
                      Other columns remain uneffected.<br/>
                      Please proceed with caution!                      
                      `}
                      />
                    )}
                  </Stack>
                </Grid>
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
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              </Grid>
              <Stack
                direction={{ xs: "column", lg: "row" }}
                alignItems="center"
                gap={2}
              >
                <TextField
                  fullWidth
                  required
                  name="value"
                  label={`Name of data`}
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
                        </Grid>
                      </li>
                    );
                  }}
                  // groupBy={() => "Column types"}
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
              </Stack>
            </Stack>
          );
        })}
        <Box>
          <Button
            size="large"
            startIcon={<AddIcon />}
            onClick={handleAddDataRow}
          >
            Add more data
          </Button>
        </Box>
      </Stack>
    </>
  );
};

export default DataList;
