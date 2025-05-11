"use client";

import { useState, useEffect } from 'react';
import { KanbanColumn } from "./KanbanColumn";
import { mockTasks, taskStatuses } from "@/lib/mockData";
import type { Task } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

export function TaskManagementTab() {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    // In a real app, you would fetch tasks from an API
    setTasks(mockTasks);
  }, []);

  // This is a placeholder for drag and drop functionality.
  // Actual implementation would require a library like react-beautiful-dnd or dnd-kit.
  const handleDragEnd = (result: any) => {
    console.log("Drag ended:", result);
    // Update task status and order based on drag result
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold tracking-tight">Task Management</h2>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Task
        </Button>
      </div>
      <div className="flex flex-col md:flex-row gap-4 overflow-x-auto pb-4">
        {taskStatuses.map((status) => (
          <KanbanColumn
            key={status}
            title={status}
            tasks={tasks.filter((task) => task.status === status)}
          />
        ))}
      </div>
    </div>
  );
}
