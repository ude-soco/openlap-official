import OpenLAPLogo from "../../assets/brand/openlap-logo.svg";
import OpenLAPFull from "../../assets/home/soco-openlap-full.svg";
import {
  Box,
  Button,
  Divider,
  Link,
  Grid,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import ToggleColorMode from "../landing-page/components/toggle-color-mode";
import { useNavigate } from "react-router-dom";

const logoStyle = {
  width: "120px",
  height: "auto",
  cursor: "pointer",
};

const fullLogoStyle = {
  width: "240px",
  height: "auto",
};

const PrivacyPolicy = () => {
  const navigate = useNavigate();
  return (
    <>
      <Box sx={{ p: 4 }}>
        <Grid container justifyContent="center" spacing={5}>
          <Grid size={{ xs: 12, md: 8, xl: 6 }}>
            <Stack spacing={2}>
              <Grid container justifyContent="space-between">
                <Tooltip title="To homepage">
                  <Box
                    component="img"
                    style={logoStyle}
                    src={OpenLAPLogo}
                    alt="Soco logo"
                    onClick={() => navigate("/")}
                  />
                </Tooltip>
                <Grid container spacing={2}>
                  <ToggleColorMode />
                  <Button
                    disableElevation
                    variant="contained"
                    size="small"
                    onClick={() => navigate("/login")}
                  >
                    Sign in
                  </Button>
                </Grid>
              </Grid>
              <Grid size={{ xs: 12 }} sx={{ py: 5 }}>
                <Grid container justifyContent="center">
                  <Box
                    component="img"
                    style={fullLogoStyle}
                    src={OpenLAPFull}
                    alt="OpenLAP Full Logo"
                  />
                </Grid>
              </Grid>
              <Typography variant="h5">Privacy Policy</Typography>
              <Typography>
                Responsible in accordance with the EU General Data Protection
                Regulation (GDPR) and other national data protection laws of the
                Member States, as well as other data protection regulations.
              </Typography>
              <Typography>
                <b>University of Duisburg-Essen</b>
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography>
                    <b>Campus Duisburg</b>
                    <br />
                    Forsthausweg 2<br />
                    47057 Duisburg
                    <br />
                    Tel.: +49 203 379 - 0<br />
                    Fax: +49 203 379 - 3333
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography>
                    <b>Campus Essen</b>
                    <br />
                    Universitätsstraße 2<br />
                    45141 Essen
                    <br />
                    Tel.: +49 201 183 - 0<br />
                    Fax: +49 201 183 - 3536
                  </Typography>
                </Grid>
              </Grid>
              <Typography>
                E-mail:{" "}
                <Link
                  component="button"
                  underline="hover"
                  onClick={() => {
                    window.location.href = "mailto:webredaktion@uni-due.org";
                  }}
                >
                  webredaktion@uni-due.org
                </Link>
                <br />
                Website:{" "}
                <Link
                  component="button"
                  underline="hover"
                  onClick={() => window.open("www.uni-due.de")}
                >
                  www.uni-due.de
                </Link>
              </Typography>
              <Typography>
                The University of Duisburg-Essen is represented by its Rector:
              </Typography>
              <Typography>
                <b>Prof. Dr. Barbara Albert</b>
                <br />
                E-mail:{" "}
                <Link
                  component="button"
                  underline="hover"
                  onClick={() => {
                    window.location.href = "mailto:rektorin@uni-due.de";
                  }}
                >
                  rektorin@uni-due.de
                </Link>
              </Typography>
              <Typography>
                Campus Duisburg: Tel.: 0203/37 9-2465
                <br />
                Campus Essen: Tel.: 0201/18 3-2000
                <br />
                Website:{" "}
                <Link
                  component="button"
                  underline="hover"
                  onClick={() => window.open("www.uni-due.de/de/rektorat/")}
                >
                  www.uni-due.de/de/rektorat/
                </Link>
              </Typography>
              <Typography>
                <b>Data Protection Officer:</b>
                <br />
                Dr. Kai-Uwe Loser
                <br />
                University of Duisburg-Essen
                <br />
                Forsthausweg 2<br />
                47057 Duisburg
                <br />
                Tel.: 0234/32-28720
                <br />
                E-mail:{" "}
                <Link
                  component="button"
                  underline="hover"
                  onClick={() => {
                    window.location.href = "mailto:kai-uwe.loser@uni-due.de";
                  }}
                >
                  kai-uwe.loser@uni-due.de
                </Link>
                <br />
                Website:{" "}
                <Link
                  component="button"
                  underline="hover"
                  onClick={() =>
                    window.open("www.uni-due.de/verwaltung/datenschutz")
                  }
                >
                  www.uni-due.de/verwaltung/datenschutz
                </Link>
              </Typography>
              <Divider />

              <Typography variant="h5">Data Collection and Use</Typography>
              <Typography>
                We collect and use personal data of our users only to the extent
                necessary for providing OpenLAP. This is done for the purpose of
                fulfilling our assigned tasks (supporting teaching and research)
                under Art. 6 (1)(e) GDPR. If we obtain consent for data
                processing, the legal basis is Art. 6 (1)(a) GDPR.
              </Typography>
              <Typography>
                <b>(1)</b> Data collected when using OpenLAP:
                <br />
                <ul style={{ margin: 0 }}>
                  <li>
                    <b>Login data:</b> username, encrypted password, email
                    address
                  </li>
                  <li>
                    <b>Content data:</b> uploaded files (CSV data)
                  </li>
                </ul>
              </Typography>
              <Typography>
                <b>Registration</b>
                <br />
                To use OpenLAP, registration with personal data is required
                (email address, encrypted password). Processing is based on Art.
                6 (1)(e) GDPR. Data is not shared with third parties.
              </Typography>
              <Typography>
                <b>Data Deletion</b>
                <br />
                <ul style={{ margin: 0 }}>
                  <li>
                    If a user is inactive for one year, they receive a
                    notification email. If they don’t log in within 14 days, a
                    second email follows, warning of account deletion within 7
                    days. Without action, the account and all data are
                    permanently deleted.
                  </li>
                  <li>
                    Users may request account deletion or data correction
                    anytime via E-mail
                    <Link
                      component="button"
                      underline="hover"
                      onClick={() => {
                        window.location.href = "mailto:ralf.berger@uni-due.de";
                      }}
                    >
                      ralf.berger@uni-due.de
                    </Link>
                    .
                  </li>
                </ul>
              </Typography>
              <Typography>
                <b>(2)</b> Local and session storage
                <br />
                OpenLAP uses local and session (small text files stored on your
                computer):
                <br />
                <ul style={{ margin: 0 }}>
                  <li>
                    <b>Local storage</b> (required to maintain user session
                    across pages)
                  </li>
                  <li>
                    <b>Session storage</b> (required for storing draft indicator
                    data)
                  </li>
                </ul>
                Legal basis: <b>Art. 6 (1)(e) GDPR.</b>
                <br />
                Data is not shared with third parties. If cookies are disabled,
                some OpenLAP features may not function.
              </Typography>
              <Typography>
                <b>(3)</b> User Rights under GDPR
                <br />
                As a data subject, you have the following rights:
                <ul style={{ margin: 0 }}>
                  <li>
                    <b>Access</b> to your personal data (Art. 15 GDPR)
                  </li>
                  <li>
                    <b>Correction</b> (Art. 16 GDPR)
                  </li>
                  <li>
                    <b>Deletion</b> (Art. 17 GDPR)
                  </li>
                  <li>
                    <b>Restriction of processing</b> (Art. 18 GDPR)
                  </li>
                  <li>
                    <b>Objection</b> (Art. 21 GDPR)
                  </li>
                  <li>
                    <b>Data portability</b> (Art. 20 GDPR)
                  </li>
                  <li>
                    <b>No automated decision-making</b> with legal or
                    significant effects (Art. 22 GDPR)
                  </li>
                </ul>
              </Typography>
              <Divider />
              <Typography variant="h5">Supervisory Authority</Typography>
              <Typography>
                You have the right to lodge a complaint with the responsible
                supervisory authority:
              </Typography>
              <Typography>
                <b>
                  State Commissioner for Data Protection and Freedom of
                  Information of North Rhine-Westphalia
                </b>
                <br />
                Kavalleriestr. 2-4
                <br />
                40213 Düsseldorf
                <br />
                Website:{" "}
                <Link
                  component="button"
                  underline="hover"
                  onClick={() => window.open("https://www.ldi.nrw.de/")}
                >
                  https://www.ldi.nrw.de/
                </Link>
              </Typography>
            </Stack>
          </Grid>
        </Grid>
      </Box>
    </>
  );
};

export default PrivacyPolicy;
