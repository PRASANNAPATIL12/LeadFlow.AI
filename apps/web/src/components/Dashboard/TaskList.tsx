import React, { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Clock, User, Calendar as CalendarIcon, AlertCircle } from 'lucide-react'; // Renamed Calendar import to avoid conflict
import { format } from 'date-fns';
import { api } from '@/lib/api';

interface Task {
  id: string;
  title: string;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
  type: 'followup' | 'meeting' | 'call' | 'email';
  leadId: string;
  leadName: string;
  completed: boolean;
}

interface TaskListProps {
  tasks: Task[]; // Accept tasks as a prop
}

export function TaskList({ tasks: initialTasks = [] }: TaskListProps) { // Use prop or default to empty array
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [isLoading, setIsLoading] = useState(false); // Initially not loading if using props/mock
  const [filter, setFilter] = useState('all'); // all, today, overdue, completed

  // Update tasks state if the prop changes
  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  // Remove fetchTasks or modify it to accept props or fetch if needed
  // useEffect(() => {
  //  fetchTasks();
  // }, [filter]);

  // const fetchTasks = async () => {
  //  setIsLoading(true);
  //  try {
  //   const response = await api.get('/tasks', {
  //    params: { filter }
  //   });
  //   setTasks(response.data);
  //  } catch (error) {
  //   console.error('Error fetching tasks:', error);
  //  } finally {
  //   setIsLoading(false);
  //  }
  // };

  // Remove mock task generation or keep for standalone testing
  // useEffect(() => {
  //  const mockTasks: Task[] = [
  //   {
  //    id: '1',
  //    title: 'Follow up on proposal',
  //    dueDate: new Date().toISOString(),
  //    priority: 'high',
  //    type: 'followup',
  //    leadId: '101',
  //    leadName: 'Acme Corp',
  //    completed: false
  //   },
  //   {
  //    id: '2',
  //    title: 'Send product information',
  //    dueDate: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString(),
  //    priority: 'medium',
  //    type: 'email',
  //    leadId: '102',
  //    leadName: 'Globex Inc',
  //    completed: false
  //   },
  //   {
  //    id: '3',
  //    title: 'Schedule demo meeting',
  //    dueDate: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(),
  //    priority: 'high',
  //    type: 'meeting',
  //    leadId: '103',
  //    leadName: 'Initech LLC',
  //    completed: false
  //   },
  //   {
  //    id: '4',
  //    title: 'Check follow-up from last call',
  //    dueDate: new Date(new Date().setDate(new Date().getDate() + 3)).toISOString(),
  //    priority: 'low',
  //    type: 'call',
  //    leadId: '104',
  //    leadName: 'Hooli',
  //    completed: true
  //   }
  //  ];
  //  
  //  setTasks(mockTasks);
  //  setIsLoading(false);
  // }, []);

  const toggleTaskCompletion = async (taskId: string) => {
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
      const originalTasks = [...tasks]; // Keep original state for potential revert
      const updatedTasks = [...tasks];
      updatedTasks[taskIndex] = { ...updatedTasks[taskIndex], completed: !updatedTasks[taskIndex].completed };
      setTasks(updatedTasks);
      
      try {
        // In a real app, this would update the task in the backend
        // await api.patch(`/tasks/${taskId}`, { completed: updatedTasks[taskIndex].completed });
        console.log(`Task ${taskId} completion toggled to: ${updatedTasks[taskIndex].completed}`);
      } catch (error) {
        console.error('Error updating task:', error);
        // Revert the change if the update fails
        setTasks(originalTasks);
      }
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'followup': return <Clock className="h-4 w-4" />;
      case 'meeting': return <CalendarIcon className="h-4 w-4" />;
      case 'call': return <User className="h-4 w-4" />;
      case 'email': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const isDueToday = (date: string) => {
    const today = new Date();
    const dueDate = new Date(date);
    return (
      dueDate.getDate() === today.getDate() &&
      dueDate.getMonth() === today.getMonth() &&
      dueDate.getFullYear() === today.getFullYear()
    );
  };

  const isOverdue = (date: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(date);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today;
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'completed') return task.completed;
    if (filter === 'today') return !task.completed && isDueToday(task.dueDate);
    if (filter === 'overdue') return !task.completed && isOverdue(task.dueDate);
    return !task.completed; // Default to 'all' (meaning all non-completed)
  });

  return (
    <div className="space-y-4">
      <div className="flex space-x-2">
        <Button 
          variant={filter === 'all' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setFilter('all')}
        >
          All Pending
        </Button>
        <Button 
          variant={filter === 'today' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setFilter('today')}
        >
          Today
        </Button>
        <Button 
          variant={filter === 'overdue' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setFilter('overdue')}
        >
          Overdue
        </Button>
        <Button 
          variant={filter === 'completed' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setFilter('completed')}
        >
          Completed
        </Button>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center p-4">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTasks.length === 0 ? (
            <div className="text-center p-4 text-muted-foreground">
              No tasks found for this filter
            </div>
          ) : (
            filteredTasks.map((task) => (
              <div key={task.id} className="flex items-center space-x-4 p-3 bg-card rounded-lg border">
                <Checkbox 
                  checked={task.completed} 
                  onCheckedChange={() => toggleTaskCompletion(task.id)}
                  aria-label={`Mark task ${task.title} as complete`}
                />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className={`font-medium ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                      {task.title}
                    </p>
                    <Badge
                      className={`${getPriorityColor(task.priority)}`}
                    >
                      {task.priority}
                    </Badge>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground space-x-4">
                    <div className="flex items-center space-x-1">
                      <User className="h-3 w-3" />
                      <span>{task.leadName}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <CalendarIcon className="h-3 w-3" />
                      <span className={isOverdue(task.dueDate) && !task.completed ? 'text-red-500 font-semibold' : ''}>
                        {isDueToday(task.dueDate) ? 'Today' : format(new Date(task.dueDate), 'MMM d')}
                        {isOverdue(task.dueDate) && !task.completed ? ' (Overdue)' : ''}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      {getTypeIcon(task.type)}
                      <span>{task.type}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
