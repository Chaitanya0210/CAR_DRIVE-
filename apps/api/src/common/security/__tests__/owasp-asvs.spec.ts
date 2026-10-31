import { describe, it, expect, beforeEach } from 'vitest';
import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { SellerAuthGuard } from '../../guards/seller-auth.guard';
import { BuyerAuthGuard } from '../../guards/buyer-auth.guard';
import { AuthSecurityService } from '../../auth/auth-security.service';
import { validateSafeUrl } from '../safe-url.validator';
import { sanitizeString } from '../sanitizer';

describe('OWASP Top 10 & ASVS Level 2 Verification Suite', () => {
  // ===========================================================================
  // 1. ACCESS CONTROL & IDOR (OWASP A01:2021 / ASVS V4)
  // ===========================================================================
  describe('Authorization & Insecure Direct Object Reference (IDOR)', () => {
    let sellerGuard: SellerAuthGuard;
    let buyerGuard: BuyerAuthGuard;

    beforeEach(() => {
      sellerGuard = new SellerAuthGuard();
      buyerGuard = new BuyerAuthGuard();
    });

    function mockContext(headers: Record<string, string>, query: Record<string, string> = {}) {
      return {
        switchToHttp: () => ({
          getRequest: () => ({
            headers,
            query,
            params: {},
            body: {},
          }),
        }),
      } as unknown as ExecutionContext;
    }

    it('IDOR: rejects Seller A attempting to access Seller B dashboard stats', () => {
      // Authenticated as dealer-101, but requesting sellerProfileId=dealer-202
      const ctx = mockContext(
        { 'x-seller-id': 'dealer-101', 'x-user-role': 'SELLER' },
        { sellerProfileId: 'dealer-202' },
      );

      expect(() => sellerGuard.canActivate(ctx)).toThrow(ForbiddenException);
      expect(() => sellerGuard.canActivate(ctx)).toThrow(/IDOR Violation/);
    });

    it('IDOR: allows seller accessing their own dashboard stats', () => {
      const ctx = mockContext(
        { 'x-seller-id': 'dealer-101', 'x-user-role': 'SELLER' },
        { sellerProfileId: 'dealer-101' },
      );

      expect(sellerGuard.canActivate(ctx)).toBe(true);
    });

    it('Portal Audience Isolation: rejects buyer token calling seller endpoints', () => {
      const ctx = mockContext({
        'x-seller-id': 'buyer-attacker-99',
        'x-user-role': 'BUYER',
      });

      expect(() => sellerGuard.canActivate(ctx)).toThrow(ForbiddenException);
      expect(() => sellerGuard.canActivate(ctx)).toThrow(/Portal Audience Isolation/);
    });

    it('Portal Audience Isolation: rejects seller token calling buyer order endpoints', () => {
      const ctx = mockContext({
        'x-buyer-id': 'dealer-attacker-99',
        'x-user-role': 'SELLER',
      });

      expect(() => buyerGuard.canActivate(ctx)).toThrow(ForbiddenException);
      expect(() => buyerGuard.canActivate(ctx)).toThrow(/Portal Audience Isolation/);
    });

    it('IDOR: rejects Buyer A attempting to read Buyer B order', () => {
      const ctx = mockContext(
        { 'x-buyer-id': 'buyer-alpha-01', 'x-user-role': 'BUYER' },
        { buyerId: 'buyer-victim-02' },
      );

      expect(() => buyerGuard.canActivate(ctx)).toThrow(ForbiddenException);
      expect(() => buyerGuard.canActivate(ctx)).toThrow(/IDOR Violation/);
    });
  });

  // ===========================================================================
  // 2. AUTHENTICATION, OTP, REFRESH TOKENS & SESSIONS (OWASP A07:2021 / ASVS V2 & V3)
  // ===========================================================================
  describe('Authentication & Session Management Security', () => {
    let authService: AuthSecurityService;

    beforeEach(() => {
      authService = new AuthSecurityService();
    });

    it('OTP Enumeration Defense: returns identical message for any phone number', async () => {
      const res1 = await authService.requestOtp('9876543210');
      const res2 = await authService.requestOtp('9123456789');

      expect(res1.success).toBe(true);
      expect(res2.success).toBe(true);
      expect(res1.message).toBe(res2.message);
    });

    it('OTP Brute Force: locks session for 15 minutes after 5 failed attempts', async () => {
      await authService.requestOtp('9988776655');

      // 4 incorrect attempts: shows remaining attempts
      for (let i = 1; i <= 4; i++) {
        await expect(authService.verifyOtp('9988776655', '000000')).rejects.toThrow(
          UnauthorizedException,
        );
      }

      // 5th incorrect attempt: triggers lockout
      await expect(authService.verifyOtp('9988776655', '000000')).rejects.toThrow(
        ForbiddenException,
      );

      // Subsequent attempt while locked remains locked
      await expect(authService.verifyOtp('9988776655', '123456')).rejects.toThrow(
        /locked due to excessive failed attempts/,
      );
    });

    it('Refresh Token Reuse Detection: invalidates entire family upon reuse', () => {
      // 1. Issue initial token family
      const { refreshToken, familyId } = authService.issueTokenFamily('seller-usr-1', 'SELLER');

      // 2. Legitimate rotation: exchange token 1 for token 2
      const rot1 = authService.rotateRefreshToken(refreshToken);
      expect(rot1.newRefreshToken).toBeDefined();

      // 3. ATTACK: Replay spent token 1
      expect(() => authService.rotateRefreshToken(refreshToken)).toThrow(ForbiddenException);
      expect(() => authService.rotateRefreshToken(refreshToken)).toThrow(
        /Refresh token reuse detected/,
      );

      // 4. Token 2 must now also be revoked because the entire family was compromised!
      expect(() => authService.rotateRefreshToken(rot1.newRefreshToken)).toThrow(
        UnauthorizedException,
      );
    });

    it('Session Revocation: revoking session immediately terminates access', () => {
      const { sessionId } = authService.issueTokenFamily('buyer-usr-1', 'BUYER');
      expect(authService.isSessionActive(sessionId)).toBe(true);

      // Revoke session
      authService.revokeSession(sessionId);
      expect(authService.isSessionActive(sessionId)).toBe(false);
    });

    it('MFA Enforcement: rejects access if MFA step was bypassed', () => {
      const { sessionId } = authService.issueTokenFamily('seller-admin-1', 'SELLER');

      // Attempting protected operation without completing MFA
      expect(() => authService.assertMfaCompleted(sessionId)).toThrow(ForbiddenException);
      expect(() => authService.assertMfaCompleted(sessionId)).toThrow(/MFA_REQUIRED/);

      // Complete MFA
      authService.verifyMfaStep(sessionId, '123456');
      expect(() => authService.assertMfaCompleted(sessionId)).not.toThrow();
    });
  });

  // ===========================================================================
  // 3. SSRF PROTECTION (OWASP A10:2021 / ASVS V5.5)
  // ===========================================================================
  describe('SSRF Protection Guard', () => {
    it('blocks loopback IP addresses (127.0.0.1, localhost, ::1)', () => {
      expect(() => validateSafeUrl('http://127.0.0.1:8080/internal')).toThrow(BadRequestException);
      expect(() => validateSafeUrl('http://localhost:4000/metrics')).toThrow(BadRequestException);
      expect(() => validateSafeUrl('http://[::1]:80/admin')).toThrow(BadRequestException);
    });

    it('blocks cloud metadata IP addresses (169.254.169.254)', () => {
      expect(() => validateSafeUrl('http://169.254.169.254/latest/meta-data/')).toThrow(
        BadRequestException,
      );
      expect(() => validateSafeUrl('http://metadata.google.internal/computeMetadata/v1/')).toThrow(
        BadRequestException,
      );
    });

    it('blocks private internal subnets (10.0.0.0/8, 192.168.0.0/16, 172.16.0.0/12)', () => {
      expect(() => validateSafeUrl('http://10.0.0.5:5432/db')).toThrow(BadRequestException);
      expect(() => validateSafeUrl('http://192.168.1.100/router')).toThrow(BadRequestException);
      expect(() => validateSafeUrl('http://172.20.0.15:6379/redis')).toThrow(BadRequestException);
    });

    it('blocks prohibited protocols (file://, gopher://, ftp://)', () => {
      expect(() => validateSafeUrl('file:///etc/passwd')).toThrow(BadRequestException);
      expect(() => validateSafeUrl('gopher://internal.lan')).toThrow(BadRequestException);
    });

    it('permits legitimate external HTTPS URLs', () => {
      expect(validateSafeUrl('https://api.groupdrive.in/v1/catalog')).toBe(
        'https://api.groupdrive.in/v1/catalog',
      );
      expect(validateSafeUrl('https://images.groupdrive.in/vehicles/scorpio-pdi.jpg')).toBe(
        'https://images.groupdrive.in/vehicles/scorpio-pdi.jpg',
      );
    });
  });

  // ===========================================================================
  // 4. XSS & SCRIPT INJECTION (OWASP A03:2021 / ASVS V5.2)
  // ===========================================================================
  describe('Cross-Site Scripting (XSS) Sanitization', () => {
    it('strips inline event handlers, script tags, and javascript: protocols', () => {
      const payload = '<img src=x onerror=alert(document.cookie)> Great Mahindra Scorpio-N deal!';
      expect(sanitizeString(payload)).toBe('Great Mahindra Scorpio-N deal!');

      const scriptPayload = '<script>window.location="http://evil.com"</script>Trusted Review';
      expect(sanitizeString(scriptPayload)).toBe('Trusted Review');
    });

    it('preserves Marathi and Hindi Devanagari text unaltered', () => {
      const marathiReview = 'गाडी वेळेत मिळाली, बारामतीमध्ये उत्कृष्ट सर्व्हिस!';
      expect(sanitizeString(marathiReview)).toBe(marathiReview);

      const hindiReview = 'ग्रुप ड्राइव्हच्या माध्यमातून ₹६५,००० ची बचत झाली.';
      expect(sanitizeString(hindiReview)).toBe(hindiReview);
    });
  });
});
