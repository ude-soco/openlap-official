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

const IndicatorCard = ({ indicator, state, setState }) => {
  const { setIndicatorRef } = useContext(CompositeIndicatorContext);

  useEffect(() => {
    const script = document.createElement("script");
    script.innerHTML = indicator.scriptData;
    document.getElementById("root").appendChild(script);
    return () => {
      document.getElementById("root").removeChild(script);
    };
  }, [indicator.scriptData]);

  const handleSelectIndicator = () => {
    if (state.selectedIndicator.id !== indicator.id) {
      setState((prevState) => ({
        ...prevState,
        selectedIndicator: indicator,
      }));
      setIndicatorRef((prevState) => ({
        ...prevState,
        indicators: [
          {
            indicatorId: indicator.id,
          },
        ],
      }));
    } else {
      setState((prevState) => ({
        ...prevState,
        selectedIndicator: {},
      }));
      setIndicatorRef((prevState) => ({
        ...prevState,
        indicators: [],
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
              state.selectedIndicator.id === indicator.id
                ? "success"
                : "primary"
            }
            startIcon={
              state.selectedIndicator.id === indicator.id ? (
                <CheckIcon />
              ) : undefined
            }
            onClick={handleSelectIndicator}
          >
            {state.selectedIndicator.id === indicator.id
              ? "Selected"
              : "Select"}
          </Button>
        </CardActions>
      </Card>
    </>
  );
};

export default IndicatorCard;
