import { NextResponse } from 'next/server';

export async function GET() {
  const csv = 'email,first_name,last_name,company,title,website,linkedin,phone\njohn@example.com,John,Smith,Acme Inc,CEO,https://acme.com,https://linkedin.com/in/johnsmith,+1234567890\n';
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="leads-template.csv"',
    },
  });
}
