import { useContext } from "react";
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
  Tooltip,
} from "@mui/material";
import HelpIcon from "@mui/icons-material/Help";
import { BasicIndicatorContext } from "../../../basic-indicator/basic-indicator.jsx";

const InputsBasicIndicator = ({ state, setState }) => {
  const {
    analysisInputMenu,
    setIndicatorQuery,
    setAnalysisRef,
    setLockedStep,
    setGenerate,
    setIndicator,
    setVisRef,
  } = useContext(BasicIndicatorContext);

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

    setVisRef((prevState) => {
      return {
        ...prevState,
        visualizationLibraryId: "",
        visualizationTypeId: "",
        visualizationMapping: {
          ...prevState.visualizationMapping,
          mapping: [],
        },
      };
    });
    setGenerate(false);
    setIndicator((prevState) => ({
      ...prevState,
      previewData: {
        ...prevState.previewData,
        displayCode: [],
        scriptData: "",
      },
    }));
    setLockedStep((prevState) => ({
      ...prevState,
      visualization: {
        locked: true,
        openPanel: false,
      },
      finalize: {
        ...prevState.finalize,
        locked: true,
        openPanel: false,
      },
    }));
  };

  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Grid container alignItems="center">
            <Typography>Analysis method inputs</Typography>
            <Tooltip
              arrow
              title={
                <Typography>
                  Choose the data from the <b>Dataset</b> and <b>Filters</b>{" "}
                  step to the inputs of the analysis method
                </Typography>
              }
            >
              <IconButton size="small">
                <HelpIcon />
              </IconButton>
            </Tooltip>
          </Grid>
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
                  {Boolean(input.required) ? (
                    <FormHelperText>Required</FormHelperText>
                  ) : (
                    <FormHelperText>Optional</FormHelperText>
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

export default InputsBasicIndicator;
