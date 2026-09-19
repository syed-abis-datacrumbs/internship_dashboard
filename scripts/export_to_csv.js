const fs = require('fs');
const path = require('path');

const storePath = path.join(__dirname, '..', 'candidates_store.json');
const outputPath = path.join(__dirname, '..', 'candidates_datacrumbs_export.csv');

try {
  const rawData = fs.readFileSync(storePath, 'utf-8');
  const candidates = JSON.parse(rawData);

  const headers = [
    'Candidate ID',
    'Name',
    'Email',
    'Domain',
    'University',
    'Score',
    'Offer Status',
    'Offer Sent Date',
    'Response Date',
    'Reminder Sent Date',
    'Reply Sent?',
    'Reply Sent Date',
    'AI Intent',
    'AI Confidence',
    'AI Summary',
    'Email Reply Text'
  ];

  function escapeCsvCell(val) {
    if (val === undefined || val === null) return '""';
    const str = String(val).replace(/"/g, '""').replace(/\r?\n/g, ' ');
    return `"${str}"`;
  }

  const rows = candidates.map((c) => [
    escapeCsvCell(c.id),
    escapeCsvCell(c.name),
    escapeCsvCell(c.email),
    escapeCsvCell(c.domain),
    escapeCsvCell(c.university),
    escapeCsvCell(c.score || ''),
    escapeCsvCell(c.status),
    escapeCsvCell(c.offerSentDate || ''),
    escapeCsvCell(c.responseDate || ''),
    escapeCsvCell(c.reminderSentDate || ''),
    escapeCsvCell(c.replySent ? 'YES' : 'NO'),
    escapeCsvCell(c.replySentDate || ''),
    escapeCsvCell(c.aiAnalysis?.intent || ''),
    escapeCsvCell(c.aiAnalysis?.confidence ? `${Math.round(c.aiAnalysis.confidence * 100)}%` : ''),
    escapeCsvCell(c.aiAnalysis?.summary || ''),
    escapeCsvCell(c.emailReply || '')
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

  fs.writeFileSync(outputPath, csvContent, 'utf-8');
  console.log(`✅ Successfully exported ${candidates.length} candidate records to: ${outputPath}`);
} catch (err) {
  console.error('❌ Error exporting candidate data:', err);
}
