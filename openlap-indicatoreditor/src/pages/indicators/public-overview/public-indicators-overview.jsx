import React from "react";
import {
  Box,
  Button,
  Container,
  Divider,
  Paper,
  Stack,
  Typography,
  Alert,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import LoginIcon from "@mui/icons-material/Login";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import PublicIndicatorsTable from "./components/public-indicators-table.jsx";

const PublicIndicatorsOverview = () => {
  const navigate = useNavigate();

  const handleSignUp = () => {
    navigate("/register");
  };

  const handleLogin = () => {
    navigate("/login");
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Stack spacing={3}>

        {/* Information Alert */}
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          <Typography variant="body2">
            <strong>Not a user yet?</strong> Sign up now to access indicators, create your own, and use them in your learning analytics applications!
          </Typography>
        </Alert>

        {/* Page Header */}
        <Box>
          <Typography variant="h5" component="h2" gutterBottom fontWeight="600">
            Public Indicators Overview
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Browse through our collection of learning analytics indicators created by the OpenLAP community. 
            Each indicator transforms raw learning data into meaningful insights through data extraction, filtering, 
            analysis, and visualization.
          </Typography>
        </Box>

        <Divider />

        {/* Main Content - Indicators Table */}
        <Paper elevation={1} sx={{ p: 3, borderRadius: 2 }}>
          <PublicIndicatorsTable />
        </Paper>
      </Stack>
    </Container>
  );
};

export default PublicIndicatorsOverview;
