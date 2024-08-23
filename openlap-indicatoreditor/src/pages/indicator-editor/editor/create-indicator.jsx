import React from "react";
import images from "./utils/images.js";
import { Button, Grid, Paper, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";

const CreateIndicator = ({ handleClearSession }) => {
  const navigate = useNavigate();
  const handleStartIndicatorCreationProcess = (image) => {
    navigate(image.link);
    handleClearSession();
  };

  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Typography>Create a new indicator</Typography>
        </Grid>
        <Grid item xs={12}>
          <Grid container spacing={2}>
            {images.map((image, index) => {
              return (
                <Grid item xs={4} key={index}>
                  <Grid
                    container
                    component={Paper}
                    onClick={() => handleStartIndicatorCreationProcess(image)}
                    sx={{
                      p: 3,
                      "&:hover": {
                        boxShadow: 5,
                      },
                      cursor: "pointer",
                    }}
                  >
                    <Grid item xs={12} sx={{ pb: 2 }}>
                      <Paper
                        elevation={0}
                        component="img"
                        src={image.image}
                        alt={image.imageCode}
                        loading="lazy"
                        sx={{
                          width: "100%",
                          height: "100%",
                          backgroundColor: "white",
                        }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Typography>{image.name}</Typography>
                      <Typography variant="caption">
                        {image.description}
                      </Typography>
                    </Grid>
                  </Grid>
                </Grid>
              );
            })}
          </Grid>
        </Grid>
      </Grid>
    </>
  );
};

export default CreateIndicator;
