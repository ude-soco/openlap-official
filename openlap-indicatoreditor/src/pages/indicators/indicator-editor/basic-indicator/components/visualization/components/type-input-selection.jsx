import { useContext, useEffect } from "react";
import { BasicContext } from "../../../basic-indicator";
import {
  FormControl,
  InputLabel,
  Grid,
  MenuItem,
  Select,
  Typography,
  Stack,
} from "@mui/material";
import CustomTooltip from "../../../../../../../common/components/custom-tooltip/custom-tooltip";

const TypeInputSelection = () => {
  const { analysis, visualization, setVisualization } =
    useContext(BasicContext);

  useEffect(() => {
    const newMappings = [...visualization.mapping.mapping]; // copy existing mappings

    const updatedInputs = visualization.inputs.map((input) => {
      // Already has a selection? Just return it.
      if (input.selectedInput) return input;

      // Find a matching analyzedData item
      const filteredInputs = Object.values(analysis.analyzedData).filter(
        (value) => input.type === value.configurationData.type
      );

      if (filteredInputs.length > 0) {
        const defaultValue = filteredInputs[0].configurationData;

        // Build mapping entry
        const mappingEntry = {
          inputPort: { ...input },
          outputPort: { ...defaultValue },
        };

        // Update or insert mapping
        const existingIndex = newMappings.findIndex(
          (m) => m.inputPort.id === input.id
        );
        if (existingIndex !== -1) {
          newMappings[existingIndex] = mappingEntry;
        } else {
          newMappings.push(mappingEntry);
        }

        // Return input with selectedInput set
        return { ...input, selectedInput: { ...defaultValue } };
      }

      return input; // no match found, return as-is
    });

    setVisualization((p) => ({
      ...p,
      inputs: updatedInputs,
      mapping: { ...p.mapping, mapping: newMappings },
    }));
  }, [visualization.selectedType.id, analysis.analyzedData]);

  const handleSelectInput = (value, input) => {
    // Deep copy each input object
    let tempInputs = visualization.inputs.map((item) => ({ ...item }));

    const foundIndex = tempInputs.findIndex((item) => input.id === item.id);
    if (foundIndex !== -1) {
      tempInputs[foundIndex] = {
        ...tempInputs[foundIndex], // copy again to ensure immutability
        selectedInput: { ...value }, // also copy value if it's an object
      };
    }
    const tempMapping = { inputPort: input, outputPort: value };
    const updatedMapping = updateMappingsMethod(
      tempMapping,
      visualization.mapping.mapping
    );
    setVisualization((p) => ({
      ...p,
      inputs: tempInputs,
      mapping: { ...p.mapping, mapping: updatedMapping },
    }));
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

  // Helper function
  const formatTypeName = (type) => {
    if (type === "Text") return "Categorical";
    if (type === "Numeric") return "Numerical";
    return type;
  };

  return (
    <Stack gap={2}>
      <Typography gutterBottom sx={{ pb: 0.5 }}>
        Select <b>Inputs</b> of {visualization.selectedType.name}
      </Typography>
      <Grid container spacing={2} alignItems="center">
        {visualization.inputs.map((input) => {
          const filteredInputs = Object.values(analysis.analyzedData).filter(
            (value) => input.type === value.configurationData.type
          );

          return (
            <Grid size={{ xs: 12, md: 6 }} key={input.id}>
              <Grid container alignItems="center" spacing={1}>
                <Grid size="grow">
                  <FormControl fullWidth>
                    <InputLabel required={Boolean(input.required)}>
                      {input.title} ({formatTypeName(input.type)}) 
                    </InputLabel>
                    <Select
                      label={`${input.title} (${formatTypeName(input.type)})`}
                      value={input.selectedInput?.id || ""} // store the id
                      onChange={(event) => {
                        const selectedId = event.target.value;
                        const selectedConfig = filteredInputs.find(
                          (v) => v.configurationData.id === selectedId
                        )?.configurationData;
                        handleSelectInput(selectedConfig, input);
                      }}
                    >
                      {filteredInputs.map((value) => (
                        <MenuItem
                          key={value.configurationData.id}
                          value={value.configurationData.id}
                        >
                          {value.configurationData.title}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size="auto">
                  <CustomTooltip
                    type="description"
                    message={input.description}
                  />
                </Grid>
              </Grid>
            </Grid>
          );
        })}
      </Grid>
    </Stack>
  );
};

export default TypeInputSelection;
