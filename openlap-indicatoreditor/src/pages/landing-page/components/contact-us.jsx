import { useState } from "react";
import { navigationIds } from "../utils/navigation-data";
import {
  Box,
  Checkbox,
  Container,
  Grid,
  FormControlLabel,
  TextField,
  Typography,
  Button,
} from "@mui/material";
import emailjs from "@emailjs/browser";
import { useSnackbar } from "notistack";
const emailTemplateId = import.meta.env.VITE_EMAIL_TEMPLATE_ID || "";
const emailServiceId = import.meta.env.VITE_EMAIL_SERVICE_ID || "";
const emailPublicKey = import.meta.env.VITE_EMAIL_PUBLIC_KEY || "";

export default function ContactUs() {
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
        <form onSubmit={handleSubmit}>
          <Grid container spacing={2} justifyContent="center">
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
            <TextField
              name="email"
              label="Email address"
              fullWidth
              required
              value={formData.email}
              onChange={handleChange}
            />
            <TextField
              name="company"
              label="Company"
              fullWidth
              value={formData.company}
              onChange={handleChange}
            />
            <TextField
              name="subject"
              label="Subject"
              fullWidth
              value={formData.subject}
              onChange={handleChange}
            />
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
            <Grid size={{ xs: 12 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="agreed"
                    checked={formData.agreed}
                    onChange={handleChange}
                  />
                }
                label="I agree to the terms of use and privacy policy."
              />
            </Grid>
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
        </form>
      </Box>
    </Container>
  );
}
