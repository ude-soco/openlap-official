import React, { useContext } from "react";
import { AuthContext } from "../../../setup/auth-context-manager/auth-context-manager.jsx";
import { requestDeleteLRSProvider } from "../utils/account-manager-api.js";
import {
  Accordion,
  AccordionActions,
  AccordionDetails,
  AccordionSummary,
  Button,
  Chip,
  Grid,
  IconButton,
  Typography,
} from "@mui/material";
import DeleteDialog from "../../../common/components/delete-dialog/delete-dialog.jsx";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { ContentCopy, Edit } from "@mui/icons-material";
import { useSnackbar } from "notistack";

const ManageLrsProviderList = ({ state, setState }) => {
  const { api } = useContext(AuthContext);
  const { enqueueSnackbar } = useSnackbar();

  const handleToggleDelete = (lrsId = "") => {
    setState((prevState) => ({
      ...prevState,
      deleteLrsProviderDialog: {
        ...prevState.deleteLrsProviderDialog,
        open: !prevState.deleteLrsProviderDialog.open,
        lrsProviderId: lrsId,
      },
    }));
  };

  const handleDeleteLrs = async () => {
    try {
      await requestDeleteLRSProvider(
        api,
        state.deleteLrsProviderDialog.lrsProviderId,
      ).then((response) => {
        setState((prevState) => ({
          ...prevState,
          addLRSProviderDialog: {
            ...prevState.addLRSProviderDialog,
            lrsProviderUpdated: true,
          },
        }));
      });
    } catch (error) {
      console.log(error);
    }
  };

  const handleCopyBasicAuth = (basicAuth) => {
    navigator.clipboard
      .writeText(basicAuth)
      .then(() => setCopiedCode(!copiedCode));
    enqueueSnackbar("Basic auth copied", { variant: "success" });
  };

  return (
    <>
      {state.user.lrsProviderList?.map((lrs, index) => {
        const { lrsId, lrsTitle, statementCount, createdAt, basicAuth } = lrs;
        return (
          <Grid item xs={12} key={lrsId}>
            <Accordion variant="outlined">
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls="panel1-content"
                id="panel1-header"
              >
                #{index + 1} {lrsTitle}
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Grid container spacing={1} alignItems="center">
                      <Grid item>
                        <Typography>LRS:</Typography>
                      </Grid>
                      <Grid item>
                        <Chip label={lrsTitle} />
                      </Grid>
                      {/*<Grid item>*/}
                      {/*  <IconButton size="small">*/}
                      {/*    <Edit />*/}
                      {/*  </IconButton>*/}
                      {/*</Grid>*/}
                    </Grid>
                  </Grid>
                  <Grid item xs={12}>
                    <Grid container spacing={1} alignItems="center">
                      <Grid item>
                        <Typography>#Statements:</Typography>
                      </Grid>
                      <Grid item>
                        <Chip label={statementCount} />
                      </Grid>
                    </Grid>
                  </Grid>
                  <Grid item xs={12}>
                    <Grid container spacing={1} alignItems="center">
                      <Grid item>
                        <Typography>Created at:</Typography>
                      </Grid>
                      <Grid item>
                        <Chip label={createdAt} />
                      </Grid>
                    </Grid>
                  </Grid>
                  <Grid item xs={12}>
                    <Grid container spacing={1}>
                      <Grid item>
                        <Typography>Basic Auth: </Typography>
                      </Grid>
                      <Grid item xs style={{ wordBreak: "break-all" }}>
                        <Typography>{basicAuth}</Typography>
                      </Grid>
                      <Grid item>
                        <IconButton
                          size="small"
                          onClick={() => handleCopyBasicAuth(basicAuth)}
                        >
                          <ContentCopy />
                        </IconButton>
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>
              </AccordionDetails>
              <AccordionActions>
                <Button color="error" onClick={() => handleToggleDelete(lrsId)}>
                  Delete
                </Button>
                <DeleteDialog
                  open={
                    state.deleteLrsProviderDialog.open &&
                    state.deleteLrsProviderDialog.lrsProviderId === lrsId
                  }
                  toggleOpen={handleToggleDelete}
                  message={
                    <>
                      <Typography>
                        {`This will delete the LRS permanently. ${statementCount > 0 ? `There are ${statementCount} statements.` : ""} You cannot undo this action.`}
                      </Typography>
                    </>
                  }
                  handleDelete={handleDeleteLrs}
                />
              </AccordionActions>
            </Accordion>
          </Grid>
        );
      })}
    </>
  );
};
export default ManageLrsProviderList;
