# Task: Fix Prayer Times Date Format

## Steps
- [x] 1. Get understanding of the task
- [x] 2. Read relevant files (PrayerTimes.tsx, Home.tsx)
- [x] 3. Plan approved
- [x] 4. Create `src/lib/dateUtils.ts` (shared date formatting utilities)
- [x] 5. Refactor `src/pages/Home.tsx` to use shared utilities
- [x] 6. Fix `src/pages/PrayerTimes.tsx`:
       - Import from `@/lib/dateUtils`
       - Replace `Intl.DateTimeFormat('en-u-ca-islamic')` with `formatHijriDate(now)`
       - Add standard Gregorian date display

