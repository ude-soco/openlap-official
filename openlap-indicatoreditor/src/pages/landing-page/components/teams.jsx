import { Typography, Grid, IconButton, Tooltip } from "@mui/material";
import GitHubIcon from "@mui/icons-material/GitHub";
import SchoolIcon from "@mui/icons-material/School";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import { navigationIds } from "../utils/navigation-data";
import { memberItems, peopleItems } from "../utils/team-data";
import Section from "./shared/section";
import SectionHeading from "./shared/section-heading";
import ProfileAvatar from "./shared/profile-avatar";

const SOCIAL_ICONS = {
  linkedin: LinkedInIcon,
  scholar: SchoolIcon,
  github: GitHubIcon,
};

export default function Teams() {
  return (
    <Section
      id={navigationIds.TEAM}
      sx={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: { xs: 3, sm: 6 },
      }}
    >
      <SectionHeading
        title="Team"
        subtitle="Meet the minds building OpenLAP and shaping the future of open and personalized learning analytics"
        sx={{ width: { sm: "100%", md: "60%" } }}
      />
      <Grid
        container
        spacing={10}
        justifyContent="center"
        sx={{ width: "100%" }}
      >
        {memberItems.map((item) => (
          <Grid size={{ xs: 12, sm: 4, md: 3 }} key={item.id}>
            <Grid container direction="column" alignItems="center">
              <ProfileAvatar
                image={item.image}
                name={item.name}
                link={item.link}
                size={148}
                iconFontSize="large"
              />
              <Typography variant="body2" color="textSecondary" align="center">
                {item.name}
              </Typography>
              <Typography variant="body2" color="textSecondary" align="center">
                {item.title}
              </Typography>
              <Grid container spacing={1}>
                {item.social?.map((social) => {
                  const SocialIcon = SOCIAL_ICONS[social.type];
                  return (
                    <Tooltip
                      key={social.id}
                      arrow
                      title={`View ${social.name} profile`}
                    >
                      <IconButton
                        color="primary"
                        aria-label={`View ${item.name}'s ${social.name} profile`}
                        onClick={() => window.open(social.link, "_blank", "noopener,noreferrer")}
                      >
                        {SocialIcon ? <SocialIcon /> : null}
                      </IconButton>
                    </Tooltip>
                  );
                })}
              </Grid>
            </Grid>
          </Grid>
        ))}
      </Grid>
      <Grid
        container
        spacing={2}
        justifyContent="center"
        sx={{ width: "100%" }}
      >
        {peopleItems
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((item) => (
            <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }} key={item.id}>
              <Grid container direction="column" alignItems="center">
                <ProfileAvatar
                  image={item.image}
                  name={item.name}
                  link={item.link}
                  size={96}
                />
                <Typography
                  variant="body2"
                  color="textSecondary"
                  align="center"
                >
                  {item.name}
                </Typography>
                {item.title && (
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    align="center"
                  >
                    {item.title}
                  </Typography>
                )}
              </Grid>
            </Grid>
          ))}
      </Grid>
    </Section>
  );
}
