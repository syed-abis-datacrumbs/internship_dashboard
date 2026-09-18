import { NextRequest, NextResponse } from 'next/server';
import tls from 'tls';
import email from 'email-reply-parser'; // Or inline raw email parser

interface SyncedEmail {
  from: string;
  subject: string;
  body: string;
}

function fetchTitanEmailsPop3Node(): Promise<SyncedEmail[]> {
  return new Promise((resolve, reject) => {
    const host = 'pop.titan.email';
    const port = 995;
    const user = process.env.TITAN_EMAIL || 'careers@datacrumbs.org';
    const pass = process.env.TITAN_PASSWORD || 'Leanwaste@01';

    console.log(`Connecting via TLS to ${host}:${port} for ${user}...`);

    const socket = tls.connect(port, host, { rejectUnauthorized: false }, () => {
      console.log('TLS socket connected to Titan POP3!');
    });

    let buffer = '';
    let state: 'GREETING' | 'USER' | 'PASS' | 'STAT' | 'RETR' | 'QUIT' = 'GREETING';
    let messageCount = 0;
    let currentMsgIndex = 0;
    let fetchedMessages: SyncedEmail[] = [];
    let waitingForMultiline = false;

    socket.setEncoding('utf-8');

    socket.on('data', (data) => {
      buffer += data;
      processBuffer();
    });

    socket.on('error', (err) => {
      console.error('POP3 Socket error:', err);
      reject(err);
    });

    function sendCommand(cmd: string) {
      socket.write(cmd + '\r\n');
    }

    function parseRawEmail(raw: string): SyncedEmail {
      const headerEndIdx = raw.indexOf('\r\n\r\n') !== -1 ? raw.indexOf('\r\n\r\n') : raw.indexOf('\n\n');
      if (headerEndIdx === -1) return { from: '', subject: '', body: '' };

      const headersStr = raw.substring(0, headerEndIdx);
      const bodyStr = raw.substring(headerEndIdx + 4);

      let from = '';
      let subject = '';

      const headerLines = headersStr.split(/\r?\n/);
      for (const line of headerLines) {
        if (line.toLowerCase().startsWith('from:')) {
          const match = line.match(/<([^>]+)>/) || line.match(/From:\s*([^\s]+)/i);
          from = match ? match[1] : line.replace(/From:\s*/i, '').trim();
        } else if (line.toLowerCase().startsWith('subject:')) {
          subject = line.replace(/Subject:\s*/i, '').trim();
        }
      }

      let cleanBody = bodyStr
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      return { from, subject, body: cleanBody };
    }

    function processBuffer() {
      if (waitingForMultiline) {
        if (buffer.includes('\r\n.\r\n')) {
          const parts = buffer.split('\r\n.\r\n');
          const rawMail = parts[0];
          buffer = parts.slice(1).join('\r\n.\r\n');
          waitingForMultiline = false;

          const parsed = parseRawEmail(rawMail);
          if (parsed.from && parsed.body && parsed.body.length > 5) {
            fetchedMessages.push(parsed);
          }

          currentMsgIndex--;
          if (currentMsgIndex > 0 && currentMsgIndex >= messageCount - 80) {
            fetchNextMsg();
          } else {
            sendCommand('QUIT');
            socket.end();
            resolve(fetchedMessages);
          }
        }
        return;
      }

      while (buffer.includes('\r\n')) {
        const lineIdx = buffer.indexOf('\r\n');
        const line = buffer.substring(0, lineIdx);
        buffer = buffer.substring(lineIdx + 2);

        if (state === 'GREETING') {
          state = 'USER';
          sendCommand(`USER ${user}`);
        } else if (state === 'USER') {
          state = 'PASS';
          sendCommand(`PASS ${pass}`);
        } else if (state === 'PASS') {
          state = 'STAT';
          sendCommand('STAT');
        } else if (state === 'STAT') {
          const statParts = line.split(' ');
          messageCount = parseInt(statParts[1], 10) || 0;
          currentMsgIndex = messageCount;
          if (messageCount > 0) {
            state = 'RETR';
            fetchNextMsg();
          } else {
            sendCommand('QUIT');
            socket.end();
            resolve([]);
          }
        }
      }
    }

    function fetchNextMsg() {
      waitingForMultiline = true;
      sendCommand(`RETR ${currentMsgIndex}`);
    }
  });
}

export async function POST(req: NextRequest) {
  try {
    const protocol = req.headers.get('x-forwarded-proto') || 'http';
    const host = req.headers.get('host') || 'localhost:3000';
    const webhookUrl = `${protocol}://${host}/api/webhooks/resend-inbound`;

    console.log(`Executing Native Node.js POP3 Sync via TLS socket...`);

    const emails = await fetchTitanEmailsPop3Node();
    console.log(`Fetched ${emails.length} emails via native Node POP3 TLS`);

    let syncedCount = 0;
    for (const em of emails) {
      try {
        const res = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: em.from,
            text: em.body,
            subject: em.subject
          })
        });
        if (res.ok) {
          syncedCount++;
        }
      } catch (err) {
        console.error(`Error posting synced email from ${em.from}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Titan Inbox POP3 sync completed! Processed ${emails.length} emails (${syncedCount} new replies ingested).`,
      syncedCount
    });
  } catch (error: any) {
    console.error('Error executing native POP3 inbox sync:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to execute native POP3 inbox sync'
      },
      { status: 500 }
    );
  }
}
