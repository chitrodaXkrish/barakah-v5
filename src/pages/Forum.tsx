import { useState, useEffect, useCallback, useRef } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  MessageCircle, Plus, Send, ArrowLeft, Loader2, Trash2, Heart, RefreshCw, 
  Sparkles, Users, TrendingUp, Hash, AtSign, Search, X, Flag, Share2, User, ChevronRight, Pin, ImagePlus, Compass, Info, BookOpen, Check, Camera, Globe, Lock, ArrowRight
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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

// Mock posts from Ayesha Khan to populate the feed
const AYESHA_AVATAR = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=faces';
const MOCK_POSTS: Post[] = [
  {
    id: 'mock-1',
    user_id: 'mock-ayesha',
    user_name: 'Ayesha Khan',
    avatar_url: AYESHA_AVATAR,
    community: 'Quran Meaning',
    content:
      'This The whole secret of existence lies in the pursuit of meaning, purpose, and connection. It is a delicate dance between self-discovery....vcbbfvvvvvv',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    likeCount: 24,
    isLiked: true,
    replies: Array(8).fill(null).map((_, i) => ({ id: `mr-1-${i}`, post_id: 'mock-1', user_id: '', user_name: '', content: '', created_at: '' })),
    likes: [],
  },
  {
    id: 'mock-2',
    user_id: 'mock-ayesha',
    user_name: 'Ayesha Khan',
    avatar_url: AYESHA_AVATAR,
    community: 'Quran Meaning',
    image_url: 'https://images.unsplash.com/photo-1564769625905-50e93615e769?w=800&h=500&fit=crop',
    content:
      'This The whole secret of existence lies in the pursuit of meaning, purpose, and connection. It is a delicate dance between self-discovery....vcbbfvvvvvv',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    likeCount: 24,
    isLiked: false,
    replies: Array(8).fill(null).map((_, i) => ({ id: `mr-2-${i}`, post_id: 'mock-2', user_id: '', user_name: '', content: '', created_at: '' })),
    likes: [],
  },
  {
    id: 'mock-3',
    user_id: 'mock-ayesha',
    user_name: 'Ayesha Khan',
    avatar_url: AYESHA_AVATAR,
    community: 'Quran Meaning',
    content:
      'This The whole secret of existence lies in the pursuit of meaning, purpose, and connection. It is a delicate dance between self-discovery....vcbbfvvvvvv',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    likeCount: 24,
    isLiked: false,
    replies: Array(8).fill(null).map((_, i) => ({ id: `mr-3-${i}`, post_id: 'mock-3', user_id: '', user_name: '', content: '', created_at: '' })),
    likes: [],
  },
];

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
        style={{ background: '#F1E2C6', border: '1.5px dashed #C4A98A' }}
      >
        <BookOpen className="h-5 w-5" style={{ color: '#A88B66' }} />
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

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold" style={{ color: BROWN_DARK }}>
          Top Picks
        </h2>
        <button className="text-sm" style={{ color: '#9C8569' }}>
          See all
        </button>
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
              placeholder="e.g., Al-Andalus Heritage Club"
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
              placeholder="Tell the world about your circle..."
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
                <SelectValue placeholder="Select Category" />
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
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostCategory, setNewPostCategory] = useState('general');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [newReply, setNewReply] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [likingPosts, setLikingPosts] = useState<Set<string>>(new Set());
  const [allUserNames, setAllUserNames] = useState<string[]>([]);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionTarget, setMentionTarget] = useState<'post' | 'reply'>('post');
  const [profileName, setProfileName] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'feed' | 'explore' | 'communities'>('feed');
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

  // Fetch posts with their replies and likes
  const fetchPosts = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const { data: postsData, error: postsError } = await supabase
        .from('guftagu_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

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
        likesByPost[like.post_id].push(like);
      });

      const postsWithData = (postsData || []).map((post) => {
        const postLikes = likesByPost[post.id] || [];
        return {
          ...post,
          replies: repliesByPost[post.id] || [],
          likes: postLikes,
          likeCount: postLikes.length,
          isLiked: user ? postLikes.some(like => like.user_id === user.uid) : false,
        };
      });

      setPosts(postsWithData);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

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
    fetchPosts();
    fetchUserNames();

    const postsChannel = supabase
      .channel('guftagu-posts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'guftagu_posts' },
        (payload) => {
          const newPost = { ...payload.new as Post, replies: [], likes: [], likeCount: 0, isLiked: false };
          setPosts((prev) => [newPost, ...prev]);
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
        () => {
          fetchPosts(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(likesChannel);
    };
  }, [fetchPosts, fetchUserNames]);

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

  const filteredSuggestions = allUserNames
    .filter(name => name.toLowerCase().includes(mentionSearch) && name !== currentUserName)
    .slice(0, 5);

  useEffect(() => {
    if (!selectedPost) return;

    const currentPost = posts.find(p => p.id === selectedPost.id);
    if (currentPost && currentPost.replies) {
      setSelectedPost(prev => prev ? { ...prev, replies: currentPost.replies, likeCount: currentPost.likeCount, isLiked: currentPost.isLiked } : null);
    }

    const repliesChannel = supabase
      .channel(`guftagu-replies-${selectedPost.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'guftagu_replies', filter: `post_id=eq.${selectedPost.id}` },
        (payload) => {
          const newReplyData = payload.new as Reply;
          setSelectedPost((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              replies: [...(prev.replies || []), newReplyData]
            };
          });
          setPosts((prev) => prev.map(p => 
            p.id === selectedPost.id 
              ? { ...p, replies: [...(p.replies || []), newReplyData] }
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
  }, [selectedPost?.id, posts]);

  const handleCreatePost = async () => {
    if (!newPostContent.trim() || !user) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from('guftagu_posts').insert({
        user_id: user.uid,
        user_name: currentUserName,
        content: newPostContent.trim(),
        category: newPostCategory,
      });

      if (error) throw error;

      setNewPostContent('');
      setNewPostCategory('general');
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

  const handleToggleLike = async (postId: string, isCurrentlyLiked: boolean) => {
    if (postId.startsWith('mock-')) return;
    if (!user) {
      toast.error('Please sign in to like posts');
      return;
    }

    if (likingPosts.has(postId)) return;

    setLikingPosts(prev => new Set(prev).add(postId));

    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          isLiked: !isCurrentlyLiked,
          likeCount: isCurrentlyLiked ? (p.likeCount || 1) - 1 : (p.likeCount || 0) + 1
        };
      }
      return p;
    }));

    try {
      if (isCurrentlyLiked) {
        const { error } = await supabase
          .from('guftagu_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.uid);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('guftagu_likes')
          .insert({ post_id: postId, user_id: user.uid });
        if (error) throw error;
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            isLiked: isCurrentlyLiked,
            likeCount: isCurrentlyLiked ? (p.likeCount || 0) + 1 : (p.likeCount || 1) - 1
          };
        }
        return p;
      }));
      toast.error('Failed to update like');
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
      const { error } = await supabase.from('guftagu_replies').insert({
        post_id: selectedPost.id,
        user_id: user.uid,
        user_name: currentUserName,
        content: newReply.trim(),
      });

      if (error) throw error;

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

  const getCategoryBadgeColor = (category?: string) => {
    switch (category) {
      case 'general': return 'bg-amber-100 text-amber-800';
      case 'dua': return 'bg-amber-100 text-amber-800';
      case 'knowledge': return 'bg-sky-100 text-sky-700';
      default: return 'bg-amber-100 text-amber-800';
    }
  };

  const getCategoryLabel = (category?: string) => {
    return CATEGORIES.find(c => c.id === category)?.label || 'General';
  };

  const PostCard = ({ post, index = 0 }: { post: Post; index?: number }) => {
    const isOwner = user?.uid === post.user_id;
    const isLiking = likingPosts.has(post.id);
    const isBookmarked = bookmarkedPosts.has(post.id);
    const contentPreview = post.content.length > 180 ? post.content.slice(0, 180) + '...' : post.content;
    const hasMore = post.content.length > 180;

    return (
      <Card 
        className="group relative overflow-hidden border-0 animate-fade-in rounded-2xl"
        style={{ 
          animationDelay: `${index * 80}ms`,
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
                Posted in{' '}
                <span className="font-semibold" style={{ color: BROWN_LIGHT }}>
                  {post.community}
                </span>
              </span>
              <button className="hover:underline" style={{ color: '#9C8569' }}>
                view community
              </button>
            </div>
          )}
          {/* Header: Avatar + Name + Category + Time */}
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
                {!post.community && (
                  <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wide", getCategoryBadgeColor(post.category))}>
                    {getCategoryLabel(post.category)}
                  </span>
                )}
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

          {/* Image placeholder for posts with longer content (simulated feature post) */}
          {post.content.length > 250 && (
            <div 
              className="w-full h-40 rounded-xl mb-3 flex items-center justify-center"
              style={{ background: '#EAD3B0' }}
              onClick={() => setSelectedPost(post)}
            >
              <span className="text-xs uppercase tracking-widest" style={{ color: '#B59A78' }}>
                IMAGE_PLACEHOLDER
              </span>
            </div>
          )}

          {/* Actions Row */}
          <div className="flex items-center justify-between pt-3" style={{ borderTop: `1px solid ${SOFT_BORDER}` }}>
            <div className="flex items-center gap-5">
              <button
                onClick={() => handleToggleLike(post.id, post.isLiked || false)}
                disabled={isLiking}
                className="flex items-center gap-1.5 text-sm transition-colors"
                style={{ color: post.isLiked ? '#D9534F' : '#9C8569' }}
              >
                <Heart className={cn("h-4 w-4", post.isLiked && "fill-current")} />
                <span className="text-xs tabular-nums">{post.likeCount || 0}</span>
              </button>
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
              >
                <Flag className={cn("h-4 w-4", isBookmarked && "fill-current")} />
              </button>
              <button
                onClick={() => handleShare(post)}
                className="transition-colors"
                style={{ color: '#9C8569' }}
              >
                <Share2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Replies View
  if (selectedPost) {
    return (
      <Layout>
        <div className="min-h-screen pb-24" style={{ background: CREAM_BG }}>
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
                      <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium uppercase", getCategoryBadgeColor(selectedPost.category))}>
                        {getCategoryLabel(selectedPost.category)}
                      </span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: '#9C8569' }}>{formatTimeAgo(selectedPost.created_at)}</p>
                  </div>
                </div>
                <p className="text-[15px] leading-relaxed whitespace-pre-wrap" style={{ color: '#3D2A1E' }}>{renderContentWithMentions(selectedPost.content)}</p>
                
                <div className="flex items-center gap-5 mt-5 pt-4" style={{ borderTop: `1px solid ${SOFT_BORDER}` }}>
                  <div className="flex items-center gap-1.5" style={{ color: selectedPost.isLiked ? '#D9534F' : '#9C8569' }}>
                    <Heart className={cn("h-4 w-4", selectedPost.isLiked && "fill-current")} />
                    <span className="text-sm">{selectedPost.likeCount || 0}</span>
                  </div>
                  <div className="flex items-center gap-1.5" style={{ color: '#9C8569' }}>
                    <MessageCircle className="h-4 w-4" />
                    <span className="text-sm">{selectedPost.replies?.length || 0}</span>
                  </div>
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
                      className="rounded-2xl p-4 animate-fade-in"
                      style={{ 
                        animationDelay: `${index * 50}ms`,
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
                      placeholder="Write a reply..."
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
      { name: 'Ayesha Khan', role: 'Admin', avatar: AYESHA_AVATAR },
      { name: 'Fatima Noor', role: 'Moderator', avatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200&h=200&fit=crop&crop=faces' },
      { name: 'Zayd Rahman', role: 'Member', avatar: 'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=200&h=200&fit=crop&crop=faces' },
      { name: 'Hafsa Iqbal', role: 'Member', avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=200&h=200&fit=crop&crop=faces' },
      { name: 'Bilal Ahmed', role: 'Member', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=faces' },
      { name: 'Mariam Yusuf', role: 'Member', avatar: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=200&h=200&fit=crop&crop=faces' },
    ];
    return (
      <Layout showHeader={false}>
        <div className="min-h-screen pb-28" style={{ background: CREAM_BG, fontFamily: "'Inter', sans-serif" }}>
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 pt-4 pb-3" style={{ background: CREAM_BG }}>
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
                    <div className="w-9 h-9 rounded-full overflow-hidden shrink-0" style={{ background: '#EAD9BE' }}>
                      <img src={AYESHA_AVATAR} alt="" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-sm pt-1" style={{ color: '#5C4632' }}>
                      This The whole secret of existence lies in the pursuit of meaning, purpose, and connection...
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

                <div className="space-y-3">
                  {MOCK_POSTS.map((post, index) => (
                    <PostCard key={post.id} post={post} index={index} />
                  ))}
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
                    <img src={m.avatar} alt={m.name} className="w-11 h-11 rounded-full object-cover shrink-0" />
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
    >
      <div 
        ref={containerRef}
        className="min-h-screen pb-24 overflow-auto"
        style={{ background: CREAM_BG }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
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
                  placeholder="Search posts..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: '#FFFFFF', border: `1px solid ${SOFT_BORDER}`, color: BROWN_DARK }}
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex items-center mb-4 gap-6">
            {([
              { id: 'feed', label: 'My feed' },
              { id: 'explore', label: 'Explore' },
              { id: 'communities', label: 'My Communities' },
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

          {activeTab === 'communities' ? (
            <MyCommunitiesView
              joined={joinedCommunities}
              communities={COMMUNITIES}
              userCreated={userCommunities}
              onToggle={toggleJoinCommunity}
              onExplore={() => setActiveTab('explore')}
              onCreate={() => setCreateCommunityOpen(true)}
              onOpen={(c) => setSelectedCommunity(c)}
            />
          ) : activeTab === 'explore' ? (
            <ExploreView
              joined={joinedCommunities}
              communities={COMMUNITIES}
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
                  {[...filteredPosts, ...MOCK_POSTS].map((post, index) => (
                    <PostCard key={post.id} post={post} index={index} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Create Post Dialog - triggered from inline composer above */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
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
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4" style={{ color: BROWN_LIGHT }} />
                <Select value={newPostCategory} onValueChange={setNewPostCategory}>
                  <SelectTrigger className="w-[180px] text-sm" style={{ background: '#FFFFFF', borderColor: SOFT_BORDER, color: BROWN_DARK }}>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent style={{ background: '#FFFFFF' }}>
                    {CATEGORIES.filter(c => c.id !== 'all').map(({ id, label }) => (
                      <SelectItem key={id} value={id}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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
                    placeholder="What's on your mind..."
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
              <div className="flex items-center justify-between">
                <span className="text-xs tabular-nums" style={{ color: '#9C8569' }}>
                  {newPostContent.length}/500
                </span>
                <Button
                  onClick={handleCreatePost}
                  disabled={!newPostContent.trim() || submitting}
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
      </div>
    </Layout>
  );
};
