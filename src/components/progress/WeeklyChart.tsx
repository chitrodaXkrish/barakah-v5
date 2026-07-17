import { Card } from '@/components/ui/card';

interface DayData {
  date: string;
  dayName: string;
  completed: number;
  total: number;
}

interface WeeklyChartProps {
  data: DayData[];
}

export const WeeklyChart = ({ data }: WeeklyChartProps) => {
  const maxHeight = 56;

  return (
    <Card className="p-5">
      <h3 className="text-sm font-medium text-muted-foreground mb-5">Last 7 Days</h3>
      <div className="flex items-end justify-between gap-2">
        {data.map((day, index) => {
          const height = day.total > 0 ? (day.completed / day.total) * maxHeight : 0;
          const isToday = index === data.length - 1;
          const isComplete = day.completed === day.total && day.completed > 0;

          return (
            <div key={day.date} className="flex flex-col items-center gap-2 flex-1">
              <div
                className="relative w-full flex flex-col items-center"
                style={{ height: maxHeight }}
              >
                {/* Background bar */}
                <div
                  className="absolute bottom-0 w-full rounded-lg bg-muted/60"
                  style={{ height: maxHeight }}
                />
                {/* Progress bar */}
                <div
                  className={`absolute bottom-0 w-full rounded-lg transition-all duration-500 ease-out ${
                    isComplete 
                      ? 'bg-primary shadow-sm' 
                      : day.completed > 0 
                        ? 'bg-primary/50' 
                        : 'bg-muted'
                  }`}
                  style={{ height: Math.max(height, 4) }}
                />
                {/* Completed count */}
                <span className={`absolute -top-5 text-xs font-semibold ${
                  isComplete ? 'text-primary' : 'text-muted-foreground'
                }`}>
                  {day.completed}
                </span>
              </div>
              <span
                className={`text-xs transition-colors duration-200 ${
                  isToday 
                    ? 'font-semibold text-primary' 
                    : 'text-muted-foreground'
                }`}
              >
                {day.dayName}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-center gap-5 mt-5 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-md bg-primary" />
          <span>Complete</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-md bg-primary/50" />
          <span>Partial</span>
        </div>
      </div>
    </Card>
  );
};