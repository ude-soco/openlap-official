import { useContext, useState } from "react";
import PropTypes from "prop-types";
import { Box, Stack, Tab, Tabs, useMediaQuery, useTheme } from "@mui/material";
import { AuthContext } from "../../setup/auth-context-manager/auth-context-manager";
import { useUserDetails } from "./hooks/use-user-details";
import PageHeader from "../../common/components/page-header/page-header";
import AccountProfilePanel from "./components/account-profile-panel";
import ChangePasswordPanel from "./components/change-password-panel";

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

const UserProfile = () => {
  const {
    user: { roles },
  } = useContext(AuthContext);
  const { loading, error, user, reload } = useUserDetails();
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
          <Tab label="Account" id="settings-tab-0" aria-controls="settings-panel-0" />
          <Tab
            label="Change Password"
            id="settings-tab-1"
            aria-controls="settings-panel-1"
          />
        </Tabs>

        <Box sx={{ flexGrow: 1, width: "100%" }}>
          <TabPanel value={tab} index={0}>
            <AccountProfilePanel
              loading={loading}
              error={error}
              user={user}
              roles={roles}
              reload={reload}
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
