import { Divider, Stack, Link, Typography, Breadcrumbs } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

const GQIEditor = () => {
  return (
    <>
      <Stack spacing={2}>
        <Breadcrumbs>
          <Link component={RouterLink} underline="hover" color="inherit" to="/">
            Home
          </Link>
          <Typography color="textPrimary">GQI Editor</Typography>
        </Breadcrumbs>
        <Divider />
        <Typography color="textPrimary">Under construction!</Typography>
      </Stack>
    </>
  );
};

export default GQIEditor;