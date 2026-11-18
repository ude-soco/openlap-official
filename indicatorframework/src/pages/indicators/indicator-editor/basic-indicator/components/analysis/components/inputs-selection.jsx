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
  Typography,
} from "@mui/material";
import { compatibleAnalysisInputs, isEventCountInput, withAnalysisInput } from "../utils/analysis-data";
import SectionCard from "../../../../../../../common/components/section-card/section-card";

export default function InputsSelection() {
  const { analysis, setAnalysis } = useContext(BasicContext);
  const countEvents = isEventCountInput(analysis.selectedAnalyticsMethod.method, analysis.inputs);

  const handleSelectInputs = (input, value) => {
    setAnalysis((previous) => withAnalysisInput(previous, input, value));
  };

  return (
    <SectionCard
      title="Method inputs"
      helper={countEvents ? "Count the events matching your dataset and activity filters." : "Map each input the method needs to a column from your data."}
    >
      <Stack sx={{ gap: 2 }}>
        {countEvents ? <Typography variant="body2" color="text.secondary">
          Each matching event is counted once. No additional field selection is needed.
        </Typography> : analysis.inputs.map((input, index) => {
          const selected = analysis.selectedAnalyticsMethod.mapping.mapping.find(
            (item) => item.inputPort.id === input.id,
          )?.outputPort;
          const requiredMissing =
            Boolean(input.required) && !selected;
          const options = compatibleAnalysisInputs(input, selected, analysis.selectedAnalyticsMethod.method);
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
                  const selectedMenu = options.find(
                    (menu) => menu.id === event.target.value
                  );
                  handleSelectInputs(input, selectedMenu);
                }}
              >
                <MenuItem value="">
                  <em>{input.required ? "Select a field" : "Not used"}</em>
                </MenuItem>
                {options.map((menu) => (
                  <MenuItem value={menu.id} key={menu.id}>
                    <Tooltip describeChild arrow title={menu.description} placement="right">
                      <Box sx={{ width: "100%" }}>{menu.name}</Box>
                    </Tooltip>
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>{!options.length
                ? "No compatible field is available for this input type."
                : input.description || `Choose a ${input.type === "Numeric" ? "numerical" : input.type === "TrueFalse" ? "true/false" : "categorical"} field.`}</FormHelperText>
            </FormControl>
          );
        })}
      </Stack>
    </SectionCard>
  );
}
