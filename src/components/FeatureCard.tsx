import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  className?: string;
  onClick?: () => void;
  children?: ReactNode;
}

export const FeatureCard = ({ 
  icon: Icon, 
  title, 
  subtitle, 
  className, 
  onClick, 
  children 
}: FeatureCardProps) => {
  return (
    <Card 
      className={cn(
        "bg-sage text-primary-foreground p-4 rounded-2xl cursor-pointer transition-all hover:shadow-sage",
        className
      )}
      onClick={onClick}
    >
      <div className="flex flex-col items-center text-center space-y-2">
        <Icon className="h-8 w-8" />
        <div>
          <h3 className="font-semibold text-sm">{title}</h3>
          {subtitle && (
            <p className="text-xs opacity-90">{subtitle}</p>
          )}
        </div>
        {children}
      </div>
    </Card>
  );
};