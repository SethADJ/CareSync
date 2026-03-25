/* eslint-disable @typescript-eslint/no-explicit-any */
declare const gapi: any;
declare const google: any;

import { db, type Patient, type LicenseInfo } from '@/db/database';

export interface BackupData {
  version: 1;
  exportedAt: string;
  patients: Patient[];
  license: LicenseInfo | null;
}

export function createBackup(): BackupData {
  const allPatients = [
    ...db.getPatients('tbcare'),
    ...db.getPatients('hivcare'),
  ];
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    patients: allPatients,
    license: db.getLicense(),
  };
}

export function restoreBackup(data: BackupData): { patientCount: number } {
  if (!data.version || !Array.isArray(data.patients)) {
    throw new Error('Invalid backup file format');
  }
  const tbPatients = data.patients.filter(p => p.program === 'tbcare');
  const hivPatients = data.patients.filter(p => p.program === 'hivcare');
  db.savePatients('tbcare', tbPatients);
  db.savePatients('hivcare', hivPatients);
  if (data.license) {
    db.saveLicense(data.license);
  }
  return { patientCount: data.patients.length };
}

export function downloadBackupFile() {
  const backup = createBackup();
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `caresync_backup_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importBackupFile(): Promise<BackupData> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return reject(new Error('No file selected'));
      try {
        const text = await file.text();
        const data = JSON.parse(text) as BackupData;
        resolve(data);
      } catch {
        reject(new Error('Failed to read backup file'));
      }
    };
    input.click();
  });
}

// Google Drive helpers using GAPI + GIS (loaded via script tags)
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const FOLDER_NAME = 'CareSync_Backups';

let tokenClient: google.accounts.oauth2.TokenClient | null = null;

export function isGoogleApiAvailable(): boolean {
  return typeof gapi !== 'undefined' && typeof google !== 'undefined';
}

export async function loadGoogleApi(clientId: string): Promise<void> {
  // Load GAPI
  await new Promise<void>((resolve, reject) => {
    if (document.getElementById('gapi-script')) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.id = 'gapi-script';
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google API'));
    document.head.appendChild(script);
  });

  // Load GIS
  await new Promise<void>((resolve, reject) => {
    if (document.getElementById('gis-script')) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.id = 'gis-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });

  // Init GAPI client
  await new Promise<void>((resolve) => {
    gapi.load('client', async () => {
      await gapi.client.init({});
      await gapi.client.load('drive', 'v3');
      resolve();
    });
  });

  // Init token client
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: SCOPES,
    callback: () => {}, // will be overridden
  });
}

export function requestGoogleAuth(): Promise<google.accounts.oauth2.TokenResponse> {
  return new Promise((resolve, reject) => {
    if (!tokenClient) return reject(new Error('Google API not loaded'));
    tokenClient.callback = (resp) => {
      if (resp.error) return reject(new Error(resp.error));
      resolve(resp);
    };
    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
}

async function getOrCreateFolder(): Promise<string> {
  const res = await gapi.client.drive.files.list({
    q: `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id)',
    spaces: 'drive',
  });
  if (res.result.files && res.result.files.length > 0) {
    return res.result.files[0].id!;
  }
  const folder = await gapi.client.drive.files.create({
    resource: { name: FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' },
    fields: 'id',
  });
  return folder.result.id!;
}

export async function uploadToDrive(): Promise<string> {
  const folderId = await getOrCreateFolder();
  const backup = createBackup();
  const json = JSON.stringify(backup, null, 2);
  const fileName = `caresync_backup_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;

  const metadata = {
    name: fileName,
    mimeType: 'application/json',
    parents: [folderId],
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([json], { type: 'application/json' }));

  const token = gapi.client.getToken()?.access_token;
  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  if (!res.ok) throw new Error('Failed to upload to Google Drive');
  const data = await res.json();
  return data.name;
}

export interface DriveFile {
  id: string;
  name: string;
  modifiedTime: string;
}

export async function listDriveBackups(): Promise<DriveFile[]> {
  const folderId = await getOrCreateFolder();
  const res = await gapi.client.drive.files.list({
    q: `'${folderId}' in parents and trashed=false and mimeType='application/json'`,
    fields: 'files(id,name,modifiedTime)',
    orderBy: 'modifiedTime desc',
    pageSize: 20,
  });
  return (res.result.files || []) as DriveFile[];
}

export async function downloadFromDrive(fileId: string): Promise<BackupData> {
  const res = await gapi.client.drive.files.get({
    fileId,
    alt: 'media',
  });
  const data = typeof res.result === 'string' ? JSON.parse(res.result) : res.result;
  return data as BackupData;
}
