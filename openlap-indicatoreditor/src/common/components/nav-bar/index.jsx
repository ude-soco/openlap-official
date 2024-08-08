import { Grid, Typography, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import OpenLAPLogo from "../../assets/brand/openlap-logo.svg";

const NavBarPublic = ({ message, moveTo, buttonLabel }) => {
  const navigate = useNavigate();
  return (
    <Grid container sx={{ p: 1 }} justifyContent="space-between">
      <Grid
        item
        component="img"
        sx={{ height: 35, cursor: "pointer" }}
        src={OpenLAPLogo}
        alt="Soco logo"
        onClick={() => navigate("/")}
      />
      <Grid item>
        <Grid container alignItems="center">
          <Typography sx={{ px: 2 }}>{message}</Typography>
          <Button
            color="primary"
            variant="contained"
            // size="small"
            onClick={() => navigate(moveTo)}
          >
            {buttonLabel}
          </Button>
        </Grid>
      </Grid>
    </Grid>
  );
};

export default NavBarPublic;
