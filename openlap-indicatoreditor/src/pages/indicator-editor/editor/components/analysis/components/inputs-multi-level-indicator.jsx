import React, { useContext, useEffect } from "react";
import { AuthContext } from "../../../../../../setup/auth-context-manager/auth-context-manager.jsx";
import { MultiLevelAnalysisIndicatorContext } from "../../../multi-level-analysis-indicator/multi-level-analysis-indicator.jsx";
import { fetchTechniqueInputs } from "../utils/analytics-api.js";
import {
  Divider,
  FormControl,
  FormHelperText,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from "@mui/material";
import Tooltip from "@mui/material/Tooltip";
import HelpIcon from "@mui/icons-material/Help";

const InputsMultiLevelIndicator = ({ state, setState }) => {
  const { api } = useContext(AuthContext);
  const {
    // setIndicatorQuery,
    indicatorRef,
    analysisRef,
    setAnalysisRef,
  } = useContext(MultiLevelAnalysisIndicatorContext);

  useEffect(() => {
    const loadTechniqueInputs = async (value) => {
      try {
        return await fetchTechniqueInputs(api, value);
      } catch (error) {
        throw error;
      }
    };
    if (analysisRef.analyticsTechniqueId !== "")
      loadTechniqueInputs(analysisRef.analyticsTechniqueId)
        .then((response) => {
          setState((prevState) => ({
            ...prevState,
            inputs: response,
          }));
        })
        .catch((error) => {
          console.log("Error fetching Analytics technique input list", error);
        });
  }, [analysisRef.analyticsTechniqueId]);

  const handleChangeInputMapping = (event, input) => {
    const { value } = event.target;

    const updateMappingsMethod = (newMappings, oldMappings) => {
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
    };

    // TODO: Check the length of the arrays of the input and the mapping if same then false
    setState((prevState) => ({
      ...prevState,
      previewDisabled: false,
    }));

    setAnalysisRef((prevState) => {
      let tempInputMappings = {
        inputPort: input,
        outputPort: value,
      };
      let updatedMappings = updateMappingsMethod(
        tempInputMappings,
        prevState.analyticsTechniqueMapping.mapping,
      );
      return {
        ...prevState,
        analyticsTechniqueMapping: {
          ...prevState.analyticsTechniqueMapping,
          mapping: updatedMappings,
        },
        analyzedData: {},
      };
    });
  };

  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Typography>Inputs</Typography>
        </Grid>
        {state.inputs?.map((input, index) => (
          <Grid item xs={12} sm={6} key={index}>
            <Grid container spacing={1}>
              <Grid item xs>
                <FormControl fullWidth>
                  <InputLabel required={Boolean(input.required)}>
                    {input.title}
                  </InputLabel>

                  <Select
                    label={input.title}
                    onChange={(event) => handleChangeInputMapping(event, input)}
                  >
                    {Object.values(indicatorRef.mergedData).map(
                      (value, index) => (
                        <MenuItem key={index} value={value.configurationData}>
                          {value.configurationData.title}
                        </MenuItem>
                      ),
                    )}
                  </Select>
                  {Boolean(input.required) && (
                    <FormHelperText>Required</FormHelperText>
                  )}
                </FormControl>
              </Grid>
              <Grid item sx={{ mt: 1 }}>
                <Tooltip
                  arrow
                  title={<Typography>{input.description}</Typography>}
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

export default InputsMultiLevelIndicator;
