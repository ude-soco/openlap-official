import { useContext, useState } from "react";
import PropTypes from "prop-types";
import { AuthContext } from "../../../setup/auth-context-manager/auth-context-manager";
import {
  requestDeleteLRSProvider,
  requestDeleteLRSStatements,
  requestUpdateLRS,
} from "../utils/account-manager-api.js";
import {
  Button,
  IconButton,
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
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditIcon from "@mui/icons-material/Edit";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import StorageIcon from "@mui/icons-material/Storage";
import DeleteDialog from "../../../common/components/delete-dialog/delete-dialog";
import ResourceCard from "../../../common/components/resource-card/resource-card.jsx";
import MetadataChip from "../../../common/components/metadata-chip/metadata-chip.jsx";
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
    navigator.clipboard.writeText(basicAuth);
    enqueueSnackbar("Basic auth copied", { variant: "success" });
  };

  return (
    <>
      <Stack spacing={2}>
        {state.user.lrsProviderList?.map((lrs, index) => {
          const identifierLabel = Object.keys(UniqueIdentifierTypes).find(
            (item) => UniqueIdentifierTypes[item] === lrs.uniqueIdentifierType
          );
          return (
            <ResourceCard
              key={lrs.lrsId}
              index={index + 1}
              title={lrs.lrsTitle}
              icon={StorageIcon}
              actions={
                <Stack direction="row" spacing={0.5}>
                  <Tooltip title="Change LRS name" arrow>
                    <IconButton
                      color="primary"
                      aria-label={`Edit name of LRS ${lrs.lrsTitle}`}
                      onClick={() => handleOpenEditLrs(lrs)}
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete LRS" arrow>
                    <IconButton
                      color="error"
                      aria-label={`Delete LRS ${lrs.lrsTitle}`}
                      onClick={() => handleOpenDeleteLrs(lrs)}
                    >
                      <DeleteOutlineIcon />
                    </IconButton>
                  </Tooltip>
                </Stack>
              }
            >
              <Stack spacing={1.25}>
                <MetadataChip
                  label="Unique identifier"
                  value={identifierLabel}
                  action={
                    <Tooltip title="Change unique identifier" arrow>
                      <IconButton
                        size="small"
                        color="primary"
                        aria-label="Change unique identifier"
                        onClick={() => handleOpenEditLrsType(lrs)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  }
                />
                <MetadataChip
                  label="Statements"
                  value={lrs.statementCount}
                  action={
                    lrs.statementCount > 0 ? (
                      <Tooltip title="Delete all statements" arrow>
                        <IconButton
                          size="small"
                          color="error"
                          aria-label="Delete all statements"
                          onClick={() => handleOpenDeleteLrsStatements(lrs)}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : null
                  }
                />
                <MetadataChip label="Created at" value={lrs.createdAt} />
                <Stack spacing={0.5}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    gap={1}
                    flexWrap="wrap"
                  >
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ minWidth: { xs: "auto", sm: 150 } }}
                    >
                      Basic auth
                    </Typography>
                    <Tooltip title="Copy basic auth" arrow>
                      <IconButton
                        size="small"
                        color="primary"
                        aria-label="Copy basic auth"
                        onClick={() => handleCopyBasicAuth(lrs.basicAuth)}
                      >
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                  <Typography
                    variant="body2"
                    sx={{
                      wordBreak: "break-all",
                      fontFamily: "monospace",
                      color: "text.secondary",
                    }}
                  >
                    {lrs.basicAuth}
                  </Typography>
                </Stack>
              </Stack>
            </ResourceCard>
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
              <Typography color="textSecondary" sx={{ fontStyle: "italic" }}>
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

ManageLrsProviderList.propTypes = {
  state: PropTypes.object.isRequired,
  setState: PropTypes.func.isRequired,
};

export default ManageLrsProviderList;
