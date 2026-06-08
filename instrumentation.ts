export async function register() {
  if (process.env.NODE_ENV === 'development') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const dns = require('node:dns')
      dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1'])
    } catch {}
  }
}
