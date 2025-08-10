import { useContext } from "react";
import { BasicContext } from "../../../basic-indicator";
import { Autocomplete, Paper, TextField, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { analysiInputMenuList } from "../utils/analysis-data";
import CustomTooltip from "../../../../../../../common/components/custom-tooltip/custom-tooltip";

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
        <CustomTooltip
          type="description"
          message={`Each method has input parameter(s). You can decide which data should be assigned to which analysis input parameter.`}
        />
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
                  <CustomTooltip
                    type="description"
                    message={input.description}
                  />
                </Grid>
              </Grid>
            </Grid>
          ))}
        </Grid>
      </Grid>
    </Grid>
  );
}
