import { useContext } from "react";
import { Grid, Skeleton, Stack } from "@mui/material";
import { AuthContext } from "../../setup/auth-context-manager/auth-context-manager";
import { useUserDetails } from "../account-manager/hooks/use-user-details";
import PageHeader from "../../common/components/page-header/page-header";
import DashboardCard from "../../common/components/dashboard-card/dashboard-card";
import homeData from "./utils/home-data";

const GRID_SIZE = { xs: 12, sm: 6, lg: 4 };

export default function Home() {
  const {
    user: { roles },
  } = useContext(AuthContext);
  const { loading, user } = useUserDetails();

  const greeting = user.name ? `Hello, ${user.name}` : "Welcome back";

  const cards = homeData.filter(
    (card) => !roles.some((role) => card.disabledRoles.includes(role))
  );

  return (
    <Stack gap={3}>
      <PageHeader title={greeting} subtitle="Choose a workspace to continue." />

      <Grid container spacing={3}>
        {loading
          ? Array.from({ length: cards.length || 3 }).map((_, index) => (
              <Grid key={index} size={GRID_SIZE}>
                <Skeleton
                  variant="rounded"
                  height={236}
                  sx={{ borderRadius: 2 }}
                />
              </Grid>
            ))
          : cards.map((card) => (
              <Grid key={card.id} size={GRID_SIZE} sx={{ display: "flex" }}>
                <DashboardCard
                  title={card.title}
                  description={card.description}
                  icon={card.icon}
                  primaryAction={card.primaryAction}
                  secondaryAction={card.secondaryAction}
                />
              </Grid>
            ))}
      </Grid>
    </Stack>
  );
}
