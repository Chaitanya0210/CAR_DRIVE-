import { describe, it, expect, beforeEach } from 'vitest';
import { sanitizeString, sanitizeDeep } from '../sanitizer';
import { CsrfGuard } from '../csrf.guard';
import { UploadScannerService } from '../upload-scanner.service';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';

describe('Platform Security Suite', () => {
  describe('Input Sanitization', () => {
    it('strips XSS script tags and javascript: URLs', () => {
      const malicious = '<script>alert("pwned")</script>Hello GroupDrive';
      expect(sanitizeString(malicious)).toBe('Hello GroupDrive');

      const inlineHandler = 'onclick=alert(1) Mahindra Scorpio';
      expect(sanitizeString(inlineHandler)).toBe('Mahindra Scorpio');

      const jsProto = 'javascript:stealTokens()';
      expect(sanitizeString(jsProto)).toBe('');
    });

    it('safely preserves legitimate Devanagari characters (Marathi and Hindi)', () => {
      const marathiText = 'बारामती तालुक्यात महिंद्रा स्कॉर्पिओ-एन खरेदीदार गट';
      expect(sanitizeString(marathiText)).toBe(marathiText);

      const hindiText = 'टाटा नेक्सन पर ₹92,000 की छूट उपलब्ध है।';
      expect(sanitizeString(hindiText)).toBe(hindiText);
    });

    it('sanitizes deeply nested objects and arrays', () => {
      const dirtyObj = {
        name: 'John <script>alert(1)</script>',
        nested: {
          comment: 'Bad <script>evil()</script> Comment',
          items: ['Safe', 'Bad javascript:hack()', 123],
        },
      };

      const cleanObj: any = sanitizeDeep(dirtyObj);
      expect(cleanObj.name).toBe('John');
      expect(cleanObj.nested.comment).toBe('Bad  Comment');
      expect(cleanObj.nested.items[1]).toBe('Bad');
      expect(cleanObj.nested.items[2]).toBe(123);
    });
  });

  describe('CSRF Guard', () => {
    let guard: CsrfGuard;

    beforeEach(() => {
      guard = new CsrfGuard();
    });

    function mockContext(
      method: string,
      headers: Record<string, string>,
      cookies: Record<string, string> = {},
    ) {
      return {
        switchToHttp: () => ({
          getRequest: () => ({
            method,
            headers,
            cookies,
          }),
        }),
      } as unknown as ExecutionContext;
    }

    it('allows idempotent safe methods (GET, HEAD, OPTIONS) without token', () => {
      const ctx = mockContext('GET', {});
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('allows API client requests authenticated with Bearer authorization headers', () => {
      const ctx = mockContext('POST', { authorization: 'Bearer gd_token_xyz123' });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('blocks mutating requests missing CSRF header', () => {
      const ctx = mockContext('POST', {});
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('blocks mutating requests when header and cookie tokens mismatch', () => {
      const ctx = mockContext(
        'POST',
        { 'x-csrf-token': 'token-header' },
        { csrf_token: 'token-cookie-different' },
      );
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('allows mutating requests when header and cookie tokens match', () => {
      const ctx = mockContext(
        'POST',
        { 'x-csrf-token': 'token-secret-123' },
        { csrf_token: 'token-secret-123' },
      );
      expect(guard.canActivate(ctx)).toBe(true);
    });
  });

  describe('File Upload Scanner & Antivirus Stub', () => {
    let scanner: UploadScannerService;

    beforeEach(() => {
      scanner = new UploadScannerService();
    });

    it('accepts clean JPEG image with valid magic bytes', async () => {
      const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
      const res = await scanner.scanFile({
        filename: 'inspection-photo.jpg',
        mimetype: 'image/jpeg',
        sizeBytes: jpegBuffer.length,
        buffer: jpegBuffer,
      });

      expect(res.status).toBe('CLEAN');
      expect(res.detectedMime).toBe('image/jpeg');
      expect(res.isSafeForStorage).toBe(true);
    });

    it('accepts clean PDF document with valid magic bytes', async () => {
      const pdfBuffer = Buffer.from('%PDF-1.4 standard document stream...');
      const res = await scanner.scanFile({
        filename: 'rc-book-form20.pdf',
        mimetype: 'application/pdf',
        sizeBytes: pdfBuffer.length,
        buffer: pdfBuffer,
      });

      expect(res.status).toBe('CLEAN');
      expect(res.detectedMime).toBe('application/pdf');
      expect(res.isSafeForStorage).toBe(true);
    });

    it('rejects executable file extensions (.exe, .sh, .bat)', async () => {
      const dummyBuffer = Buffer.from('echo malicious shell');
      const res = await scanner.scanFile({
        filename: 'exploit.sh',
        mimetype: 'application/x-sh',
        sizeBytes: dummyBuffer.length,
        buffer: dummyBuffer,
      });

      expect(res.status).toBe('REJECTED_UNSUPPORTED_TYPE');
      expect(res.isSafeForStorage).toBe(false);
      expect(res.reason).toContain('prohibited');
    });

    it('quarantines files containing EICAR antivirus test signature', async () => {
      // Valid PNG header followed by EICAR signature
      const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
      const eicarPayload = Buffer.from(
        'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*',
      );
      const infectedBuffer = Buffer.concat([pngHeader, eicarPayload]);

      const res = await scanner.scanFile({
        filename: 'malicious-trojan.png',
        mimetype: 'image/png',
        sizeBytes: infectedBuffer.length,
        buffer: infectedBuffer,
      });

      expect(res.status).toBe('INFECTED_QUARANTINED');
      expect(res.isSafeForStorage).toBe(false);
      expect(res.reason).toContain('EICAR');
    });
  });
});
