import { Breadcrumbs, Divider, Link, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import AllIndicatorsTable from "./components/all-indicators-table.jsx";//imports AllIndicatorsTable component responisible for displaying the table of indicators

const IndicatorPool = () => {
  return (
    <>
      <Stack spacing={2}>
        <Breadcrumbs>
          <Link component={RouterLink} underline="hover" color="inherit" to="/">
            Home
          </Link>
          <Typography>Indicator Pool</Typography>
        </Breadcrumbs>
        <Divider />
        <Typography variant="h5" component="h1" gutterBottom>
          Indicator Pool
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Browse and explore all available indicators created by the community.
        </Typography>
        <Divider />
        <AllIndicatorsTable />
      </Stack>
    </>
  );
};
export default IndicatorPool;
