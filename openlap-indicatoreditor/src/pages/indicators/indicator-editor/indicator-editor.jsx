import { useContext, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Divider,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import HistoryEduOutlinedIcon from "@mui/icons-material/HistoryEduOutlined";
import { indicatorData } from "./utils/indicator-data";
import PageHeader from "../../../common/components/page-header/page-header";
import { AuthContext } from "../../../setup/auth-context-manager/auth-context-manager";

// Consistent hero panel for each type card: the type artwork centred on a
// faint tinted background with a fixed aspect ratio, so cards line up even
// though the source images differ in size.
const CardHero = ({ image, alt, muted = false }) => (
  <Box
    sx={(theme) => ({
      height: 150,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      p: 2,
      backgroundColor: alpha(theme.palette.primary.main, 0.04),
    })}
  >
    <Box
      component="img"
      src={image}
      alt={alt}
      loading="lazy"
      sx={{
        maxWidth: "100%",
        maxHeight: "100%",
        objectFit: "contain",
        filter: muted ? "grayscale(1)" : "none",
      }}
    />
  </Box>
);

CardHero.propTypes = {
  image: PropTypes.string.isRequired,
  alt: PropTypes.string.isRequired,
  muted: PropTypes.bool,
};

const IndicatorEditor = () => {
  const { SESSION_INDICATOR } = useContext(AuthContext);
  const navigate = useNavigate();
  const [indicatorInProgress, setIndicatorInProgress] = useState(false);

  useEffect(() => {
    const savedState = sessionStorage.getItem(SESSION_INDICATOR);
    setIndicatorInProgress(Boolean(savedState));
  }, [SESSION_INDICATOR]);

  const handleClearSession = () => {
    setIndicatorInProgress(false);
    sessionStorage.removeItem(SESSION_INDICATOR);
  };

  const handleContinueEditing = () => {
    if (!indicatorInProgress) return;
    switch (
      JSON.parse(sessionStorage.getItem(SESSION_INDICATOR)).indicator.type
    ) {
      case "BASIC":
        navigate("/indicator/editor/basic");
        break;
      case "COMPOSITE":
        navigate("/indicator/editor/composite");
        break;
      case "MULTI_LEVEL":
        navigate("/indicator/editor/multi-level-analysis");
        break;
      default:
        break;
    }
  };

  // Behaviour preserved: starting a fresh indicator clears any in-progress
  // draft from sessionStorage before navigating into the flow.
  const handleCreateIndicator = (link) => {
    handleClearSession();
    navigate(link);
  };

  const cardSx = (theme) => ({
    display: "flex",
    flexDirection: "column",
    height: "100%",
    borderRadius: `${theme.custom.radii.card}px`,
  });

  return (
    <Stack gap={3}>
      <PageHeader
        title="Create an indicator"
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "My Indicators", to: "/indicator" },
        ]}
        subtitle="Choose the type of indicator you want to build."
      />

      {/* In-progress draft banner (session-restore). Behaviour unchanged; only
          restyled from a stock Alert to the shared alpha-tinted banner. */}
      {indicatorInProgress && (
        <Box
          sx={(theme) => ({
            p: 2,
            borderRadius: `${theme.custom.radii.card}px`,
            border: `1px solid ${alpha(theme.palette.info.main, 0.4)}`,
            backgroundColor: alpha(theme.palette.info.main, 0.06),
          })}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            gap={2}
            alignItems={{ xs: "flex-start", sm: "center" }}
            justifyContent="space-between"
          >
            <Stack direction="row" gap={1.5} alignItems="center">
              <HistoryEduOutlinedIcon color="info" />
              <Box>
                <Typography fontWeight={600}>
                  You have an indicator in progress
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Continue where you left off, or discard it to start fresh.
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" gap={1} sx={{ flexShrink: 0 }}>
              <Button variant="outlined" onClick={handleClearSession}>
                Discard
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={handleContinueEditing}
              >
                Continue
              </Button>
            </Stack>
          </Stack>
        </Box>
      )}

      <Grid container spacing={3} alignItems="stretch">
        {indicatorData.map((type) => (
          <Grid key={type.imageCode} size={{ xs: 12, sm: 6, md: 4 }} sx={{ display: "flex" }}>
            {type.available ? (
              <Card variant="outlined" sx={cardSx}>
                <CardActionArea
                  onClick={() => handleCreateIndicator(type.link)}
                  aria-label={`Start building a ${type.name}`}
                  sx={{
                    flexGrow: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "stretch",
                  }}
                >
                  <CardHero image={type.image} alt={type.name} />
                  <CardContent sx={{ p: 3, width: "100%" }}>
                    <Typography variant="h6" component="h2" gutterBottom>
                      {type.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {type.description}
                    </Typography>
                    {type.steps && (
                      <Stack
                        direction="row"
                        gap={1}
                        flexWrap="wrap"
                        sx={{ mt: 2 }}
                      >
                        {type.steps.map((step, i) => (
                          <Chip
                            key={step}
                            size="small"
                            variant="outlined"
                            label={`${i + 1}. ${step}`}
                          />
                        ))}
                      </Stack>
                    )}
                  </CardContent>
                  <Box sx={{ mt: "auto", width: "100%" }}>
                    <Divider />
                    <Stack
                      direction="row"
                      gap={0.5}
                      alignItems="center"
                      sx={{ p: 2, color: "primary.main", fontWeight: 600 }}
                    >
                      <Typography fontWeight={600}>Start building</Typography>
                      <ArrowForwardRoundedIcon fontSize="small" />
                    </Stack>
                  </Box>
                </CardActionArea>
              </Card>
            ) : (
              <Card
                variant="outlined"
                aria-disabled="true"
                sx={(theme) => ({ ...cardSx(theme), opacity: 0.65 })}
              >
                <CardHero image={type.image} alt={type.name} muted />
                <CardContent sx={{ p: 3 }}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="flex-start"
                    gap={1}
                    sx={{ mb: 0.5 }}
                  >
                    <Typography variant="h6" component="h2">
                      {type.name}
                    </Typography>
                    <Chip label="Coming soon" size="small" sx={{ flexShrink: 0 }} />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {type.description}
                  </Typography>
                </CardContent>
                <Box sx={{ mt: "auto" }}>
                  <Divider />
                  <Typography
                    variant="body2"
                    color="text.disabled"
                    sx={{ p: 2 }}
                  >
                    Not yet available
                  </Typography>
                </Box>
              </Card>
            )}
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
};

export default IndicatorEditor;
