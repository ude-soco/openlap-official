import { useContext, useEffect } from "react";
import {
  TextField,
  Grid,
  Typography,
  Divider,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import HelpIcon from "@mui/icons-material/Help";
import { AuthContext } from "../../../../../../../../setup/auth-context-manager/auth-context-manager";
import { fetchTechniqueParams } from "../utils/analytics-api";
import { IndicatorEditorContext } from "../../../../../indicator-editor";

const Params = ({ state, setState }) => {
  const { api } = useContext(AuthContext);
  const { analysisRef, setAnalysisRef } = useContext(IndicatorEditorContext);

  useEffect(() => {
    const loadTechniqueParams = async (techniqueId) => {
      try {
        const techniqueParamsList = await fetchTechniqueParams(
          api,
          techniqueId
        );
        techniqueParamsList.forEach(
          (param) => (param.value = param.defaultValue)
        );
        setAnalysisRef((prevState) => ({
          ...prevState,
          analyticsTechniqueParams: techniqueParamsList,
        }));
      } catch (error) {
        console.log("Error fetching Analytics technique input list");
      }
    };

    if (analysisRef.analyticsTechniqueId !== "")
      loadTechniqueParams(analysisRef.analyticsTechniqueId);
  }, [analysisRef.analyticsTechniqueId]);

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
            <Grid container spacing={1}>
              <Grid item xs>
                <FormControl fullWidth>
                  {param.type === "Choice" ? (
                    <>
                      <InputLabel required={Boolean(param.required)}>
                        {param.title}
                      </InputLabel>
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
                      value={
                        param.value !== undefined && param.value !== null
                          ? param.value
                          : param.defaultValue
                      }
                      type={param.dataType === "INTEGER" ? "number" : "text"}
                      required={Boolean(param.required)}
                      label={param.title}
                      onChange={(event) => handleChangeParam(event, param)}
                    />
                  ) : undefined}
                </FormControl>
              </Grid>
              <Grid item sx={{ mt: 1 }}>
                <Tooltip
                  arrow
                  title={<Typography>{param.description}</Typography>}
                >
                  <IconButton>
                    <HelpIcon />
                  </IconButton>
                </Tooltip>
              </Grid>
            </Grid>
          </Grid>
        ))}
        <Grid item xs={12} sx={{ py: 2 }}>
          <Divider />
        </Grid>
      </Grid>
    </>
  );
};

export default Params;
