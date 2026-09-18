import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import util from 'util';

const execPromise = util.promisify(exec);

export async function POST(req: NextRequest) {
  try {
    // Determine script path (in root or dashboard folder)
    const scriptPathInRoot = path.join(process.cwd(), '..', 'sync_titan_inbox_pop3.py');
    const scriptPathInDashboard = path.join(process.cwd(), 'sync_titan_inbox_pop3.py');

    const scriptToRun = require('fs').existsSync(scriptPathInDashboard)
      ? scriptPathInDashboard
      : scriptPathInRoot;

    console.log(`Executing POP3 Sync script: ${scriptToRun}`);

    // Set host URL dynamically for local vs production
    const protocol = req.headers.get('x-forwarded-proto') || 'http';
    const host = req.headers.get('host') || 'localhost:3000';
    const webhookUrl = `${protocol}://${host}/api/webhooks/resend-inbound`;

    // Execute Python sync script
    const { stdout, stderr } = await execPromise(`python "${scriptToRun}"`, {
      env: {
        ...process.env,
        DASHBOARD_WEBHOOK_URL: webhookUrl
      }
    });

    console.log('POP3 Sync stdout:', stdout);
    if (stderr) console.error('POP3 Sync stderr:', stderr);

    return NextResponse.json({
      success: true,
      message: 'Titan Inbox POP3 sync completed successfully!',
      details: stdout
    });
  } catch (error: any) {
    console.error('Error executing POP3 inbox sync:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to execute POP3 inbox sync'
      },
      { status: 500 }
    );
  }
}
