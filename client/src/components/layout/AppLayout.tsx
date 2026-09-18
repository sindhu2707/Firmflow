import { useState } from 'react';
import { Outlet, Link, NavLink, useLocation } from 'react-router';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { useLogout } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { CommandPalette  } from '@/components/ui/CommandPalette';
import { LayoutDashboard, Users, User, CreditCard, Menu, ChevronsLeft, X, Package } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['org_owner', 'employee', 'customer'] },
  { to: '/team', label: 'Team', icon: Users, roles: ['org_owner', 'employee'] },
  { to: '/billing', label: 'Billing', icon: CreditCard, roles: ['org_owner', 'employee'] },
  {to: '/products', label: 'Products', icon: Package, roles: ['org_owner','employee']},
  { to: '/profile', label: 'Profile', icon: User, roles: ['org_owner', 'employee', 'customer', 'super_admin'] },
];

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/team': 'Team',
  '/billing': 'Billing',
  '/billing/plans': 'Plans & Pricing',
  '/products': 'Products',
  '/profile': 'Profile',
};

export function AppLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleItems = NAV_ITEMS.filter((item) => user && item.roles.includes(user.role));
  const pageTitle = PAGE_TITLES[location.pathname] ?? 'FirmFlow';

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 72 : 240 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="hidden flex-col border-r border-border bg-card md:flex"
      >
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <Link to="/dashboard" className="flex items-center gap-2 overflow-hidden">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
              F
            </span>
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="whitespace-nowrap text-lg font-bold text-foreground"
                >
                  FirmFlow
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        </div>

        <LayoutGroup>
          <nav className="flex-1 space-y-1 p-3">
            {visibleItems.map((item) => {
              const isActive = location.pathname.startsWith(item.to);
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className="relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {isActive && (
                    <motion.span
                      layoutId="active-nav-pill"
                      className="absolute inset-0 rounded-md bg-primary/10 ring-1 ring-inset ring-primary/20"
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    />
                  )}
                  <item.icon
                    size={18}
                    strokeWidth={2}
                    className={`relative shrink-0 ${isActive ? 'text-primary' : ''}`}
                  />
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={`relative whitespace-nowrap ${isActive ? 'text-foreground' : ''}`}
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </NavLink>
              );
            })}
          </nav>
        </LayoutGroup>

        <div className="border-t border-border p-3">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="mb-2 flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs text-muted-foreground hover:bg-muted"
          >
            <motion.span animate={{ rotate: collapsed ? 180 : 0 }}>
              <ChevronsLeft size={16} />
            </motion.span>
            {!collapsed && 'Collapse'}
          </button>

          {user && !collapsed && (
            <div className="mb-2 text-sm">
              <p className="font-medium text-foreground">{user.name}</p>
              <p className="capitalize text-muted-foreground">{user.role.replace('_', ' ')}</p>
            </div>
          )}

          <Button
            variant="secondary"
            className="w-full"
            onClick={() => logout.mutate()}
            isLoading={logout.isPending}
          >
            {collapsed ? '↩' : 'Log out'}
          </Button>
        </div>
      </motion.aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40 md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card md:hidden"
            >
              <div className="flex h-14 items-center justify-between border-b border-border px-4">
                <Link
                  to="/dashboard"
                  className="flex items-center gap-2"
                  onClick={() => setMobileOpen(false)}
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
                    F
                  </span>
                  <span className="text-lg font-bold text-foreground">FirmFlow</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-md p-2 text-muted-foreground hover:bg-muted"
                  aria-label="Close menu"
                >
                  <X size={18} />
                </button>
              </div>

              <nav className="flex-1 space-y-1 p-3">
                {visibleItems.map((item) => {
                  const isActive = location.pathname.startsWith(item.to);
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-primary/10 text-primary ring-1 ring-inset ring-primary/20'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <item.icon size={18} strokeWidth={2} className="shrink-0" />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </nav>

              <div className="border-t border-border p-3">
                {user && (
                  <div className="mb-2 text-sm">
                    <p className="font-medium text-foreground">{user.name}</p>
                    <p className="capitalize text-muted-foreground">{user.role.replace('_', ' ')}</p>
                  </div>
                )}
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => {
                    setMobileOpen(false);
                    logout.mutate();
                  }}
                  isLoading={logout.isPending}
                >
                  Log out
                </Button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main section */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-md p-2 text-muted-foreground hover:bg-muted md:hidden"
              aria-label="Open menu"
            >
              <Menu size={18} />
            </button>
            <h1 className="text-sm font-semibold text-foreground">{pageTitle}</h1>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <kbd className="hidden items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:flex">
              ⌘K
            </kbd>
            {user && (
              <>
                <div className="h-6 w-px bg-border" />
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-medium text-foreground">{user.name}</p>
                  <p className="text-xs capitalize text-muted-foreground">
                    {user.role.replace('_', ' ')}
                  </p>
                </div>
              </>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}