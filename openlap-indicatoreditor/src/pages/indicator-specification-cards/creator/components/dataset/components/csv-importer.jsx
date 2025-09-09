import { useContext } from "react";
import {
  Alert,
  AlertTitle,
  Box,
  IconButton,
  Link,
  Grid,
  Tooltip,
  Typography,
} from "@mui/material";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import CloseIcon from "@mui/icons-material/Close";
import { ISCContext } from "../../../indicator-specification-card.jsx";

const CsvImporter = () => {
  const { dataset, setDataset } = useContext(ISCContext);

  const handleImportFile = (event) => {
    const files = Array.from(event.target.files || []);
    const csvFiles = files.filter((file) =>
      file.name.toLowerCase().endsWith(".csv")
    );

    if (csvFiles.length !== files.length) {
      alert("Only CSV files are allowed.");
      return;
    }

    setDataset((p) => ({ ...p, file: event.target.files[0] }));
  };

  const handleRemoveFile = () => {
    setDataset((p) => ({ ...p, file: { name: "" } }));
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
            <Grid
              container
              spacing={2}
              justifyContent="space-between"
              alignItems="center"
              sx={{ width: "100%" }}
            >
              <Grid container spacing={1} alignItems="center">
                <InsertDriveFileIcon color="primary" />
                <Typography sx={{ fontWeight: "bold", ml: 1 }}>
                  {dataset.file.name}
                </Typography>
              </Grid>
              <Grid container spacing={2} alignItems="center">
                <Typography>{dataset.file.size} KB</Typography>
                <Tooltip title={<Typography>Remove file</Typography>} arrow>
                  <IconButton
                    onClick={handleRemoveFile}
                    size="small"
                    color="error"
                  >
                    <CloseIcon />
                  </IconButton>
                </Tooltip>
              </Grid>
            </Grid>
            {(dataset.columns.length > 0 || dataset.rows.length > 0) && (
              <Alert severity="warning" sx={{ width: "100%" }}>
                <AlertTitle>Please proceed with caution!</AlertTitle>
                Uploading the file will replace the existing dataset
              </Alert>
            )}
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
