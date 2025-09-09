import { navigationIds } from "../utils/navigation-data";
import { Container, Typography } from "@mui/material";

export default function Features() {
  return (
    <Container
      maxWidth="lg"
      id={navigationIds.FEATURE}
      sx={{
        pt: { xs: 4, sm: 12 },
      }}
    >
      <Typography component="h2" variant="h4" align="center">
        OpenLAP Features
      </Typography>
      <Typography variant="body1" color="textSecondary" align="center">
        The Indicator Specification Card (ISC) Creator and the Indicator Editor
      </Typography>
    </Container>
  );
}
