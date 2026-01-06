import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { GoogleAdsAccount } from '../../../entities';

@Injectable()
export class HmacAuthGuard implements CanActivate {
  private readonly MAX_TIMESTAMP_DIFF_MS = 5 * 60 * 1000; // 5 minutes

  constructor(
    @InjectRepository(GoogleAdsAccount)
    private readonly accountRepository: Repository<GoogleAdsAccount>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Get required headers
    const timestamp = request.headers['x-timestamp'];
    const signature = request.headers['x-signature'];
    const accountId = request.headers['x-account-id'];

    if (!timestamp || !signature || !accountId) {
      throw new BadRequestException(
        'Missing required headers: X-Timestamp, X-Signature, X-Account-Id',
      );
    }

    // Validate timestamp (within 5 minutes)
    const requestTime = new Date(timestamp).getTime();
    const now = Date.now();
    if (isNaN(requestTime) || Math.abs(now - requestTime) > this.MAX_TIMESTAMP_DIFF_MS) {
      throw new UnauthorizedException('Request timestamp is invalid or expired');
    }

    // Find account
    const account = await this.accountRepository.findOne({
      where: { customerId: accountId, isActive: true },
    });

    if (!account) {
      throw new UnauthorizedException('Account not found or inactive');
    }

    // Get raw body for signature verification
    const rawBody = request.rawBody || JSON.stringify(request.body);

    // Verify HMAC signature
    const expectedSignature = this.computeSignature(
      timestamp,
      rawBody,
      account.sharedSecret,
    );

    // Debug logging
    console.log('=== HMAC Debug ===');
    console.log('Timestamp:', timestamp);
    console.log('Received signature:', signature);
    console.log('Expected signature:', expectedSignature);
    console.log('Has rawBody:', !!request.rawBody);
    console.log('Secret (first 10 chars):', account.sharedSecret.substring(0, 10));
    console.log('Body (first 100 chars):', rawBody.substring(0, 100));
    console.log('==================');

    if (!this.secureCompare(signature, expectedSignature)) {
      throw new UnauthorizedException('Invalid signature');
    }

    // Attach account to request for use in controller/service
    request.googleAdsAccount = account;

    return true;
  }

  private computeSignature(
    timestamp: string,
    body: string,
    secret: string,
  ): string {
    const payload = timestamp + body;
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }

  private secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }
}
