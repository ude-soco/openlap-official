import { useContext } from "react";
import { BasicContext } from "../../../basic-indicator";
import {
  Autocomplete,
  IconButton,
  Paper,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import InfoIcon from "@mui/icons-material/Info";
import { analysiInputMenuList } from "../utils/analysis-data";

export default function InputsSelection() {
  const { analysis, setAnalysis } = useContext(BasicContext);

  const handleSelectInputs = (input, value) => {
    const tempInputMappings = { inputPort: input, outputPort: value };
    setAnalysis((p) => {
      const updatedMappings = updateMappingsMethod(
        tempInputMappings,
        p.selectedAnalyticsMethod.mapping.mapping
      );
      let tempInputs = [...p.inputs];
      const item = tempInputs.find((item) => input.id === item.id);
      if (item) item.selectedInput = value;
      return {
        ...p,
        inputs: tempInputs,
        selectedAnalyticsMethod: {
          ...p.selectedAnalyticsMethod,
          mapping: {
            ...p.selectedAnalyticsMethod.mapping,
            mapping: updatedMappings,
          },
        },
        analyzedData: {},
      };
    });
  };

  // * Helper function
  function updateMappingsMethod(newMappings, oldMappings) {
    let found = false;
    oldMappings.forEach((item, index) => {
      if (item.inputPort.id === newMappings.inputPort.id) {
        oldMappings[index].outputPort = newMappings.outputPort;
        found = true;
      }
    });
    if (!found) {
      oldMappings.push(newMappings);
    }
    return oldMappings;
  }

  return (
    <Grid
      container
      spacing={2}
      component={Paper}
      variant="outlined"
      sx={{ p: 2 }}
    >
      <Grid container spacing={0} alignItems="center">
        <Typography>
          Select <b>Inputs</b> of the method
        </Typography>
        <Tooltip
          arrow
          title={
            <Typography sx={{ p: 1 }}>
              <b>Description</b>
              <br />
              Each Analysis Method has input parameters. You can decide which
              data should be assigned to which analysis input parameter.
            </Typography>
          }
        >
          <IconButton color="info">
            <InfoIcon />
          </IconButton>
        </Tooltip>
      </Grid>
      <Grid size={{ xs: 12 }}>
        <Grid container spacing={2} alignItems="center">
          {analysis.inputs.map((input, index) => (
            <Grid size={{ xs: 12 }} key={index}>
              <Grid container spacing={1} alignItems="center">
                <Grid size="grow">
                  {/* // TODO: Need to change to normal Select Menu Item component */}
                  <Autocomplete
                    disableClearable
                    disablePortal
                    fullWidth
                    options={analysiInputMenuList}
                    getOptionLabel={(o) => o.name}
                    value={input.selectedInput || null}
                    onChange={(event, value) =>
                      handleSelectInputs(input, value)
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label={`${input.title} ${
                          input.required ? "" : "(Optional)"
                        }`}
                        placeholder="Input attributes"
                      />
                    )}
                    renderOption={(props, option) => {
                      const { key, ...restProps } = props;
                      return (
                        <li {...restProps} key={option.id}>
                          <Grid container sx={{ py: 0.5 }}>
                            <Grid size={{ xs: 12 }}>
                              <Typography>{option.name}</Typography>
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                              <Typography variant="body2">
                                {option.description}
                              </Typography>
                            </Grid>
                          </Grid>
                        </li>
                      );
                    }}
                  />
                </Grid>
                <Grid size="auto">
                  <Tooltip
                    arrow
                    title={
                      <Typography sx={{ p: 1 }}>
                        <b>Description</b>
                        <br />
                        {input.description}
                      </Typography>
                    }
                  >
                    <IconButton color="info">
                      <InfoIcon />
                    </IconButton>
                  </Tooltip>
                </Grid>
              </Grid>
            </Grid>
          ))}
        </Grid>
      </Grid>
    </Grid>
  );
}
