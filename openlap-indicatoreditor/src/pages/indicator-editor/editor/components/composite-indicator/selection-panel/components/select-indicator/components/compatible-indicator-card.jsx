import React, { useContext, useEffect } from "react";
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Grid,
  Typography,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import { CompositeIndicatorContext } from "../../../../composite-indicator.jsx";

const CompatibleIndicatorCard = ({ indicator, state, setState }) => {
  const { setIndicatorRef } = useContext(CompositeIndicatorContext);

  useEffect(() => {
    const script = document.createElement(`script`);
    script.innerHTML = indicator.scriptData;
    document.getElementById("root").appendChild(script);
    return () => {
      document.getElementById("root").removeChild(script);
    };
  }, [indicator.scriptData]);

  const handleToggleSelectIndicator = () => {
    const foundSelected = state.selectedCompatibleIndicators.find(
      (item) => item.id === indicator.id,
    );
    if (!Boolean(foundSelected)) {
      setState((prevState) => ({
        ...prevState,
        selectedCompatibleIndicators: [
          ...prevState.selectedCompatibleIndicators,
          indicator,
        ],
      }));

      setIndicatorRef((prevState) => ({
        ...prevState,
        indicators: [...prevState.indicators, { indicatorId: indicator.id }],
      }));
    } else {
      setState((prevState) => ({
        ...prevState,
        selectedCompatibleIndicators:
          prevState.selectedCompatibleIndicators.filter(
            (item) => item.id !== indicator.id,
          ),
      }));
      setIndicatorRef((prevState) => ({
        ...prevState,
        indicators: prevState.indicators.filter(
          (item) => item.indicatorId !== indicator.id,
        ),
      }));
    }
  };

  return (
    <>
      <Card variant="outlined" sx={{ flex: 1 }}>
        <CardHeader subheader={indicator.name} />
        <CardContent>
          <Typography>
            <Grid
              container
              justifyContent="center"
              sx={{ backgroundColor: "white", borderRadius: 2 }}
            >
              <Box>{indicator.displayCode}</Box>
            </Grid>
          </Typography>
        </CardContent>
        <CardActions>
          <Button
            fullWidth
            variant="contained"
            color={
              state.selectedCompatibleIndicators.some(
                (item) => item.id === indicator.id,
              )
                ? "success"
                : "primary"
            }
            startIcon={
              state.selectedCompatibleIndicators.some(
                (item) => item.id === indicator.id,
              ) ? (
                <CheckIcon />
              ) : undefined
            }
            onClick={handleToggleSelectIndicator}
          >
            {state.selectedCompatibleIndicators.some(
              (item) => item.id === indicator.id,
            )
              ? "Selected"
              : "Select"}
          </Button>
        </CardActions>
      </Card>
    </>
  );
};

export default CompatibleIndicatorCard;
