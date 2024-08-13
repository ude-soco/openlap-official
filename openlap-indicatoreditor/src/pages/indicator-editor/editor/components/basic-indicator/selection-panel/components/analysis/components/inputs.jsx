import { useEffect, useContext } from "react";
import {
  IconButton,
  Divider,
  Grid,
  Typography,
  FormHelperText,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { AuthContext } from "../../../../../../../../../setup/auth-context-manager/auth-context-manager.jsx";
import HelpIcon from "@mui/icons-material/Help";
import Tooltip from "@mui/material/Tooltip";
import { fetchTechniqueInputs } from "../utils/analytics-api.js";
import { BasicIndicatorContext } from "../../../../basic-indicator.jsx";

const Inputs = ({ state, setState }) => {
  const { api } = useContext(AuthContext);
  const {
    analysisInputMenu,
    indicatorQuery,
    setIndicatorQuery,
    lockedStep,
    analysisRef,
    setAnalysisRef,
  } = useContext(BasicIndicatorContext);

  useEffect(() => {
    const loadTechniqueInputs = async (value) => {
      try {
        const techniqueInputsList = await fetchTechniqueInputs(api, value);
        setState((prevState) => ({
          ...prevState,
          inputs: techniqueInputsList,
        }));
      } catch (error) {
        console.log("Error fetching Analytics technique input list");
      }
    };
    if (analysisRef.analyticsTechniqueId !== "")
      loadTechniqueInputs(analysisRef.analyticsTechniqueId);
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
        prevState.analyticsTechniqueMapping.mapping
      );

      setIndicatorQuery((prevState) => ({
        ...prevState,
        outputs: updatedMappings.map((item) => item.outputPort.id),
      }));

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
                    {Object.values(analysisInputMenu).map((value, index) => (
                      <MenuItem key={index} value={value}>
                        {value.title}
                      </MenuItem>
                    ))}
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

export default Inputs;
