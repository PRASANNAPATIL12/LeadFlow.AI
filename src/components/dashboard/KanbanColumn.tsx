import { TaskCard } from "./TaskCard";
import type { Task } from "@/lib/mockData";

interface KanbanColumnProps {
  title: Task['status'];
  tasks: Task[];
}

export function KanbanColumn({ title, tasks }: KanbanColumnProps) {
  return (
    <div className="flex flex-col w-full md:w-72 lg:w-80 bg-muted/50 rounded-lg p-3 shadow">
      <h3 className="text-lg font-semibold mb-4 px-1 text-foreground">{title} <span className="text-sm text-muted-foreground">({tasks.length})</span></h3>
      <div className="flex-grow space-y-3 overflow-y-auto min-h-[200px]">
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No tasks in this stage.</p>
        ) : (
          tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))
        )}
      </div>
    </div>
  );
}
