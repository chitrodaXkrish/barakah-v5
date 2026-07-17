import { Menu, Bell, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LanguageSelector } from '@/components/LanguageSelector';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface TopHeaderProps {
  onMenuClick: () => void;
  title?: string;
  rightContent?: ReactNode;
  onSearchClick?: () => void;
  showSearch?: boolean;
  className?: string;
  titleClassName?: string;
  titleStyle?: React.CSSProperties;
  buttonClassName?: string;
  leftAlignTitle?: boolean;
}

export const TopHeader = ({ onMenuClick, title, rightContent, onSearchClick, showSearch, className, titleClassName, titleStyle, buttonClassName, leftAlignTitle }: TopHeaderProps) => {
  return (
    <header className={cn("relative z-20 px-5 py-4 flex items-center font-arabic", leftAlignTitle ? "justify-start gap-3" : "justify-between", className)}>
      <Button 
        variant="ghost" 
        size="icon" 
        className={cn("hover:bg-primary/10 hover:text-primary rounded-xl h-10 w-10 border border-transparent hover:border-primary/25 transition-all duration-300", buttonClassName || "text-foreground")}
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" strokeWidth={1.5} />
      </Button>
      
      {title && (
        <h1 className={cn("text-xl font-semibold tracking-tight", titleClassName || "text-foreground")} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", ...titleStyle }}>
          {title}
        </h1>
      )}
      
      {leftAlignTitle && <div className="flex-1" />}
      
      <div className="flex items-center gap-2">
        {rightContent ? rightContent : (
          <>
            <LanguageSelector />
            {showSearch ? (
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn("hover:bg-primary/10 hover:text-primary rounded-xl h-10 w-10 border border-transparent hover:border-primary/25 transition-all duration-300", buttonClassName || "text-foreground")}
                onClick={onSearchClick}
              >
                <Search className="h-5 w-5" strokeWidth={1.5} />
              </Button>
            ) : (
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn("hover:bg-primary/10 hover:text-primary rounded-xl h-10 w-10 border border-transparent hover:border-primary/25 transition-all duration-300", buttonClassName || "text-foreground")}
              >
                <Bell className="h-5 w-5" strokeWidth={1.5} />
              </Button>
            )}
          </>
        )}
      </div>
    </header>
  );
};
