import { BadRequestException } from '@nestjs/common';
import * as url from 'url';

/**
 * SSRF (Server-Side Request Forgery) Protection Validator (OWASP A10 / ASVS V5.5).
 * Validates and ensures URLs do not target internal, private, loopback, or cloud-metadata endpoints.
 */

const BLOCKED_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  'metadata.google.internal',
  'instance-data',
]);

const BLOCKED_IP_PREFIXES = [
  '127.', // Loopback
  '10.', // RFC 1918 Private Class A
  '192.168.', // RFC 1918 Private Class C
  '169.254.', // Link-Local / Cloud Instance Metadata (AWS/GCP/Azure)
  '0.',
];

export function validateSafeUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') {
    throw new BadRequestException('Invalid URL parameter');
  }

  let parsed: url.UrlWithStringQuery;
  try {
    parsed = url.parse(rawUrl);
  } catch (err) {
    throw new BadRequestException('Malformed URL structure');
  }

  const protocol = (parsed.protocol || '').toLowerCase();
  if (protocol !== 'http:' && protocol !== 'https:') {
    throw new BadRequestException(
      `SSRF Guard: Prohibited protocol '${protocol}'. Only HTTP and HTTPS are permitted.`,
    );
  }

  const hostname = (parsed.hostname || '').toLowerCase();
  if (!hostname) {
    throw new BadRequestException('SSRF Guard: Missing hostname in URL');
  }

  // 1. Check exact blocked hostnames
  if (BLOCKED_HOSTS.has(hostname)) {
    throw new BadRequestException(
      `SSRF Guard: Access to loopback/metadata host '${hostname}' is strictly forbidden.`,
    );
  }

  // 2. Check blocked private IP prefixes
  for (const prefix of BLOCKED_IP_PREFIXES) {
    if (hostname.startsWith(prefix)) {
      throw new BadRequestException(
        `SSRF Guard: Target IP '${hostname}' belongs to private/internal subnet range. Access denied.`,
      );
    }
  }

  // 3. Check RFC 1918 Class B (172.16.0.0 – 172.31.255.255)
  if (hostname.startsWith('172.')) {
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      const secondOctet = parseInt(parts[1], 10);
      if (secondOctet >= 16 && secondOctet <= 31) {
        throw new BadRequestException(
          `SSRF Guard: Target IP '${hostname}' belongs to private RFC 1918 Class B range.`,
        );
      }
    }
  }

  return rawUrl;
}
