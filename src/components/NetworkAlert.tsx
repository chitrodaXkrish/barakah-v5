import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';
import { Network } from '@capacitor/network';
import { Capacitor } from '@capacitor/core';
import { Button } from '@/components/ui/button';

export const NetworkAlert = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Initial check
    const checkStatus = async () => {
      if (Capacitor.isNativePlatform()) {
        const status = await Network.getStatus();
        setIsOnline(status.connected);
        if (status.connected) setIsDismissed(false);
      } else {
        setIsOnline(navigator.onLine);
        if (navigator.onLine) setIsDismissed(false);
      }
    };
    
    checkStatus();

    // Listeners
    if (Capacitor.isNativePlatform()) {
      const listener = Network.addListener('networkStatusChange', status => {
        setIsOnline(status.connected);
        if (status.connected) setIsDismissed(false);
      });
      return () => {
        listener.then(l => l.remove());
      };
    } else {
      const handleOnline = () => {
        setIsOnline(true);
        setIsDismissed(false);
      };
      const handleOffline = () => setIsOnline(false);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  if (isOnline || isDismissed) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl flex flex-col items-center text-center animate-in fade-in zoom-in duration-300">
        <div className="h-16 w-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
          <WifiOff className="h-8 w-8 text-red-600 dark:text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          No Internet Connection
        </h2>
        <p className="text-slate-600 dark:text-slate-300 mb-6 text-sm">
          Barakah requires an active internet connection. Please check your network settings and try again.
        </p>
        <Button 
          onClick={() => setIsDismissed(true)} 
          className="w-full"
        >
          Okay
        </Button>
      </div>
    </div>
  );
};
