import { Card } from "@/components/ui/card";
import { Newspaper, ExternalLink, Sparkles, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface NewsItem {
  id: string;
  title: string;
  source_name: string;
  article_url: string;
}

export const IslamicNewsCard = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("news_articles")
        .select("id, title, source_name, article_url")
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(3);
      if (active && data) setItems(data as NewsItem[]);
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <Card className="relative overflow-hidden glass-dark p-5 shine-effect">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-0 right-0 w-32 h-32 bg-[radial-gradient(circle_at_top_right,hsl(17_70%_45%/0.08),transparent_60%)] pointer-events-none" />
      
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/8 border border-primary/20 shadow-[0_0_12px_-3px_hsl(17_70%_45%/0.25)]">
            <Newspaper className="h-4 w-4 text-primary" strokeWidth={1.5} />
          </div>
          <h2 className="text-sm font-bold text-brown-gradient flex items-center gap-2">
            Islamic World News
            <Sparkles className="h-3 w-3 text-primary/60" />
          </h2>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No news yet. Check back soon.
          </p>
        ) : (
          <div className="space-y-3">
            {items.map((news) => (
              <button
                key={news.id}
                type="button"
                onClick={() => navigate(`/news/${news.id}`)}
                className="group w-full text-left flex items-start gap-3 p-3 rounded-xl bg-gradient-to-r from-secondary/60 to-secondary/40 border border-border/50 hover:border-primary/30 hover:from-secondary/80 hover:to-secondary/60 transition-all duration-300 cursor-pointer hover:shadow-[0_0_15px_-5px_hsl(17_70%_45%/0.12)]"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-snug line-clamp-2 text-foreground group-hover:text-brown-gradient transition-all duration-300">
                    {news.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{news.source_name}</p>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5 group-hover:text-primary group-hover:scale-110 transition-all duration-300" strokeWidth={1.5} />
              </button>
            ))}
          </div>
        )}
        
        <button
          onClick={() => navigate("/news")}
          className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-primary/12 to-primary/8 border border-primary/20 hover:from-primary/20 hover:to-primary/12 hover:border-primary/35 hover:shadow-[0_0_15px_-5px_hsl(17_70%_45%/0.25)] transition-all duration-300 text-xs font-bold uppercase tracking-wider text-primary"
        >
          View All News
        </button>
      </div>
    </Card>
  );
};
