import { useState, useEffect, useCallback, useRef } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  MessageCircle, Plus, Send, ArrowLeft, Loader2, Trash2, Heart, RefreshCw, 
  Sparkles, Users, TrendingUp, AtSign, Search, X, Bookmark, BookmarkCheck, Share2, User, ChevronRight, Pin, ImagePlus, Compass, Info, BookOpen, Check, Camera, Globe, Lock, ArrowRight, Flag,
  ThumbsUp, HandHeart, Lightbulb, Laugh
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

// Post categories (limited to mockup set)
const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'general', label: 'General' },
  { id: 'dua', label: 'Dua Requests' },
  { id: 'knowledge', label: 'Deen & Knowledge' },
];

// Daily duas collection
const DAILY_DUAS = [
  {
    arabic: 'اللَّهُمَّ أَنْتَ رَبِّي لاَ إِلَهَ إِلاَّ أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ',
    translation: 'O Allah, You are my Lord. There is no god but You. You created me and I am Your servant.',
  },
  {
    arabic: 'رَبِّ اغْفِرْ لِي وَلِوَالِدَيَّ وَلِلْمُؤْمِنِينَ يَوْمَ يَقُومُ الْحِسَابُ',
    translation: 'My Lord, forgive me and my parents and the believers on the Day the account is established.',
  },
  {
    arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا وَرِزْقًا طَيِّبًا وَعَمَلًا مُتَقَبَّلًا',
    translation: 'O Allah, I ask You for beneficial knowledge, good provision, and accepted deeds.',
  },
  {
    arabic: 'اللَّهُمَّ اجْعَلْنِي مِنَ التَّوَّابِينَ وَاجْعَلْنِي مِنَ الْمُتَطَهِّرِينَ',
    translation: 'O Allah, make me among those who repent and make me among those who purify themselves.',
  },
  {
    arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ عِلْمٍ لاَ يَنْفَعُ وَمِنْ قَلْبٍ لاَ يَخْشَعُ',
    translation: 'O Allah, I seek refuge in You from knowledge that does not benefit, and a heart that does not humble itself.',
  },
  {
    arabic: 'اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ',
    translation: 'O Allah, help me to remember You, to thank You, and to worship You in the best manner.',
  },
  {
    arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ سُبْحَانَ اللَّهِ الْعَظِيمِ',
    translation: 'Glory is to Allah and praise is to Him, glory is to Allah the Magnificent.',
  },
];

const getTodaysDua = () => {
  const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  return DAILY_DUAS[dayOfYear % DAILY_DUAS.length];
};

interface Reply {
  id: string;
  post_id: string;
  user_id: string;
  user_name: string;
  content: string;
  created_at: string;
}

interface Like {
  id: string;
  post_id: string;
  user_id: string;
  reaction_type?: ReactionType;
}

interface Post {
  id: string;
  user_id: string;
  user_name: string;
  content: string;
  created_at: string;
  category?: string;
  community?: string;
  image_url?: string;
  avatar_url?: string;
  replies?: Reply[];
  likes?: Like[];
  likeCount?: number;
  isLiked?: boolean;
  userReaction?: ReactionType | null;
}

const formatTimeAgo = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return `${Math.floor(diffDays / 7)}w ago`;
};

const GUFTAGU_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

type CachedPosts = {
  savedAt: number;
  posts: Post[];
};

const readCachedPosts = (key: string): Post[] | null => {
  try {
    const cached = JSON.parse(localStorage.getItem(key) || 'null') as CachedPosts | null;
    if (!cached || !Array.isArray(cached.posts) || Date.now() - cached.savedAt > GUFTAGU_CACHE_TTL_MS) {
      return null;
    }
    return cached.posts;
  } catch {
    return null;
  }
};

const writeCachedPosts = (key: string, posts: Post[]) => {
  try {
    localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), posts } satisfies CachedPosts));
  } catch {
    // Ignore storage quota and private-browsing failures; the network feed remains available.
  }
};

// Helper function to render content with @mentions highlighted
const renderContentWithMentions = (content: string) => {
  const mentionRegex = /@(\w+)/g;
  const parts = content.split(mentionRegex);
  
  return parts.map((part, index) => {
    if (index % 2 === 1) {
      return (
        <span key={index} className="text-primary font-semibold hover:underline cursor-pointer">
          @{part}
        </span>
      );
    }
    return part;
  });
};

const BROWN = '#7B3F1E';
const BROWN_LIGHT = '#A35233';
const BROWN_DARK = '#5C2E15';
const CREAM_BG = '#FFF5E5';
const CREAM_DEEP = '#F5E6D0';
const WARM_CARD = '#FFFFFF';
const SOFT_BORDER = 'rgba(123, 63, 30, 0.12)';
const OLIVE = '#7C7E2D';
const OLIVE_DARK = '#656823';

type ReactionType = 'like' | 'ameen' | 'love' | 'insightful' | 'laugh' | 'horrified';

const REACTIONS: Array<{
  type: ReactionType;
  label: string;
  color: string;
  bg: string;
  Icon?: typeof ThumbsUp;
  emoji?: string;
}> = [
  { type: 'like', label: 'Like', color: '#2F80ED', bg: '#EAF3FF', Icon: ThumbsUp },
  { type: 'ameen', label: 'Ameen', color: '#5C9D45', bg: '#EDF8E9', Icon: HandHeart },
  { type: 'love', label: 'Love', color: '#D9534F', bg: '#FFF0EE', Icon: Heart },
  { type: 'insightful', label: 'Insightful', color: '#D69B22', bg: '#FFF5D8', Icon: Lightbulb },
  { type: 'laugh', label: 'Laugh', color: '#1D9AAA', bg: '#E7FAFC', Icon: Laugh },
  { type: 'horrified', label: 'Horrified', color: '#7B61FF', bg: '#F1EEFF', emoji: '😱' },
];

const getReaction = (type?: ReactionType | null) =>
  REACTIONS.find((reaction) => reaction.type === type) || REACTIONS[0];

// Mock communities for the Explore tab
interface Community {
  id: string;
  name: string;
  members: string;
  type: string;
  description: string;
  banner: string;
  category: string;
  featured?: boolean;
  isAdmin?: boolean;
  iconUrl?: string;
}

const QURAN_BANNER = 'https://images.unsplash.com/photo-1609599006353-e629aaabfeae?w=900&h=560&fit=crop';
const KAABA_BANNER = 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=900&h=560&fit=crop';

const COMMUNITIES: Community[] = [
  {
    id: 'quran-meanings',
    name: 'Quran Meanings',
    members: '12.4k members',
    type: 'Private Group',
    description: 'A curated space for discussions on contemporary faith, art, and reflection.',
    banner: QURAN_BANNER,
    category: 'ummah',
    featured: true,
  },
  {
    id: 'sacred-journeys',
    name: 'Sacred Journeys',
    members: '8.7k members',
    type: 'Public Group',
    description: 'Stories, tips, and reflections from pilgrims around the world.',
    banner: KAABA_BANNER,
    category: 'heritage',
    featured: true,
  },
  { id: 'quranic-journaling-1', name: 'Quranic Journaling', members: '3.2k members', type: 'Private Group', description: 'Daily reflections on ayat.', banner: QURAN_BANNER, category: 'ummah' },
  { id: 'halal-living', name: 'Halal Living', members: '5.1k members', type: 'Public Group', description: 'Tips for a halal lifestyle.', banner: QURAN_BANNER, category: 'lifestyle' },
  { id: 'islamic-heritage', name: 'Islamic Heritage', members: '2.8k members', type: 'Public Group', description: 'Art, architecture, and history.', banner: QURAN_BANNER, category: 'heritage' },
  { id: 'youth-ummah', name: 'Youth Ummah', members: '6.4k members', type: 'Public Group', description: 'A space for young Muslims.', banner: QURAN_BANNER, category: 'ummah' },
];

const COMMUNITY_CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'ummah', label: 'Ummah' },
  { id: 'lifestyle', label: 'Lifestyle' },
  { id: 'heritage', label: 'Heritage' },
];

const CREATE_CATEGORIES = [
  { id: 'ummah', label: 'Ummah' },
  { id: 'lifestyle', label: 'Lifestyle' },
  { id: 'heritage', label: 'Heritage' },
  { id: 'knowledge', label: 'Deen & Knowledge' },
  { id: 'dua', label: 'Dua & Reflection' },
];

const REPORT_REASONS = [
  { id: 'harassment', label: 'Harassment or bullying' },
  { id: 'hate', label: 'Hate or abusive content' },
  { id: 'misinformation', label: 'Religious misinformation' },
  { id: 'spam', label: 'Spam or promotion' },
  { id: 'inappropriate', label: 'Inappropriate content' },
  { id: 'other', label: 'Other' },
];

// ---------- Community sub-components ----------
const CommunityHeroCard = ({
  community,
  joined,
  onToggle,
  onOpen,
}: {
  community: Community;
  joined: boolean;
  onToggle: (id: string) => void;
  onOpen?: (c: Community) => void;
}) => (
  <div
    className="shrink-0 w-[78%] rounded-2xl overflow-hidden cursor-pointer"
    style={{ background: '#FFFFFF', boxShadow: '0 1px 3px rgba(123, 63, 30, 0.06)' }}
    onClick={() => onOpen?.(community)}
  >
    <div className="w-full" style={{ aspectRatio: '16 / 10' }}>
      <img src={community.banner} alt={community.name} className="w-full h-full object-cover" />
    </div>
    <div className="p-4">
      <h3 className="text-lg font-bold leading-tight" style={{ color: BROWN_DARK }}>
        {community.name}
      </h3>
      <p className="text-xs mt-1" style={{ color: '#9C8569' }}>
        {community.members} · {community.type}
      </p>
      <p className="text-sm mt-3 leading-relaxed" style={{ color: '#5C4632' }}>
        {community.description}
      </p>
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(community.id); }}
        className="mt-4 w-full py-2.5 rounded-full text-sm font-semibold text-white transition-opacity"
        style={{ background: joined ? BROWN_DARK : BROWN, opacity: joined ? 0.85 : 1 }}
      >
        {joined ? 'Joined' : 'Join'}
      </button>
    </div>
  </div>
);

const renderCommunityIcon = (community: Community) => {
  const Icon = community.id.includes('halal')
    ? Check
    : community.id.includes('heritage')
      ? Globe
      : community.id.includes('youth')
        ? Users
        : community.id.includes('journey')
          ? Compass
          : BookOpen;

  return <Icon className="h-5 w-5" style={{ color: BROWN }} />;
};

const CommunityRow = ({
  community,
  joined,
  onToggle,
  onOpen,
}: {
  community: Community;
  joined: boolean;
  onToggle: (id: string) => void;
  onOpen?: (c: Community) => void;
}) => (
  <div
    className="flex items-center gap-3 p-3 rounded-2xl cursor-pointer"
    style={{ background: '#FFFFFF', boxShadow: '0 1px 3px rgba(123, 63, 30, 0.05)' }}
    onClick={() => onOpen?.(community)}
  >
    {community.iconUrl ? (
      <img
        src={community.iconUrl}
        alt={community.name}
        className="w-12 h-12 rounded-full object-cover shrink-0"
        style={{ border: '1.5px solid #E8D5C4' }}
      />
    ) : (
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
        style={{ background: '#F1E2C6', border: '1.5px solid #E8D5C4' }}
      >
        {renderCommunityIcon(community)}
      </div>
    )}
    <div className="flex-1 min-w-0">
      <p className="text-sm font-bold truncate" style={{ color: BROWN_DARK }}>
        {community.name}
      </p>
      <p className="text-xs mt-0.5" style={{ color: '#9C8569' }}>
        {community.members} · {community.type}
      </p>
    </div>
    {community.isAdmin ? (
      <span
        className="px-4 py-1.5 rounded-full text-[11px] font-bold tracking-wide text-white shrink-0"
        style={{ background: OLIVE }}
      >
        ADMIN
      </span>
    ) : (
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(community.id); }}
        className="px-5 py-1.5 rounded-full text-xs font-semibold shrink-0"
        style={
          joined
            ? { background: BROWN_DARK, color: '#FFFFFF', opacity: 0.85 }
            : { background: '#FFFFFF', color: BROWN_DARK, border: `1px solid ${SOFT_BORDER}` }
        }
      >
        {joined ? 'Joined' : 'Join'}
      </button>
    )}
  </div>
);

const ExploreView = ({
  joined,
  communities,
  category,
  setCategory,
  onToggle,
  onOpen,
}: {
  joined: Set<string>;
  communities: Community[];
  category: string;
  setCategory: (id: string) => void;
  onToggle: (id: string) => void;
  onOpen?: (c: Community) => void;
}) => {
  const featured = communities.filter((c) => c.featured);
  const rest = communities.filter((c) => !c.featured && (category === 'all' || c.category === category));

  return (
    <div className="-mx-4 px-4">
      {joined.size === 0 && (
        <div
          className="flex items-center gap-3 rounded-2xl px-4 py-3 mb-5"
          style={{ background: '#FBE6C8' }}
        >
          <Info className="h-4 w-4 shrink-0" style={{ color: BROWN }} />
          <p className="text-sm" style={{ color: BROWN_DARK }}>
            You haven't joined any communities yet.
          </p>
        </div>
      )}

      {communities.length === 0 ? (
        <div className="text-center py-16 rounded-2xl" style={{ background: '#FFFFFF' }}>
          <Users className="h-10 w-10 mx-auto mb-4" style={{ color: '#C4A98A' }} />
          <p className="font-medium" style={{ color: BROWN_DARK }}>
            No communities to explore yet
          </p>
          <p className="text-sm mt-1" style={{ color: '#9C8569' }}>
            New communities will appear here once they are available.
          </p>
        </div>
      ) : (
        <>
          {featured.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold" style={{ color: BROWN_DARK }}>
                  Top Picks
                </h2>
              </div>

              <div className="flex gap-3 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-hide mb-5">
                {featured.map((c) => (
                  <CommunityHeroCard
                    key={c.id}
                    community={c}
                    joined={joined.has(c.id)}
                    onToggle={onToggle}
                    onOpen={onOpen}
                  />
                ))}
              </div>
            </>
          )}

          <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
            {COMMUNITY_CATEGORIES.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setCategory(id)}
                className="px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border"
                style={
                  category === id
                    ? { background: BROWN, borderColor: 'transparent', color: '#FFFFFF' }
                    : { background: '#FFFFFF', borderColor: SOFT_BORDER, color: BROWN_DARK }
                }
              >
                {label}
              </button>
            ))}
          </div>

          <div className="space-y-3 pb-6">
            {rest.map((c) => (
              <CommunityRow key={c.id} community={c} joined={joined.has(c.id)} onToggle={onToggle} onOpen={onOpen} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const MyCommunitiesView = ({
  joined,
  communities,
  userCreated,
  onToggle,
  onExplore,
  onCreate,
  onOpen,
}: {
  joined: Set<string>;
  communities: Community[];
  userCreated: Community[];
  onToggle: (id: string) => void;
  onExplore: () => void;
  onCreate: () => void;
  onOpen?: (c: Community) => void;
}) => {
  const joinedList = communities.filter((c) => joined.has(c.id));
  const combined = [...userCreated, ...joinedList];

  return (
    <div className="relative min-h-[60vh]">
      {combined.length === 0 ? (
        <div className="text-center py-16 rounded-2xl" style={{ background: '#FFFFFF' }}>
          <Users className="h-10 w-10 mx-auto mb-4" style={{ color: '#C4A98A' }} />
          <p className="font-medium" style={{ color: BROWN_DARK }}>
            No communities yet
          </p>
          <p className="text-sm mt-1 mb-5" style={{ color: '#9C8569' }}>
            Discover groups that match your interests or start your own.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={onExplore}
              className="rounded-full px-5 py-2 text-sm font-semibold text-white"
              style={{ background: BROWN }}
            >
              Explore
            </button>
            <button
              onClick={onCreate}
              className="rounded-full px-5 py-2 text-sm font-semibold text-white"
              style={{ background: OLIVE }}
            >
              Create Community
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3 pb-28">
          {combined.map((c) => (
            <CommunityRow key={c.id} community={c} joined onToggle={onToggle} onOpen={onOpen} />
          ))}
        </div>
      )}

      <button
        onClick={onCreate}
        className="fixed bottom-24 right-4 z-30 flex items-center gap-2 pl-4 pr-5 py-3 rounded-full text-sm font-semibold text-white shadow-lg"
        style={{ background: OLIVE, boxShadow: '0 8px 20px rgba(124, 126, 45, 0.35)' }}
        aria-label="Create community"
      >
        <Plus className="h-5 w-5" strokeWidth={2.5} />
        Create Community
      </button>
    </div>
  );
};

// ---------- Create Community Dialog ----------
const CreateCommunityDialog = ({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate: (data: {
    name: string;
    description: string;
    category: string;
    privacy: 'public' | 'private';
    cover: string | null;
    icon: string | null;
  }) => void;
}) => {
  const [name, setName] = useState('');
  const { t } = useLanguage();
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'private'>('public');
  const [cover, setCover] = useState<string | null>(null);
  const [icon, setIcon] = useState<string | null>(null);

  const reset = () => {
    setName(''); setDescription(''); setCategory(''); setPrivacy('public'); setCover(null); setIcon(null);
  };

  const handleFile = (file: File | undefined, setter: (v: string) => void) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setter(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) { toast.error('Community name is required'); return; }
    if (!category) { toast.error('Please select a category'); return; }
    onCreate({
      name: trimmed.slice(0, 50),
      description: description.trim().slice(0, 200),
      category,
      privacy,
      cover,
      icon,
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent
        className="max-w-md p-0 overflow-hidden gap-0 max-h-[92vh] flex flex-col"
        style={{ background: CREAM_BG, border: `1px solid ${SOFT_BORDER}` }}
      >
        {/* Header */}
        <DialogHeader className="px-4 py-3 m-0 flex-row items-center gap-3 space-y-0" style={{ background: '#FFFFFF', borderBottom: `1px solid ${SOFT_BORDER}` }}>
          <button onClick={() => onOpenChange(false)} aria-label="Back" className="shrink-0">
            <ArrowLeft className="h-5 w-5" style={{ color: BROWN_DARK }} />
          </button>
          <DialogTitle className="text-lg font-bold" style={{ color: BROWN_DARK, fontFamily: "'Inter', sans-serif" }}>
            Create Community
          </DialogTitle>
          <DialogDescription className="sr-only">Create a new community</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 pt-5 pb-4">
          {/* Cover photo */}
          <div className="relative mb-10">
            <label className="block cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0], setCover)}
              />
              <div
                className="rounded-2xl flex items-center justify-center overflow-hidden"
                style={{
                  height: 150,
                  background: '#EFE2CB',
                  border: '1.5px dashed #C4A98A',
                }}
              >
                {cover ? (
                  <img src={cover} alt="Cover" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center">
                    <Camera className="h-7 w-7 mb-2" style={{ color: '#8E7150' }} />
                    <p className="text-sm font-semibold" style={{ color: BROWN_DARK }}>Add cover photo</p>
                    <p className="text-xs" style={{ color: '#9C8569' }}>Optional</p>
                  </div>
                )}
              </div>
            </label>

            {/* Icon - overlapping bottom-left */}
            <div className="absolute left-3 -bottom-8 flex items-end gap-3">
              <label className="relative cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0], setIcon)}
                />
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center overflow-hidden"
                  style={{ background: '#EFE2CB', border: `3px solid ${CREAM_BG}` }}
                >
                  {icon ? (
                    <img src={icon} alt="Icon" className="w-full h-full object-cover" />
                  ) : (
                    <ImagePlus className="h-6 w-6" style={{ color: '#8E7150' }} />
                  )}
                </div>
                <div
                  className="absolute -right-1 bottom-0 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: BROWN }}
                >
                  <Camera className="h-3 w-3 text-white" />
                </div>
              </label>
              <span className="text-sm mb-1" style={{ color: BROWN_DARK }}>Add icon</span>
            </div>
          </div>

          <p className="text-[11px] font-bold tracking-[0.15em] mb-3" style={{ color: BROWN }}>REQUIRED</p>

          {/* Name */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold" style={{ color: BROWN_DARK }}>Community Name</label>
              <span className="text-[11px]" style={{ color: '#9C8569' }}>{name.length}/50</span>
            </div>
            <input
              type="text"
              maxLength={50}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('forum.circle_name_placeholder')}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={{ background: '#FBEFD8', borderBottom: '1px solid #E8D5C4', color: BROWN_DARK }}
            />
          </div>

          {/* Description */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold" style={{ color: BROWN_DARK }}>Description</label>
              <span className="text-[11px]" style={{ color: '#9C8569' }}>{description.length}/200</span>
            </div>
            <textarea
              maxLength={200}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('forum.circle_desc_placeholder')}
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-none"
              style={{ background: '#FBEFD8', borderBottom: '1px solid #E8D5C4', color: BROWN_DARK }}
            />
          </div>

          {/* Category */}
          <div className="mb-6">
            <label className="block text-sm font-semibold mb-2" style={{ color: BROWN_DARK }}>Category</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger
                className="w-full rounded-lg text-sm"
                style={{ background: '#FBEFD8', border: 'none', borderBottom: '1px solid #E8D5C4', color: BROWN_DARK }}
              >
                <SelectValue placeholder={t('forum.select_category')} />
              </SelectTrigger>
              <SelectContent>
                {CREATE_CATEGORIES.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="text-[11px] font-bold tracking-[0.15em] mb-3" style={{ color: BROWN }}>PRIVACY</p>

          <div className="grid grid-cols-2 gap-3 mb-2">
            {([
              { id: 'public', label: 'Public', desc: 'Anyone can see and join', Icon: Globe },
              { id: 'private', label: 'Private', desc: 'Admin approves members', Icon: Lock },
            ] as const).map((opt) => {
              const active = privacy === opt.id;
              const Ic = opt.Icon;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPrivacy(opt.id)}
                  className="rounded-2xl py-4 px-3 flex flex-col items-center text-center transition-all"
                  style={{
                    background: active ? '#FBEFD8' : '#F5E6CE',
                    border: active ? `1.5px solid ${BROWN}` : '1.5px solid transparent',
                  }}
                >
                  <Ic className="h-5 w-5 mb-2" style={{ color: active ? BROWN : BROWN_DARK }} />
                  <span className="text-sm font-bold" style={{ color: active ? BROWN : BROWN_DARK }}>{opt.label}</span>
                  <span className="text-[11px] mt-1" style={{ color: '#9C8569' }}>{opt.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-4 py-4" style={{ background: CREAM_BG, borderTop: `1px solid ${SOFT_BORDER}` }}>
          <button
            onClick={handleSubmit}
            className="w-full py-3.5 rounded-full text-base font-semibold text-white flex items-center justify-center gap-2"
            style={{ background: BROWN }}
          >
            Send For Approval
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const Forum = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImage, setNewPostImage] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [reportPost, setReportPost] = useState<Post | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [reporting, setReporting] = useState(false);
  const [newReply, setNewReply] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [likingPosts, setLikingPosts] = useState<Set<string>>(new Set());
  const [activeReactionPostId, setActiveReactionPostId] = useState<string | null>(null);
  const pendingPostIdsRef = useRef(new Set<string>());
  const pendingReplyIdsRef = useRef(new Set<string>());
  const hasLoadedPostsRef = useRef(false);
  const [allUserNames, setAllUserNames] = useState<string[]>([]);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionTarget, setMentionTarget] = useState<'post' | 'reply'>('post');
  const [profileName, setProfileName] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'feed' | 'explore' | 'communities' | 'bookmarks'>('feed');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Set<string>>(new Set());
  const [joinedCommunities, setJoinedCommunities] = useState<Set<string>>(new Set());
  const [exploreCategory, setExploreCategory] = useState<string>('all');
  const [userCommunities, setUserCommunities] = useState<Community[]>([]);
  const [createCommunityOpen, setCreateCommunityOpen] = useState(false);
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [communityTab, setCommunityTab] = useState<'posts' | 'members' | 'settings'>('posts');
  const [communityOverrides, setCommunityOverrides] = useState<Record<string, { banner?: string; iconUrl?: string }>>(() => {
    try {
      const raw = localStorage.getItem('guftagu_community_overrides');
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  });
  const updateOverride = (id: string, patch: { banner?: string; iconUrl?: string }) => {
    setCommunityOverrides((prev) => {
      const next = { ...prev, [id]: { ...prev[id], ...patch } };
      try { localStorage.setItem('guftagu_community_overrides', JSON.stringify(next)); } catch {}
      return next;
    });
  };
  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  // Persist joined communities per user in localStorage
  const joinedStorageKey = `guftagu_joined_${user?.uid || 'guest'}`;
  const createdStorageKey = `guftagu_created_${user?.uid || 'guest'}`;
  const bookmarksStorageKey = `guftagu_bookmarks_${user?.uid || 'guest'}`;
  const postsCacheKey = `guftagu_posts_cache_${user?.uid || 'guest'}`;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(bookmarksStorageKey);
      setBookmarkedPosts(raw ? new Set(JSON.parse(raw)) : new Set());
    } catch {
      setBookmarkedPosts(new Set());
    }
  }, [bookmarksStorageKey]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(joinedStorageKey);
      if (raw) setJoinedCommunities(new Set(JSON.parse(raw)));
      else setJoinedCommunities(new Set());
    } catch {
      setJoinedCommunities(new Set());
    }
  }, [joinedStorageKey]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(createdStorageKey);
      setUserCommunities(raw ? JSON.parse(raw) : []);
    } catch {
      setUserCommunities([]);
    }
  }, [createdStorageKey]);

  const handleCreateCommunity = (data: {
    name: string;
    description: string;
    category: string;
    privacy: 'public' | 'private';
    cover: string | null;
    icon: string | null;
  }) => {
    const newCommunity: Community = {
      id: `user-${Date.now()}`,
      name: data.name,
      members: '1 member',
      type: data.privacy === 'public' ? 'Public Group' : 'Private Group',
      description: data.description,
      banner: data.cover || QURAN_BANNER,
      category: data.category,
      isAdmin: true,
      iconUrl: data.icon || undefined,
    };
    setUserCommunities((prev) => {
      const next = [newCommunity, ...prev];
      try { localStorage.setItem(createdStorageKey, JSON.stringify(next)); } catch {}
      return next;
    });
    toast.success('Community sent for approval');
    setActiveTab('communities');
  };

  const toggleJoinCommunity = (id: string) => {
    setJoinedCommunities((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        toast.success('Left community');
      } else {
        next.add(id);
        toast.success('Joined community');
      }
      try {
        localStorage.setItem(joinedStorageKey, JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };
  
  // Pull to refresh state
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const PULL_THRESHOLD = 80;

  const todaysDua = getTodaysDua();

  // Fetch user's profile name from Supabase
  useEffect(() => {
    const fetchProfileName = async () => {
      if (!user?.uid) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.uid)
        .maybeSingle();
      
      if (data?.full_name) {
        setProfileName(data.full_name);
      }
    };
    
    fetchProfileName();
  }, [user?.uid]);

  const currentUserName = profileName || user?.displayName || user?.email?.split('@')[0] || 'User';

  // Get filtered posts based on selected category and search
  const filteredPosts = posts.filter(post => {
    const matchesCategory = selectedCategory === 'all' || post.category === selectedCategory;
    const matchesSearch = !searchQuery || post.content.toLowerCase().includes(searchQuery.toLowerCase()) || post.user_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });
  const bookmarkedFilteredPosts = filteredPosts.filter((post) => bookmarkedPosts.has(post.id));

  // Fetch posts with their replies and likes
  const fetchPosts = useCallback(async (showLoader = true) => {
    if (showLoader && !hasLoadedPostsRef.current) setLoading(true);
    try {
      const { data: postsData, error: postsError } = await supabase
        .from('guftagu_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      const authorIds = Array.from(new Set((postsData || []).map((post) => post.user_id).filter(Boolean)));
      const { data: profilesData, error: profilesError } = authorIds.length
        ? await supabase.from('profiles').select('user_id, avatar_url').in('user_id', authorIds)
        : { data: [], error: null };

      if (profilesError) throw profilesError;

      const avatarsByUserId = Object.fromEntries(
        (profilesData || []).map((profile) => [profile.user_id, profile.avatar_url]),
      );

      const { data: repliesData, error: repliesError } = await supabase
        .from('guftagu_replies')
        .select('*')
        .order('created_at', { ascending: true });

      if (repliesError) throw repliesError;

      const { data: likesData, error: likesError } = await supabase
        .from('guftagu_likes')
        .select('*');

      if (likesError) throw likesError;

      const repliesByPost: Record<string, Reply[]> = {};
      (repliesData || []).forEach((reply) => {
        if (!repliesByPost[reply.post_id]) {
          repliesByPost[reply.post_id] = [];
        }
        repliesByPost[reply.post_id].push(reply);
      });

      const likesByPost: Record<string, Like[]> = {};
      (likesData || []).forEach((like) => {
        if (!likesByPost[like.post_id]) {
          likesByPost[like.post_id] = [];
        }
        likesByPost[like.post_id].push(like as Like);
      });

      const postsWithData = (postsData || [])
        .filter((post) => post.user_name !== 'Ayesha Khan')
        .map((post) => {
        const postLikes = likesByPost[post.id] || [];
        return {
          ...post,
          avatar_url: avatarsByUserId[post.user_id] || undefined,
          replies: repliesByPost[post.id] || [],
          likes: postLikes,
          likeCount: postLikes.length,
          isLiked: user ? postLikes.some(like => like.user_id === user.uid) : false,
          userReaction: user ? (postLikes.find(like => like.user_id === user.uid)?.reaction_type || 'like') : null,
        };
      });

      setPosts(postsWithData);
      writeCachedPosts(postsCacheKey, postsWithData);
      hasLoadedPostsRef.current = true;
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [postsCacheKey, user?.uid]);

  useEffect(() => {
    const handleProfileUpdate = () => {
      fetchPosts(false);
    };
    window.addEventListener('barakah-profile-updated', handleProfileUpdate);
    return () => window.removeEventListener('barakah-profile-updated', handleProfileUpdate);
  }, [fetchPosts]);

  useEffect(() => {
    if (hasLoadedPostsRef.current && posts.length > 0) {
      writeCachedPosts(postsCacheKey, posts);
    }
  }, [posts, postsCacheKey]);

  // Pull to refresh handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      startYRef.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling) return;
    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, (currentY - startYRef.current) * 0.5);
    setPullDistance(Math.min(distance, PULL_THRESHOLD * 1.5));
  }, [isPulling]);

  const handleTouchEnd = useCallback(() => {
    if (pullDistance >= PULL_THRESHOLD && !refreshing) {
      setRefreshing(true);
      fetchPosts(false);
    }
    setPullDistance(0);
    setIsPulling(false);
  }, [pullDistance, refreshing, fetchPosts]);

  const fetchUserNames = useCallback(async () => {
    try {
      const { data: postsData } = await supabase
        .from('guftagu_posts')
        .select('user_name');
      
      const { data: repliesData } = await supabase
        .from('guftagu_replies')
        .select('user_name');

      const allNames = new Set<string>();
      postsData?.forEach(p => allNames.add(p.user_name));
      repliesData?.forEach(r => allNames.add(r.user_name));
      
      setAllUserNames(Array.from(allNames));
    } catch (error) {
      console.error('Error fetching usernames:', error);
    }
  }, []);

  useEffect(() => {
    hasLoadedPostsRef.current = false;
    const cachedPosts = readCachedPosts(postsCacheKey);
    if (cachedPosts) {
      setPosts(cachedPosts);
      setLoading(false);
      hasLoadedPostsRef.current = true;
    } else {
      setPosts([]);
      setLoading(true);
    }

    fetchPosts();
    fetchUserNames();

    const postsChannel = supabase
      .channel('guftagu-posts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'guftagu_posts' },
        (payload) => {
          const newPost = { ...payload.new as Post, replies: [], likes: [], likeCount: 0, isLiked: false, userReaction: null };
          pendingPostIdsRef.current.delete(newPost.id);
          setPosts((prev) => {
            if (prev.some((post) => post.id === newPost.id)) return prev;
            return [newPost, ...prev];
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'guftagu_posts' },
        (payload) => {
          setPosts((prev) => prev.filter((p) => p.id !== payload.old.id));
        }
      )
      .subscribe();

    const likesChannel = supabase
      .channel('guftagu-likes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'guftagu_likes' },
        (payload) => {
          const like = ((payload.new as Like | null) || (payload.old as Like | null));
          if (!like?.post_id) return;
          const delta = payload.eventType === 'INSERT' ? 1 : payload.eventType === 'DELETE' ? -1 : 0;
          setPosts((prev) => prev.map((post) => {
            if (post.id !== like.post_id) return post;
            const userOwnsEvent = user?.uid === like.user_id;
            return {
              ...post,
              isLiked: userOwnsEvent ? payload.eventType !== 'DELETE' : post.isLiked,
              userReaction: userOwnsEvent
                ? payload.eventType === 'DELETE'
                  ? null
                  : like.reaction_type || 'like'
                : post.userReaction,
              likeCount: Math.max(0, (post.likeCount || 0) + delta),
            };
          }));
          setSelectedPost((prev) => {
            if (!prev || prev.id !== like.post_id) return prev;
            const userOwnsEvent = user?.uid === like.user_id;
            return {
              ...prev,
              isLiked: userOwnsEvent ? payload.eventType !== 'DELETE' : prev.isLiked,
              userReaction: userOwnsEvent
                ? payload.eventType === 'DELETE'
                  ? null
                  : like.reaction_type || 'like'
                : prev.userReaction,
              likeCount: Math.max(0, (prev.likeCount || 0) + delta),
            };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(likesChannel);
    };
  }, [fetchPosts, fetchUserNames, postsCacheKey]);

  const handleContentChange = (value: string, target: 'post' | 'reply') => {
    if (target === 'post') {
      setNewPostContent(value);
    } else {
      setNewReply(value);
    }
    
    const lastAtIndex = value.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const textAfterAt = value.slice(lastAtIndex + 1);
      const hasSpaceAfter = textAfterAt.includes(' ');
      
      if (!hasSpaceAfter && textAfterAt.length >= 0) {
        setMentionSearch(textAfterAt.toLowerCase());
        setShowMentionSuggestions(true);
        setMentionTarget(target);
        return;
      }
    }
    setShowMentionSuggestions(false);
  };

  const insertMention = (username: string) => {
    const currentContent = mentionTarget === 'post' ? newPostContent : newReply;
    const lastAtIndex = currentContent.lastIndexOf('@');
    const newContent = currentContent.slice(0, lastAtIndex) + '@' + username + ' ';
    
    if (mentionTarget === 'post') {
      setNewPostContent(newContent);
    } else {
      setNewReply(newContent);
    }
    setShowMentionSuggestions(false);
  };

  const handlePostImageChange = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }
    try {
      const url = await readFileAsDataUrl(file);
      setNewPostImage(url);
    } catch {
      toast.error('Could not attach image');
    }
  };

  const filteredSuggestions = allUserNames
    .filter(name => name.toLowerCase().includes(mentionSearch) && name !== currentUserName)
    .slice(0, 5);

  useEffect(() => {
    if (!selectedPost) return;
    const currentPost = posts.find(p => p.id === selectedPost.id);
    if (currentPost && currentPost.replies) {
      const repliesChanged =
        (currentPost.replies || []).length !== (selectedPost.replies || []).length ||
        (currentPost.replies || []).some((reply, index) => reply.id !== selectedPost.replies?.[index]?.id);
      const metaChanged =
        currentPost.likeCount !== selectedPost.likeCount ||
        currentPost.isLiked !== selectedPost.isLiked ||
        currentPost.userReaction !== selectedPost.userReaction;

      if (repliesChanged || metaChanged) {
        setSelectedPost(prev => prev ? {
          ...prev,
          replies: currentPost.replies,
          likeCount: currentPost.likeCount,
          isLiked: currentPost.isLiked,
          userReaction: currentPost.userReaction,
        } : null);
      }
    }
  }, [selectedPost, posts]);

  useEffect(() => {
    if (!selectedPost) return;

    const repliesChannel = supabase
      .channel(`guftagu-replies-${selectedPost.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'guftagu_replies', filter: `post_id=eq.${selectedPost.id}` },
        (payload) => {
          const newReplyData = payload.new as Reply;
          pendingReplyIdsRef.current.delete(newReplyData.id);
          setSelectedPost((prev) => {
            if (!prev) return null;
            if ((prev.replies || []).some((reply) => reply.id === newReplyData.id)) return prev;
            return {
              ...prev,
              replies: [...(prev.replies || []), newReplyData]
            };
          });
          setPosts((prev) => prev.map(p => 
            p.id === selectedPost.id 
              ? (p.replies || []).some((reply) => reply.id === newReplyData.id)
                ? p
                : { ...p, replies: [...(p.replies || []), newReplyData] }
              : p
          ));
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'guftagu_replies', filter: `post_id=eq.${selectedPost.id}` },
        (payload) => {
          setSelectedPost((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              replies: (prev.replies || []).filter((r) => r.id !== payload.old.id)
            };
          });
          setPosts((prev) => prev.map(p => 
            p.id === selectedPost.id 
              ? { ...p, replies: (p.replies || []).filter((r) => r.id !== payload.old.id) }
              : p
          ));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(repliesChannel);
    };
  }, [selectedPost?.id]);

  const handleCreatePost = async () => {
    if ((!newPostContent.trim() && !newPostImage) || !user) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase.from('guftagu_posts').insert({
        user_id: user.uid,
        user_name: currentUserName,
        content: newPostContent.trim(),
        image_url: newPostImage,
      } as any).select('*').single();

      if (error) throw error;

      const createdPost = {
        ...data,
        replies: [],
        likes: [],
        likeCount: 0,
        isLiked: false,
        userReaction: null,
      } as Post;
      pendingPostIdsRef.current.add(createdPost.id);
      setPosts((prev) => {
        if (prev.some((post) => post.id === createdPost.id)) return prev;
        return [createdPost, ...prev];
      });

      setNewPostContent('');
      setNewPostImage(null);
      setIsCreateDialogOpen(false);
      toast.success('Post shared!');
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Failed to create post');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      const { error } = await supabase.from('guftagu_posts').delete().eq('id', postId);
      if (error) throw error;
      toast.success('Post deleted');
      if (selectedPost?.id === postId) {
        setSelectedPost(null);
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post');
    }
  };

  const handleSetReaction = async (
    postId: string,
    currentReaction: ReactionType | null | undefined,
    nextReaction: ReactionType
  ) => {
    if (!user) {
      toast.error('Please sign in to react to posts');
      return;
    }

    if (likingPosts.has(postId)) return;

    setLikingPosts(prev => new Set(prev).add(postId));
    setActiveReactionPostId(null);

    const optimisticReaction = currentReaction === nextReaction ? null : nextReaction;
    const optimisticLiked = Boolean(optimisticReaction);
    const optimisticDelta = currentReaction ? (optimisticReaction ? 0 : -1) : 1;

    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          isLiked: optimisticLiked,
          userReaction: optimisticReaction,
          likeCount: Math.max(0, (p.likeCount || 0) + optimisticDelta)
        };
      }
      return p;
    }));
    setSelectedPost(prev => prev?.id === postId ? {
      ...prev,
      isLiked: optimisticLiked,
      userReaction: optimisticReaction,
      likeCount: Math.max(0, (prev.likeCount || 0) + optimisticDelta),
    } : prev);

    try {
      if (currentReaction && !optimisticReaction) {
        const { error } = await supabase
          .from('guftagu_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.uid);
        if (error) throw error;
      } else if (currentReaction && optimisticReaction) {
        const { error } = await supabase
          .from('guftagu_likes')
          .update({ reaction_type: optimisticReaction } as any)
          .eq('post_id', postId)
          .eq('user_id', user.uid);
        if (error) throw error;
      } else if (optimisticReaction) {
        const { error } = await supabase
          .from('guftagu_likes')
          .insert({ post_id: postId, user_id: user.uid, reaction_type: optimisticReaction } as any);
        if (error) throw error;
      }
    } catch (error) {
      console.error('Error updating reaction:', error);
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            isLiked: Boolean(currentReaction),
            userReaction: currentReaction || null,
            likeCount: Math.max(0, (p.likeCount || 0) - optimisticDelta)
          };
        }
        return p;
      }));
      setSelectedPost(prev => prev?.id === postId ? {
        ...prev,
        isLiked: Boolean(currentReaction),
        userReaction: currentReaction || null,
        likeCount: Math.max(0, (prev.likeCount || 0) - optimisticDelta),
      } : prev);
      toast.error('Failed to update reaction');
    } finally {
      setLikingPosts(prev => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
    }
  };

  const handleAddReply = async () => {
    if (!newReply.trim() || !user || !selectedPost) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase.from('guftagu_replies').insert({
        post_id: selectedPost.id,
        user_id: user.uid,
        user_name: currentUserName,
        content: newReply.trim(),
      }).select('*').single();

      if (error) throw error;

      const createdReply = data as Reply;
      pendingReplyIdsRef.current.add(createdReply.id);
      setSelectedPost((prev) => {
        if (!prev || prev.id !== createdReply.post_id) return prev;
        if ((prev.replies || []).some((reply) => reply.id === createdReply.id)) return prev;
        return { ...prev, replies: [...(prev.replies || []), createdReply] };
      });
      setPosts((prev) => prev.map((post) => {
        if (post.id !== createdReply.post_id) return post;
        if ((post.replies || []).some((reply) => reply.id === createdReply.id)) return post;
        return { ...post, replies: [...(post.replies || []), createdReply] };
      }));

      setNewReply('');
      toast.success('Reply sent!');
    } catch (error) {
      console.error('Error adding reply:', error);
      toast.error('Failed to send reply');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    try {
      const { error } = await supabase.from('guftagu_replies').delete().eq('id', replyId);
      if (error) throw error;
      toast.success('Reply deleted');
    } catch (error) {
      console.error('Error deleting reply:', error);
      toast.error('Failed to delete reply');
    }
  };

  const handleToggleBookmark = (postId: string) => {
    setBookmarkedPosts(prev => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
        toast.success('Removed from bookmarks');
      } else {
        next.add(postId);
        toast.success('Saved to bookmarks');
      }
      try {
        localStorage.setItem(bookmarksStorageKey, JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  const handleShare = async (post: Post) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Post by ${post.user_name}`,
          text: post.content,
        });
      } else {
        await navigator.clipboard.writeText(post.content);
        toast.success('Copied to clipboard');
      }
    } catch {
      // User cancelled share
    }
  };

  const resetReportDialog = () => {
    setReportPost(null);
    setReportReason('');
    setReportDetails('');
  };

  const handleSubmitReport = async () => {
    if (!user) {
      toast.error('Please sign in to report posts');
      return;
    }
    if (!reportPost) return;
    if (!reportReason) {
      toast.error('Please select a reason');
      return;
    }

    setReporting(true);
    try {
      const reasonLabel = REPORT_REASONS.find((reason) => reason.id === reportReason)?.label || reportReason;
      const { error } = await (supabase as any).from('guftagu_post_reports').insert({
        post_id: reportPost.id,
        reporter_id: user.uid,
        reporter_name: currentUserName,
        reason: reasonLabel,
        details: reportDetails.trim() || null,
      } as any);

      if (error) throw error;
      toast.success('Post reported. Our team will review it.');
      resetReportDialog();
    } catch (error: any) {
      console.error('Error reporting post:', error);
      if (error?.code === '23505') {
        toast.error('You have already reported this post.');
      } else {
        toast.error(error?.message || 'Failed to report post');
      }
    } finally {
      setReporting(false);
    }
  };

  const renderReportPostDialog = () => (
    <Dialog
      open={!!reportPost}
      onOpenChange={(open) => {
        if (!open) resetReportDialog();
      }}
    >
      <DialogContent
        className="sm:max-w-md border-0"
        style={{ background: '#FFF8EA' }}
      >
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2" style={{ color: BROWN }}>
            <Flag className="h-5 w-5" />
            Report Post
          </DialogTitle>
          <DialogDescription className="text-sm" style={{ color: '#9C8569' }}>
            Let us know why this post should be reviewed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {reportPost && (
            <div
              className="rounded-xl p-3 text-sm leading-relaxed line-clamp-3"
              style={{ background: '#FFFFFF', color: '#5C4632', border: `1px solid ${SOFT_BORDER}` }}
            >
              {reportPost.content || 'Image post'}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: BROWN_DARK }}>
              Reason
            </label>
            <Select value={reportReason} onValueChange={setReportReason}>
              <SelectTrigger
                className="rounded-xl bg-white"
                style={{ borderColor: SOFT_BORDER, color: BROWN_DARK }}
              >
                <SelectValue placeholder={t('forum.select_reason')} />
              </SelectTrigger>
              <SelectContent>
                {REPORT_REASONS.map((reason) => (
                  <SelectItem key={reason.id} value={reason.id}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: BROWN_DARK }}>
              Details optional
            </label>
            <Textarea
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value.slice(0, 500))}
              placeholder={t('forum.note_placeholder')}
              className="min-h-[96px] resize-none rounded-xl"
              style={{ background: '#FFFFFF', color: BROWN_DARK, border: `1px solid ${SOFT_BORDER}` }}
            />
            <p className="text-xs mt-1 text-right" style={{ color: '#9C8569' }}>
              {reportDetails.length}/500
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={resetReportDialog}
              disabled={reporting}
              className="rounded-full"
              style={{ borderColor: SOFT_BORDER, color: BROWN_DARK }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmitReport}
              disabled={!reportReason || reporting}
              className="rounded-full text-white"
              style={{ background: BROWN }}
            >
              {reporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Flag className="h-4 w-4 mr-2" />}
              Submit Report
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  const ReactionPicker = ({ post }: { post: Post }) => (
    <div
      className="absolute bottom-full left-0 z-30 mb-2 flex items-center gap-1 rounded-full border px-2 py-1.5 shadow-lg"
      style={{ background: '#FFFFFF', borderColor: SOFT_BORDER }}
      onClick={(e) => e.stopPropagation()}
    >
      {REACTIONS.map(({ type, label, color, bg, Icon, emoji }) => {
        const selected = post.userReaction === type;
        return (
          <button
            key={type}
            type="button"
            onClick={() => handleSetReaction(post.id, post.userReaction, type)}
            disabled={likingPosts.has(post.id)}
            className="h-10 w-10 rounded-full flex items-center justify-center transition-transform hover:-translate-y-1 active:scale-95 disabled:opacity-60"
            style={{
              background: selected ? color : bg,
              color: selected ? '#FFFFFF' : color,
              boxShadow: selected ? `0 5px 12px ${color}44` : 'none',
            }}
            aria-label={selected ? `Remove ${label}` : `React ${label}`}
            title={label}
          >
            {Icon ? (
              <Icon className={cn('h-5 w-5', selected && type === 'love' && 'fill-current')} strokeWidth={2.4} />
            ) : (
              <span className="text-xl leading-none" aria-hidden="true">{emoji}</span>
            )}
          </button>
        );
      })}
    </div>
  );

  const PostCard = ({ post }: { post: Post; index?: number }) => {
    const isOwner = user?.uid === post.user_id;
    const isLiking = likingPosts.has(post.id);
    const isBookmarked = bookmarkedPosts.has(post.id);
    const reaction = getReaction(post.userReaction);
    const ReactionIcon = reaction.Icon;
    const contentPreview = post.content.length > 180 ? post.content.slice(0, 180) + '...' : post.content;
    const hasMore = post.content.length > 180;

    return (
      <Card 
        className="group relative overflow-visible border-0 rounded-2xl"
        style={{ 
          background: WARM_CARD,
          boxShadow: '0 1px 3px rgba(123, 63, 30, 0.06)',
        }}
      >
        <CardContent className="p-4">
          {post.community && (
            <div
              className="flex items-center justify-between pb-2.5 mb-3 text-xs"
              style={{ borderBottom: `1px solid ${SOFT_BORDER}` }}
            >
              <span style={{ color: '#9C8569' }}>
                {t('forum.posted_in')}{' '}
                <span className="font-semibold" style={{ color: BROWN_LIGHT }}>
                  {post.community}
                </span>
              </span>
              <button className="hover:underline" style={{ color: '#9C8569' }}>
                view community
              </button>
            </div>
          )}
          {/* Header: Avatar + Name + Time */}
          <div className="flex items-start gap-3 mb-3">
            {post.avatar_url ? (
              <img
                src={post.avatar_url}
                alt={post.user_name}
                className="w-11 h-11 rounded-full object-cover shrink-0"
              />
            ) : (
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
                style={{ background: '#EAD9BE' }}
              >
                <User className="h-5 w-5" style={{ color: '#A88B66' }} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm" style={{ color: BROWN_DARK }}>{post.user_name}</span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: '#9C8569' }}>{formatTimeAgo(post.created_at)}</p>
            </div>
            {isOwner && (
              <button
                className="hover:text-destructive transition-colors p-1"
                style={{ color: '#C4A98A' }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeletePost(post.id);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Optional post image */}
          {post.image_url && (
            <div className="w-full rounded-xl overflow-hidden mb-3" style={{ aspectRatio: '16 / 10' }}>
              <img src={post.image_url} alt="" className="w-full h-full object-cover" />
            </div>
          )}

          {/* Content */}
          <div className="mb-3">
            <p className="text-sm leading-relaxed" style={{ color: '#3D2A1E' }}>
              {renderContentWithMentions(contentPreview)}
              {hasMore && (
                <button 
                  onClick={() => setSelectedPost(post)}
                  className="text-sm ml-1 hover:underline font-semibold"
                  style={{ color: BROWN }}
                >
                  Read more
                </button>
              )}
            </p>
          </div>

          {/* Actions Row */}
          <div className="flex items-center justify-between pt-3" style={{ borderTop: `1px solid ${SOFT_BORDER}` }}>
            <div className="flex items-center gap-5">
              <div className="relative">
                {activeReactionPostId === post.id && <ReactionPicker post={post} />}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveReactionPostId(activeReactionPostId === post.id ? null : post.id);
                  }}
                  disabled={isLiking}
                  className="flex items-center gap-1.5 text-sm transition-colors disabled:opacity-60"
                  style={{ color: post.isLiked ? reaction.color : '#9C8569' }}
                  aria-label={post.isLiked ? `${reaction.label} reaction selected` : 'React to post'}
                  title={post.isLiked ? reaction.label : 'React'}
                >
                  {ReactionIcon ? (
                    <ReactionIcon className={cn("h-4 w-4", post.isLiked && post.userReaction === 'love' && "fill-current")} />
                  ) : (
                    <span className="text-base leading-none" aria-hidden="true">{reaction.emoji}</span>
                  )}
                  <span className="text-xs tabular-nums">{post.likeCount || 0}</span>
                </button>
              </div>
              <button
                onClick={() => setSelectedPost(post)}
                className="flex items-center gap-1.5 text-sm transition-colors"
                style={{ color: '#9C8569' }}
              >
                <MessageCircle className="h-4 w-4" />
                <span className="text-xs tabular-nums">{post.replies?.length || 0}</span>
              </button>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => handleToggleBookmark(post.id)}
                className="transition-colors"
                style={{ color: isBookmarked ? BROWN : '#9C8569' }}
                aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark post'}
              >
                {isBookmarked ? (
                  <BookmarkCheck className="h-5 w-5" strokeWidth={2.4} />
                ) : (
                  <Bookmark className="h-5 w-5" strokeWidth={2.4} />
                )}
              </button>
              <button
                onClick={() => handleShare(post)}
                className="transition-colors"
                style={{ color: '#9C8569' }}
                aria-label="Share post"
              >
                <Share2 className="h-4 w-4" />
              </button>
              {!isOwner && (
                <button
                  onClick={() => setReportPost(post)}
                  className="transition-colors"
                  style={{ color: '#9C8569' }}
                  aria-label="Report post"
                >
                  <Flag className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Replies View
  if (selectedPost) {
    const selectedReaction = getReaction(selectedPost.userReaction);
    const SelectedReactionIcon = selectedReaction.Icon;

    return (
      <Layout pageBackgroundColor={CREAM_BG}>
        <div className="min-h-screen" style={{ background: CREAM_BG }}>
          <div className="relative px-4 pt-6">
            <button
              onClick={() => setSelectedPost(null)}
              className="flex items-center gap-2 transition-colors mb-6 group"
              style={{ color: BROWN }}
            >
              <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform duration-300" />
              <span className="font-medium text-sm">Back to Guftagu</span>
            </button>

            <Card className="relative overflow-hidden border-0 mb-6 rounded-2xl" style={{ background: WARM_CARD, boxShadow: '0 1px 3px rgba(123, 63, 30, 0.06)' }}>
              <CardContent className="p-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: '#EAD9BE' }}
                  >
                    <User className="h-6 w-6" style={{ color: '#A88B66' }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold" style={{ color: BROWN_DARK }}>{selectedPost.user_name}</span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: '#9C8569' }}>{formatTimeAgo(selectedPost.created_at)}</p>
                  </div>
                </div>
                {selectedPost.image_url && (
                  <div className="w-full rounded-xl overflow-hidden mb-4" style={{ aspectRatio: '16 / 10' }}>
                    <img src={selectedPost.image_url} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <p className="text-[15px] leading-relaxed whitespace-pre-wrap" style={{ color: '#3D2A1E' }}>{renderContentWithMentions(selectedPost.content)}</p>
                
                <div className="flex items-center justify-between mt-5 pt-4" style={{ borderTop: `1px solid ${SOFT_BORDER}` }}>
                  <div className="flex items-center gap-5">
                    <div className="relative">
                      {activeReactionPostId === selectedPost.id && <ReactionPicker post={selectedPost} />}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveReactionPostId(activeReactionPostId === selectedPost.id ? null : selectedPost.id);
                        }}
                        disabled={likingPosts.has(selectedPost.id)}
                        className="flex items-center gap-1.5 transition-colors disabled:opacity-60"
                        style={{ color: selectedPost.isLiked ? selectedReaction.color : '#9C8569' }}
                        aria-label={selectedPost.isLiked ? `${selectedReaction.label} reaction selected` : 'React to post'}
                        title={selectedPost.isLiked ? selectedReaction.label : 'React'}
                      >
                        {SelectedReactionIcon ? (
                          <SelectedReactionIcon className={cn("h-4 w-4", selectedPost.isLiked && selectedPost.userReaction === 'love' && "fill-current")} />
                        ) : (
                          <span className="text-base leading-none" aria-hidden="true">{selectedReaction.emoji}</span>
                        )}
                        <span className="text-sm">{selectedPost.likeCount || 0}</span>
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5" style={{ color: '#9C8569' }}>
                      <MessageCircle className="h-4 w-4" />
                      <span className="text-sm">{selectedPost.replies?.length || 0}</span>
                    </div>
                  </div>
                  {user?.uid !== selectedPost.user_id && (
                    <button
                      onClick={() => setReportPost(selectedPost)}
                      className="flex items-center gap-1.5 transition-colors text-sm"
                      style={{ color: '#9C8569' }}
                      aria-label="Report post"
                    >
                      <Flag className="h-4 w-4" />
                      Report
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="mb-6">
              <h3 className="font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wide" style={{ color: BROWN_DARK }}>
                <MessageCircle className="h-4 w-4" style={{ color: BROWN }} />
                Replies
              </h3>

              <div className="space-y-3">
                {selectedPost.replies?.map((reply, index) => {
                  const isOwner = user?.uid === reply.user_id;
                  
                  return (
                    <div 
                      key={reply.id} 
                      className="rounded-2xl p-4"
                      style={{ 
                        background: '#FFFFFF',
                        boxShadow: '0 1px 3px rgba(123, 63, 30, 0.05)',
                      }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center"
                            style={{ background: '#EAD9BE' }}
                          >
                            <User className="h-4 w-4" style={{ color: '#A88B66' }} />
                          </div>
                          <div>
                            <span className="font-semibold text-sm" style={{ color: BROWN_DARK }}>{reply.user_name}</span>
                            <span className="text-xs ml-2" style={{ color: '#9C8569' }}>{formatTimeAgo(reply.created_at)}</span>
                          </div>
                        </div>
                        {isOwner && (
                          <button
                            className="hover:text-destructive transition-colors p-1"
                            style={{ color: '#C4A98A' }}
                            onClick={() => handleDeleteReply(reply.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-sm leading-relaxed pl-12" style={{ color: '#3D2A1E' }}>{renderContentWithMentions(reply.content)}</p>
                    </div>
                  );
                })}

                {(!selectedPost.replies || selectedPost.replies.length === 0) && (
                  <div className="text-center py-12 rounded-2xl" style={{ background: '#FFFFFF' }}>
                    <MessageCircle className="h-8 w-8 mx-auto mb-3" style={{ color: '#C4A98A' }} />
                    <p className="font-medium text-sm" style={{ color: BROWN_DARK }}>No replies yet</p>
                    <p className="text-xs mt-1" style={{ color: '#9C8569' }}>Be the first to reply!</p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: '#EAD9BE' }}
                >
                  <User className="h-4 w-4" style={{ color: '#A88B66' }} />
                </div>
                <div className="flex-1 flex gap-2">
                  <div className="relative flex-1">
                    <Textarea
                      value={newReply}
                      onChange={(e) => handleContentChange(e.target.value, 'reply')}
                      placeholder={t('forum.reply_placeholder')}
                      className="min-h-[48px] max-h-[120px] resize-none rounded-xl border-0"
                      style={{ background: '#FFFFFF', color: BROWN_DARK, border: `1px solid ${SOFT_BORDER}` }}
                    />
                    {showMentionSuggestions && mentionTarget === 'reply' && filteredSuggestions.length > 0 && (
                      <div className="absolute bottom-full left-0 right-0 mb-1 rounded-lg shadow-lg overflow-hidden z-50 border"
                        style={{ background: '#FFFFFF', borderColor: SOFT_BORDER }}
                      >
                        {filteredSuggestions.map((name) => (
                          <button
                            key={name}
                            onClick={() => insertMention(name)}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-amber-50 flex items-center gap-2 transition-colors"
                            style={{ color: BROWN_DARK }}
                          >
                            <AtSign className="h-3 w-3" style={{ color: BROWN }} />
                            <span className="font-medium">{name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={handleAddReply}
                    disabled={!newReply.trim() || submitting}
                    size="icon"
                    className="h-12 w-12 rounded-xl shrink-0 border-0 text-white"
                    style={{ background: BROWN }}
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
        {renderReportPostDialog()}
      </Layout>
    );
  }

  const headerRight = (
    <button
      onClick={() => {
        setSearchOpen(!searchOpen);
        if (searchOpen) setSearchQuery('');
      }}
      className="text-[#2C1309] hover:opacity-70 transition-colors p-2"
    >
      {searchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
    </button>
  );

  // Community detail view
  if (selectedCommunity) {
    const c = selectedCommunity;
    const isJoined = joinedCommunities.has(c.id) || c.isAdmin;
    const override = communityOverrides[c.id] || {};
    const banner = override.banner || c.banner;
    const iconUrl = override.iconUrl || c.iconUrl;
    const isAdmin = !!c.isAdmin;
    const TABS: Array<{ id: 'posts' | 'members' | 'settings'; label: string }> = [
      { id: 'posts', label: 'Posts' },
      { id: 'members', label: 'Members' },
      ...(isAdmin ? [{ id: 'settings' as const, label: 'Settings' }] : []),
    ];
    const MOCK_MEMBERS = [
      { name: currentUserName, role: isAdmin ? 'Admin' : 'Member', avatar: null },
      { name: 'Fatima Noor', role: 'Moderator', avatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200&h=200&fit=crop&crop=faces' },
      { name: 'Zayd Rahman', role: 'Member', avatar: 'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=200&h=200&fit=crop&crop=faces' },
      { name: 'Hafsa Iqbal', role: 'Member', avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=200&h=200&fit=crop&crop=faces' },
      { name: 'Bilal Ahmed', role: 'Member', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=faces' },
      { name: 'Mariam Yusuf', role: 'Member', avatar: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=200&h=200&fit=crop&crop=faces' },
    ];
    return (
      <Layout showHeader={false} pageBackgroundColor={CREAM_BG}>
        <div className="min-h-screen pb-28" style={{ background: CREAM_BG, fontFamily: "'Inter', sans-serif" }}>
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-3" style={{ background: CREAM_BG }}>
            <button
              onClick={() => setSelectedCommunity(null)}
              className="flex items-center gap-2"
              style={{ color: BROWN_DARK }}
            >
              <span className="w-8 h-8 rounded-full flex items-center justify-center" style={{ border: `1.5px solid ${BROWN_DARK}` }}>
                <ArrowLeft className="h-4 w-4" />
              </span>
              <span className="text-base font-bold">Back to Guftagu</span>
            </button>
            <button
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ border: `1.5px solid ${BROWN_DARK}`, color: BROWN_DARK }}
              aria-label="Help"
            >
              <span className="text-sm font-bold">?</span>
            </button>
          </div>

          {/* Banner */}
          <div className="w-full" style={{ aspectRatio: '16 / 9' }}>
            <img src={banner} alt={c.name} className="w-full h-full object-cover" />
          </div>

          {/* Header block */}
          <div className="px-4 relative">
            <div className="flex items-end justify-between -mt-10 mb-3">
              {iconUrl ? (
                <img
                  src={iconUrl}
                  alt={c.name}
                  className="w-20 h-20 rounded-full object-cover"
                  style={{ border: `4px solid ${CREAM_BG}`, background: '#FFFFFF' }}
                />
              ) : (
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center"
                  style={{ background: '#F4E7D2', border: `4px solid ${CREAM_BG}` }}
                >
                  <BookOpen className="h-7 w-7" style={{ color: '#A88B66' }} />
                </div>
              )}
              {!c.isAdmin && (
                <button
                  onClick={() => toggleJoinCommunity(c.id)}
                  className="px-8 py-2.5 rounded-full text-sm font-semibold text-white mb-1"
                  style={{ background: isJoined ? BROWN_DARK : BROWN }}
                >
                  {isJoined ? 'Joined' : 'Join'}
                </button>
              )}
            </div>

            <h1 className="text-2xl font-bold" style={{ color: BROWN_DARK }}>
              {c.name}
            </h1>
            <p className="text-sm mt-1" style={{ color: '#9C8569' }}>
              {c.members} · {c.type}
            </p>
            <p className="text-[15px] mt-4 leading-relaxed" style={{ color: '#3D2A1E' }}>
              {c.description}
            </p>

            {/* Tabs */}
            <div className="mt-6 mb-4 border-b flex items-center gap-6" style={{ borderColor: SOFT_BORDER }}>
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setCommunityTab(t.id)}
                  className="relative pb-2"
                >
                  <span
                    className="text-base"
                    style={{
                      color: communityTab === t.id ? BROWN : '#9C8569',
                      fontWeight: communityTab === t.id ? 700 : 500,
                    }}
                  >
                    {t.label}
                  </span>
                  {communityTab === t.id && (
                    <span className="absolute -bottom-px left-0 right-0 h-[2px] rounded-full" style={{ background: BROWN }} />
                  )}
                </button>
              ))}
            </div>

            {communityTab === 'posts' && (
              <>
                {/* Composer card */}
                <button
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="w-full mb-5 rounded-2xl text-left"
                  style={{ background: '#FFFFFF', border: `1.5px solid ${BROWN}` }}
                >
                  <div className="flex items-start gap-3 px-4 pt-4">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: '#EAD9BE' }}>
                      <User className="h-4 w-4" style={{ color: '#A88B66' }} />
                    </div>
                    <span className="text-sm pt-1" style={{ color: '#5C4632' }}>
                      Write your post here
                    </span>
                  </div>
                  <div
                    className="mt-3 mx-4 pt-3 pb-3 flex items-center justify-between"
                    style={{ borderTop: `1px solid ${SOFT_BORDER}` }}
                  >
                    <span style={{ color: BROWN_LIGHT }}>
                      <ImagePlus className="h-5 w-5" />
                    </span>
                    <span
                      className="px-6 py-1.5 rounded-full text-xs font-semibold text-white"
                      style={{ background: BROWN }}
                    >
                      Post
                    </span>
                  </div>
                </button>

                <div className="text-center py-12 rounded-2xl" style={{ background: '#FFFFFF' }}>
                  <MessageCircle className="h-8 w-8 mx-auto mb-3" style={{ color: '#C4A98A' }} />
                  <p className="font-medium text-sm" style={{ color: BROWN_DARK }}>No community posts yet</p>
                  <p className="text-xs mt-1" style={{ color: '#9C8569' }}>Start the first conversation.</p>
                </div>
              </>
            )}

            {communityTab === 'members' && (
              <div className="space-y-2 pb-6">
                {MOCK_MEMBERS.map((m) => (
                  <div
                    key={m.name}
                    className="flex items-center gap-3 p-3 rounded-2xl"
                    style={{ background: '#FFFFFF', boxShadow: '0 1px 3px rgba(123, 63, 30, 0.05)' }}
                  >
                    {m.avatar ? (
                      <img src={m.avatar} alt={m.name} className="w-11 h-11 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: '#EAD9BE' }}>
                        <User className="h-4 w-4" style={{ color: '#A88B66' }} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate" style={{ color: BROWN_DARK }}>{m.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#9C8569' }}>{m.role}</p>
                    </div>
                    {m.role === 'Admin' ? (
                      <span
                        className="px-4 py-1.5 rounded-full text-[11px] font-bold tracking-wide text-white shrink-0"
                        style={{ background: OLIVE }}
                      >
                        ADMIN
                      </span>
                    ) : (
                      <button
                        className="px-4 py-1.5 rounded-full text-xs font-semibold shrink-0"
                        style={{ background: '#FFFFFF', color: BROWN_DARK, border: `1px solid ${SOFT_BORDER}` }}
                      >
                        Message
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {communityTab === 'settings' && (
              <div className="space-y-4 pb-6">
                <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: '#9C8569' }}>
                  Community Media
                </p>

                {/* Cover photo */}
                <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', boxShadow: '0 1px 3px rgba(123, 63, 30, 0.05)' }}>
                  <div className="w-full" style={{ aspectRatio: '16 / 9' }}>
                    <img src={banner} alt="Cover" className="w-full h-full object-cover" />
                  </div>
                  <div className="p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold" style={{ color: BROWN_DARK }}>Cover photo</p>
                      <p className="text-xs mt-0.5" style={{ color: '#9C8569' }}>Shown at the top of the community page</p>
                    </div>
                    <label
                      className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold text-white cursor-pointer"
                      style={{ background: BROWN }}
                    >
                      <Camera className="h-3.5 w-3.5" />
                      Update
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          const url = await readFileAsDataUrl(f);
                          updateOverride(c.id, { banner: url });
                          toast.success('Cover photo updated');
                        }}
                      />
                    </label>
                  </div>
                </div>

                {/* Profile photo */}
                <div className="rounded-2xl p-4 flex items-center gap-4" style={{ background: '#FFFFFF', boxShadow: '0 1px 3px rgba(123, 63, 30, 0.05)' }}>
                  {iconUrl ? (
                    <img src={iconUrl} alt="Icon" className="w-16 h-16 rounded-full object-cover shrink-0" style={{ border: `1.5px solid #E8D5C4` }} />
                  ) : (
                    <div className="w-16 h-16 rounded-full flex items-center justify-center shrink-0" style={{ background: '#F4E7D2' }}>
                      <BookOpen className="h-6 w-6" style={{ color: '#A88B66' }} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold" style={{ color: BROWN_DARK }}>Profile photo</p>
                    <p className="text-xs mt-0.5" style={{ color: '#9C8569' }}>The icon for your community</p>
                  </div>
                  <label
                    className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold text-white cursor-pointer"
                    style={{ background: BROWN }}
                  >
                    <Camera className="h-3.5 w-3.5" />
                    Update
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        const url = await readFileAsDataUrl(f);
                        updateOverride(c.id, { iconUrl: url });
                        toast.success('Profile photo updated');
                      }}
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout 
      headerTitle="Guftagu" 
      headerRight={headerRight}
      headerClassName="bg-white"
      headerTitleClassName="text-[#2C1309]"
      headerTitleStyle={{ color: '#2C1309' }}
      headerButtonClassName="text-[#2C1309] hover:bg-[#2C1309]/10 hover:text-[#2C1309] border-transparent hover:border-[#2C1309]/25"
      leftAlignHeaderTitle
      disableHeaderSafeAreaPadding
      pageBackgroundColor={CREAM_BG}
    >
      <div 
        ref={containerRef}
        className="min-h-screen"
        style={{ background: CREAM_BG }}
      >
        {/* Pull to refresh indicator */}
        <div 
          className="flex items-center justify-center transition-all duration-200 overflow-hidden"
          style={{ height: pullDistance > 0 ? pullDistance : refreshing ? 50 : 0 }}
        >
          <RefreshCw 
            className={`h-5 w-5 transition-transform duration-200 ${refreshing ? 'animate-spin' : ''}`}
            style={{ 
              color: BROWN_LIGHT,
              transform: `rotate(${Math.min(pullDistance * 3, 360)}deg)`,
              opacity: pullDistance > 20 || refreshing ? 1 : 0
            }}
          />
        </div>

        <div className="relative px-4 pt-2">
          {/* Search Bar */}
          {searchOpen && (
            <div className="mb-4 animate-fade-in">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: BROWN_LIGHT }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('forum.search_placeholder')}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: '#FFFFFF', border: `1px solid ${SOFT_BORDER}`, color: BROWN_DARK }}
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex items-center mb-4 gap-6 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
            {([
              { id: 'feed', label: 'My feed' },
              { id: 'explore', label: 'Explore' },
              { id: 'communities', label: 'My Communities' },
              { id: 'bookmarks', label: 'Bookmarks' },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="relative pb-2 px-1"
              >
                <span
                  className="text-sm transition-colors"
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    color: activeTab === tab.id ? BROWN : '#9C8569',
                    fontWeight: activeTab === tab.id ? 600 : 400,
                  }}
                >
                  {tab.label}
                </span>
                {activeTab === tab.id && (
                  <div
                    className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full"
                    style={{ background: BROWN }}
                  />
                )}
              </button>
            ))}
          </div>

          {activeTab === 'bookmarks' ? (
            bookmarkedFilteredPosts.length === 0 ? (
              <div className="text-center py-16 rounded-2xl" style={{ background: '#FFFFFF' }}>
                <Bookmark className="h-9 w-9 mx-auto mb-3" style={{ color: '#C4A98A' }} />
                <p className="font-medium text-sm" style={{ color: BROWN_DARK }}>No bookmarked posts yet</p>
                <p className="text-xs mt-1" style={{ color: '#9C8569' }}>Saved posts will appear here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {bookmarkedFilteredPosts.map((post, index) => (
                  <PostCard key={post.id} post={post} index={index} />
                ))}
              </div>
            )
          ) : activeTab === 'communities' ? (
            <MyCommunitiesView
              joined={joinedCommunities}
              communities={[]}
              userCreated={userCommunities}
              onToggle={toggleJoinCommunity}
              onExplore={() => setActiveTab('explore')}
              onCreate={() => setCreateCommunityOpen(true)}
              onOpen={(c) => setSelectedCommunity(c)}
            />
          ) : activeTab === 'explore' ? (
            <ExploreView
              joined={joinedCommunities}
              communities={[]}
              category={exploreCategory}
              setCategory={setExploreCategory}
              onToggle={toggleJoinCommunity}
              onOpen={(c) => setSelectedCommunity(c)}
            />
          ) : (
            <>
              {/* Category Filter Pills - hidden on My feed per redesign */}
              <div className="hidden gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
                {CATEGORIES.map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => setSelectedCategory(id)}
                    className={cn(
                      "px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 border",
                      selectedCategory === id
                        ? "text-white border-transparent"
                        : ""
                    )}
                    style={selectedCategory === id
                      ? { background: BROWN, borderColor: 'transparent' }
                      : { background: '#FFFFFF', borderColor: SOFT_BORDER, color: BROWN_DARK }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Today's Dua Card */}
              <Card
                className="mb-5 overflow-hidden"
                style={{ background: '#fff8ed', border: '1px solid #E8D5C4' }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Pin className="h-4 w-4" style={{ color: BROWN }} />
                      <span 
                        className="text-xs font-bold uppercase tracking-wider"
                        style={{ color: BROWN }}
                      >
                        TODAY'S DUA
                      </span>
                    </div>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(`${todaysDua.arabic}\n${todaysDua.translation}`);
                        toast.success('Dua copied to clipboard');
                      }}
                      className="p-1 transition-colors"
                      style={{ color: BROWN_LIGHT }}
                    >
                      <Share2 className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-center text-lg leading-loose mb-3 font-arabic" style={{ color: BROWN_DARK }}>
                    {todaysDua.arabic}
                  </p>
                  <p className="text-xs text-center leading-relaxed" style={{ color: '#7A5C40' }}>
                    {todaysDua.translation}
                  </p>
                </CardContent>
              </Card>

              {/* Inline Composer - opens the create post dialog */}
              <button
                onClick={() => setIsCreateDialogOpen(true)}
                className="w-full mb-5 rounded-2xl text-left transition-shadow"
                style={{ background: '#FFFFFF', boxShadow: '0 1px 3px rgba(123, 63, 30, 0.06)' }}
              >
                <div className="flex items-center gap-3 px-4 pt-4">
                  <div
                    className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center shrink-0"
                    style={{ background: '#EAD9BE' }}
                  >
                    <User className="h-4 w-4" style={{ color: '#A88B66' }} />
                  </div>
                  <span className="text-sm" style={{ color: '#9C8569' }}>
                    write your post here
                  </span>
                </div>
                <div
                  className="mt-3 mx-4 pt-3 pb-3 flex items-center justify-between"
                  style={{ borderTop: `1px solid ${SOFT_BORDER}` }}
                >
                  <span style={{ color: BROWN_LIGHT }}>
                    <ImagePlus className="h-5 w-5" />
                  </span>
                  <span
                    className="px-5 py-1.5 rounded-full text-xs font-semibold"
                    style={{ background: '#EFE3CE', color: '#B59A78' }}
                  >
                    Post
                  </span>
                </div>
              </button>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="h-6 w-6 animate-spin" style={{ color: BROWN }} />
                  <p className="text-sm mt-3" style={{ color: '#9C8569' }}>Loading conversations...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredPosts.map((post, index) => (
                    <PostCard key={post.id} post={post} index={index} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Create Post Dialog - triggered from inline composer above */}
        <Dialog
          open={isCreateDialogOpen}
          onOpenChange={(open) => {
            setIsCreateDialogOpen(open);
            if (!open) {
              setNewPostImage(null);
              setShowMentionSuggestions(false);
            }
          }}
        >
          <DialogContent className="sm:max-w-md border-0"
            style={{ background: '#FFF8EA' }}
          >
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2" style={{ color: BROWN }}>
                <Sparkles className="h-5 w-5" />
                Share Your Thoughts
              </DialogTitle>
              <DialogDescription className="text-sm" style={{ color: '#9C8569' }}>
                Post a message for the community to see and engage with.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: '#EAD9BE' }}
                >
                  <User className="h-4 w-4" style={{ color: '#A88B66' }} />
                </div>
                <div className="relative flex-1">
                  <Textarea
                    value={newPostContent}
                    onChange={(e) => handleContentChange(e.target.value, 'post')}
                    placeholder={t('forum.post_placeholder')}
                    className="min-h-[120px] resize-none rounded-xl"
                    style={{ background: '#FFFFFF', color: BROWN_DARK, border: `1px solid ${SOFT_BORDER}` }}
                    maxLength={500}
                  />
                  {showMentionSuggestions && mentionTarget === 'post' && filteredSuggestions.length > 0 && (
                    <div className="absolute bottom-full left-0 right-0 mb-1 rounded-lg shadow-lg overflow-hidden z-50 border"
                      style={{ background: '#FFFFFF', borderColor: SOFT_BORDER }}
                    >
                      {filteredSuggestions.map((name) => (
                        <button
                          key={name}
                          onClick={() => insertMention(name)}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-amber-50 flex items-center gap-2 transition-colors"
                          style={{ color: BROWN_DARK }}
                        >
                          <AtSign className="h-3 w-3" style={{ color: BROWN }} />
                          <span className="font-medium">{name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {newPostImage && (
                <div className="relative rounded-xl overflow-hidden" style={{ aspectRatio: '16 / 10', background: '#EAD9BE' }}>
                  <img src={newPostImage} alt="Attached post image" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setNewPostImage(null)}
                    className="absolute right-2 top-2 h-8 w-8 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(44,19,9,0.75)', color: '#FFFFFF' }}
                    aria-label="Remove attached image"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <label
                    className="h-9 w-9 rounded-full flex items-center justify-center cursor-pointer"
                    style={{ background: '#EFE3CE', color: BROWN }}
                    aria-label="Attach image"
                  >
                    <ImagePlus className="h-4 w-4" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        handlePostImageChange(e.target.files?.[0]);
                        e.currentTarget.value = '';
                      }}
                    />
                  </label>
                  <span className="text-xs tabular-nums" style={{ color: '#9C8569' }}>
                    {newPostContent.length}/500
                  </span>
                </div>
                <Button
                  onClick={handleCreatePost}
                  disabled={(!newPostContent.trim() && !newPostImage) || submitting}
                  className="rounded-full px-6 border-0 text-white"
                  style={{ background: BROWN }}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                  Post
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <CreateCommunityDialog
          open={createCommunityOpen}
          onOpenChange={setCreateCommunityOpen}
          onCreate={handleCreateCommunity}
        />
        {renderReportPostDialog()}
      </div>
    </Layout>
  );
};
