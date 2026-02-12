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

  async sendAnalysisDigest(
    recipients: string[],
    results: { accountName: string; success: boolean; recommendations: number; error?: string }[],
  ): Promise<void> {
    const from = this.configService.get('SMTP_FROM', 'noreply@karalisweb.net');
    const appName = 'GADS Audit';
    const date = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });

    const totalRecs = results.reduce((sum, r) => sum + r.recommendations, 0);
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    const accountRows = results.map(r => `
      <tr>
        <td style="padding: 8px 12px; color: #e0e0e0; border-bottom: 1px solid #2a2a2a;">${r.accountName}</td>
        <td style="padding: 8px 12px; color: ${r.success ? '#4ade80' : '#f87171'}; border-bottom: 1px solid #2a2a2a;">${r.success ? 'OK' : 'Errore'}</td>
        <td style="padding: 8px 12px; color: #e0e0e0; text-align: right; border-bottom: 1px solid #2a2a2a;">${r.recommendations}</td>
        <td style="padding: 8px 12px; color: #707070; font-size: 12px; border-bottom: 1px solid #2a2a2a;">${r.error || '-'}</td>
      </tr>
    `).join('');

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Report Analisi AI</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0d0d0d;">
  <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="background-color: #0d0d0d;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #1a1a1a; border-radius: 12px; overflow: hidden;">
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #2a2a2a;">
              <h1 style="margin: 0; color: #f5c518; font-size: 24px; font-weight: 700;">${appName}</h1>
              <p style="margin: 8px 0 0; color: #a0a0a0; font-size: 14px;">Report Analisi AI - ${date}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px;">
              <div style="display: flex; gap: 16px; margin-bottom: 24px;">
                <div style="background-color: #252525; border-radius: 8px; padding: 16px; text-align: center; flex: 1;">
                  <p style="margin: 0; color: #a0a0a0; font-size: 12px;">Raccomandazioni</p>
                  <p style="margin: 4px 0 0; color: #f5c518; font-size: 28px; font-weight: 700;">${totalRecs}</p>
                </div>
              </div>
              <p style="margin: 0 0 16px; color: #a0a0a0; font-size: 14px;">
                Account analizzati: <strong style="color: #ffffff;">${results.length}</strong> |
                Successo: <strong style="color: #4ade80;">${successCount}</strong> |
                Errori: <strong style="color: ${failCount > 0 ? '#f87171' : '#4ade80'};">${failCount}</strong>
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="border-collapse: collapse;">
                <thead>
                  <tr>
                    <th style="padding: 8px 12px; color: #707070; font-size: 12px; text-align: left; border-bottom: 2px solid #333;">Account</th>
                    <th style="padding: 8px 12px; color: #707070; font-size: 12px; text-align: left; border-bottom: 2px solid #333;">Stato</th>
                    <th style="padding: 8px 12px; color: #707070; font-size: 12px; text-align: right; border-bottom: 2px solid #333;">Racc.</th>
                    <th style="padding: 8px 12px; color: #707070; font-size: 12px; text-align: left; border-bottom: 2px solid #333;">Note</th>
                  </tr>
                </thead>
                <tbody>
                  ${accountRows}
                </tbody>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px; background-color: #141414; border-top: 1px solid #2a2a2a;">
              <p style="margin: 0; color: #505050; font-size: 12px; text-align: center;">
                &copy; ${new Date().getFullYear()} Karalisweb | <a href="https://gads.karalisdemo.it" style="color: #f5c518; text-decoration: none;">GADS Audit</a>
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

    const text = `GADS Audit - Report Analisi AI (${date})\n\nRaccomandazioni totali: ${totalRecs}\nAccount analizzati: ${results.length}\n\n${results.map(r => `${r.accountName}: ${r.success ? 'OK' : 'Errore'} - ${r.recommendations} raccomandazioni${r.error ? ` (${r.error})` : ''}`).join('\n')}`;

    try {
      await this.transporter.sendMail({
        from: `"${appName}" <${from}>`,
        to: recipients.join(', '),
        subject: `[GADS Audit] Report AI: ${totalRecs} raccomandazioni - ${date}`,
        text,
        html,
      });
      this.logger.log(`Analysis digest sent to ${recipients.join(', ')}`);
    } catch (error) {
      this.logger.error(`Failed to send analysis digest`, error);
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
