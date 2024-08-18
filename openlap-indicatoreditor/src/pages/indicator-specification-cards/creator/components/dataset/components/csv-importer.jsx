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
import { Alert } from "@mui/lab";

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
          <Grid
            container
            sx={{ minHeight: 55 }}
            spacing={2}
            alignItems="center"
          >
            <Grid item xs={12}>
              <Grid
                container
                spacing={2}
                justifyContent="space-between"
                alignItems="center"
              >
                <Grid item xs>
                  <Grid container spacing={1} alignItems="center">
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
                  <Grid container spacing={2} alignItems="center">
                    <Grid item>
                      <Typography>{dataset.file.size} KB</Typography>
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
            <Grid item xs={12}>
              {(dataset.columns.length > 0 || dataset.rows.length > 0) && (
                <Alert severity="warning">
                  Uploading the file will replace the existing dataset
                </Alert>
              )}
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
