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
      <Grid item xs={12}>
        <Typography>Create a new indicator</Typography>
      </Grid>
      <Grid item xs={12}>
        <Grid container spacing={4}>
          {images.map((image, index) => {
            return (
              <Grid item xs={4} lg={3} key={index}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Button
                      fullWidth
                      color="primary"
                      onClick={() => handleStartIndicatorCreationProcess(image)}
                    >
                      <Paper
                        component="img"
                        src={image.image}
                        alt={image.imageCode}
                        sx={{
                          width: "100%",
                          height: "100%",
                          backgroundColor: "white",
                        }}
                      />
                    </Button>
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
    </>
  );
};

export default CreateIndicator;
