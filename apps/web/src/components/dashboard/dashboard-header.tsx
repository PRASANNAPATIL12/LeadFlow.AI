import { Button } from "@/components/ui/button";

export function DashboardHeader() {
  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor your leads and sales performance in real-time.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button>Import Leads</Button>
        <Button variant="outline">Export Data</Button>
      </div>
    </div>
  );
}
