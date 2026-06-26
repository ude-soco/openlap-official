import { Box, Link, Paper, Typography } from "@mui/material";
import { useMediaQuery, useTheme } from "@mui/material";
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
} from "@mui/lab";
import { navigationIds } from "../utils/navigation-data";
import { newsItems } from "../utils/news-data";
import Section from "./shared/section";
import SectionHeading from "./shared/section-heading";
import MoreLink from "./shared/more-link";

// Formats an ISO date (YYYY-MM-DD) as e.g. "March 2026". Parsed from the
// string parts to avoid timezone shifts that can flip the month.
const formatNewsDate = (iso) => {
  const [year, month] = iso.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
};

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
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const sortedNews = [...newsItems].sort((a, b) =>
    b.date.localeCompare(a.date)
  );

  return (
    <Section
      id={navigationIds.NEWS}
      sx={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: { xs: 3 },
      }}
    >
      <SectionHeading
        title="News"
        subtitle="All the updates, announcements, and stories from Open Learning Analytics Platform"
        sx={{ width: { sm: "100%", md: "60%" } }}
      />

      <Timeline position={isMobile ? "right" : "alternate"}>
        {sortedNews.map((item, index) => (
          <TimelineItem key={item.slug} sx={{ pb: 1 }}>
            <TimelineOppositeContent
              color="textSecondary"
              sx={{ display: { xs: "none", sm: "grid" } }}
            >
              <Typography variant="body2" color="textSecondary" gutterBottom>
                {formatNewsDate(item.date)}
              </Typography>
            </TimelineOppositeContent>
            <TimelineSeparator>
              <TimelineDot color="primary" />
              {index < sortedNews.length - 1 && <TimelineConnector />}
            </TimelineSeparator>

            <TimelineContent component="div">
              <Typography
                variant="body2"
                color="textSecondary"
                sx={{ display: { xs: "flex", sm: "none" }, mb: 2 }}
                component="span"
              >
                {formatNewsDate(item.date)}
              </Typography>
              <Box component={Paper} sx={{ p: 2 }} variant="outlined">
                <Typography component="h3" fontWeight="medium" gutterBottom>
                  {item.title}
                </Typography>
                <Typography
                  variant="body2"
                  color="textSecondary"
                  gutterBottom
                  component="div"
                >
                  {renderNewsBody(item.body)}
                </Typography>
                {item.venue && (
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    component="div"
                  >
                    {item.venue}
                  </Typography>
                )}
              </Box>
            </TimelineContent>
          </TimelineItem>
        ))}
      </Timeline>

      <MoreLink label="More News" href="https://www.uni-due.de/soco/news.php" />
    </Section>
  );
}
