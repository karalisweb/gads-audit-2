import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ExecutionContext, UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import { HmacAuthGuard } from './hmac-auth.guard';
import { GoogleAdsAccount } from '../../../entities';

// ── Helpers ──────────────────────────────────────────────────────────────────

const SHARED_SECRET = 'test-shared-secret-32bytes-long!!';

function computeSignature(timestamp: string, body: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(timestamp + body).digest('hex');
}

function createMockContext(
  method: string,
  headers: Record<string, string>,
  body: any = {},
  rawBody?: string,
): ExecutionContext {
  const request = {
    method,
    headers,
    body,
    rawBody: rawBody || JSON.stringify(body),
    googleAdsAccount: undefined,
  };

  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

const mockAccount: Partial<GoogleAdsAccount> = {
  id: 'account-uuid-1',
  customerId: '1234567890',
  customerName: 'Test Account',
  isActive: true,
  sharedSecret: SHARED_SECRET,
};

// ── Test Suite ───────────────────────────────────────────────────────────────

describe('HmacAuthGuard', () => {
  let guard: HmacAuthGuard;
  let accountRepo: { findOne: jest.Mock };

  beforeEach(async () => {
    accountRepo = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HmacAuthGuard,
        { provide: getRepositoryToken(GoogleAdsAccount), useValue: accountRepo },
      ],
    }).compile();

    guard = module.get<HmacAuthGuard>(HmacAuthGuard);
  });

  // ── Missing headers ────────────────────────────────────────────────────

  it('should throw BadRequestException when headers are missing', async () => {
    const ctx = createMockContext('POST', {});

    await expect(guard.canActivate(ctx)).rejects.toThrow(BadRequestException);
  });

  it('should throw when X-Signature is missing', async () => {
    const ctx = createMockContext('POST', {
      'x-timestamp': new Date().toISOString(),
      'x-account-id': '1234567890',
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(BadRequestException);
  });

  // ── Timestamp validation ───────────────────────────────────────────────

  it('should reject expired timestamps (>5 min old)', async () => {
    const oldTimestamp = new Date(Date.now() - 6 * 60 * 1000).toISOString();
    const body = JSON.stringify({ test: true });
    const sig = computeSignature(oldTimestamp, body, SHARED_SECRET);

    const ctx = createMockContext('POST', {
      'x-timestamp': oldTimestamp,
      'x-signature': sig,
      'x-account-id': '1234567890',
    }, { test: true }, body);

    accountRepo.findOne.mockResolvedValue(mockAccount);

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('should reject invalid timestamp format', async () => {
    const ctx = createMockContext('POST', {
      'x-timestamp': 'not-a-date',
      'x-signature': 'somesig',
      'x-account-id': '1234567890',
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  // ── Account lookup ─────────────────────────────────────────────────────

  it('should reject unknown account ID', async () => {
    const timestamp = new Date().toISOString();
    const body = JSON.stringify({});
    const sig = computeSignature(timestamp, body, SHARED_SECRET);

    const ctx = createMockContext('POST', {
      'x-timestamp': timestamp,
      'x-signature': sig,
      'x-account-id': '9999999999',
    }, {}, body);

    accountRepo.findOne.mockResolvedValue(null);

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('should normalize account ID (remove dashes)', async () => {
    const timestamp = new Date().toISOString();
    const body = JSON.stringify({});
    const sig = computeSignature(timestamp, body, SHARED_SECRET);

    const ctx = createMockContext('POST', {
      'x-timestamp': timestamp,
      'x-signature': sig,
      'x-account-id': '123-456-7890',
    }, {}, body);

    accountRepo.findOne.mockResolvedValue(mockAccount);

    await guard.canActivate(ctx);

    expect(accountRepo.findOne).toHaveBeenCalledWith({
      where: { customerId: '1234567890', isActive: true },
    });
  });

  // ── Signature verification ─────────────────────────────────────────────

  it('should accept valid signature for POST requests', async () => {
    const timestamp = new Date().toISOString();
    const body = JSON.stringify({ data: 'test' });
    const sig = computeSignature(timestamp, body, SHARED_SECRET);

    const ctx = createMockContext('POST', {
      'x-timestamp': timestamp,
      'x-signature': sig,
      'x-account-id': '1234567890',
    }, { data: 'test' }, body);

    accountRepo.findOne.mockResolvedValue(mockAccount);

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
  });

  it('should accept valid signature for GET requests (empty body)', async () => {
    const timestamp = new Date().toISOString();
    const sig = computeSignature(timestamp, '', SHARED_SECRET);

    const ctx = createMockContext('GET', {
      'x-timestamp': timestamp,
      'x-signature': sig,
      'x-account-id': '1234567890',
    });

    accountRepo.findOne.mockResolvedValue(mockAccount);

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
  });

  it('should reject tampered body', async () => {
    const timestamp = new Date().toISOString();
    const originalBody = JSON.stringify({ amount: 100 });
    const sig = computeSignature(timestamp, originalBody, SHARED_SECRET);

    const tamperedBody = JSON.stringify({ amount: 999999 });
    const ctx = createMockContext('POST', {
      'x-timestamp': timestamp,
      'x-signature': sig,
      'x-account-id': '1234567890',
    }, { amount: 999999 }, tamperedBody);

    accountRepo.findOne.mockResolvedValue(mockAccount);

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('should reject wrong shared secret', async () => {
    const timestamp = new Date().toISOString();
    const body = JSON.stringify({});
    const sig = computeSignature(timestamp, body, 'wrong-secret-key');

    const ctx = createMockContext('POST', {
      'x-timestamp': timestamp,
      'x-signature': sig,
      'x-account-id': '1234567890',
    }, {}, body);

    accountRepo.findOne.mockResolvedValue(mockAccount);

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  // ── Request enrichment ─────────────────────────────────────────────────

  it('should attach account to request on success', async () => {
    const timestamp = new Date().toISOString();
    const body = JSON.stringify({});
    const sig = computeSignature(timestamp, body, SHARED_SECRET);

    const request = {
      method: 'POST',
      headers: {
        'x-timestamp': timestamp,
        'x-signature': sig,
        'x-account-id': '1234567890',
      },
      body: {},
      rawBody: body,
      googleAdsAccount: undefined as any,
    };

    const ctx = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    accountRepo.findOne.mockResolvedValue(mockAccount);

    await guard.canActivate(ctx);

    expect(request.googleAdsAccount).toEqual(mockAccount);
  });
});
