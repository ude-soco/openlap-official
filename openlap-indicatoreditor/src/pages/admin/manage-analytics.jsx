import {
  Box,
  Breadcrumbs,
  Button,
  Container,
  Divider,
  Link,
  Stack,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";

const ManageAnalytics = () => {
  const [state, setState] = useState({
    loading: false,
  });

  return (
    <>
      <Stack gap={2}>
        <Breadcrumbs>
          <Link component={RouterLink} underline="hover" color="inherit" to="/">
            Home
          </Link>
          <Typography color="textPrimary">Analytics Method</Typography>
        </Breadcrumbs>
        <Divider />
      </Stack>
      <Container maxWidth="lg" sx={{ pt: 2 }}>
        <Box
          sx={{
            mt: 2,
            pb: 1,
            p: 8,
            border: "1px dashed",
            borderColor: "divider",
            borderRadius: 2,
            textAlign: "center",
            color: "text.secondary",
          }}
        >
          <Typography variant="body1" gutterBottom>
            Upload a JAR file that consist of your Analytics Methods
          </Typography>
          <Button
            loading={state.loading}
            loadingPosition="start"
            loadingIndicator="Please wait..."
            autoFocus
            variant="contained"
            // onClick={handlePreviewAnalyzedData}
          >
            {!state.loading && "Upload JAR"}
          </Button>
        </Box>
      </Container>
    </>
  );
};

export default ManageAnalytics;
