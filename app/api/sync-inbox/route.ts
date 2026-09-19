import { NextRequest, NextResponse } from 'next/server';
import tls from 'tls';
import { getCandidates, updateCandidate } from '@/lib/candidates';
import { analyzeEmailReplyWithOpenAI } from '@/lib/openai';

interface SyncedEmail {
  from: string;
  subject: string;
  body: string;
}

function fetchTitanEmailsPop3Node(): Promise<SyncedEmail[]> {
  return new Promise((resolve) => {
    const host = 'pop.titan.email';
    const port = 995;
    const user = process.env.TITAN_EMAIL || 'careers@datacrumbs.org';
    const pass = process.env.TITAN_PASSWORD || 'Leanwaste@01';

    console.log(`Connecting via TLS to ${host}:${port} for ${user}...`);

    let socket: tls.TLSSocket;
    let buffer = '';
    let state: 'GREETING' | 'USER' | 'PASS' | 'STAT' | 'RETR' | 'QUIT' = 'GREETING';
    let messageCount = 0;
    let currentMsgIndex = 0;
    let minMsgIndex = 1;
    let fetchedMessages: SyncedEmail[] = [];
    let readingMultiline = false;
    let currentMailBuffer = '';

    // Safety timeout: resolve whatever emails we gathered in 6 seconds
    const timer = setTimeout(() => {
      console.log(`POP3 sync timeout reached. Returning ${fetchedMessages.length} emails.`);
      try {
        if (socket) socket.destroy();
      } catch (e) {}
      resolve(fetchedMessages);
    }, 7000);

    try {
      socket = tls.connect(port, host, { rejectUnauthorized: false }, () => {
        console.log('TLS socket connected to Titan POP3!');
      });
    } catch (err) {
      console.error('TLS socket creation error:', err);
      clearTimeout(timer);
      return resolve([]);
    }

    socket.setEncoding('utf-8');

    socket.on('data', (chunk: string) => {
      buffer += chunk;
      processData();
    });

    socket.on('error', (err) => {
      console.error('POP3 Socket error:', err);
      clearTimeout(timer);
      resolve(fetchedMessages);
    });

    socket.on('close', () => {
      clearTimeout(timer);
      resolve(fetchedMessages);
    });

    function sendCommand(cmd: string) {
      if (socket && !socket.destroyed) {
        socket.write(cmd + '\r\n');
      }
    }

    function parseRawEmail(raw: string): SyncedEmail {
      const headerEndIdx = raw.indexOf('\r\n\r\n') !== -1 ? raw.indexOf('\r\n\r\n') : raw.indexOf('\n\n');
      if (headerEndIdx === -1) return { from: '', subject: '', body: raw.substring(0, 500) };

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

    function processData() {
      if (readingMultiline) {
        const terminatorIndex = buffer.indexOf('\r\n.\r\n');
        if (terminatorIndex !== -1) {
          currentMailBuffer += buffer.substring(0, terminatorIndex);
          buffer = buffer.substring(terminatorIndex + 5);
          readingMultiline = false;

          const parsed = parseRawEmail(currentMailBuffer);
          if (parsed.from && parsed.body && parsed.body.length > 5) {
            fetchedMessages.push(parsed);
          }
          currentMailBuffer = '';

          currentMsgIndex--;
          if (currentMsgIndex >= minMsgIndex) {
            fetchNextMsg();
          } else {
            sendCommand('QUIT');
            socket.end();
            clearTimeout(timer);
            resolve(fetchedMessages);
          }
        } else {
          currentMailBuffer += buffer;
          buffer = '';
        }
        return;
      }

      while (buffer.includes('\r\n')) {
        const lineIdx = buffer.indexOf('\r\n');
        const line = buffer.substring(0, lineIdx);
        buffer = buffer.substring(lineIdx + 2);

        if (state === 'GREETING') {
          if (line.startsWith('+OK')) {
            state = 'USER';
            sendCommand(`USER ${user}`);
          }
        } else if (state === 'USER') {
          if (line.startsWith('+OK')) {
            state = 'PASS';
            sendCommand(`PASS ${pass}`);
          }
        } else if (state === 'PASS') {
          if (line.startsWith('+OK')) {
            state = 'STAT';
            sendCommand('STAT');
          } else {
            console.error('POP3 Auth Failed:', line);
            sendCommand('QUIT');
            socket.end();
            clearTimeout(timer);
            return resolve(fetchedMessages);
          }
        } else if (state === 'STAT') {
          if (line.startsWith('+OK')) {
            const statParts = line.split(' ');
            messageCount = parseInt(statParts[1], 10) || 0;
            currentMsgIndex = messageCount;
            // Fetch last 15 messages for high speed
            minMsgIndex = Math.max(1, messageCount - 15);
            if (messageCount > 0) {
              state = 'RETR';
              fetchNextMsg();
            } else {
              sendCommand('QUIT');
              socket.end();
              clearTimeout(timer);
              resolve([]);
            }
          }
        } else if (state === 'RETR') {
          if (line.startsWith('+OK')) {
            readingMultiline = true;
            currentMailBuffer = '';
            processData();
            return;
          }
        }
      }
    }

    function fetchNextMsg() {
      sendCommand(`RETR ${currentMsgIndex}`);
    }
  });
}

export async function POST(req: NextRequest) {
  try {
    console.log(`Executing Native Fast Node.js POP3 Sync via TLS socket...`);

    const emails = await fetchTitanEmailsPop3Node();
    console.log(`Fetched ${emails.length} emails via native Node POP3 TLS`);

    const candidates = getCandidates();
    let syncedCount = 0;

    for (const em of emails) {
      if (!em.from || !em.body) continue;

      const senderEmail = em.from.match(/<([^>]+)>/)?.[1] || em.from.trim();
      const matchCandidate = candidates.find(
        (c) => c.email.toLowerCase() === senderEmail.toLowerCase()
      );

      if (matchCandidate) {
        try {
          // Process OpenAI Analysis if emailReply was not present or updated
          const aiAnalysis = await analyzeEmailReplyWithOpenAI(matchCandidate.name, em.body);
          updateCandidate(matchCandidate.id, {
            emailReply: em.body,
            aiAnalysis,
            status: aiAnalysis.recommendedStatus,
            responseDate: new Date().toISOString().split('T')[0]
          });
          syncedCount++;
        } catch (e) {
          console.error(`Error processing candidate ${matchCandidate.name}:`, e);
          updateCandidate(matchCandidate.id, {
            emailReply: em.body,
            responseDate: new Date().toISOString().split('T')[0]
          });
          syncedCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Titan Inbox POP3 sync completed! Processed ${emails.length} emails (${syncedCount} candidate replies updated).`,
      syncedCount,
      totalFetched: emails.length
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
