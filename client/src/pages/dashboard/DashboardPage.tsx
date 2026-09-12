import { useDashboard } from '@/hooks/useOrganization';
import { Card, CardContent } from '@/components/ui/Card';

export function DashboardPage() {
  const { data, isLoading, isError } = useDashboard();

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading dashboard…</p>;
  }

  if (isError || !data) {
    return <p className="text-sm text-destructive">Could not load dashboard.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{data.organization.name}</h1>
        <p className="text-sm text-muted-foreground">/{data.organization.slug}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Team members</p>
            <p className="mt-1 text-3xl font-bold text-foreground">
              {data.stats.memberCount}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}