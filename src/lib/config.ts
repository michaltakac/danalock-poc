export const danalockConfig = {
  username: process.env.DANALOCK_USERNAME || '',
  password: process.env.DANALOCK_PASSWORD || ''
};

export function validateConfig() {
  if (!danalockConfig.username || !danalockConfig.password) {
    throw new Error('Missing Danalock credentials. Please set DANALOCK_USERNAME and DANALOCK_PASSWORD environment variables.');
  }
}