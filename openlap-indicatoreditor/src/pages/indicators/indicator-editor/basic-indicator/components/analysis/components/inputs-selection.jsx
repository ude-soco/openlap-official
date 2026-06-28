import { useContext } from "react";
import { BasicContext } from "../../../basic-indicator";
import {
  Box,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tooltip,
} from "@mui/material";
import { analyticsInputMenuList } from "../utils/analysis-data";
import SectionCard from "../../../../../../../common/components/section-card/section-card";

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
    <SectionCard
      title="Method inputs"
      helper="Map each input the method needs to a column from your data."
    >
      <Stack gap={2}>
        {analysis.inputs.map((input, index) => {
          const requiredMissing =
            Boolean(input.required) && input.selectedInput === undefined;
          const labelText = `${input.title} ${
            input.required ? "(Required)" : "(Optional)"
          }`;
          return (
            <FormControl key={input.id ?? index} fullWidth error={requiredMissing}>
              <InputLabel>{labelText}</InputLabel>
              <Select
                label={labelText}
                value={input.selectedInput?.id || ""}
                onChange={(event) => {
                  const selectedMenu = analyticsInputMenuList.find(
                    (menu) => menu.id === event.target.value
                  );
                  handleSelectInputs(input, selectedMenu);
                }}
              >
                {analyticsInputMenuList.map((menu) => (
                  <MenuItem value={menu.id} key={menu.id}>
                    <Tooltip arrow title={menu.description} placement="right">
                      <Box sx={{ width: "100%" }}>{menu.name}</Box>
                    </Tooltip>
                  </MenuItem>
                ))}
              </Select>
              {input.description && (
                <FormHelperText>{input.description}</FormHelperText>
              )}
            </FormControl>
          );
        })}
      </Stack>
    </SectionCard>
  );
}
