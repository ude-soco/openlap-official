import { useContext, useState } from "react";
import PropTypes from "prop-types";
import {
  Avatar,
  Box,
  Chip,
  Divider,
  Paper,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { AuthContext } from "../../setup/auth-context-manager/auth-context-manager";
import { useUserDetails } from "./hooks/use-user-details";
import RoleTypes from "./utils/enums/role-types.js";
import PageHeader from "../../common/components/page-header/page-header";
import EmptyState from "../../common/components/empty-state/empty-state";

const ROLE_LABELS = {
  [RoleTypes.user]: "User",
  [RoleTypes.userWithoutLRS]: "User (no LRS connected)",
  [RoleTypes["data provider"]]: "Data Provider",
  [RoleTypes.admin]: "Administrator",
};

const panelSx = (theme) => ({
  p: { xs: 2.5, md: 3 },
  width: "100%",
  borderRadius: `${theme.custom.radii.card}px`,
});

const TabPanel = ({ value, index, children }) => (
  <Box
    role="tabpanel"
    hidden={value !== index}
    id={`settings-panel-${index}`}
    aria-labelledby={`settings-tab-${index}`}
    sx={{ width: "100%" }}
  >
    {value === index && children}
  </Box>
);

TabPanel.propTypes = {
  value: PropTypes.number.isRequired,
  index: PropTypes.number.isRequired,
  children: PropTypes.node,
};

const AccountPanel = ({ loading, error, user, roles }) => {
  if (error) {
    return (
      <EmptyState
        tone="error"
        title="Couldn't load your account details"
        description="Something went wrong while loading your profile. Please refresh the page to try again."
      />
    );
  }

  const initial = user.name
    ? user.name.trim().charAt(0).toUpperCase()
    : user.email
      ? user.email.trim().charAt(0).toUpperCase()
      : "";

  return (
    <Paper variant="outlined" sx={panelSx}>
      <Typography variant="h6" component="h2" gutterBottom>
        Profile
      </Typography>
      <Stack spacing={2.5} sx={{ mt: 1 }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          {loading ? (
            <Skeleton variant="circular" width={56} height={56} />
          ) : (
            <Avatar
              sx={{
                width: 56,
                height: 56,
                fontSize: 22,
                fontWeight: 600,
                bgcolor: "primary.main",
                color: "primary.contrastText",
              }}
            >
              {initial}
            </Avatar>
          )}
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={600} noWrap>
              {loading ? <Skeleton width={180} /> : user.name || "—"}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {loading ? <Skeleton width={220} /> : user.email || "—"}
            </Typography>
          </Box>
        </Stack>

        <Divider />

        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Account type
          </Typography>
          {loading ? (
            <Skeleton width={120} height={32} />
          ) : (
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {roles?.length ? (
                roles.map((role) => (
                  <Chip key={role} size="small" label={ROLE_LABELS[role] || role} />
                ))
              ) : (
                <Typography variant="body2">—</Typography>
              )}
            </Stack>
          )}
        </Box>
      </Stack>
    </Paper>
  );
};

AccountPanel.propTypes = {
  loading: PropTypes.bool.isRequired,
  error: PropTypes.bool.isRequired,
  user: PropTypes.object.isRequired,
  roles: PropTypes.array,
};

const ChangePasswordPanel = () => (
  <Paper variant="outlined" sx={panelSx}>
    <Typography variant="h6" component="h2" gutterBottom>
      Change password
    </Typography>
    <Box sx={{ mt: 2 }}>
      <EmptyState
        icon={LockOutlinedIcon}
        title="Password change isn't available yet"
        description="Updating your password from the app isn't supported by the server yet. Once the account update endpoint is available, you'll be able to change your password here."
      />
    </Box>
  </Paper>
);

const UserProfile = () => {
  const {
    user: { roles },
  } = useContext(AuthContext);
  const { loading, error, user } = useUserDetails();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [tab, setTab] = useState(0);

  return (
    <>
      <PageHeader
        title="Account Settings"
        subtitle="Manage your profile and security settings."
        breadcrumbs={[{ label: "Home", to: "/" }]}
      />
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={3}
        sx={{ mt: 1, alignItems: "flex-start" }}
      >
        <Tabs
          orientation={isMobile ? "horizontal" : "vertical"}
          variant={isMobile ? "fullWidth" : "standard"}
          value={tab}
          onChange={(_event, value) => setTab(value)}
          aria-label="Account settings sections"
          sx={{
            flexShrink: 0,
            minWidth: { sm: 220 },
            width: { xs: "100%", sm: "auto" },
            borderRight: { sm: 1 },
            borderBottom: { xs: 1, sm: 0 },
            borderColor: { xs: "divider", sm: "divider" },
            "& .MuiTab-root": { alignItems: { sm: "flex-start" }, textTransform: "none" },
          }}
        >
          <Tab
            label="Account"
            id="settings-tab-0"
            aria-controls="settings-panel-0"
          />
          <Tab
            label="Change Password"
            id="settings-tab-1"
            aria-controls="settings-panel-1"
          />
        </Tabs>

        <Box sx={{ flexGrow: 1, width: "100%" }}>
          <TabPanel value={tab} index={0}>
            <AccountPanel
              loading={loading}
              error={error}
              user={user}
              roles={roles}
            />
          </TabPanel>
          <TabPanel value={tab} index={1}>
            <ChangePasswordPanel />
          </TabPanel>
        </Box>
      </Stack>
    </>
  );
};

export default UserProfile;
