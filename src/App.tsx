import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { CartProvider } from "./contexts/CartContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { LocationProvider } from "./contexts/LocationContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { PrayerTimesProvider } from "./contexts/PrayerTimesContext";

// Eager — needed for first paint / auth flow
import { Home } from "./pages/Home";
import { LoadingScreen } from "./pages/LoadingScreen";
import { Register } from "./pages/Register";
import { Onboarding } from "./pages/Onboarding";

// Lazy — split per route to shrink the initial bundle
const Quran = lazy(() => import("./pages/Quran").then(m => ({ default: m.Quran })));
const Qibla = lazy(() => import("./pages/Qibla").then(m => ({ default: m.Qibla })));
const Shop = lazy(() => import("./pages/Shop").then(m => ({ default: m.Shop })));
const ShopCategories = lazy(() => import("./pages/ShopCategories").then(m => ({ default: m.ShopCategories })));
const ProductDetail = lazy(() => import("./pages/ProductDetail").then(m => ({ default: m.ProductDetail })));
const Places = lazy(() => import("./pages/Places").then(m => ({ default: m.Places })));
const Account = lazy(() => import("./pages/Account").then(m => ({ default: m.Account })));
const PrayerTimes = lazy(() => import("./pages/PrayerTimes").then(m => ({ default: m.PrayerTimes })));
const Progress = lazy(() => import("./pages/Progress").then(m => ({ default: m.Progress })));
const MonthlyStreak = lazy(() => import("./pages/MonthlyStreak").then(m => ({ default: m.MonthlyStreak })));
const FAQ = lazy(() => import("./pages/FAQ").then(m => ({ default: m.FAQ })));
const Zakat = lazy(() => import("./pages/Zakat").then(m => ({ default: m.Zakat })));
const ZakatResult = lazy(() => import("./pages/ZakatResult").then(m => ({ default: m.ZakatResult })));
const Hajj = lazy(() => import("./pages/Hajj").then(m => ({ default: m.Hajj })));
const BusinessAccount = lazy(() => import("./pages/BusinessAccount").then(m => ({ default: m.BusinessAccount })));
const Cart = lazy(() => import("./pages/Cart").then(m => ({ default: m.Cart })));
const Checkout = lazy(() => import("./pages/Checkout").then(m => ({ default: m.Checkout })));
const ShippingAddresses = lazy(() => import("./pages/ShippingAddresses").then(m => ({ default: m.ShippingAddresses })));
const AddShippingAddress = lazy(() => import("./pages/AddShippingAddress").then(m => ({ default: m.AddShippingAddress })));
const OrderConfirmation = lazy(() => import("./pages/OrderConfirmation").then(m => ({ default: m.OrderConfirmation })));
const SellerDashboard = lazy(() => import("./pages/SellerDashboard").then(m => ({ default: m.SellerDashboard })));
const SellerOnboarding = lazy(() => import("./pages/SellerOnboarding").then(m => ({ default: m.SellerOnboarding })));
const SellerProducts = lazy(() => import("./pages/seller/SellerProducts").then(m => ({ default: m.SellerProducts })));
const SellerAddProduct = lazy(() => import("./pages/seller/SellerAddProduct").then(m => ({ default: m.SellerAddProduct })));
const SellerOrdersPage = lazy(() => import("./pages/seller/SellerOrdersPage").then(m => ({ default: m.SellerOrdersPage })));
const SellerOrderDetail = lazy(() => import("./pages/seller/SellerOrderDetail").then(m => ({ default: m.SellerOrderDetail })));
const SellerEarnings = lazy(() => import("./pages/seller/SellerEarnings").then(m => ({ default: m.SellerEarnings })));
const MakkahLive = lazy(() => import("./pages/MakkahLive").then(m => ({ default: m.MakkahLive })));
const Forum = lazy(() => import("./pages/Forum").then(m => ({ default: m.Forum })));
const News = lazy(() => import("./pages/News").then(m => ({ default: m.News })));
const NewsDetail = lazy(() => import("./pages/NewsDetail").then(m => ({ default: m.NewsDetail })));
const Mood = lazy(() => import("./pages/Mood").then(m => ({ default: m.Mood })));
const HalalScanner = lazy(() => import("./pages/HalalScanner").then(m => ({ default: m.HalalScanner })));
const Hadith = lazy(() => import("./pages/Hadith").then(m => ({ default: m.Hadith })));
const HadithBook = lazy(() => import("./pages/HadithBook").then(m => ({ default: m.HadithBook })));
const PrivacyPolicy = lazy(() => import("./pages/legal/PrivacyPolicy").then(m => ({ default: m.PrivacyPolicy })));
const TermsOfService = lazy(() => import("./pages/legal/TermsOfService").then(m => ({ default: m.TermsOfService })));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const OrdersRedirect = () => {
  const { userRole } = useAuth();
  return <Navigate to={userRole === 'seller' ? '/seller/orders' : '/account'} replace />;
};

const RouteFallback = () => (
  <div
    className="min-h-screen max-w-md mx-auto"
    style={{ backgroundColor: "#FFF5E5" }}
    aria-label="Loading"
  />
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <LanguageProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthProvider>
            <LocationProvider>
              <PrayerTimesProvider>
                <CartProvider>
                  <Toaster />
                  <Sonner />
                  <Suspense fallback={<RouteFallback />}>
                  <Routes>
                    <Route path="/loading" element={<LoadingScreen />} />
                    <Route path="/login" element={<Register />} />
                    <Route path="/onboarding" element={<Onboarding />} />
                    <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
                    <Route path="/quran" element={<ProtectedRoute><Quran /></ProtectedRoute>} />
                    <Route path="/qibla" element={<ProtectedRoute><Qibla /></ProtectedRoute>} />
                    <Route path="/marketplace" element={<Navigate to="/shop" replace />} />
                    <Route path="/shop" element={<ProtectedRoute><Shop /></ProtectedRoute>} />
                    <Route path="/shop/categories" element={<ProtectedRoute><ShopCategories /></ProtectedRoute>} />
                    <Route path="/shop/product/:id" element={<ProtectedRoute><ProductDetail /></ProtectedRoute>} />
                    <Route path="/forum" element={<ProtectedRoute><Forum /></ProtectedRoute>} />
                    <Route path="/places" element={<ProtectedRoute><Places /></ProtectedRoute>} />
                    <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
                    <Route path="/seller-dashboard" element={<ProtectedRoute><SellerDashboard /></ProtectedRoute>} />
                    <Route path="/seller-onboarding" element={<ProtectedRoute><SellerOnboarding /></ProtectedRoute>} />
                    <Route path="/seller/products" element={<ProtectedRoute><SellerProducts /></ProtectedRoute>} />
                    <Route path="/seller/products/new" element={<ProtectedRoute><SellerAddProduct /></ProtectedRoute>} />
                    <Route path="/seller/orders" element={<ProtectedRoute><SellerOrdersPage /></ProtectedRoute>} />
                    <Route path="/seller/orders/:id" element={<ProtectedRoute><SellerOrderDetail /></ProtectedRoute>} />
                    <Route path="/seller/earnings" element={<ProtectedRoute><SellerEarnings /></ProtectedRoute>} />
                    <Route path="/prayer-times" element={<ProtectedRoute><PrayerTimes /></ProtectedRoute>} />
                    <Route path="/progress" element={<ProtectedRoute><Progress /></ProtectedRoute>} />
                    <Route path="/monthly-streak" element={<ProtectedRoute><MonthlyStreak /></ProtectedRoute>} />
                    <Route path="/faq" element={<ProtectedRoute><FAQ /></ProtectedRoute>} />
                    <Route path="/zakat" element={<ProtectedRoute><Zakat /></ProtectedRoute>} />
                    <Route path="/zakat-result" element={<ProtectedRoute><ZakatResult /></ProtectedRoute>} />
                    <Route path="/hajj" element={<ProtectedRoute><Hajj /></ProtectedRoute>} />
                    <Route path="/business-account" element={<ProtectedRoute><BusinessAccount /></ProtectedRoute>} />
                    <Route path="/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
                    <Route path="/orders" element={<ProtectedRoute><OrdersRedirect /></ProtectedRoute>} />
                    <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
                    <Route path="/shipping-address" element={<ProtectedRoute><ShippingAddresses /></ProtectedRoute>} />
                    <Route path="/shipping-address/new" element={<ProtectedRoute><AddShippingAddress /></ProtectedRoute>} />
                    <Route path="/shipping-address/edit/:id" element={<ProtectedRoute><AddShippingAddress /></ProtectedRoute>} />
                    <Route path="/order-confirmation/:orderId" element={<ProtectedRoute><OrderConfirmation /></ProtectedRoute>} />
                    <Route path="/makkah-live" element={<ProtectedRoute><MakkahLive /></ProtectedRoute>} />
                    <Route path="/news" element={<ProtectedRoute><News /></ProtectedRoute>} />
                    <Route path="/news/:id" element={<ProtectedRoute><NewsDetail /></ProtectedRoute>} />
                    <Route path="/mood" element={<ProtectedRoute><Mood /></ProtectedRoute>} />
                    <Route path="/halal-scanner" element={<ProtectedRoute><HalalScanner /></ProtectedRoute>} />
                    <Route path="/hadith" element={<ProtectedRoute><Hadith /></ProtectedRoute>} />
                    <Route path="/hadith/:slug" element={<ProtectedRoute><HadithBook /></ProtectedRoute>} />
                    <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                    <Route path="/terms-of-service" element={<TermsOfService />} />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                  </Suspense>
                </CartProvider>
              </PrayerTimesProvider>
            </LocationProvider>
          </AuthProvider>
        </BrowserRouter>
      </LanguageProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
