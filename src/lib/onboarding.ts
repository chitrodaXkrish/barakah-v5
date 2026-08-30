const ONBOARDING_COMPLETED_KEY = 'barakah_onboarding_completed_v2';
const LEGACY_ONBOARDING_COMPLETED_KEY = 'barakah_onboarding_completed';

export const hasCompletedOnboarding = () => {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(ONBOARDING_COMPLETED_KEY) === 'true';
};

export const markOnboardingCompleted = () => {
  window.localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
  window.localStorage.setItem(LEGACY_ONBOARDING_COMPLETED_KEY, 'true');
};
