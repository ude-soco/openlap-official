import React, { useContext } from "react";
import {
  Accordion,
  AccordionActions,
  AccordionDetails,
  AccordionSummary,
  Button,
  Chip,
  Grid,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DeleteDialog from "../../../common/components/delete-dialog/delete-dialog.jsx";
import { requestDeleteLrsConsumer } from "../utils/account-manager-api.js";
import { AuthContext } from "../../../setup/auth-context-manager/auth-context-manager.jsx";

const ManageLrsConsumerList = ({ state, setState }) => {
  const { api } = useContext(AuthContext);
  const handleToggleDelete = (lrsConsumerId = "") => {
    setState((prevState) => ({
      ...prevState,
      deleteLrsConsumerDialog: {
        ...prevState.deleteLrsConsumerDialog,
        open: !prevState.deleteLrsConsumerDialog.open,
        lrsConsumerId: lrsConsumerId,
      },
    }));
  };

  const handleDeleteLrs = async () => {
    try {
      await requestDeleteLrsConsumer(
        api,
        state.deleteLrsConsumerDialog.lrsConsumerId
      ).then(() => {
        setState((prevState) => ({
          ...prevState,
          addLRSConsumerDialog: {
            ...prevState.addLRSConsumerDialog,
            lrsConsumerUpdated: true,
          },
        }));
      });
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <>
      {state.user.lrsConsumerList?.map((lrs, index) => (
        <Grid item xs={12} key={lrs.id}>
          <Accordion variant="outlined">
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls="panel1-content"
              id="panel1-header"
            >
              #{index + 1} {lrs.lrsTitle}
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Grid container spacing={1} alignItems="center">
                    <Grid item>
                      <Typography>LRS:</Typography>
                    </Grid>
                    <Grid item>
                      <Chip label={lrs.lrsTitle} />
                    </Grid>
                  </Grid>
                </Grid>
                <Grid item xs={12}>
                  <Grid container spacing={1} alignItems="center">
                    <Grid item>
                      <Typography>Unique Identifier:</Typography>
                    </Grid>
                    <Grid item>
                      <Chip label={lrs.uniqueIdentifier} />
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </AccordionDetails>
            <AccordionActions>
              <Button color="error" onClick={() => handleToggleDelete(lrs.id)}>
                Delete
              </Button>
            </AccordionActions>
          </Accordion>
        </Grid>
      ))}
      <DeleteDialog
        open={state.deleteLrsConsumerDialog.open}
        toggleOpen={handleToggleDelete}
        message="This will delete the LRS permanently. You cannot undo this action."
        handleDelete={handleDeleteLrs}
      />
    </>
  );
};

export default ManageLrsConsumerList;
