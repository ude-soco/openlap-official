import { useContext } from "react";
import { AuthContext } from "../../../../../../../setup/auth-context-manager/auth-context-manager";
import { BasicContext } from "../../../basic-indicator";
import {
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import Grid from "@mui/material/Grid2";

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
    <>
      <Typography gutterBottom sx={{ pb: 0.5 }}>
        Select <b>Parameters</b> of the method
      </Typography>
      <Grid container spacing={2} alignItems="center">
        {analysis.params.map((param, index) => (
          <Grid size={{ xs: 12, md: 6 }} key={index}>
            <Grid container alignItems="center" spacing={1}>
              <Grid size="grow">
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
              </Grid>
              <Grid size="auto">
                <Tooltip
                  arrow
                  title={
                    <Typography sx={{ p: 1 }}>
                      <b>Description</b>
                      <br />
                      {param.description}
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
        ))}
      </Grid>
    </>
  );
}
