import {
  ShoppingBag,
  HelpCircle,
  MapPin,
  Bell,
  Globe,
  LayoutGrid,
  Share2,
  Info,
  Shield,
  FileText,
  LogOut,
  ArrowLeft,
  Check,
  LayoutDashboard,
  User,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useGlobalLocation } from '@/contexts/LocationContext';
import { LANGUAGE_OPTIONS, useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cancelPrayerNotifications } from '@/lib/prayerNotifications';

interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const CREAM = '#FFF8F3';
const BROWN = '#2C1309';
const BROWN_ACCENT = '#5A2A18';
const BADGE_BROWN = '#4A2418';
const ACCENT_ORANGE = '#B54A22';
const MUTED = '#9A8270';
const SERIF = "'Plus Jakarta Sans', sans-serif";
const ITALIC = "'Cormorant Garamond', 'Plus Jakarta Sans', sans-serif";

export const SideMenu = ({ isOpen, onClose }: SideMenuProps) => {
  const navigate = useNavigate();
  const { user, userRole, signOut } = useAuth();
  const { location } = useGlobalLocation();
  const { language, setLanguage, t } = useLanguage();

  const [notifications, setNotifications] = useState<boolean>(() => {
    return localStorage.getItem('barakah_notifications_enabled') !== 'false';
  });
  const [langOpen, setLangOpen] = useState(false);
  const [orderCount, setOrderCount] = useState(0);

  useEffect(() => {
    localStorage.setItem('barakah_notifications_enabled', notifications ? 'true' : 'false');
    window.dispatchEvent(
      new CustomEvent('barakah-notification-setting-changed', {
        detail: { enabled: notifications },
      }),
    );

    if (!notifications) {
      cancelPrayerNotifications().catch(() => undefined);
    }
  }, [notifications]);

  useEffect(() => {
    if (!isOpen || !user?.uid) {
      setOrderCount(0);
      return;
    }

    const activeStatuses = new Set(['new', 'pending', 'paid', 'processing', 'shipped']);
    const field = userRole === 'seller' ? 'seller_id' : 'user_id';

    const fetchOrderCount = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, status')
        .eq(field, user.uid);

      if (error) {
        setOrderCount(0);
        return;
      }

      setOrderCount((data || []).filter((order) => activeStatuses.has(order.status)).length);
    };

    fetchOrderCount();

    const channel = supabase
      .channel(`side-menu-orders-${field}-${user.uid}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `${field}=eq.${user.uid}`,
        },
        fetchOrderCount,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, user?.uid, userRole]);

  const go = (path: string) => {
    navigate(path);
    onClose();
  };

  const handleLogout = async () => {
    shareData.text = t('menu.share_text');
    try {
      await signOut();
      onClose();
      navigate('/login');
    } catch {
      toast.error(t('menu.sign_out_error'));
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: t('app.name'),
      text: t('menu.share_text'),
      url: window.location.origin,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        toast.success(t('menu.link_copied'));
      }
    } catch {
      /* user cancelled */
    }
  };

  const displayName =
    user?.displayName ||
    user?.email?.split('@')[0] ||
    t('menu.guest_user');
  const initial = (displayName?.[0] || 'U').toUpperCase();
  const locationLabel = location ? `${location.area || location.city}${location.country ? ', ' + location.country : ''}` : t('home.set_location');
  const currentLang = LANGUAGE_OPTIONS.find(l => l.code === language)?.nativeLabel || 'English';

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        style={{ backgroundColor: 'rgba(44, 19, 9, 0.35)' }}
        onClick={onClose}
      />

      <aside
        className={cn(
          'fixed top-0 left-0 h-full w-[86vw] max-w-[360px] z-50 shadow-2xl transform transition-transform duration-300 ease-out flex flex-col',
          isOpen ? 'translate-x-0 pointer-events-auto' : '-translate-x-full pointer-events-none'
        )}
        style={{
          backgroundColor: CREAM,
          borderTopRightRadius: 32,
          borderBottomRightRadius: 32,
          fontFamily: SERIF,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: avatar + back */}
        <div className="px-6 pt-7 pb-2 flex items-start justify-between">
          <div className="relative">
            <div
              className="w-[72px] h-[72px] rounded-full overflow-hidden flex items-center justify-center text-2xl font-semibold"
              style={{
                border: `2px solid ${ACCENT_ORANGE}`,
                color: BROWN,
                background: '#E8D3AE',
                fontFamily: SERIF,
              }}
            >
              {user?.photoURL ? (
                <img src={user.photoURL} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <span>{initial}</span>
              )}
            </div>
            <span
              className="absolute bottom-0 right-1 w-3.5 h-3.5 rounded-full"
              style={{ background: '#B54A22', border: `2px solid ${CREAM}` }}
            />
          </div>

          <button
            onClick={onClose}
            aria-label="Close menu"
            className="w-11 h-11 rounded-full flex items-center justify-center transition-transform active:scale-95"
            style={{ border: `1.5px solid ${BROWN}`, color: BROWN }}
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={1.8} />
          </button>
        </div>

        <div className="px-6 pb-4">
          <h2
            className="text-[22px] italic"
            style={{ color: BROWN_ACCENT, fontFamily: ITALIC, fontWeight: 500 }}
          >
            {displayName}
          </h2>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-2 pb-6">
          <Section title={t('menu.section.profile')}>
            <Row
              icon={<User className="w-[22px] h-[22px]" strokeWidth={1.8} />}
              label={t('menu.view_edit_profile')}
              onClick={() => go('/account')}
            />
          </Section>

          {userRole === 'seller' && (
            <Section title={t('menu.section.seller')}>
              <Row
                icon={<LayoutDashboard className="w-[22px] h-[22px]" strokeWidth={1.8} />}
                label={t('menu.seller_dashboard')}
                onClick={() => go('/seller-dashboard')}
              />
            </Section>
          )}

          <Section title={t('menu.section.orders')}>
            <Row
              icon={<ShoppingBag className="w-[22px] h-[22px]" strokeWidth={1.8} />}
              label={t('menu.orders')}
              onClick={() => go(userRole === 'seller' ? '/seller/orders' : '/cart')}
              trailing={
                orderCount > 0 ? (
                  <span
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-semibold text-white"
                    style={{ background: BADGE_BROWN }}
                  >
                    {orderCount > 9 ? '9+' : orderCount}
                  </span>
                ) : null
              }
            />
          </Section>

          <Section title={t('menu.section.help')}>
            <Row
              icon={<HelpCircle className="w-[22px] h-[22px]" strokeWidth={1.8} />}
              label={t('menu.help_support')}
              onClick={() => go('/faq')}
            />
          </Section>

          <Section title={t('menu.section.preferences')}>
            <Row
              icon={<MapPin className="w-[22px] h-[22px]" strokeWidth={1.8} />}
              label={t('menu.location')}
              onClick={() => go('/places')}
              trailing={
                <span className="text-[14px]" style={{ color: ACCENT_ORANGE, fontFamily: SERIF }}>
                  {locationLabel}
                </span>
              }
            />
            <Row
              icon={<Bell className="w-[22px] h-[22px]" strokeWidth={1.8} />}
              label={t('menu.notifications')}
              onClick={() => setNotifications(v => !v)}
              trailing={
                <button
                  onClick={(e) => { e.stopPropagation(); setNotifications(v => !v); }}
                  aria-label={t('menu.toggle_notifications')}
                  className="relative w-[46px] h-[26px] rounded-full transition-colors"
                  style={{ background: notifications ? ACCENT_ORANGE : '#C9B89D' }}
                >
                  <span
                    className="absolute top-[3px] w-5 h-5 rounded-full bg-white shadow transition-all"
                    style={{ left: notifications ? 23 : 3 }}
                  />
                </button>
              }
            />
            <Row
              icon={<Globe className="w-[22px] h-[22px]" strokeWidth={1.8} />}
              label={t('menu.language')}
              onClick={() => setLangOpen(true)}
              trailing={
                <span className="text-[14px]" style={{ color: ACCENT_ORANGE }}>
                  {currentLang}
                </span>
              }
            />
          </Section>

          <Section title={t('menu.section.app_setup')}>
            <Row
              icon={<LayoutGrid className="w-[22px] h-[22px]" strokeWidth={1.8} />}
              label={t('menu.widget_setup')}
              onClick={() => { toast.info(t('menu.widget_coming_soon')); onClose(); }}
            />
            <Row
              icon={<Share2 className="w-[22px] h-[22px]" strokeWidth={1.8} />}
              label={t('menu.share_app')}
              onClick={handleShare}
            />
          </Section>

          <Section title={t('menu.section.legal')}>
            <Row
              icon={<Info className="w-[22px] h-[22px]" strokeWidth={1.8} />}
              label={t('menu.about_us')}
              onClick={() => { toast.info('Barakah App · v1.0'); }}
            />
            <Row
              icon={<Shield className="w-[22px] h-[22px]" strokeWidth={1.8} />}
              label={t('menu.privacy_policy')}
              onClick={() => go('/privacy-policy')}
            />
            <Row
              icon={<FileText className="w-[22px] h-[22px]" strokeWidth={1.8} />}
              label={t('menu.terms_of_service')}
              onClick={() => go('/terms-of-service')}
            />
          </Section>

          <div className="px-4 pt-6">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 text-[17px] font-semibold transition-opacity active:opacity-70"
              style={{ color: '#D63A1F' }}
            >
              <LogOut className="w-[22px] h-[22px]" strokeWidth={2} />
              {t('menu.sign_out')}
            </button>
          </div>
        </div>

        {/* Language picker sheet */}
        {langOpen && (
          <div
            className="absolute inset-0 z-10 flex items-end"
            style={{ background: 'rgba(44,19,9,0.3)' }}
            onClick={() => setLangOpen(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full p-5 pb-7"
              style={{
                background: CREAM,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
              }}
            >
              <div className="mx-auto w-10 h-1 rounded-full mb-4" style={{ background: '#D9C39E' }} />
              <h3 className="text-[18px] font-semibold mb-3" style={{ color: BROWN }}>
                {t('language.select')}
              </h3>
              <div className="max-h-[280px] overflow-y-auto -mx-1">
                {LANGUAGE_OPTIONS.map(opt => {
                  const active = opt.code === language;
                  return (
                    <button
                      key={opt.code}
                      onClick={() => { setLanguage(opt.code); setLangOpen(false); }}
                      className="w-full flex items-center justify-between px-3 py-3 rounded-xl"
                      style={{ color: BROWN, background: active ? '#F5E6D0' : 'transparent' }}
                    >
                      <span className="text-[15px]">{opt.nativeLabel}</span>
                      <span className="ml-auto mr-3 text-[12px]" style={{ color: MUTED }}>
                        {t(opt.labelKey)}
                      </span>
                      {active && <Check className="w-4 h-4" style={{ color: ACCENT_ORANGE }} />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};

/* ---------- helpers ---------- */

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="px-4 pt-5">
    <div
      className="text-[12px] tracking-[0.18em] mb-1 px-1"
      style={{ color: MUTED, fontWeight: 600 }}
    >
      {title}
    </div>
    <div>{children}</div>
  </div>
);

const Row = ({
  icon,
  label,
  onClick,
  trailing,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  trailing?: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full flex items-center gap-4 px-3 py-3 rounded-xl transition-colors active:bg-[#F5E6D0]"
    style={{ color: BROWN }}
  >
    <span className="flex items-center justify-center w-9 h-9" style={{ color: BROWN }}>
      {icon}
    </span>
    <span className="flex-1 text-left text-[17px] font-semibold" style={{ color: BROWN }}>
      {label}
    </span>
    {trailing}
  </button>
);
