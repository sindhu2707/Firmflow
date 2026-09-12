import { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Users, User, Sun, Moon, Monitor, LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { useLogout } from '@/hooks/useAuth';
import { useTeam } from '@/hooks/useTeam';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const setTheme = useThemeStore((s) => s.setTheme);
  const logout = useLogout();
  const canSeeTeam = user?.role === 'org_owner' || user?.role === 'employee';
  const { data: teamData } = useTeam(canSeeTeam);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const go = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ duration: 0.15 }}
            className="fixed left-1/2 top-24 z-50 w-full max-w-lg -translate-x-1/2 overflow-hidden rounded-lg border border-border bg-card shadow-lg"
          >
            <Command
              className="[&_[cmdk-input]]:h-12 [&_[cmdk-input]]:w-full [&_[cmdk-input]]:border-b [&_[cmdk-input]]:border-border [&_[cmdk-input]]:bg-transparent [&_[cmdk-input]]:px-4 [&_[cmdk-input]]:text-sm [&_[cmdk-input]]:text-foreground [&_[cmdk-input]]:outline-none [&_[cmdk-input]]:placeholder:text-muted-foreground"
            >
              <Command.Input placeholder="Type a command or search…" autoFocus />
              <Command.List className="max-h-80 overflow-y-auto p-2">
                <Command.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No results found.
                </Command.Empty>

                <Command.Group heading="Navigate" className="text-xs font-medium text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
                  <Command.Item
                    onSelect={() => go('/dashboard')}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground data-[selected=true]:bg-muted"
                  >
                    <LayoutDashboard size={16} /> Dashboard
                  </Command.Item>
                  {canSeeTeam && (
                    <Command.Item
                      onSelect={() => go('/team')}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground data-[selected=true]:bg-muted"
                    >
                      <Users size={16} /> Team
                    </Command.Item>
                  )}
                  <Command.Item
                    onSelect={() => go('/profile')}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground data-[selected=true]:bg-muted"
                  >
                    <User size={16} /> Profile
                  </Command.Item>
                </Command.Group>

                                {canSeeTeam && teamData?.users && teamData.users.length > 0 && (
                  <Command.Group heading="Team" className="text-xs font-medium text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
                    {teamData.users.map((member) => (
                      <Command.Item
                        key={member.id}
                        value={`${member.name} ${member.email}`}
                        onSelect={() => go('/team')}
                        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground data-[selected=true]:bg-muted"
                      >
                        <User size={16} />
                        <span className="flex-1 truncate">{member.name}</span>
                        <span className="text-xs capitalize text-muted-foreground">
                          {member.role.replace('_', ' ')}
                        </span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                <Command.Group heading="Theme" className="text-xs font-medium text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
                  <Command.Item onSelect={() => { setTheme('light'); setOpen(false); }} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground data-[selected=true]:bg-muted">
                    <Sun size={16} /> Light
                  </Command.Item>
                  <Command.Item onSelect={() => { setTheme('dark'); setOpen(false); }} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground data-[selected=true]:bg-muted">
                    <Moon size={16} /> Dark
                  </Command.Item>
                  <Command.Item onSelect={() => { setTheme('system'); setOpen(false); }} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground data-[selected=true]:bg-muted">
                    <Monitor size={16} /> System
                  </Command.Item>
                </Command.Group>

                <Command.Group heading="Account" className="text-xs font-medium text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
                  <Command.Item
                    onSelect={() => { logout.mutate(); setOpen(false); }}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-destructive data-[selected=true]:bg-muted"
                  >
                    <LogOut size={16} /> Log out
                  </Command.Item>
                </Command.Group>
              </Command.List>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}