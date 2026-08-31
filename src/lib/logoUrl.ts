const DRIVE_FILE_ID_PATTERNS = [
  /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
  /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
  /drive\.google\.com\/uc\?(?:export=view&)?id=([a-zA-Z0-9_-]+)/,
];

/**
 * A normal Google Drive "share" link (drive.google.com/file/d/<id>/view)
 * doesn't work as a hotlinked <img>/PDF image — it needs the
 * uc?export=view&id=<id> form. Any other URL passes through unchanged.
 */
export function normalizeLogoUrl(input: string): string {
  const trimmed = input.trim();
  for (const pattern of DRIVE_FILE_ID_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      return `https://drive.google.com/uc?export=view&id=${match[1]}`;
    }
  }
  return trimmed;
}
