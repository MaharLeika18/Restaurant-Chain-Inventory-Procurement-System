import * as React from 'react';
import MuiAvatar from '@mui/material/Avatar';
import MuiListItemAvatar from '@mui/material/ListItemAvatar';
import MenuItem from '@mui/material/MenuItem';
import ListItemText from '@mui/material/ListItemText';
import Select, { SelectChangeEvent, selectClasses } from '@mui/material/Select';
import { styled } from '@mui/material/styles';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import { useBranch } from '../../context/BranchContext';

const Avatar = styled(MuiAvatar)(({ theme }) => ({
  width: 28,
  height: 28,
  backgroundColor: (theme.vars || theme).palette.background.paper,
  color: (theme.vars || theme).palette.text.secondary,
  border: `1px solid ${(theme.vars || theme).palette.divider}`,
}));

const ListItemAvatar = styled(MuiListItemAvatar)({
  minWidth: 0,
  marginRight: 12,
});

export default function SelectContent() {
  const { branches, branchId, setBranchId, loading } = useBranch();

  const handleChange = (event: SelectChangeEvent) => {
    setBranchId(Number(event.target.value));
  };

  return (
    <Select
      labelId="branch-select"
      id="branch-simple-select"
      value={branchId != null ? String(branchId) : ''}
      onChange={handleChange}
      displayEmpty
      disabled={loading || branches.length === 0}
      inputProps={{ 'aria-label': 'Select branch' }}
      fullWidth
      sx={{
        maxHeight: 56,
        width: 215,
        '&.MuiList-root': {
          p: '8px',
        },
        [`& .${selectClasses.select}`]: {
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          pl: 1,
        },
      }}
    >
      {branches.length === 0 && (
        <MenuItem value="" disabled>
          <ListItemText primary={loading ? 'Loading branches…' : 'No branches yet'} />
        </MenuItem>
      )}
      {branches.map((branch) => (
        <MenuItem key={branch.branch_id} value={String(branch.branch_id)}>
          <ListItemAvatar>
            <Avatar alt={branch.branch_name}>
              <StorefrontRoundedIcon sx={{ fontSize: '1rem' }} />
            </Avatar>
          </ListItemAvatar>
          <ListItemText primary={branch.branch_name} secondary={branch.address ?? undefined} />
        </MenuItem>
      ))}
    </Select>
  );
}
