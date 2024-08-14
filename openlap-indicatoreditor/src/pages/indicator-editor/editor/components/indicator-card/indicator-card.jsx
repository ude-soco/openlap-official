import React, { useEffect } from "react";
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

const IndicatorCard = ({ indicator, selectedIndicator, handleSelection }) => {
  useEffect(() => {
    const script = document.createElement("script");
    script.innerHTML = indicator.scriptData;
    document.getElementById("root").appendChild(script);
    return () => {
      document.getElementById("root").removeChild(script);
    };
  }, [indicator.scriptData]);

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
              selectedIndicator?.some((item) => item.id === indicator.id)
                ? "success"
                : "primary"
            }
            startIcon={
              selectedIndicator?.some((item) => item.id === indicator.id) ? (
                <CheckIcon />
              ) : undefined
            }
            onClick={handleSelection}
          >
            {selectedIndicator?.some((item) => item.id === indicator.id)
              ? "Selected"
              : "Select"}
          </Button>
        </CardActions>
      </Card>
    </>
  );
};

export default IndicatorCard;
