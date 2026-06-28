import { useContext, useEffect } from "react";
import { BasicContext } from "../../../basic-indicator";
import {
  FormControl,
  FormHelperText,
  InputLabel,
  Grid,
  MenuItem,
  Select,
} from "@mui/material";
import SectionCard from "../../../../../../../common/components/section-card/section-card";

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
    <SectionCard
      title="Configure chart"
      helper={`Map each input of ${visualization.selectedType.name} to a column from your analysed data.`}
    >
      <Grid container spacing={2}>
        {visualization.inputs.map((input) => {
          const filteredInputs = Object.values(analysis.analyzedData).filter(
            (value) => input.type === value.configurationData.type
          );
          const labelId = `vis-input-label-${input.id}`;
          const labelText = `${input.title} (${formatTypeName(input.type)})`;

          return (
            <Grid size={{ xs: 12, md: 6 }} key={input.id}>
              <FormControl fullWidth>
                <InputLabel id={labelId} required={Boolean(input.required)}>
                  {labelText}
                </InputLabel>
                <Select
                  labelId={labelId}
                  id={`vis-input-${input.id}`}
                  label={labelText}
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
                {input.description && (
                  <FormHelperText>{input.description}</FormHelperText>
                )}
              </FormControl>
            </Grid>
          );
        })}
      </Grid>
    </SectionCard>
  );
};

export default TypeInputSelection;
