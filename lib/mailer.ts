import nodemailer from 'nodemailer';

export type EmailAccount = {
  type: string;
  email: string;
  smtp_host?: string | null;
  smtp_port?: number | null;
  smtp_user?: string | null;
  smtp_pass?: string | null;
};

export function createTransport(account: EmailAccount) {
  if (account.type === 'gmail-oauth') {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: account.smtp_user || account.email,
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: account.smtp_pass,
      },
    });
  }
  if (account.type === 'gmail-app') {
    return nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: { user: account.smtp_user!, pass: account.smtp_pass! },
    });
  }
  return nodemailer.createTransport({
    host: account.smtp_host!,
    port: account.smtp_port ?? 587,
    secure: account.smtp_port === 465,
    auth: { user: account.smtp_user!, pass: account.smtp_pass! },
  });
}

export function replaceVars(text: string, lead: Record<string, string | null>): string {
  return text
    .replace(/\{\{first_name\}\}/g, lead.first_name || '')
    .replace(/\{\{last_name\}\}/g, lead.last_name || '')
    .replace(/\{\{company\}\}/g, lead.company || '')
    .replace(/\{\{title\}\}/g, lead.title || '')
    .replace(/\{\{email\}\}/g, lead.email || '')
    .replace(/\{\{website\}\}/g, lead.website || '');
}
