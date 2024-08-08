import { Grid, Typography, Paper } from "@mui/material";

const PreviewPanel = () => {
  return (
    <>
      <Paper sx={{ p: 2, border: "1px solid #e0e0e0" }} elevation={0}>
        <Typography>Preview panel</Typography>
      </Paper>
    </>
  );
};

export default PreviewPanel;
