import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';
import { useChangePassword } from '@/hooks/useAuth';

const schema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});
type FormValues = z.infer<typeof schema>;

export function ChangePasswordPage() {
  const changePassword = useChangePassword();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = (values: FormValues) => changePassword.mutate(values.newPassword);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="w-full max-w-sm rounded-lg border border-border bg-card p-8 shadow-sm"
      >
        <h1 className="mb-2 text-2xl font-bold text-foreground">Set a new password</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Your account was created with a temporary password. Choose a new one to continue.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <TextField
            label="New password"
            type="password"
            error={errors.newPassword?.message}
            {...register('newPassword')}
          />
          <Button type="submit" isLoading={changePassword.isPending} className="mt-2">
            Continue
          </Button>
        </form>
      </motion.div>
    </div>
  );
}