import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import toast from 'react-hot-toast';

const ROOT_PATHS = ['/dashboard', '/login'];

/** Wires the Android hardware back button to in-app navigation instead of the OS default
 * (do nothing, or exit immediately). No-ops outside the native Capacitor shell. */
export function useAndroidBackButton() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationRef = useRef(location.pathname);
  const lastBackPressRef = useRef(0);

  locationRef.current = location.pathname;

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listenerPromise = CapacitorApp.addListener('backButton', () => {
      const atRoot = ROOT_PATHS.includes(locationRef.current);
      const hasHistory = (window.history.state?.idx ?? 0) > 0;

      if (!atRoot && hasHistory) {
        navigate(-1);
        return;
      }

      const now = Date.now();
      if (now - lastBackPressRef.current < 2000) {
        CapacitorApp.exitApp();
      } else {
        lastBackPressRef.current = now;
        toast('Press back again to exit', { duration: 2000 });
      }
    });

    return () => {
      listenerPromise.then((listener) => listener.remove());
    };
  }, [navigate]);
}
