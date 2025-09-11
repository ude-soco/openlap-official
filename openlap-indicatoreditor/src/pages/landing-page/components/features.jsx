import { navigationIds } from "../utils/navigation-data";
import { Container, Stack, Typography } from "@mui/material";

export default function Features() {
  return (
    <Container
      maxWidth="lg"
      id={navigationIds.FEATURE}
      sx={{ pt: { xs: 8, sm: 12 } }}
    >
      <Stack container alignItems={{xs: "none", md: "center"}}>
        <Typography component="h2" variant="h4">
          OpenLAP Features
        </Typography>
        <Typography variant="body1" color="textSecondary">
          The Indicator Specification Card (ISC) Creator and the Indicator
          Editor
        </Typography>
      </Stack>
    </Container>
  );
}
