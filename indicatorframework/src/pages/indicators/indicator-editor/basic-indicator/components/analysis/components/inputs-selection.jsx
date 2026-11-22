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
import { compatibleAnalysisInputs, isEventInput, withAnalysisInput } from "../utils/analysis-data";
import SectionCard from "../../../../../../../common/components/section-card/section-card";

function xapiField(path) {
  const prefix = "statement.";
  const fromStatement = path.startsWith(prefix);
  return (
    <>
      {fromStatement ? "xAPI field " : "Data field "}
      <Box component="code" sx={{ overflowWrap: "anywhere" }}>
        {fromStatement ? path.slice(prefix.length) : path}
      </Box>
    </>
  );
}

export default function InputsSelection() {
  const { analysis, setAnalysis } = useContext(BasicContext);
  const { method, mapping } = analysis.selectedAnalyticsMethod;
  const selectedField = (inputId) => mapping.mapping.find((item) => item.inputPort.id === inputId)?.outputPort;
  const automaticEvent = (input, selected) => isEventInput(method, input) && input.required &&
    (!selected || selected.id === "statement.id");
  const eventsOnly = analysis.inputs.length > 0 &&
    analysis.inputs.every((input) => automaticEvent(input, selectedField(input.id)));

  const handleSelectInputs = (input, value) => {
    setAnalysis((previous) => withAnalysisInput(previous, input, value));
  };

  return (
    <SectionCard
      title="Method inputs"
      helper={eventsOnly ? "Each xAPI statement matching your filters counts as one event." : "Choose an xAPI field for each method input."}
    >
      <Stack sx={{ gap: 2 }}>
        {analysis.inputs.map((input, index) => {
          const selected = selectedField(input.id);
          if (automaticEvent(input, selected)) return (
            <Typography key={input.id} variant="body2" color="text.secondary">
              {selected?.id && <>{xapiField(selected.id)} marks each row. </>}
              Statements with a missing value still count.
            </Typography>
          );
          const requiredMissing =
            Boolean(input.required) && !selected;
          const options = compatibleAnalysisInputs(input, selected, method);
          const title = (input.title || input.id).replace(/\s*\((?:optional|required)\)\s*$/i, "");
          const labelText = `${title} ${
            input.required ? "(Required)" : "(Optional)"
          }`;
          const labelId = `analysis-input-${input.id || index}-label`;
          const helperId = `analysis-input-${input.id || index}-help`;
          return (
            <FormControl key={input.id ?? index} fullWidth error={requiredMissing}>
              <InputLabel id={labelId}>{labelText}</InputLabel>
              <Select
                labelId={labelId}
                label={labelText}
                aria-describedby={helperId}
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
              <FormHelperText id={helperId}>
                {!options.length
                  ? "No compatible field is available for this input type."
                  : input.description || `Choose a ${input.type === "Numeric" ? "numerical" : input.type === "TrueFalse" ? "true/false" : "categorical"} field.`}
                {selected?.id && (
                  <Box component="span" sx={{ display: "block", mt: 0.5 }}>
                    {xapiField(selected.id)}
                  </Box>
                )}
              </FormHelperText>
            </FormControl>
          );
        })}
      </Stack>
    </SectionCard>
  );
}
