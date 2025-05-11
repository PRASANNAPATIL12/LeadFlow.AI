import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Zap, BarChart2, Mail, ListChecks } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-secondary/30 p-4">
      <header className="absolute top-0 left-0 right-0 p-6 flex justify-center">
        <div className="flex items-center space-x-2 text-primary">
          <Zap className="h-8 w-8" />
          <h1 className="text-3xl font-bold">LeadFlow AI</h1>
        </div>
      </header>

      <main className="text-center space-y-8">
        <h2 className="text-5xl md:text-6xl font-extrabold tracking-tight text-foreground">
          Supercharge Your B2B Sales
        </h2>
        <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
          Leverage Agentic AI to autonomously score leads, automate outreach, and close deals faster.
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto my-10">
          <FeatureCard icon={<BarChart2 className="h-8 w-8 text-accent" />} title="Intelligent Scoring" description="AI-powered lead qualification." />
          <FeatureCard icon={<Mail className="h-8 w-8 text-accent" />} title="Smart Sequencing" description="Automated, personalized email flows." />
          <FeatureCard icon={<ListChecks className="h-8 w-8 text-accent" />} title="Task Management" description="Organized sales activities." />
          <FeatureCard icon={<Zap className="h-8 w-8 text-accent" />} title="Real-Time Insights" description="Actionable sales dashboard." />
        </div>

        <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg transition-transform transform hover:scale-105">
          <Link href="/dashboard">
            Go to Dashboard
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </Button>
      </main>

      <footer className="absolute bottom-0 left-0 right-0 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} LeadFlow AI. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="flex flex-col items-center p-4 bg-card rounded-lg shadow-md border border-border hover:shadow-lg transition-shadow">
      {icon}
      <h3 className="mt-2 text-md font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground text-center">{description}</p>
    </div>
  );
}
