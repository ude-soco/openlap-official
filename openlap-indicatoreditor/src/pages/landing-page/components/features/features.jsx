import { Fragment } from "react";
import { alpha, Box, Card, CardContent, Stack, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import DesignServicesIcon from "@mui/icons-material/DesignServices";
import AddchartIcon from "@mui/icons-material/Addchart";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { navigationIds } from "../../utils/navigation-data";
import { featureItems } from "../../utils/features-data";
import Section from "../shared/section";
import SectionHeading from "../shared/section-heading";
import Reveal from "../shared/reveal";
import FeatureRow from "./feature-row";

// Two complementary tools: design indicators first (ISC Creator), then
// implement them with real data (Indicator Editor).
const TOOLS = [
  {
    icon: DesignServicesIcon,
    eyebrow: "Design",
    title: "Design Learning Analytics Indicators",
    description:
      "Low-fidelity, conceptual, and theoretically grounded specification of indicators with the ISC Creator.",
  },
  {
    icon: AddchartIcon,
    eyebrow: "Implement",
    title: "Implement Learning Analytics Indicators",
    description:
      "High-fidelity implementation using datasets, filters, analysis methods, and visualizations with the Indicator Editor.",
  },
];

const ToolsOverview = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const accent = isDark ? "primary.light" : "primary.main";

  return (
    <Stack
      direction={{ xs: "column", md: "row" }}
      spacing={3}
      useFlexGap
      alignItems="stretch"
      sx={{ mt: { xs: 5, md: 6 } }}
    >
      {TOOLS.map((tool, i) => {
        const Icon = tool.icon;
        return (
          <Fragment key={tool.eyebrow}>
            <Card sx={{ flex: 1 }}>
              <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                <Stack spacing={2}>
                  <Box
                    aria-hidden
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: "12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: accent,
                      bgcolor: alpha(
                        theme.palette.primary.main,
                        isDark ? 0.18 : 0.1
                      ),
                    }}
                  >
                    <Icon />
                  </Box>
                  <Box>
                    <Typography
                      variant="overline"
                      sx={{
                        color: accent,
                        fontWeight: 600,
                        letterSpacing: "0.1em",
                      }}
                    >
                      {tool.eyebrow}
                    </Typography>
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 700 }}
                      gutterBottom
                    >
                      {tool.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {tool.description}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
            {i < TOOLS.length - 1 && (
              <Stack
                aria-hidden
                alignItems="center"
                justifyContent="center"
                sx={{ color: "text.disabled" }}
              >
                <ArrowForwardIcon
                  sx={{ transform: { xs: "rotate(90deg)", md: "none" } }}
                />
              </Stack>
            )}
          </Fragment>
        );
      })}
    </Stack>
  );
};

export default function Features() {
  return (
    <>
      <Section id={navigationIds.FEATURE} sx={{ pt: { xs: 6, sm: 8, md: 11 }, pb: 0 }}>
        <Reveal>
          <SectionHeading
            title="OpenLAP Features"
            subtitle="Two complementary no-code tools — design your learning analytics indicators, then implement them with real data."
            sx={{ width: { sm: "100%", md: "70%" }, mx: "auto" }}
          />
        </Reveal>
        <Reveal delay={80}>
          <ToolsOverview />
        </Reveal>
      </Section>
      {featureItems.map((feature) => (
        <Reveal key={feature.id}>
          <FeatureRow feature={feature} />
        </Reveal>
      ))}
    </>
  );
}
