import { ReactNode, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { BottomNavigation } from './BottomNavigation';
import { TopHeader } from './TopHeader';
import { SideMenu } from './SideMenu';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: ReactNode;
  showNavigation?: boolean;
  showHeader?: boolean;
  headerTitle?: string;
  headerRight?: ReactNode;
  onSearchClick?: () => void;
  showSearch?: boolean;
  headerClassName?: string;
  headerTitleClassName?: string;
  headerTitleStyle?: React.CSSProperties;
  headerButtonClassName?: string;
  leftAlignHeaderTitle?: boolean;
}

export const Layout = ({ children, showNavigation = true, showHeader = true, headerTitle, headerRight, onSearchClick, showSearch, headerClassName, headerTitleClassName, headerTitleStyle, headerButtonClassName, leftAlignHeaderTitle }: LayoutProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const location = useLocation();

  // Trigger page transition animation on route change
  useEffect(() => {
    setIsTransitioning(true);
    const timer = setTimeout(() => setIsTransitioning(false), 300);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  const handleMenuClick = () => {
    setIsMenuOpen(true);
  };

  const handleMenuClose = () => {
    setIsMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto relative overflow-hidden font-arabic">
      {/* Background with warm brown tint */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Dark brown-tinted base */}
        <div 
          className="absolute inset-0"
          style={{ 
            background: 'linear-gradient(180deg, rgba(45, 25, 15, 1) 0%, rgba(25, 15, 10, 1) 50%, rgba(15, 10, 8, 1) 100%)' 
          }}
        />
        
        {/* Warm brown overlay for the tint */}
        <div 
          className="absolute inset-0"
          style={{ 
            background: 'rgba(139, 90, 43, 0.08)' 
          }}
        />
        
        {/* Subtle lighter glow at top center */}
        <div 
          className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[50%]"
          style={{ 
            background: 'radial-gradient(ellipse at top, rgba(163, 82, 51, 0.15) 0%, transparent 70%)' 
          }}
        />
      </div>
      
      {showHeader && <TopHeader onMenuClick={handleMenuClick} title={headerTitle} rightContent={headerRight} onSearchClick={onSearchClick} showSearch={showSearch} className={headerClassName} titleClassName={headerTitleClassName} titleStyle={headerTitleStyle} buttonClassName={headerButtonClassName} leftAlignTitle={leftAlignHeaderTitle} />}
      
      <main className={cn(
        "flex-1 relative z-10",
        showNavigation && "pb-24",
        isTransitioning && "animate-fade-in"
      )}>
        {children}
      </main>
      
      {showNavigation && <BottomNavigation />}
      
      {/* Side Menu */}
      <SideMenu isOpen={isMenuOpen} onClose={handleMenuClose} />
    </div>
  );
};
