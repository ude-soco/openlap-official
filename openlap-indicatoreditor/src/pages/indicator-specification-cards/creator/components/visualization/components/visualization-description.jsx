import React, { useContext } from "react";
import { ISCContext } from "../../../indicator-specification-card.jsx";
import { Button, Chip, Grid, Typography } from "@mui/material";

const VisualizationDescription = () => {
  const { visRef } = useContext(ISCContext);
  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Typography>Example preview</Typography>
        </Grid>
        <Grid item xs={12}>
          <Grid container spacing={2}>
            <Grid
              item
              xs={12}
              md={6}
              component="img"
              src={visRef.chart.imageDescription}
              sx={{ width: "100%", borderRadius: 2 }}
            />
            <Grid item xs={12} md={6}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography gutterBottom>Short description</Typography>
                  <Typography gutterBottom>
                    {visRef.chart.description}
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <Grid container>
                    <Grid item xs={12}>
                      <Typography gutterBottom>
                        Types of data required
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Grid container spacing={1}>
                        {visRef.chart.dataTypes.map((type) => {
                          if (type.required !== 0) {
                            return (
                              <Grid item key={type}>
                                <Chip
                                  label={`${type.type.value}: ${type.required}`}
                                />
                              </Grid>
                            );
                          }
                        })}
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>

                <Grid item xs={12} md={7} lg={5} sx={{ mt: 3 }}>
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
        </Grid>
      </Grid>
    </>
  );
};

export default VisualizationDescription;
