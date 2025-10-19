export class ImportController {
  constructor() {
    this._token = 0;
    this._controller = null;
  }

  start() {
    if (this._controller) {
      try {
        this._controller.abort();
      } catch {}
    }
    this._controller = new AbortController();
    this._token += 1;
    const token = this._token;
    return { token, signal: this._controller.signal };
  }

  abort() {
    if (this._controller) {
      try { this._controller.abort(); } catch {}
    }
  }

  isCurrent(token) {
    if (token !== this._token) return false;
    const signal = this._controller?.signal;
    return !(signal && signal.aborted);
  }

  finish(token) {
    if (token === this._token) {
      this._controller = null;
    }
  }
}

function matchBytes(bytes, signature) {
  if (bytes.length < signature.length) return false;
  for (let i = 0; i < signature.length; i += 1) {
    if (bytes[i] !== signature[i]) return false;
  }
  return true;
}

export async function sniffFileKind(file, { signal } = {}) {
  if (!file || typeof file.slice !== 'function') {
    return { kind: 'unknown' };
  }

  if (signal?.aborted) {
    throw new DOMException('Operation aborted', 'AbortError');
  }

  const head = file.slice(0, 12);
  const buffer = await head.arrayBuffer();

  if (signal?.aborted) {
    throw new DOMException('Operation aborted', 'AbortError');
  }

  const bytes = new Uint8Array(buffer);

  if (matchBytes(bytes, [0x25, 0x50, 0x44, 0x46])) {
    return { kind: 'pdf' };
  }

  if (matchBytes(bytes, [0xff, 0xd8])) {
    return { kind: 'jpeg' };
  }

  if (matchBytes(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { kind: 'png' };
  }

  const header = String.fromCharCode(...bytes.slice(0, 6));
  if (header === 'GIF87a' || header === 'GIF89a') {
    return { kind: 'gif' };
  }

  return { kind: 'unknown' };
}

export function createImportHandler({
  importBtn,
  importFile,
  setHint,
  clearHint,
  setEditorText,
  setMirrorVisible,
  runParseFlow,
  postIngest,
  toBase64,
  sniffFileKind: sniff = sniffFileKind,
} = {}) {
  const controller = new ImportController();

  function setBusy(on) {
    if (importBtn) importBtn.disabled = !!on;
  }

  async function handleImportFile(file) {
    if (!file) {
      if (importFile) importFile.value = '';
      return;
    }

    const { token, signal } = controller.start();
    setBusy(true);
    clearHint?.();

    try {
      const kind = await sniff(file, { signal });
      if (!controller.isCurrent(token)) return;

      if (!kind || kind.kind === 'unknown') {
        setHint?.('Unsupported file. Choose a PDF or image.');
        return;
      }

      setHint?.('Importing…');

      const { base64 } = await toBase64(file);
      if (!controller.isCurrent(token)) return;

      const response = await postIngest(
        {
          name: file.name || '',
          type: file.type || '',
          size: file.size || 0,
          data: base64,
        },
        { signal },
      );

      if (!controller.isCurrent(token)) return;

      if (response && response.ok && response.data && response.data.text) {
        const text = String(response.data.text || '');
        setEditorText?.(text);
        setMirrorVisible?.(true);
        runParseFlow?.(text, file.name || 'Imported', '');
        setHint?.('Imported text added to editor.');
        return;
      }

      if (response) {
        if (response.status === 404) {
          setHint?.('Media import not enabled on this site.');
        } else if (response.status === 501) {
          setHint?.('Media ingest is not enabled yet (beta stub).');
        } else if (response.status === 403) {
          setHint?.('Media import is beta-only. Enable beta in Settings or visit /beta.');
        } else {
          setHint?.('Media import unavailable.');
        }
        return;
      }

      setHint?.('Media import unavailable.');
    } catch (err) {
      if (!controller.isCurrent(token)) return;
      if (err && err.name === 'AbortError') {
        clearHint?.();
      } else {
        setHint?.('Import failed.');
      }
    } finally {
      if (controller.isCurrent(token)) {
        setBusy(false);
        controller.finish(token);
      }
      if (importFile) importFile.value = '';
    }
  }

  return { controller, handleImportFile };
}
