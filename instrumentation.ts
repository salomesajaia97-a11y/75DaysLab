export async function register() {
  if (process.env.NODE_ENV === 'development') {
    const dns = await import('dns')
    dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1'])
  }
}
