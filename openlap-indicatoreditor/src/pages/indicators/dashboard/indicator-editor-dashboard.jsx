import { Breadcrumbs, Divider, Link, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { Link as RouterLink } from "react-router-dom";
import MyIndicatorsTable from "./components/my-indicators-table.jsx";

const IndicatorEditorDashboard = () => {
  return (
    <>
      <Grid container spacing={2}>
        <Breadcrumbs>
          <Link component={RouterLink} underline="hover" color="inherit" to="/">
            Home
          </Link>
          <Typography sx={{ color: "text.primary" }}>
            Indicator Dashboard
          </Typography>
        </Breadcrumbs>
        <Grid size={{ xs: 12 }}>
          <Divider />
        </Grid>

        <Grid size={{ xs: 12 }}>
          <MyIndicatorsTable />
        </Grid>
      </Grid>
    </>
  );
};

export default IndicatorEditorDashboard;
