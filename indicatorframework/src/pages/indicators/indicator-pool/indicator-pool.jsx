import { Breadcrumbs, Divider, Link, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

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
        <Typography>Under Construction!</Typography>
      </Stack>
    </>
  );
};
export default IndicatorPool;
