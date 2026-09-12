import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export function ProfilePage() {
  const { data, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    values: data ? { name: data.user.name } : undefined,
  });

  const onSubmit = (values: ProfileFormValues) => updateProfile.mutate(values);
  //const apiError = updateProfile.error as AxiosError<ApiErrorPayload> | null;

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading profile…</p>;
  }

  return (
    <div className="max-w-md">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Your profile</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <TextField
          label="Name"
          error={errors.name?.message}
          {...register('name')}
        />
        <TextField label="Email" value={data?.user.email} disabled />
        <TextField label="Role" value={data?.user.role} disabled className="capitalize" />

        <Button type="submit" isLoading={updateProfile.isPending} className="mt-2">
          Save changes
        </Button>
      </form>
    </div>
  );
}