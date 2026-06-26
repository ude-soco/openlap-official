import {
  Box,
  Card,
  CardContent,
  Grid,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import GitHubIcon from "@mui/icons-material/GitHub";
import SchoolIcon from "@mui/icons-material/School";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import { navigationIds } from "../utils/navigation-data";
import { memberItems, peopleItems } from "../utils/team-data";
import Section from "./shared/section";
import SectionHeading from "./shared/section-heading";
import ProfileAvatar from "./shared/profile-avatar";
import Reveal from "./shared/reveal";

const SOCIAL_ICONS = {
  linkedin: LinkedInIcon,
  scholar: SchoolIcon,
  github: GitHubIcon,
};

export default function Teams() {
  const sortedPeople = [...peopleItems].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return (
    <Section
      id={navigationIds.TEAM}
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: { xs: 5, md: 7 },
      }}
    >
      <Reveal>
        <SectionHeading
          title="Team"
          subtitle="Meet the minds building OpenLAP and shaping the future of open and personalized learning analytics"
          sx={{ width: { sm: "100%", md: "70%" }, mx: "auto" }}
        />
      </Reveal>

      {/* Lead researchers — prominent profile cards */}
      <Reveal sx={{ width: "100%" }}>
        <Grid container spacing={3} justifyContent="center">
          {memberItems.map((item) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={item.id}>
              <Card sx={{ height: "100%" }}>
                <CardContent
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                    p: { xs: 3, md: 4 },
                    gap: 1.5,
                  }}
                >
                  <ProfileAvatar
                    image={item.image}
                    name={item.name}
                    link={item.link}
                    size={120}
                    iconFontSize="large"
                  />
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {item.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {item.title}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={0.5}>
                    {item.social?.map((social) => {
                      const SocialIcon = SOCIAL_ICONS[social.type];
                      return (
                        <Tooltip
                          key={social.id}
                          arrow
                          title={`View ${item.name}'s ${social.name} profile`}
                        >
                          <IconButton
                            size="small"
                            color="primary"
                            aria-label={`View ${item.name}'s ${social.name} profile`}
                            onClick={() =>
                              window.open(
                                social.link,
                                "_blank",
                                "noopener,noreferrer"
                              )
                            }
                          >
                            {SocialIcon ? <SocialIcon fontSize="small" /> : null}
                          </IconButton>
                        </Tooltip>
                      );
                    })}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Reveal>

      {/* Wider team — refined avatar grid */}
      <Reveal sx={{ width: "100%" }} delay={80}>
        <Grid container spacing={{ xs: 3, md: 4 }} justifyContent="center">
          {sortedPeople.map((item) => (
            <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }} key={item.id}>
              <Stack alignItems="center" spacing={1} sx={{ textAlign: "center" }}>
                <ProfileAvatar
                  image={item.image}
                  name={item.name}
                  link={item.link}
                  size={88}
                />
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {item.name}
                  </Typography>
                  {item.title && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      component="div"
                    >
                      {item.title}
                    </Typography>
                  )}
                </Box>
              </Stack>
            </Grid>
          ))}
        </Grid>
      </Reveal>
    </Section>
  );
}
