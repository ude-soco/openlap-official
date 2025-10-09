import { useContext } from "react";
import { BasicContext } from "../../../basic-indicator";
import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Tooltip,
  Typography,
  Stack,
} from "@mui/material";
import { analyticsInputMenuList } from "../utils/analysis-data";
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
      console.log(item);

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
    <Stack gap={2} component={Paper} variant="outlined" sx={{ p: 2 }}>
      <Stack direction="row" alignItems="center">
        <Typography>
          Select <b>Inputs</b> of the method
        </Typography>
        <CustomTooltip
          type="description"
          message={`Each method has input parameter(s). You can decide which data should be assigned to which analysis input parameter.`}
        />
      </Stack>
      {analysis.inputs.map((input, index) => (
        <Stack direction="row" key={index} gap={1} alignItems="center">
          <FormControl
            fullWidth
            error={Boolean(input.required) && input.selectedInput === undefined}
          >
            <InputLabel>
              {input.title} {input.required ? "(Required)" : "(Optional)"}
            </InputLabel>

            <Select
              label={`${input.title} ${
                input.required ? "(Required)" : "(Optional)"
              }`}
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
                  <Tooltip
                    arrow
                    title={<Typography>{menu.description}</Typography>}
                    placement="right"
                  >
                    <Box sx={{ width: "100%" }}>{menu.name}</Box>
                  </Tooltip>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <CustomTooltip type="description" message={input.description} />
        </Stack>
      ))}
    </Stack>
  );
}
