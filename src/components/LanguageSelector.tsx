import { useLanguage, Language } from '@/contexts/LanguageContext';
import { Globe } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

const languages: { code: Language; label: string; nativeLabel: string }[] = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'ur', label: 'Urdu', nativeLabel: 'اردو' },
  { code: 'ar', label: 'Arabic', nativeLabel: 'العربية' },
  { code: 'tr', label: 'Turkish', nativeLabel: 'Türkçe' },
  { code: 'id', label: 'Indonesian', nativeLabel: 'Bahasa Indonesia' },
  { code: 'ms', label: 'Malay', nativeLabel: 'Bahasa Melayu' },
  { code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்' },
  { code: 'bn', label: 'Bengali', nativeLabel: 'বাংলা' },
];

export const LanguageSelector = () => {
  const { language, setLanguage } = useLanguage();

  const currentLang = languages.find((l) => l.code === language);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 rounded-xl border-[#A35233]/25 text-[#A35233] hover:bg-[#FFF5E5] hover:text-[#A35233]"
          style={{ backgroundColor: 'rgba(163, 82, 51, 0.08)' }}
        >
          <Globe className="h-4 w-4" style={{ color: '#A35233' }} />
          <span className="text-sm font-medium" style={{ color: '#A35233' }}>{currentLang?.nativeLabel}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="center" 
        className="w-48 rounded-xl border border-[#E8D2A8] bg-[#FFF8F3] shadow-lg"
      >
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={`flex items-center justify-between px-4 py-3 cursor-pointer rounded-lg focus:bg-[#A35233]/10 focus:text-[#2C1309] hover:bg-[#A35233]/5 hover:text-[#2C1309] ${
              language === lang.code ? 'bg-[#A35233]/15 font-semibold' : ''
            }`}
            style={{ color: '#2C1309' }}
          >
            <span className="font-medium">{lang.nativeLabel}</span>
            <span className="text-xs opacity-70">{lang.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
