import barakahLogo from '@/assets/barakah-logo.png';

interface BarakahLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const BarakahLogo = ({ className = '', size = 'md' }: BarakahLogoProps) => {
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-24 h-24',
  };

  return (
    <div className={`${sizeClasses[size]} ${className} float`}>
      <img 
        src={barakahLogo} 
        alt="Barakah Logo" 
        className="w-full h-full object-contain drop-shadow-[0_0_15px_hsl(150_30%_50%/0.4)]"
      />
    </div>
  );
};
