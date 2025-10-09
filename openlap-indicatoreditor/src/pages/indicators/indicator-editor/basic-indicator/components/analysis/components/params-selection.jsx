import { useContext } from "react";
import { BasicContext } from "../../../basic-indicator";
import {
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
  Stack,
} from "@mui/material";
import CustomTooltip from "../../../../../../../common/components/custom-tooltip/custom-tooltip";

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
    <Stack gap={2} component={Paper} variant="outlined" sx={{ p: 2 }}>
      <Stack direction="row" alignItems="center">
        <Typography>
          Set <b>Parameters</b> of the method
        </Typography>
        <CustomTooltip
          type="description"
          message={`Parameters are preselected with default values and can be changed
              based on your needs.`}
        />
      </Stack>
      {analysis.params.map((param, index) => (
        <Stack gap={1} direction="row" alignItems="center">
          <FormControl fullWidth>
            {param.type === PARAM_TYPE.choice && (
              <>
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
                  {param.possibleValues.split(",").map((value, index) => (
                    <MenuItem key={index} value={value}>
                      {value}
                    </MenuItem>
                  ))}
                </Select>
              </>
            )}
            {param.type === PARAM_TYPE.textBox && (
              <TextField
                value={
                  param.value !== undefined && param.value !== null
                    ? param.value
                    : param.defaultValue || ""
                }
                type={param.dataType === "INTEGER" ? "number" : "text"}
                required={Boolean(param.required)}
                label={param.title}
                onChange={(event) => handleChangeParam(event, param)}
              />
            )}
          </FormControl>
          <CustomTooltip type="description" message={param.description} />
        </Stack>
      ))}
    </Stack>
  );
}
