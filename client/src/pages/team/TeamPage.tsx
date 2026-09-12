import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useTeam } from '@/hooks/useTeam';
import { usersApi, type InvitePayload } from '@/api/users';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';
import { getErrorMessage } from '@/lib/errors';
import type { TeamMember, TeamResponse } from '@/types';

const inviteSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['employee', 'customer']),
});

type InviteFormValues = z.infer<typeof inviteSchema>;

function useInviteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: InvitePayload) => usersApi.inviteUser(payload),

    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: ['team'] });
      const previous = queryClient.getQueryData<TeamResponse>(['team']);

      const optimisticMember: TeamMember = {
        id: `optimistic-${Date.now()}`,
        name: payload.name,
        email: payload.email,
        role: payload.role,
      };

      queryClient.setQueryData<TeamResponse>(['team'], (old) =>
        old ? { ...old, users: [...old.users, optimisticMember] } : old
      );

      return { previous, optimisticId: optimisticMember.id };
    },

    onError: (error, _payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['team'], context.previous);
      }
      toast.error(getErrorMessage(error, 'Could not invite user'));
    },

    onSuccess: (_data, payload) => {
      toast.success(`Invited ${payload.name}`);
    },

    onSettled: () => {
      // Reconcile with the server's real id/shape regardless of outcome
      queryClient.invalidateQueries({ queryKey: ['team'] });
    },
  });
}

export function TeamPage() {
  const { data, isLoading, isError } = useTeam();
  const inviteUser = useInviteUser();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      role: 'employee',
    },
  });

  const onSubmit = (values: InviteFormValues) =>
    inviteUser.mutate(values, {
      onSuccess: () => reset(),
    });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading team…</p>;
  }

  if (isError || !data) {
    return <p className="text-sm text-destructive">Could not load team members.</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Team list */}
      <div>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Team</h1>
          <span className="text-sm text-muted-foreground">
            {data.users.length} {data.users.length === 1 ? 'member' : 'members'}
          </span>
        </div>

        {data.users.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-12 text-center">
            <p className="text-sm font-medium text-foreground">No team members yet</p>
            <p className="text-sm text-muted-foreground">
              Invite your first teammate using the form below.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                    Role
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                <AnimatePresence initial={false}>
                  {data.users.map((member) => {
                    const isOptimistic = member.id.startsWith('optimistic-');
                    return (
                      <motion.tr
                        key={member.id}
                        initial={{ opacity: 0, backgroundColor: 'hsl(var(--primary) / 0.08)' }}
                        animate={{
                          opacity: isOptimistic ? 0.6 : 1,
                          backgroundColor: 'hsl(var(--primary) / 0)',
                        }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.35 }}
                        className="transition-colors hover:bg-muted/50"
                      >
                        <td className="px-4 py-3 text-sm text-foreground">{member.name}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{member.email}</td>
                        <td className="px-4 py-3 text-sm capitalize text-muted-foreground">
                          {member.role.replace('_', ' ')}
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invite form */}
      <div className="max-w-sm">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Invite a team member</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <TextField label="Name" error={errors.name?.message} {...register('name')} />
          <TextField label="Email" type="email" error={errors.email?.message} {...register('email')} />
          <TextField
            label="Temporary password"
            type="password"
            error={errors.password?.message}
            {...register('password')}
          />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-foreground">Role</label>
            <select
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none focus:ring-2 focus:ring-ring"
              {...register('role')}
            >
              <option value="employee">Employee</option>
              <option value="customer">Customer</option>
            </select>
          </div>

          <Button type="submit" isLoading={inviteUser.isPending} className="mt-2">
            Invite
          </Button>
        </form>
      </div>
    </div>
  );
}