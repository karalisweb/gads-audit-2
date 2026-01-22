import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST', 'mail.karalisweb.net'),
      port: this.configService.get('SMTP_PORT', 25),
      secure: false, // TLS
      auth: {
        user: this.configService.get('SMTP_USER', 'alessio@karalisweb.net'),
        pass: this.configService.get('SMTP_PASSWORD'),
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  async sendOtpEmail(email: string, code: string): Promise<void> {
    const from = this.configService.get('SMTP_FROM', 'noreply@karalisweb.net');
    const appName = 'GADS Audit';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Codice di verifica</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0d0d0d;">
  <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="background-color: #0d0d0d;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="max-width: 480px; margin: 0 auto; background-color: #1a1a1a; border-radius: 12px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #2a2a2a;">
              <h1 style="margin: 0; color: #f5c518; font-size: 24px; font-weight: 700;">${appName}</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 16px; color: #ffffff; font-size: 20px; font-weight: 600;">Codice di verifica</h2>
              <p style="margin: 0 0 24px; color: #a0a0a0; font-size: 15px; line-height: 1.5;">
                Inserisci il seguente codice per completare l'accesso al tuo account:
              </p>

              <!-- OTP Code -->
              <div style="background-color: #252525; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 24px;">
                <span style="font-family: 'SF Mono', Monaco, 'Courier New', monospace; font-size: 32px; font-weight: 700; color: #f5c518; letter-spacing: 8px;">${code}</span>
              </div>

              <p style="margin: 0 0 8px; color: #a0a0a0; font-size: 14px;">
                Il codice scade tra <strong style="color: #ffffff;">10 minuti</strong>.
              </p>
              <p style="margin: 0; color: #707070; font-size: 13px;">
                Se non hai richiesto questo codice, ignora questa email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #141414; border-top: 1px solid #2a2a2a;">
              <p style="margin: 0; color: #505050; font-size: 12px; text-align: center;">
                &copy; ${new Date().getFullYear()} Karalisweb. Tutti i diritti riservati.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const text = `
${appName} - Codice di verifica

Il tuo codice di verifica e': ${code}

Il codice scade tra 10 minuti.

Se non hai richiesto questo codice, ignora questa email.
    `;

    try {
      await this.transporter.sendMail({
        from: `"${appName}" <${from}>`,
        to: email,
        subject: `${code} - Codice di verifica ${appName}`,
        text,
        html,
      });
      this.logger.log(`OTP email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send OTP email to ${email}`, error);
      throw error;
    }
  }

  async sendPasswordResetEmail(email: string, code: string): Promise<void> {
    const from = this.configService.get('SMTP_FROM', 'noreply@karalisweb.net');
    const appName = 'GADS Audit';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reimposta password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0d0d0d;">
  <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="background-color: #0d0d0d;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="max-width: 480px; margin: 0 auto; background-color: #1a1a1a; border-radius: 12px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #2a2a2a;">
              <h1 style="margin: 0; color: #f5c518; font-size: 24px; font-weight: 700;">${appName}</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 16px; color: #ffffff; font-size: 20px; font-weight: 600;">Reimposta la tua password</h2>
              <p style="margin: 0 0 24px; color: #a0a0a0; font-size: 15px; line-height: 1.5;">
                Hai richiesto di reimpostare la password. Usa il codice seguente per procedere:
              </p>

              <!-- OTP Code -->
              <div style="background-color: #252525; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 24px;">
                <span style="font-family: 'SF Mono', Monaco, 'Courier New', monospace; font-size: 32px; font-weight: 700; color: #f5c518; letter-spacing: 8px;">${code}</span>
              </div>

              <p style="margin: 0 0 8px; color: #a0a0a0; font-size: 14px;">
                Il codice scade tra <strong style="color: #ffffff;">10 minuti</strong>.
              </p>
              <p style="margin: 0; color: #707070; font-size: 13px;">
                Se non hai richiesto di reimpostare la password, ignora questa email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #141414; border-top: 1px solid #2a2a2a;">
              <p style="margin: 0; color: #505050; font-size: 12px; text-align: center;">
                &copy; ${new Date().getFullYear()} Karalisweb. Tutti i diritti riservati.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const text = `
${appName} - Reimposta password

Il tuo codice per reimpostare la password e': ${code}

Il codice scade tra 10 minuti.

Se non hai richiesto di reimpostare la password, ignora questa email.
    `;

    try {
      await this.transporter.sendMail({
        from: `"${appName}" <${from}>`,
        to: email,
        subject: `${code} - Reimposta password ${appName}`,
        text,
        html,
      });
      this.logger.log(`Password reset email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${email}`, error);
      throw error;
    }
  }
}
