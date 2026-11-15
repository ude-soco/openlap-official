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
  const navigate = useNavigate();
  const handleCreateIndicator = (link) => navigate(link);

  const cardSx = (theme) => ({
    display: "flex",
    flexDirection: "column",
    height: "100%",
    borderRadius: `${theme.custom.radii.card}px`,
  });

  return (
    <Stack sx={{ gap: 3 }}>
      <PageHeader
        title="Create an indicator"
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "My Indicators", to: "/indicator" },
        ]}
        subtitle="Choose the type of indicator you want to build."
      />

      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
        <Button variant="outlined" startIcon={<HistoryEduOutlinedIcon />} onClick={() => navigate("/indicator?view=drafts")}>View my drafts</Button>
      </Box>

      <Grid container spacing={3} sx={{ alignItems: "stretch" }}>
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
                        sx={{ gap: 1, flexWrap: "wrap", mt: 2 }}
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
                      sx={{ gap: 0.5, alignItems: "center", p: 2, color: "primary.main", fontWeight: 600 }}
                    >
                      <Typography sx={{ fontWeight: 600 }}>Start building</Typography>
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
                    sx={{ justifyContent: "space-between", alignItems: "flex-start", gap: 1, mb: 0.5 }}
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
