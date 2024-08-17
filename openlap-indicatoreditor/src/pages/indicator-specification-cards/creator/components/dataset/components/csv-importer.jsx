import React, { useContext } from "react";
import {
  Box,
  Grid,
  IconButton,
  Link,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  InsertDriveFile as InsertDriveFileIcon,
} from "@mui/icons-material";
import { ISCContext } from "../../../indicator-specification-card.jsx";

const CsvImporter = () => {
  const { dataset, setDataset } = useContext(ISCContext);

  const handleImportFile = (event) => {
    setDataset((prevState) => ({
      ...prevState,
      file: event.target.files[0],
    }));
  };

  const handleRemoveFile = () => {
    setDataset((prevState) => ({
      ...prevState,
      file: {
        name: "",
      },
    }));
  };

  return (
    <>
      <Box sx={{ pt: 2 }}>
        {dataset.file.name ? (
          <Grid container sx={{ height: 50 }} alignItems="center">
            <Grid item xs>
              <Grid
                container
                justifyContent="space-between"
                alignItems="center"
              >
                <Grid item xs>
                  <Grid container alignItems="center">
                    <Grid item>
                      <InsertDriveFileIcon color="primary" />
                    </Grid>
                    <Grid item xs>
                      <Typography sx={{ fontWeight: "bold", ml: 1 }}>
                        {dataset.file.name}
                      </Typography>
                    </Grid>
                  </Grid>
                </Grid>
                <Grid item>
                  <Grid container alignItems="center">
                    <Grid item>
                      <Box
                        sx={{
                          borderRadius: 1,
                          px: 1,
                          mx: 1.5,
                          py: 0.5,
                        }}
                      >
                        <Typography variant="body2">
                          {dataset.file.size} KB
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item>
                      <Tooltip title="Remove file" arrow>
                        <IconButton
                          onClick={handleRemoveFile}
                          size="small"
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        ) : (
          <Grid
            container
            justifyContent="center"
            alignItems="center"
            sx={{
              border: "2px dotted #C4C4C4",
              height: 150,
              borderRadius: 2,
            }}
          >
            <Link component="label" sx={{ cursor: "pointer" }}>
              Click here to select a file to upload
              <input
                hidden
                multiple
                onChange={(event) => handleImportFile(event)}
                type="file"
                accept=".csv"
              />
            </Link>
          </Grid>
        )}
      </Box>
    </>
  );
};

export default CsvImporter;
