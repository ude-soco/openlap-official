import { useContext, useState } from "react";
import { AuthContext } from "../../../setup/auth-context-manager/auth-context-manager";
import {
  requestDeleteLRSProvider,
  requestDeleteLRSStatements,
  requestUpdateLRS,
} from "../utils/account-manager-api.js";
import {
  Accordion,
  AccordionActions,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  IconButton,
  Grid,
  Stack,
  Typography,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  Select,
  MenuItem,
} from "@mui/material";
import DeleteDialog from "../../../common/components/delete-dialog/delete-dialog";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useSnackbar } from "notistack";
import UniqueIdentifierTypes from "../utils/enums/unique-identifier-types.js";

const ManageLrsProviderList = ({ state, setState }) => {
  const { api } = useContext(AuthContext);
  const { enqueueSnackbar } = useSnackbar();
  const [deleteLRS, setDeleteLRS] = useState({
    lrs: { lrsId: "" },
    open: false,
    openStatements: false,
  });
  const [editLRS, setEditLRS] = useState({
    lrs: { lrsId: "", lrsTitle: "", uniqueIdentifierType: "" },
    newTitle: "",
    newType: "",
    open: false,
    openType: false,
    loading: false,
  });

  const handleOpenDeleteLrs = (lrs) => {
    setDeleteLRS((p) => ({ ...p, lrs: lrs, open: true }));
  };

  const handleOpenDeleteLrsStatements = (lrs) => {
    setDeleteLRS((p) => ({ ...p, lrs: lrs, openStatements: true }));
  };

  const handleCloseDeleteLrs = () => {
    setDeleteLRS((p) => ({ ...p, lrs: { lrsId: "" }, open: false }));
  };

  const handleCloseDeleteLrsStatements = () => {
    setDeleteLRS((p) => ({ ...p, lrs: { lrsId: "" }, openStatements: false }));
  };

  const handleOpenEditLrs = (lrs) => {
    setEditLRS((p) => ({
      ...p,
      lrs: lrs,
      newTitle: lrs.lrsTitle,
      newType: lrs.uniqueIdentifierType,
      open: true,
    }));
  };

  const handleOpenEditLrsType = (lrs) => {
    setEditLRS((p) => ({
      ...p,
      lrs: lrs,
      newTitle: lrs.lrsTitle,
      newType: lrs.uniqueIdentifierType,
      openType: true,
    }));
  };

  const handleChangeTitle = (event) => {
    const newTitle = event.target.value;
    setEditLRS((p) => ({ ...p, newTitle }));
  };

  const handleChangeUniqueIdentifierType = (event) => {
    const newType = event.target.value;
    setEditLRS((p) => ({ ...p, newType }));
  };

  const handleCloseEditLrs = () => {
    setEditLRS((p) => ({
      ...p,
      lrs: { lrsId: "", lrsTitle: "", uniqueIdentifierType: "" },
      newTitle: "",
      newType: "",
      open: false,
    }));
  };

  const handleCloseEditLrsType = () => {
    setEditLRS((p) => ({
      ...p,
      lrs: { lrsId: "", lrsTitle: "", uniqueIdentifierType: "" },
      newTitle: "",
      newType: "",
      openType: false,
    }));
  };

  const handleDeleteLrs = async () => {
    try {
      await requestDeleteLRSProvider(api, deleteLRS.lrs.lrsId);
      setState((p) => ({
        ...p,
        addLRSProviderDialog: {
          ...p.addLRSProviderDialog,
          lrsProviderUpdated: true,
        },
      }));
    } catch (error) {
      console.log(error);
    }
  };

  const handleDeleteLrsStatements = async () => {
    try {
      await requestDeleteLRSStatements(api, deleteLRS.lrs.lrsId);
      setState((p) => ({
        ...p,
        addLRSProviderDialog: {
          ...p.addLRSProviderDialog,
          lrsProviderUpdated: true,
        },
      }));
    } catch (error) {
      console.log(error);
    }
  };

  const handleEditLrs = async () => {
    try {
      setEditLRS((p) => ({ ...p, loading: true }));
      await requestUpdateLRS(
        api,
        editLRS.lrs.lrsId,
        editLRS.newTitle,
        editLRS.newType
      );

      setState((p) => ({
        ...p,
        addLRSProviderDialog: {
          ...p.addLRSProviderDialog,
          lrsProviderUpdated: true,
        },
      }));
      setEditLRS((p) => ({
        ...p,
        lrs: { lrsId: "", lrsTitle: "", uniqueIdentifierType: "" },
        newTitle: "",
        newType: "",
        open: false,
        openType: false,
      }));
    } catch (error) {
      console.log(error);
    } finally {
      setEditLRS((p) => ({ ...p, loading: false }));
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
      <Stack spacing={2}>
        {state.user.lrsProviderList?.map((lrs, index) => {
          return (
            <Accordion variant="outlined" key={lrs.lrsId}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>
                  #{index + 1} {lrs.lrsTitle}
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container direction="column" spacing={2}>
                  <Grid container spacing={1} alignItems="center">
                    <Typography>LRS name:</Typography>
                    <Chip label={lrs.lrsTitle} />
                    <Tooltip title="Change LRS name" arrow>
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleOpenEditLrs(lrs)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                  </Grid>
                  <Grid container spacing={1} alignItems="center">
                    <Typography>Unique Identifier:</Typography>
                    <Chip
                      label={Object.keys(UniqueIdentifierTypes).find(
                        (item) =>
                          UniqueIdentifierTypes[item] ===
                          lrs.uniqueIdentifierType
                      )}
                    />
                    <Tooltip title="Change Unique Identifier" arrow>
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleOpenEditLrsType(lrs)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                  </Grid>
                  <Grid container spacing={1} alignItems="center">
                    <Typography>#Statements:</Typography>
                    <Chip label={lrs.statementCount} />
                    {lrs.statementCount > 0 && (
                      <Tooltip title="Delete all statements" arrow>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleOpenDeleteLrsStatements(lrs)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Grid>
                  <Grid container spacing={1} alignItems="center">
                    <Typography>Created at:</Typography>
                    <Chip label={lrs.createdAt} />
                  </Grid>
                  <Grid container spacing={1} alignItems="flex-start">
                    <Typography>Basic Auth: </Typography>
                    <Tooltip title="Copy basic auth" arrow>
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleCopyBasicAuth(lrs.basicAuth)}
                      >
                        <ContentCopyIcon />
                      </IconButton>
                    </Tooltip>
                    <Grid size="grow">
                      <Typography sx={{ wordBreak: "break-all" }}>
                        {lrs.basicAuth}
                      </Typography>
                    </Grid>
                  </Grid>
                </Grid>
              </AccordionDetails>
              <AccordionActions>
                <Button color="error" onClick={() => handleOpenDeleteLrs(lrs)}>
                  Delete LRS
                </Button>
              </AccordionActions>
            </Accordion>
          );
        })}
        <DeleteDialog
          open={deleteLRS.open}
          toggleOpen={handleCloseDeleteLrs}
          message={
            <>
              <Typography>
                {`This will delete the LRS permanently. ${
                  deleteLRS.lrs.statementCount > 0
                    ? `There are ${deleteLRS.lrs.statementCount} statements.`
                    : ""
                } You will not be able undo this action. Please confirm.`}
              </Typography>
            </>
          }
          handleDelete={handleDeleteLrs}
        />
        <DeleteDialog
          open={deleteLRS.openStatements}
          toggleOpen={handleCloseDeleteLrsStatements}
          message={
            <>
              <Typography>
                There are <b>{deleteLRS.lrs.statementCount}</b> statements.
                <br />
                This will delete all the statements in this LRS permanently.
                <br />
                You will not be able undo this action. <br />
                <br />
                Please confirm.
              </Typography>
            </>
          }
          handleDelete={handleDeleteLrsStatements}
        />
        <Dialog open={editLRS.open} fullWidth maxWidth="sm">
          <DialogTitle>Edit LRS name</DialogTitle>
          <DialogContent>
            <Stack gap={2}>
              <Typography color="textSecondary" sx={{fontStyle: "italic"}}>
                Current LRS name: {editLRS.lrs.lrsTitle}
              </Typography>
              <TextField
                fullWidth
                value={editLRS.newTitle}
                onChange={handleChangeTitle}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button fullWidth onClick={handleCloseEditLrs}>
              Cancel
            </Button>
            <Button
              autoFocus
              loading={editLRS.loading}
              loadingPosition="start"
              loadingIndicator="Please wait..."
              variant="contained"
              disabled={editLRS.lrs.lrsTitle === editLRS.newTitle}
              fullWidth
              onClick={handleEditLrs}
            >
              Update
            </Button>
          </DialogActions>
        </Dialog>
        <Dialog open={editLRS.openType} fullWidth maxWidth="sm">
          <DialogTitle>Change Unique Identifier</DialogTitle>
          <DialogContent>
            <Stack gap={1}>
              <Typography color="textSecondary" sx={{ fontStyle: "italic" }}>
                <b>Important:</b> Changing the unique identifier now can cause
                the following issues:
                <ul>
                  <li>
                    Existing users of this LRS will not be able use the data to
                    preview their existing indicators
                  </li>
                  <li>
                    Existing users need to update their unique identifier
                    manually
                  </li>
                </ul>
                Therefore, please proceed with caution!
              </Typography>
              <Select
                fullWidth
                variant="outlined"
                name="uniqueIdentifierType"
                value={editLRS.newType}
                onChange={handleChangeUniqueIdentifierType}
              >
                {Object.entries(UniqueIdentifierTypes).map(([key, value]) => {
                  return (
                    <MenuItem key={key} value={value}>
                      {key}
                    </MenuItem>
                  );
                })}
              </Select>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button fullWidth onClick={handleCloseEditLrsType}>
              Cancel
            </Button>
            <Button
              autoFocus
              loading={editLRS.loading}
              loadingPosition="start"
              loadingIndicator="Please wait..."
              variant="contained"
              fullWidth
              disabled={editLRS.lrs.uniqueIdentifierType === editLRS.newType}
              onClick={handleEditLrs}
            >
              Update
            </Button>
          </DialogActions>
        </Dialog>
      </Stack>
    </>
  );
};
export default ManageLrsProviderList;
