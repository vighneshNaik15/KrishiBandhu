export function isLoopbackHostname(hostname: string): boolean {
  const host = hostname.replace(/\.$/, '');
  return host === 'localhost' || host.endsWith('.localhost') ||
    /^127(?:\.\d+){3}$/.test(host) || host === '[::1]';
}

export function parseCropDoctorUrl(value: string, allowLocal = false): URL | null {
  try {
    const url = new URL(value);
    if (url.username || url.password || url.search || url.hash) return null;
    if (isLoopbackHostname(url.hostname) || url.hostname === '0.0.0.0') {
      if (!allowLocal || url.hostname === '0.0.0.0') return null;
      return url.protocol === 'http:' || url.protocol === 'https:' ? url : null;
    }
    return url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}
