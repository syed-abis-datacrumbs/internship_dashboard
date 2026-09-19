import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { Candidate } from './types';

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID || '1eSJzatmUmor0yeKq02zk4BhrsSGD-yhekp4Dk58jujs';
const TAB_NAME = 'Signed_offers';

function getGoogleAuth() {
  const credsPaths = [
    path.join(process.cwd(), '..', 'internship-backend-abis', 'credentials.json'),
    path.join(process.cwd(), 'credentials.json')
  ];

  let credsFile = credsPaths.find((p) => fs.existsSync(p));

  if (credsFile) {
    const keys = JSON.parse(fs.readFileSync(credsFile, 'utf-8'));
    return new google.auth.JWT({
      email: keys.client_email,
      key: keys.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
  }

  if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    return new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
  }

  return null;
}

export async function syncAcceptedCandidateToSheets(candidate: Candidate) {
  if (candidate.status !== 'ACCEPTED') {
    return;
  }

  try {
    const auth = getGoogleAuth();
    if (!auth) {
      console.warn('Google Sheets sync skipped: No Google credentials found.');
      return;
    }

    const sheets = google.sheets({ version: 'v4', auth });

    // 1. Fetch current rows in 'Signed_offers' tab to check for existing email
    const range = `'${TAB_NAME}'!A:J`;
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range
    });

    const rows = response.data.values || [];
    let existingRowIndex = -1;

    // Search for email in column B (index 1)
    if (rows.length > 1) {
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][1] && rows[i][1].toLowerCase().trim() === candidate.email.toLowerCase().trim()) {
          existingRowIndex = i + 1; // 1-indexed row number in Google Sheets
          break;
        }
      }
    }

    const rawReply = (candidate.emailReply || '').trim();
    const truncatedReply = rawReply.length > 3500 ? rawReply.substring(0, 3500) : rawReply;
    const aiSummary = candidate.aiAnalysis?.summary || '';
    const acceptanceDate = candidate.responseDate || candidate.replySentDate || new Date().toISOString().split('T')[0];

    const rowData = [
      candidate.name || '',
      candidate.email || '',
      candidate.domain || '',
      candidate.university || '',
      'ACCEPTED',
      candidate.offerSentDate || '',
      acceptanceDate,
      candidate.replySent ? 'YES' : 'NO',
      aiSummary,
      truncatedReply
    ];

    if (existingRowIndex !== -1) {
      // Update existing row
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${TAB_NAME}'!A${existingRowIndex}:J${existingRowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [rowData] }
      });
      console.log(`[Google Sheets Auto-Sync] Updated row ${existingRowIndex} for ACCEPTED candidate: ${candidate.name} (${candidate.email})`);
    } else {
      // Append new row
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${TAB_NAME}'!A:J`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: [rowData] }
      });
      console.log(`[Google Sheets Auto-Sync] Appended new ACCEPTED candidate row for: ${candidate.name} (${candidate.email})`);
    }
  } catch (error: any) {
    console.error(`[Google Sheets Auto-Sync Error] Failed to sync ${candidate.name}:`, error?.message || error);
  }
}
