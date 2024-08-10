import { useEffect, useState, useContext } from "react";
import {
  IconButton,
  Grid,
  Typography,
  FormHelperText,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { AuthContext } from "../../../../../../../../setup/auth-context-manager/auth-context-manager";
import HelpIcon from "@mui/icons-material/Help";
import Tooltip from "@mui/material/Tooltip";
import { fetchVisualizationTypeInputs } from "../utils/visualization-api";
import { IndicatorEditorContext } from "../../../../../indicator-editor";

const Inputs = ({ state, setState }) => {
  const { api } = useContext(AuthContext);
  const {
    analysisInputMenu,
    indicatorQuery,
    setIndicatorQuery,
    lockedStep,
    analysisRef,
    setAnalysisRef,
    visRef,
    setVisRef,
  } = useContext(IndicatorEditorContext);

  useEffect(() => {
    const loadVisTypeInputs = async (typeId) => {
      try {
        const typeInputsList = await fetchVisualizationTypeInputs(api, typeId);
        setState((prevState) => ({
          ...prevState,
          inputs: typeInputsList,
        }));
      } catch (error) {
        console.log("Error fetching visualization library input list");
      }
    };
    if (visRef.visualizationTypeId !== "")
      loadVisTypeInputs(visRef.visualizationTypeId);
  }, [visRef.visualizationTypeId]);

  useEffect(() => {
    // Set default value for each input if only one possible option is available
    state.inputs?.forEach((input) => {
      const filteredValues = Object.values(analysisRef.analyzedData).filter(
        (value) => input.type === value.configurationData.type
      );

      if (filteredValues.length === 1) {
        handleChange(filteredValues[0].configurationData, input);
      }
    });
  }, [state.inputs]);

  const handleChangeInputMapping = (event, input) => {
    const { value } = event.target;
    handleChange(value, input);
  };

  const handleChange = (value, input) => {
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

    setVisRef((prevState) => {
      let tempInputMappings = {
        inputPort: input,
        outputPort: value,
      };
      let updatedMappings = updateMappingsMethod(
        tempInputMappings,
        prevState.visualizationMapping.mapping
      );

      return {
        ...prevState,
        visualizationMapping: {
          ...prevState.visualizationMapping,
          mapping: updatedMappings,
        },
      };
    });
  };

  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Typography>Inputs</Typography>
        </Grid>
        {state.inputs?.map((input, index) => {
          const filteredValues = Object.values(analysisRef.analyzedData).filter(
            (value) => input.type === value.configurationData.type
          );

          return (
            <Grid item xs={12} sm={6} key={index}>
              <Grid container spacing={1}>
                <Grid item xs>
                  <FormControl fullWidth>
                    <InputLabel required={Boolean(input.required)}>
                      {input.title}
                    </InputLabel>
                    <Select
                      label={input.title}
                      onChange={(event) =>
                        handleChangeInputMapping(event, input)
                      }
                      defaultValue={
                        filteredValues.length === 1
                          ? filteredValues[0].configurationData
                          : ""
                      }
                    >
                      {filteredValues.map((value, index) => (
                        <MenuItem key={index} value={value.configurationData}>
                          {value.configurationData.title}
                        </MenuItem>
                      ))}
                    </Select>
                    {Boolean(input.required) && (
                      <FormHelperText>Input is required</FormHelperText>
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
          );
        })}
      </Grid>
    </>
  );
};

export default Inputs;
