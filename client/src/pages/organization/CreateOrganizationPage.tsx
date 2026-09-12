import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';
import { useCreateOrganization } from '@/hooks/useOrganization';
import type { AxiosError } from 'axios';
import type { ApiErrorPayload } from '@/types';

const orgSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters'),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, and hyphens only'),
});

type OrgFormValues = z.infer<typeof orgSchema>;

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function CreateOrganizationPage() {
  const createOrg = useCreateOrganization();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<OrgFormValues>({ resolver: zodResolver(orgSchema) });

  const onSubmit = (values: OrgFormValues) => createOrg.mutate(values);
  const apiError = createOrg.error as AxiosError<ApiErrorPayload> | null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">
          Set up your organization
        </h1>
        <p className="mb-6 text-sm text-gray-500">
          You'll be the owner of this organization.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <TextField
            label="Organization name"
            error={errors.name?.message}
            {...register('name', {
              onChange: (e) => setValue('slug', slugify(e.target.value)),
            })}
          />
          <TextField
            label="URL slug"
            error={errors.slug?.message}
            {...register('slug')}
          />

          {apiError && (
            <p className="text-sm text-red-500">
              {apiError.response?.data?.message ?? 'Could not create organization.'}
            </p>
          )}

          <Button type="submit" isLoading={createOrg.isPending} className="mt-2">
            Create organization
          </Button>
        </form>
      </div>
    </div>
  );
}
