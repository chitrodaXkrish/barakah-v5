import { Card } from "@/components/ui/card";
import { Heart } from "lucide-react";

export const DailyDuaCard = () => {
  return (
    <Card className="relative overflow-hidden glass-dark px-5 py-5 shine-effect">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-24 h-24 bg-[radial-gradient(circle_at_top_left,hsl(17_70%_45%/0.08),transparent_60%)] pointer-events-none" />
      
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-bold text-brown-gradient">Daily Dua</h2>
          <Heart className="h-3.5 w-3.5 text-primary/60" strokeWidth={1.5} />
        </div>
        <p className="text-sm text-foreground leading-relaxed italic">
          "O Allah, I ask You for beneficial knowledge, good provision, and
          acceptable deeds."
        </p>
        <div className="mt-4 flex gap-2">
          <span className="rounded-xl bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/25 px-4 py-1.5 text-xs font-bold text-primary shadow-[0_0_10px_-3px_hsl(17_70%_45%/0.2)]">
            Arabic
          </span>
          <span className="rounded-xl bg-secondary/60 border border-border/50 px-4 py-1.5 text-xs text-muted-foreground hover:border-primary/25 hover:text-foreground transition-colors duration-300 cursor-pointer">
            English
          </span>
        </div>
      </div>
    </Card>
  );
};
