import { Breadcrumbs, Divider, Link, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

const ISCPool = () => {
  return (
    <>
      <Stack spacing={2}>
        <Breadcrumbs>
          <Link component={RouterLink} underline="hover" color="inherit" to="/">
            Home
          </Link>
          <Typography>ISC Pool</Typography>
        </Breadcrumbs>
        <Divider />
        <Typography>Under Construction!</Typography>
      </Stack>
    </>
  );
};
export default ISCPool;
