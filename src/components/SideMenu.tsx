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
import { Capacitor } from '@capacitor/core';
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
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.barakah.services';
const APP_STORE_URL = 'https://apps.apple.com/app/barakah-islamic-lifestyle-app/id6792232643';

export const SideMenu = ({ isOpen, onClose }: SideMenuProps) => {
  const navigate = useNavigate();
  const { user, userRole, signOut } = useAuth();
  const { location } = useGlobalLocation();
  const { language, setLanguage, t } = useLanguage();

  const [notifications, setNotifications] = useState<boolean>(() => {
    return localStorage.getItem('barakah_notifications_enabled') !== 'false';
  });
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
  const [notificationHistory, setNotificationHistory] = useState<Array<{ id: string; title: string; body: string; receivedAt: number }>>([]);
  const [profileName, setProfileName] = useState<string | null>(null);
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
    const cacheKey = `barakah_home_notifications_${user?.uid || 'guest'}`;
    try {
      const parsed = JSON.parse(localStorage.getItem(cacheKey) || '[]');
      if (Array.isArray(parsed)) {
        setNotificationHistory(
          parsed
            .filter((item: any) => item && typeof item.id === 'string' && typeof item.title === 'string' && typeof item.body === 'string')
            .sort((a: any, b: any) => (b.receivedAt || 0) - (a.receivedAt || 0)),
        );
      }
    } catch {
      setNotificationHistory([]);
    }
  }, [isOpen, user?.uid]);

  useEffect(() => {
    let active = true;

    const loadProfileName = async () => {
      if (!user?.uid) {
        setProfileName(null);
        return;
      }

      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.uid)
        .maybeSingle();

      if (active) setProfileName(data?.full_name?.trim() || null);
    };

    loadProfileName();
    window.addEventListener('barakah-profile-updated', loadProfileName);

    return () => {
      active = false;
      window.removeEventListener('barakah-profile-updated', loadProfileName);
    };
  }, [user?.uid]);

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
    try {
      await signOut();
      onClose();
      navigate('/login', { replace: true });
    } catch {
      toast.error(t('menu.sign_out_error'));
    }
  };

  const handleShare = async () => {
    const platform = Capacitor.getPlatform();
    const primaryUrl = platform === 'ios' ? APP_STORE_URL : PLAY_STORE_URL;
    const shareText = `${t('menu.share_text')}\n\nPlay Store: ${PLAY_STORE_URL}\nApp Store: ${APP_STORE_URL}`;
    const shareData = {
      title: t('app.name'),
      text: shareText,
      url: primaryUrl,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareText);
        toast.success(t('menu.link_copied'));
      }
    } catch {
      /* user cancelled */
    }
  };

  const displayName =
    profileName ||
    user?.displayName ||
    user?.email?.split('@')[0] ||
    t('menu.guest_user');
  const initial = (displayName?.[0] || 'U').toUpperCase();
  const locationLabel = location ? `${location.area || location.city}${location.country ? ', ' + location.country : ''}` : t('home.set_location');
  const currentLang = LANGUAGE_OPTIONS.find(l => l.code === language)?.nativeLabel || 'English';
  const accountLabel = user?.email?.toLowerCase().endsWith('@privaterelay.appleid.com')
    ? 'Apple ID'
    : user?.email || '+00 000 000 000';
  const nativeSafeAreaTop = Capacitor.isNativePlatform()
    ? 'max(var(--safe-area-inset-top), 24px)'
    : 'var(--safe-area-inset-top)';
  const nativeSafeAreaBottom = Capacitor.isNativePlatform()
    ? 'max(var(--safe-area-inset-bottom), 16px)'
    : 'var(--safe-area-inset-bottom)';

  return (
    <>
      <div
        className={cn(
          'fixed left-0 right-0 z-40 transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        style={{
          top: nativeSafeAreaTop,
          bottom: nativeSafeAreaBottom,
          backgroundColor: 'rgba(44, 19, 9, 0.35)',
        }}
        onClick={onClose}
      />

      <aside
        className={cn(
          'fixed left-0 w-[86vw] max-w-[360px] z-50 shadow-2xl transform transition-transform duration-300 ease-out flex flex-col',
          isOpen ? 'translate-x-0 pointer-events-auto' : '-translate-x-full pointer-events-none'
        )}
        style={{
          top: nativeSafeAreaTop,
          bottom: nativeSafeAreaBottom,
          backgroundColor: CREAM,
          borderTopRightRadius: 32,
          borderBottomRightRadius: 32,
          fontFamily: SERIF,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-0 pb-6">
          <div className="px-6 pt-4 pb-2 flex items-center justify-between">
            <button
              onClick={onClose}
              aria-label="Back"
              className="w-11 h-11 rounded-full flex items-center justify-center transition-transform active:scale-95"
              style={{ border: `1.5px solid ${BROWN}`, color: BROWN }}
            >
              <ArrowLeft className="w-5 h-5" strokeWidth={1.8} />
            </button>
          </div>

          <div className="px-6 pb-4 flex items-center gap-4">
            <div className="relative">
              <div
                className="w-[74px] h-[74px] rounded-full overflow-hidden flex items-center justify-center text-2xl font-semibold"
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

            <div className="min-w-0">
              <p className="text-[26px] leading-none font-bold truncate" style={{ color: BROWN }}>
                {displayName}
              </p>
              <p className="mt-2 text-[16px]" style={{ color: BROWN, opacity: 0.8 }}>
                {accountLabel}
              </p>
            </div>
          </div>

          <div className="px-5 pb-6 grid grid-cols-3 gap-3">
            <MenuTile
              icon={<ShoppingBag className="w-[28px] h-[28px]" strokeWidth={1.8} />}
              label={t('menu.orders')}
              onClick={() => go(userRole === 'seller' ? '/seller/orders' : '/cart')}
              badge={orderCount > 0 ? (orderCount > 9 ? '9+' : String(orderCount)) : null}
            />
            <MenuTile
              icon={<HelpCircle className="w-[28px] h-[28px]" strokeWidth={1.8} />}
              label={t('menu.help_support')}
              onClick={() => go('/faq')}
            />
            <MenuTile
              icon={<Bell className="w-[28px] h-[28px]" strokeWidth={1.8} />}
              label={t('menu.notifications')}
              onClick={() => setShowNotificationsPanel((prev) => !prev)}
            />
          </div>

          {showNotificationsPanel && (
            <div className="px-5 pb-4">
              <div className="rounded-2xl border p-3" style={{ borderColor: 'rgba(44,19,9,0.12)', background: 'rgba(255,255,255,0.25)' }}>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[14px] font-bold" style={{ color: BROWN }}>Past notifications</p>
                  <button
                    type="button"
                    onClick={() => setShowNotificationsPanel(false)}
                    className="text-[12px] font-medium"
                    style={{ color: ACCENT_ORANGE }}
                  >
                    Close
                  </button>
                </div>
                <div className="max-h-[220px] space-y-2 overflow-y-auto">
                  {notificationHistory.length > 0 ? (
                    notificationHistory.map((item) => (
                      <div key={item.id} className="rounded-xl border px-3 py-2" style={{ borderColor: 'rgba(44,19,9,0.08)', background: 'rgba(255,255,255,0.12)' }}>
                        <p className="text-[13px] font-semibold" style={{ color: BROWN }}>{item.title}</p>
                        <p className="mt-1 text-[12px] leading-snug" style={{ color: MUTED }}>{item.body}</p>
                        <p className="mt-1 text-[10px]" style={{ color: ACCENT_ORANGE }}>
                          {new Date(item.receivedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-[12px]" style={{ color: MUTED }}>No past notifications yet.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="px-5">
            <h3 className="text-[22px] font-bold mb-3" style={{ color: BROWN }}>Profile</h3>

            <div className="space-y-0 rounded-2xl overflow-hidden border" style={{ borderColor: 'rgba(44,19,9,0.12)', background: 'rgba(255,255,255,0.28)' }}>
              <ListRow
                icon={<User className="w-[22px] h-[22px]" strokeWidth={1.8} />}
                label={t('menu.view_edit_profile')}
                onClick={() => go('/account')}
              />

              {userRole === 'seller' && (
                <ListRow
                  icon={<LayoutDashboard className="w-[22px] h-[22px]" strokeWidth={1.8} />}
                  label={t('menu.seller_dashboard')}
                  onClick={() => go('/seller-dashboard')}
                />
              )}

              <ListRow
                icon={<MapPin className="w-[22px] h-[22px]" strokeWidth={1.8} />}
                label={t('menu.location')}
                onClick={() => go('/places')}
                trailing={<span className="text-[14px]" style={{ color: ACCENT_ORANGE, fontFamily: SERIF }}>{locationLabel}</span>}
              />

              <ListRow
                icon={<Globe className="w-[22px] h-[22px]" strokeWidth={1.8} />}
                label={t('menu.language')}
                onClick={() => setLangOpen(true)}
                trailing={<span className="text-[14px]" style={{ color: ACCENT_ORANGE }}>{currentLang}</span>}
              />

              <ListRow
                icon={<LayoutGrid className="w-[22px] h-[22px]" strokeWidth={1.8} />}
                label={t('menu.widget_setup')}
                onClick={() => { toast.info(t('menu.widget_coming_soon')); onClose(); }}
              />

              <ListRow
                icon={<Share2 className="w-[22px] h-[22px]" strokeWidth={1.8} />}
                label={t('menu.share_app')}
                onClick={handleShare}
              />

              <ListRow
                icon={<Info className="w-[22px] h-[22px]" strokeWidth={1.8} />}
                label={t('menu.about_us')}
                onClick={() => go('/about-us')}
              />

              <ListRow
                icon={<Shield className="w-[22px] h-[22px]" strokeWidth={1.8} />}
                label={t('menu.privacy_policy')}
                onClick={() => go('/privacy-policy')}
              />

              <ListRow
                icon={<FileText className="w-[22px] h-[22px]" strokeWidth={1.8} />}
                label={t('menu.terms_of_service')}
                onClick={() => go('/terms-of-service')}
              />
            </div>

            <div className="pt-6 pb-2">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 text-[18px] font-semibold transition-opacity active:opacity-70"
                style={{ color: '#D63A1F' }}
              >
                <LogOut className="w-[22px] h-[22px]" strokeWidth={2} />
                {t('menu.sign_out')}
              </button>
            </div>
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

const MenuTile = ({
  icon,
  label,
  onClick,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  badge?: string | null;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="relative flex flex-col items-center justify-center rounded-[18px] p-3 min-h-[110px] transition-transform active:scale-[0.98]"
    style={{ background: 'transparent', border: 'none', color: BROWN }}
  >
    {badge && (
      <span
        className="absolute right-2 top-2 min-w-[20px] h-5 rounded-full flex items-center justify-center px-1 text-[11px] font-semibold text-white"
        style={{ background: BADGE_BROWN }}
      >
        {badge}
      </span>
    )}
    <span className="mb-2 flex items-center justify-center" style={{ color: BROWN }}>
      {icon}
    </span>
    <span className="text-center text-[15px] font-semibold leading-tight" style={{ color: BROWN }}>
      {label}
    </span>
  </button>
);

const ListRow = ({
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
    className="w-full flex items-center gap-4 px-4 py-4 border-b last:border-b-0 transition-colors active:bg-[#F5E6D0]"
    style={{ color: BROWN, borderColor: 'rgba(44,19,9,0.08)' }}
  >
    <span className="flex items-center justify-center w-9 h-9" style={{ color: BROWN }}>
      {icon}
    </span>
    <span className="flex-1 text-left text-[17px] font-semibold" style={{ color: BROWN }}>
      {label}
    </span>
    {trailing ?? <span aria-hidden className="text-[26px] leading-none" style={{ color: '#6D584A' }}>›</span>}
  </button>
);
