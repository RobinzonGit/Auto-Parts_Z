import { useMemo, useState } from 'react';
import { useLocation, NavLink as RouterNavLink } from 'react-router-dom';
import {
  AppBar,
  Avatar,
  Box,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Snackbar,
  Alert,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import Brightness4OutlinedIcon from '@mui/icons-material/Brightness4Outlined';
import Brightness7OutlinedIcon from '@mui/icons-material/Brightness7Outlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import MenuOutlinedIcon from '@mui/icons-material/MenuOutlined';
import { Outlet, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';
import { useThemeMode } from '@/hooks/useThemeMode';
import { useUiStore } from '@/store/uiStore';
import { ROLE_LABELS } from '@/utils/labels';
import { WebSearchButton } from '@/components/web-search/WebSearchButton';

const DRAWER_WIDTH = 264;

interface NavItem {
  label: string;
  to: string;
  icon: ReactNode;
  /** Раздел виден только этим ролям (undefined — всем). */
  allowRoles?: Array<'user' | 'moderator' | 'admin'>;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Каталог запчастей', to: '/catalog', icon: <Inventory2OutlinedIcon /> },
  { label: 'Мои запросы', to: '/my-requests', icon: <ReceiptLongOutlinedIcon /> },
  { label: 'Профиль', to: '/profile', icon: <PersonOutlineOutlinedIcon /> },
];

const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: 'Пользователи', to: '/admin/users', icon: <PeopleAltOutlinedIcon />, allowRoles: ['admin'] },
  { label: 'Запросы', to: '/admin/requests', icon: <FactCheckOutlinedIcon />, allowRoles: ['moderator', 'admin'] },
  { label: 'Запчасти', to: '/admin/components', icon: <CategoryOutlinedIcon />, allowRoles: ['moderator', 'admin'] },
];

/** Каркас приложения: AppBar, боковое меню с фильтром по ролям, снекбар. */
export function AppLayout() {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const { user, isAdmin, isStaff, role } = useAuth();
  const { mode, toggleMode } = useThemeMode();
  const logout = useAuthStore((s) => s.logout);
  const snackbar = useUiStore((s) => s.snackbar);
  const hideSnackbar = useUiStore((s) => s.hideSnackbar);
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const visibleAdminItems = useMemo(
    () => ADMIN_NAV_ITEMS.filter((item) => !item.allowRoles || (role !== null && item.allowRoles.includes(role))),
    [role],
  );

  const isActive = (to: string): boolean => location.pathname === to || location.pathname.startsWith(`${to}/`);

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar sx={{ px: 2 }}>
        <Typography variant="h6" fontWeight={700} noWrap>
          Auto Parts
        </Typography>
      </Toolbar>
      <Divider />
      <List sx={{ px: 1, flexGrow: 1 }}>
        {NAV_ITEMS.map((item) => (
          <ListItemButton
            key={item.to}
            component={RouterNavLink}
            to={item.to}
            selected={isActive(item.to)}
            onClick={() => setMobileOpen(false)}
            sx={{ borderRadius: 2, mb: 0.5 }}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
        {isStaff && visibleAdminItems.length > 0 && <Divider sx={{ my: 1 }} />}
        {isStaff &&
          visibleAdminItems.map((item) => (
            <ListItemButton
              key={item.to}
              component={RouterNavLink}
              to={item.to}
              selected={isActive(item.to)}
              onClick={() => setMobileOpen(false)}
              sx={{ borderRadius: 2, mb: 0.5 }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
      </List>
      <Box sx={{ p: 2 }}>
        {user && <Chip size="small" label={ROLE_LABELS[user.role]} color={isAdmin ? 'primary' : 'secondary'} />}
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
          Auto Parts MVP · v1.0.0
        </Typography>
      </Box>
    </Box>
  );

  const handleLogout = async (): Promise<void> => {
    setMenuAnchor(null);
    await logout();
    navigate('/login');
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar position="fixed" elevation={0} sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar>
          {!isDesktop && (
            <IconButton edge="start" onClick={() => setMobileOpen(true)} sx={{ mr: 1 }} aria-label="Открыть меню">
              <MenuOutlinedIcon />
            </IconButton>
          )}
          <Typography variant="h6" fontWeight={700} noWrap>
            Auto Parts — Склад автозапчастей
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          {isAdmin && <WebSearchButton />}
          <Tooltip title={mode === 'light' ? 'Тёмная тема' : 'Светлая тема'}>
            <IconButton onClick={toggleMode} color="inherit" aria-label="Переключить тему">
              {mode === 'light' ? <Brightness4OutlinedIcon /> : <Brightness7OutlinedIcon />}
            </IconButton>
          </Tooltip>
          {user && (
            <Tooltip title={user.name}>
              <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)} color="inherit" aria-label="Меню пользователя">
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main', fontSize: 14 }}>
                  {user.name.charAt(0).toUpperCase()}
                </Avatar>
              </IconButton>
            </Tooltip>
          )}
        </Toolbar>
      </AppBar>

      <Drawer
        variant={isDesktop ? 'permanent' : 'temporary'}
        open={isDesktop ? true : mobileOpen}
        onClose={() => setMobileOpen(false)}
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
        }}
      >
        {drawerContent}
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 3 }, width: { md: `calc(100% - ${DRAWER_WIDTH}px)` } }}>
        <Toolbar />
        <Outlet />
      </Box>

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            navigate('/profile');
          }}
        >
          Профиль
        </MenuItem>
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            navigate('/my-requests');
          }}
        >
          Мои запросы
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutOutlinedIcon fontSize="small" />
          </ListItemIcon>
          Выйти
        </MenuItem>
      </Menu>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={hideSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={hideSnackbar} severity={snackbar.severity} variant="filled" sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
