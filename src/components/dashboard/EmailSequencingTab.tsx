import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Settings, BarChart2, PlayCircle } from "lucide-react";

export function EmailSequencingTab() {
  // Placeholder data for sequences
  const sequences = [
    { id: 'seq1', name: 'New Lead Welcome Sequence', status: 'Active', leads: 120, openRate: '65%', clickRate: '22%' },
    { id: 'seq2', name: 'Post-Demo Follow-Up', status: 'Paused', leads: 45, openRate: '72%', clickRate: '30%' },
    { id: 'seq3', name: 'Long-Term Nurturing', status: 'Draft', leads: 0, openRate: 'N/A', clickRate: 'N/A' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold tracking-tight">Email Sequencing</h2>
        <Button>
          <Mail className="mr-2 h-4 w-4" /> Create New Sequence
        </Button>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sequences.map((seq) => (
          <Card key={seq.id} className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg">{seq.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status:</span>
                <span className={`font-medium ${seq.status === 'Active' ? 'text-green-600' : seq.status === 'Paused' ? 'text-yellow-600' : 'text-gray-500'}`}>
                  {seq.status}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Active Leads:</span>
                <span>{seq.leads}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Open Rate:</span>
                <span>{seq.openRate}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Click Rate:</span>
                <span>{seq.clickRate}</span>
              </div>
            </CardContent>
            <CardContent className="border-t pt-4 flex space-x-2">
              <Button variant="outline" size="sm" className="flex-1">
                <BarChart2 className="mr-2 h-4 w-4" /> View Analytics
              </Button>
              <Button variant="outline" size="sm" className="flex-1">
                <Settings className="mr-2 h-4 w-4" /> Edit Sequence
              </Button>
               <Button variant="ghost" size="icon" className={seq.status === 'Active' ? "text-yellow-600" : "text-green-600"}>
                <PlayCircle className="h-5 w-5" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6 bg-secondary/50">
        <CardHeader>
          <CardTitle className="text-xl">AI-Powered Content Generation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Leverage GenAI to create highly personalized email content for your sequences. 
            Our AI analyzes lead interactions and behavior to craft messages that resonate.
          </p>
          <Button variant="accent">
            Try AI Content Generation
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
