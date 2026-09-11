import { loadEnv } from 'vite';

const mode = process.env.NODE_ENV || 'production';
const env = {
  ...loadEnv(mode, process.cwd(), ''),
  ...process.env,
};

const required = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
];

const missing = required.filter((key) => !env[key]);

if (missing.length > 0) {
  console.error(
    `Missing required production environment variables: ${missing.join(', ')}`
  );
  process.exit(1);
}

console.log('Required production environment variables are present.');