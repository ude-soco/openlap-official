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
    setAnalysis((p) => ({
        ...p,
        inputs: p.inputs.map((item) => item.id === input.id
          ? { ...item, selectedInput: value } : item),
        selectedAnalyticsMethod: {
          ...p.selectedAnalyticsMethod,
          mapping: {
            ...p.selectedAnalyticsMethod.mapping,
            mapping: [
              ...p.selectedAnalyticsMethod.mapping.mapping.filter(
                (item) => item.inputPort.id !== input.id,
              ),
              tempInputMappings,
            ],
          },
        },
        analyzedData: {},
    }));
  };

  return (
    <SectionCard
      title="Method inputs"
      helper="Map each input the method needs to a column from your data."
    >
      <Stack sx={{ gap: 2 }}>
        {analysis.inputs.map((input, index) => {
          const selected = analysis.selectedAnalyticsMethod.mapping.mapping.find(
            (item) => item.inputPort.id === input.id,
          )?.outputPort;
          const requiredMissing =
            Boolean(input.required) && !selected;
          const labelText = `${input.title} ${
            input.required ? "(Required)" : "(Optional)"
          }`;
          const labelId = `analysis-input-${input.id || index}-label`;
          return (
            <FormControl key={input.id ?? index} fullWidth error={requiredMissing}>
              <InputLabel id={labelId}>{labelText}</InputLabel>
              <Select
                labelId={labelId}
                label={labelText}
                value={selected?.id || ""}
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
