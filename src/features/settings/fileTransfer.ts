import { format } from 'date-fns';
import { exportAll, markExported } from '@/db/backup';

/** Serialize the whole DB and trigger a timestamped JSON download. */
export async function downloadBackup(): Promise<void> {
  const backup = await exportAll();
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cat-tracker-backup-${format(backup.exportedAt, 'yyyy-MM-dd-HHmm')}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  await markExported(backup.exportedAt);
}

/** Read a File as text (for import). */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read the file.'));
    reader.readAsText(file);
  });
}
