import { Breadcrumbs, Divider, Link, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { Link as RouterLink } from "react-router-dom";

const ISCPool = () => {
  return (
    <>
      <Grid container spacing={2}>
        <Breadcrumbs>
          <Link component={RouterLink} underline="hover" color="inherit" to="/">
            Home
          </Link>
          <Typography sx={{ color: "text.primary" }}>
            Search for ISCs
          </Typography>
        </Breadcrumbs>
        <Grid size={{ xs: 12 }} sx={{ mb: 2 }}>
          <Divider />
        </Grid>
      </Grid>
    </>
  );
};
export default ISCPool;
