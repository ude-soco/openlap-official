import { useContext, useEffect } from "react";
import { BasicContext } from "../../../basic-indicator";
import {
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Tooltip,
  Typography,
} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import Grid from "@mui/material/Grid2";

const InputsSelection = () => {
  const { analysis, visualization, setVisualization } =
    useContext(BasicContext);

  useEffect(() => {
    visualization.selectedType.chartInputs.forEach((input) => {
      if (!input.selectedInput) {
        const filteredInputs = Object.values(analysis.analyzedData).filter(
          (value) => input.type === value.configurationData.type
        );
        if (filteredInputs.length > 0) {
          const defaultValue = filteredInputs[0].configurationData;
          handleSelectInputs(defaultValue, input);
        }
      }
    });
  }, [visualization.selectedType.chartInputs, analysis.analyzedData]);

  const handleSelectInputs = (value, input) => {
    const tempInputMappings = { inputPort: input, outputPort: value };
    setVisualization((p) => {
      const updatedMappings = updateMappingsMethod(
        tempInputMappings,
        p.mapping.mapping
      );
      let tempInputs = [...p.selectedType.chartInputs];
      const item = tempInputs.find((item) => input.id === item.id);
      if (item) item.selectedInput = value;
      return {
        ...p,
        mapping: {
          ...p.mapping,
          mapping: updatedMappings,
        },
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
    <>
      <Typography gutterBottom sx={{ pb: 0.5 }}>
        Select <b>Inputs</b> of {visualization.selectedType.name}
      </Typography>
      <Grid container spacing={2} alignItems="center">
        {visualization.selectedType.chartInputs.flatMap((input, index) => {
          const filteredInputs = Object.values(analysis.analyzedData).filter(
            (value) => input.type === value.configurationData.type
          );
          let defaultValue = "";
          if (input.selectedInput) {
            defaultValue = input.selectedInput;
          } else if (filteredInputs.length > 0) {
            defaultValue = filteredInputs[0].configurationData;
            // handleSelectInputs(defaultValue, input);
          }
          return (
            <Grid size={{ xs: 12, md: 6 }} key={index}>
              <Grid container alignItems="center" spacing={1}>
                <Grid size="grow">
                  <FormControl fullWidth>
                    <InputLabel required={Boolean(input.required)}>
                      {input.title}
                    </InputLabel>
                    <Select
                      label={input.title}
                      value={defaultValue}
                      onChange={(event) =>
                        handleSelectInputs(event.target.value, input)
                      }
                    >
                      {filteredInputs.map((value, index) => (
                        <MenuItem key={index} value={value.configurationData}>
                          {value.configurationData.title}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
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
          );
        })}
      </Grid>
    </>
  );
};

export default InputsSelection;
