import React, { useContext } from "react";
import { ISCContext } from "../../../indicator-specification-card.jsx";
import {
  Button,
  Chip,
  Grid,
  Grow,
  IconButton,
  Tooltip,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

const VisualizationDescription = ({ toggleDescription }) => {
  const { visRef } = useContext(ISCContext);

  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Grid container justifyContent="flex-end">
            <Tooltip title="Close description">
              <IconButton onClick={toggleDescription}>
                <CloseIcon color="primary" />
              </IconButton>
            </Tooltip>
          </Grid>
        </Grid>

        <Grid item xs={12} md={6}>
          <Grid container spacing={1}>
            <Grid item xs={12}>
              <Typography>
                <b>Example preview</b>
              </Typography>
            </Grid>
            <Grid
              item
              xs={12}
              component="img"
              src={visRef.chart.imageDescription}
              sx={{
                width: "100%",
                height: "100%",
                borderRadius: 2,
              }}
            />
          </Grid>
        </Grid>
        <Grid item xs={12} md={6}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography gutterBottom>
                <b>Short description</b>
              </Typography>
              <Typography gutterBottom>{visRef.chart.description}</Typography>
            </Grid>

            <Grid item xs={12}>
              <Grid container>
                <Grid item xs={12}>
                  <Typography gutterBottom>
                    <b>Types of data required</b>
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Grid container spacing={1}>
                    {visRef.chart.dataTypes.map((type, index) => {
                      if (type.required !== 0) {
                        return (
                          <Grid item key={index}>
                            <Chip
                              color="success"
                              label={`${type.type.value}: ${type.required}`}
                            />
                          </Grid>
                        );
                      }
                      return undefined;
                    })}
                  </Grid>
                </Grid>
              </Grid>
            </Grid>

            <Grid item xs={12} sx={{ mt: 3 }}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => window.open(visRef.chart.link, "_blank")}
              >
                Learn more
              </Button>
              <Typography
                variant="caption"
                sx={{ textAlign: "right", display: "block", mt: 1 }}
              >
                Source: Data Visualization Catalogue
              </Typography>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </>
  );
};

export default VisualizationDescription;
