import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Edit2, Trash2 } from "lucide-react";
import type { Task } from "@/lib/mockData";
import { Button } from "../ui/button";

interface TaskCardProps {
  task: Task;
}

export function TaskCard({ task }: TaskCardProps) {
  const getPriorityBadgeVariant = (priority: Task['priority']) => {
    switch (priority) {
      case 'High': return 'destructive';
      case 'Medium': return 'secondary';
      case 'Low': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <Card className="mb-3 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing">
      <CardHeader className="p-4">
        <CardTitle className="text-base font-medium">{task.title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-3">
        {task.description && (
          <p className="text-sm text-muted-foreground">{task.description}</p>
        )}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center">
            <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
            <span>{new Date(task.dueDate).toLocaleDateString()}</span>
          </div>
          <Badge variant={getPriorityBadgeVariant(task.priority)}>{task.priority}</Badge>
        </div>
        <div className="flex items-center justify-between">
           <div className="flex items-center">
            <Avatar className="h-7 w-7 mr-2">
              <AvatarImage src={task.assignee.avatarUrl || `https://picsum.photos/seed/${task.assignee.name}/40/40`} data-ai-hint={task.assignee.dataAiHint || "person avatar"}/>
              <AvatarFallback>{task.assignee.name.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{task.assignee.name}</span>
          </div>
          <div className="flex space-x-1">
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
