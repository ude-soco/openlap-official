import { useContext } from "react";
import { BasicContext } from "../../../basic-indicator";
import {
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Stack,
} from "@mui/material";
import SectionCard from "../../../../../../../common/components/section-card/section-card";

const PARAM_TYPE = { choice: "Choice", textBox: "Textbox" };

export default function ParamsSelection() {
  const { analysis, setAnalysis } = useContext(BasicContext);

  const handleChangeParam = (event, param) => {
    const { value } = event.target;
    setAnalysis((p) => {
      let tempParams = [...p.params];
      const item = tempParams.find((item) => param.id === item.id);
      if (item) item.value = value;
      return { ...p, params: tempParams, analyzedData: {} };
    });
  };

  return (
    <SectionCard
      title="Method parameters"
      helper="Parameters come with sensible defaults — adjust them only if needed."
    >
      <Stack gap={2}>
        {analysis.params.map((param, index) => {
          if (param.type === PARAM_TYPE.choice) {
            return (
              <FormControl key={param.id ?? index} fullWidth>
                <InputLabel required={Boolean(param.required)}>
                  {param.title}
                </InputLabel>
                <Select
                  label={param.title}
                  value={
                    param.value !== undefined && param.value !== null
                      ? param.value
                      : param.defaultValue
                  }
                  onChange={(event) => handleChangeParam(event, param)}
                >
                  {param.possibleValues.split(",").map((value, i) => (
                    <MenuItem key={i} value={value}>
                      {value}
                    </MenuItem>
                  ))}
                </Select>
                {param.description && (
                  <FormHelperText>{param.description}</FormHelperText>
                )}
              </FormControl>
            );
          }
          if (param.type === PARAM_TYPE.textBox) {
            return (
              <TextField
                key={param.id ?? index}
                fullWidth
                value={
                  param.value !== undefined && param.value !== null
                    ? param.value
                    : param.defaultValue || ""
                }
                type={param.dataType === "INTEGER" ? "number" : "text"}
                required={Boolean(param.required)}
                label={param.title}
                helperText={param.description}
                onChange={(event) => handleChangeParam(event, param)}
              />
            );
          }
          return null;
        })}
      </Stack>
    </SectionCard>
  );
}
