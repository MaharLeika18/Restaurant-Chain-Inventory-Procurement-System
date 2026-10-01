import * as React from 'react';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext.jsx';

export default function AccountMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  if (!user) return null;

  const initial = (user.username || '?').charAt(0).toUpperCase();

  const handleLogout = () => {
    setAnchorEl(null);
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <>
      <Tooltip title={user.username}>
        <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)} aria-label="Account menu">
          <Avatar sx={{ width: 32, height: 32, fontSize: 14 }}>{initial}</Avatar>
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)} onClick={() => setAnchorEl(null)}>
        <MenuItem disabled sx={{ opacity: '1 !important' }}>
          <ListItemText
            primary={user.username}
            secondary={user.role?.charAt(0) + user.role?.slice(1).toLowerCase()}
          />
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutRoundedIcon fontSize="small" />
          </ListItemIcon>
          <Typography variant="body2">Log out</Typography>
        </MenuItem>
      </Menu>
    </>
  );
}
