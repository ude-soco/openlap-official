import {
  alpha,
  Card,
  CardContent,
  Chip,
  Grid,
  Link,
  Stack,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { navigationIds } from "../utils/navigation-data";
import { newsItems } from "../utils/news-data";
import Section from "./shared/section";
import SectionHeading from "./shared/section-heading";
import MoreLink from "./shared/more-link";
import Reveal from "./shared/reveal";

// Formats an ISO date (YYYY-MM-DD) as e.g. "March 2026". Parsed from the
// string parts to avoid timezone shifts that can flip the month.
const formatNewsDate = (iso) => {
  const [year, month] = iso.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
};

// Clamps an excerpt to N lines so cards stay readable and even. Links that
// fall within the visible lines stay clickable; full text remains available
// via the "More News" link.
const clampSx = (lines) => ({
  display: "-webkit-box",
  WebkitLineClamp: lines,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
});

// Renders a news body (array of strings / { text, href } link parts) inline.
const renderNewsBody = (body) =>
  body.map((part, index) =>
    typeof part === "string" ? (
      part
    ) : (
      <Link
        key={index}
        href={part.href}
        target="_blank"
        rel="noopener noreferrer"
      >
        {part.text}
      </Link>
    )
  );

export default function News() {
  const theme = useTheme();
  const accent =
    theme.palette.mode === "dark" ? "primary.light" : "primary.main";

  const sortedNews = [...newsItems].sort((a, b) =>
    b.date.localeCompare(a.date)
  );
  const [featured, ...rest] = sortedNews;

  return (
    <Section
      id={navigationIds.NEWS}
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: { xs: 4, md: 6 },
      }}
    >
      <Reveal>
        <SectionHeading
          title="News"
          subtitle="All the updates, announcements, and stories from the Open Learning Analytics Platform"
          sx={{ width: { sm: "100%", md: "70%" }, mx: "auto" }}
        />
      </Reveal>

      {/* Featured / latest */}
      {featured && (
        <Reveal sx={{ width: "100%" }}>
          <Card>
            <CardContent sx={{ p: { xs: 3, md: 4 } }}>
              <Stack spacing={1.5}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Chip
                    label="Latest"
                    size="small"
                    sx={{
                      bgcolor: alpha(theme.palette.primary.main, 0.12),
                      color: accent,
                      fontWeight: 600,
                    }}
                  />
                  <Typography variant="overline" sx={{ color: "text.secondary" }}>
                    {formatNewsDate(featured.date)}
                  </Typography>
                </Stack>
                <Typography variant="h5" component="h3" sx={{ fontWeight: 700 }}>
                  {featured.title}
                </Typography>
                <Typography
                  variant="body1"
                  color="text.secondary"
                  component="div"
                  sx={clampSx(4)}
                >
                  {renderNewsBody(featured.body)}
                </Typography>
                {featured.venue && (
                  <Typography variant="body2" color="text.secondary">
                    {featured.venue}
                  </Typography>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Reveal>
      )}

      {/* Remaining news */}
      <Reveal sx={{ width: "100%" }} delay={80}>
        <Grid container spacing={3}>
          {rest.map((item) => (
            <Grid size={{ xs: 12, md: 6 }} key={item.slug}>
              <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
                <CardContent sx={{ p: 3, flexGrow: 1 }}>
                  <Stack spacing={1}>
                    <Typography variant="overline" sx={{ color: "text.secondary" }}>
                      {formatNewsDate(item.date)}
                    </Typography>
                    <Typography
                      variant="subtitle1"
                      component="h3"
                      sx={{ fontWeight: 700 }}
                    >
                      {item.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      component="div"
                      sx={clampSx(3)}
                    >
                      {renderNewsBody(item.body)}
                    </Typography>
                    {item.venue && (
                      <Typography variant="caption" color="text.secondary">
                        {item.venue}
                      </Typography>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Reveal>

      <MoreLink label="More News" href="https://www.uni-due.de/soco/news.php" />
    </Section>
  );
}
