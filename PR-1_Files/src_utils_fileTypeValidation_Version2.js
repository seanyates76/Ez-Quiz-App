// Magic byte sniffing for PDFs and common images.
// Returns one of: 'pdf' | 'png' | 'jpeg' | 'gif' | 'unknown'
export async function sniffFileKind(file) {
  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());

  // PDF: "%PDF"
  if (head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46) {
    return 'pdf';
  }
  // PNG: 89 50 4E 47
  if (head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4E && head[3] === 0x47) {
    return 'png';
  }
  // JPEG: FF D8 FF (next marker varies)
  if (head[0] === 0xFF && head[1] === 0xD8 && head[2] === 0xFF) {
    return 'jpeg';
  }
  // GIF87a / GIF89a: 47 49 46 38
  if (head[0] === 0x47 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x38) {
    return 'gif';
  }
  return 'unknown';
}

export function isSupportedImportKind(kind) {
  return kind === 'pdf' || kind === 'png' || kind === 'jpeg' || kind === 'gif';
}