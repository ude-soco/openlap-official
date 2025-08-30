import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid2";
import { navigationIds } from "../utils/navigation-data";
import { Button, Checkbox, FormControlLabel, TextField } from "@mui/material";

export default function ContactUs() {
  return (
    <Container
      id={navigationIds.CONTACT}
      sx={{
        pt: { xs: 4, sm: 12 },
        pb: { xs: 8, sm: 16 },
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: { xs: 3, sm: 6 },
      }}
    >
      <Box
        sx={{
          width: { sm: "100%", md: "60%" },
          textAlign: { sm: "left", md: "center" },
        }}
      >
        <Typography component="h2" variant="h4" color="text.primary">
          Let's talk about the future
        </Typography>
        <Typography variant="body1" color="text.secondary">
          We're here to answer your questions and discuss future collaboration.
        </Typography>
      </Box>
      <Box sx={{ width: { sm: "100%", md: "50%" } }}>
        <Grid container spacing={2} justifyContent="center">
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField label="First name" fullWidth required />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField label="Last name" fullWidth required />
          </Grid>
          <TextField label="Email address" fullWidth required />
          <TextField label="Company" fullWidth required />
          <TextField label="Message" fullWidth required />
          <Grid size={{ xs: 12 }}>
            <FormControlLabel
              control={<Checkbox value="allowExtraEmails" color="primary" />}
              label="I agree to the terms of use and privacy policy."
            />
          </Grid>
          <Button fullWidth variant="contained" disabled>
            Submit
          </Button>
        </Grid>
      </Box>
    </Container>
  );
}
