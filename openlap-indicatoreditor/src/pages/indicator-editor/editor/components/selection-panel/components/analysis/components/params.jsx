import { useContext } from "react";
import {
  TextField,
  Grid,
  Typography,
  FormHelperText,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { SelectionContext } from "../../../selection-panel";

const Params = ({ state, setState }) => {
  const { analysisRef, setAnalysisRef } = useContext(SelectionContext);

  const handleChangeParam = (event, param) => {
    const { value } = event.target;
    setAnalysisRef((prevState) => {
      let tempParams = [...prevState.analyticsTechniqueParams];
      const item = tempParams.find((item) => param.id === item.id);
      if (item) {
        item.value = value;
      }
      return {
        ...prevState,
        analyticsTechniqueParams: tempParams,
      };
    });
  };

  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Typography>Additional parameters</Typography>
        </Grid>
        {analysisRef.analyticsTechniqueParams?.map((param, index) => (
          <Grid item xs={12} sm={6} key={index}>
            <FormControl fullWidth>
              {param.type === "Choice" ? (
                <>
                  <InputLabel>{param.title}</InputLabel>
                  <Select
                    label={param.title}
                    defaultValue={param.defaultValue}
                    onChange={(event) => handleChangeParam(event, param)}
                  >
                    {param.possibleValues.split(",").map((value, index) => (
                      <MenuItem key={index} value={value}>
                        {value}
                      </MenuItem>
                    ))}
                  </Select>
                </>
              ) : param.type === "Textbox" ? (
                <TextField
                  defaultValue={param.defaultValue}
                  value={param.value}
                  type={param.dataType === "INTEGER" ? "number" : "string"}
                  required={Boolean(param.required)}
                  label={param.title}
                  onChange={(event) => handleChangeParam(event, param)}
                />
              ) : undefined}

              {Boolean(param.required) && (
                <FormHelperText>Required</FormHelperText>
              )}
            </FormControl>
          </Grid>
        ))}
      </Grid>
    </>
  );
};

export default Params;
