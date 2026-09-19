/**
 * DataCrumbs Google Apps Script Webhook / Auto Sync
 * Paste this script into Google Sheets (Extensions -> Apps Script)
 * to receive live candidate syncs directly into your Google Sheet!
 */

function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const data = JSON.parse(e.postData.contents);

    // If header row doesn't exist, create it
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        'Candidate ID', 'Name', 'Email', 'Domain', 'University',
        'Score', 'Offer Status', 'Offer Sent Date', 'Response Date',
        'Reply Sent?', 'AI Intent', 'AI Confidence', 'AI Summary', 'Email Reply'
      ]);
    }

    const candidates = Array.isArray(data) ? data : [data];

    candidates.forEach(c => {
      sheet.appendRow([
        c.id || '',
        c.name || '',
        c.email || '',
        c.domain || '',
        c.university || '',
        c.score || '',
        c.status || '',
        c.offerSentDate || '',
        c.responseDate || '',
        c.replySent ? 'YES' : 'NO',
        c.aiAnalysis?.intent || '',
        c.aiAnalysis?.confidence ? (c.aiAnalysis.confidence * 100) + '%' : '',
        c.aiAnalysis?.summary || '',
        c.emailReply || ''
      ]);
    });

    return ContentService.createTextOutput(JSON.stringify({ result: 'success', count: candidates.length }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ result: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
