import { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
  Grid,
  Link,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import emailjs from "@emailjs/browser";
import { useSnackbar } from "notistack";
import { navigationIds } from "../utils/navigation-data";
import Section from "./shared/section";
import SectionHeading from "./shared/section-heading";
import Reveal from "./shared/reveal";
const emailTemplateId = import.meta.env.VITE_EMAIL_TEMPLATE_ID || "";
const emailServiceId = import.meta.env.VITE_EMAIL_SERVICE_ID || "";
const emailPublicKey = import.meta.env.VITE_EMAIL_PUBLIC_KEY || "";

export default function ContactUs() {
  const theme = useTheme();
  const accent =
    theme.palette.mode === "dark" ? "primary.light" : "primary.main";
  const { enqueueSnackbar } = useSnackbar();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    company: "",
    subject: "",
    message: "",
    agreed: false,
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    emailjs
      .send(
        emailServiceId,
        emailTemplateId,
        {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          company: formData.company,
          subject: formData.subject,
          message: formData.message,
        },
        emailPublicKey
      )
      .then(
        () => {
          enqueueSnackbar("Message sent successfully!", { variant: "success" });
          setFormData({
            firstName: "",
            lastName: "",
            email: "",
            company: "",
            subject: "",
            message: "",
            agreed: false,
          });
          setLoading(false);
        },
        (error) => {
          enqueueSnackbar("Failed to send. Try again.", { variant: "error" });
          setLoading(false);
          console.error(error);
        }
      );
  };

  return (
    <Section id={navigationIds.CONTACT}>
      <Reveal sx={{ width: "100%" }}>
        <Grid container spacing={{ xs: 4, md: 6 }} alignItems="flex-start">
          {/* Left: invitation + research context */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Stack spacing={2}>
              <Typography
                variant="overline"
                sx={{ color: accent, fontWeight: 600, letterSpacing: "0.1em" }}
              >
                Contact
              </Typography>
              <SectionHeading
                title="Let's talk about the future"
                subtitle="We're here to answer your questions and discuss future collaboration."
                align="left"
              />
              <Typography variant="body2" color="text.secondary">
                OpenLAP is an open research project by the Social Computing Group
                at the University of Duisburg-Essen. We welcome questions,
                feedback, and collaboration opportunities.
              </Typography>
            </Stack>
          </Grid>

          {/* Right: form card */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Card>
              <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                <Box component="form" onSubmit={handleSubmit}>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        name="firstName"
                        label="First name"
                        fullWidth
                        required
                        value={formData.firstName}
                        onChange={handleChange}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        name="lastName"
                        label="Last name"
                        fullWidth
                        required
                        value={formData.lastName}
                        onChange={handleChange}
                      />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <TextField
                        name="email"
                        label="Email address"
                        type="email"
                        fullWidth
                        required
                        value={formData.email}
                        onChange={handleChange}
                      />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <TextField
                        name="company"
                        label="Company"
                        fullWidth
                        value={formData.company}
                        onChange={handleChange}
                      />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <TextField
                        name="subject"
                        label="Subject"
                        fullWidth
                        value={formData.subject}
                        onChange={handleChange}
                      />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <TextField
                        name="message"
                        label="Message"
                        fullWidth
                        multiline
                        rows={5}
                        required
                        value={formData.message}
                        onChange={handleChange}
                      />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            name="agreed"
                            checked={formData.agreed}
                            onChange={handleChange}
                          />
                        }
                        label={
                          <span>
                            I agree to the terms of use and{" "}
                            <Link
                              href="/privacy"
                              target="_blank"
                              rel="noopener noreferrer"
                              underline="hover"
                              onClick={(e) => e.stopPropagation()}
                            >
                              privacy policy
                            </Link>
                            .
                          </span>
                        }
                      />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Button
                        loading={loading}
                        loadingPosition="start"
                        loadingIndicator="Message on its way..."
                        type="submit"
                        fullWidth
                        variant="contained"
                        disabled={!formData.agreed}
                      >
                        {!loading && "Send Message"}
                      </Button>
                    </Grid>
                  </Grid>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Reveal>
    </Section>
  );
}
