'use strict';

const path = require('node:path');
const fs = require('node:fs/promises');
const vm = require('node:vm');

const bytes = (...values) => Uint8Array.from(values);

function createFile(data, { name = 'file.bin', type = 'application/octet-stream' } = {}) {
  return new File([data], name, { type });
}

describe('Import pipeline helpers', () => {
  let importer;

  beforeAll(async () => {
    const code = await fs.readFile(path.resolve(__dirname, '../public/js/importer.js'), 'utf8');
    const context = vm.createContext({
      console,
      AbortController,
      DOMException,
      File,
      Blob,
      setTimeout,
      clearTimeout,
    });
    context.globalThis = context;
    const module = new vm.SourceTextModule(code, { context });
    await module.link(() => { throw new Error('Unexpected import in importer.js'); });
    await module.evaluate();
    importer = module.namespace;
  });

  test('sniffFileKind detects common media headers', async () => {
    const pdf = await importer.sniffFileKind(createFile(bytes(0x25, 0x50, 0x44, 0x46, 0x2d), { type: 'application/pdf' }));
    expect(pdf.kind).toBe('pdf');

    const jpeg = await importer.sniffFileKind(createFile(bytes(0xff, 0xd8, 0xff, 0xdb), { type: 'image/jpeg' }));
    expect(jpeg.kind).toBe('jpeg');

    const png = await importer.sniffFileKind(createFile(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a), { type: 'image/png' }));
    expect(png.kind).toBe('png');

    const gif = await importer.sniffFileKind(createFile(bytes(0x47, 0x49, 0x46, 0x38, 0x39, 0x61), { type: 'image/gif' }));
    expect(gif.kind).toBe('gif');

    const unknown = await importer.sniffFileKind(createFile(bytes(0x00, 0x11, 0x22, 0x33)));
    expect(unknown.kind).toBe('unknown');
  });

  test('ImportController manages sequential tokens and aborts previous signal', () => {
    const controller = new importer.ImportController();
    const first = controller.start();
    expect(first.token).toBe(1);
    expect(first.signal.aborted).toBe(false);

    const second = controller.start();
    expect(second.token).toBe(2);
    expect(first.signal.aborted).toBe(true);
    expect(controller.isCurrent(first.token)).toBe(false);
    expect(controller.isCurrent(second.token)).toBe(true);

    controller.abort();
    expect(controller.isCurrent(second.token)).toBe(false);
  });

  test('handleImportFile only applies results from the most recent request', async () => {
    const importBtn = { disabled: false };
    const importFile = { value: 'preset' };
    const setHint = jest.fn();
    const clearHint = jest.fn();
    const setEditorText = jest.fn();
    const setMirrorVisible = jest.fn();
    const runParseFlow = jest.fn();

    const sniff = jest.fn(async () => ({ kind: 'pdf' }));
    const toBase64 = jest.fn(async () => ({ base64: 'ZmFrZQ==' }));
    const postIngest = jest.fn((payload, { signal } = {}) => {
      if (payload.name === 'first.pdf') {
        return new Promise((resolve, reject) => {
          if (signal?.aborted) {
            reject(new DOMException('Aborted', 'AbortError'));
            return;
          }
          const onAbort = () => {
            signal.removeEventListener('abort', onAbort);
            reject(new DOMException('Aborted', 'AbortError'));
          };
          signal?.addEventListener('abort', onAbort);
        });
      }

      return Promise.resolve({ ok: true, status: 200, data: { text: 'second import' } });
    });

    const { handleImportFile } = importer.createImportHandler({
      importBtn,
      importFile,
      setHint,
      clearHint,
      setEditorText,
      setMirrorVisible,
      runParseFlow,
      postIngest,
      toBase64,
      sniffFileKind: sniff,
    });

    const firstFile = createFile(bytes(0x25, 0x50, 0x44, 0x46), { name: 'first.pdf', type: 'application/pdf' });
    const secondFile = createFile(bytes(0x25, 0x50, 0x44, 0x46), { name: 'second.pdf', type: 'application/pdf' });

    const firstPromise = handleImportFile(firstFile);
    const secondPromise = handleImportFile(secondFile);

    await Promise.allSettled([firstPromise, secondPromise]);

    expect(setEditorText).toHaveBeenCalledTimes(1);
    expect(setEditorText).toHaveBeenCalledWith('second import');
    expect(runParseFlow).toHaveBeenCalledTimes(1);
    expect(runParseFlow.mock.calls[0][0]).toBe('second import');
    expect(importBtn.disabled).toBe(false);
    expect(importFile.value).toBe('');
    expect(clearHint).toHaveBeenCalled();
  });

  test('handleImportFile resets UI on error paths', async () => {
    const importBtn = { disabled: false };
    const importFile = { value: 'pending' };
    const setHint = jest.fn();
    const clearHint = jest.fn();

    const { handleImportFile } = importer.createImportHandler({
      importBtn,
      importFile,
      setHint,
      clearHint,
      setEditorText: jest.fn(),
      setMirrorVisible: jest.fn(),
      runParseFlow: jest.fn(),
      postIngest: jest.fn(async () => { throw new Error('boom'); }),
      toBase64: jest.fn(async () => ({ base64: 'data' })),
      sniffFileKind: jest.fn(async () => ({ kind: 'pdf' })),
    });

    const file = createFile(bytes(0x25, 0x50, 0x44, 0x46), { name: 'error.pdf', type: 'application/pdf' });
    await handleImportFile(file);

    expect(importBtn.disabled).toBe(false);
    expect(importFile.value).toBe('');
    expect(setHint).toHaveBeenCalledWith('Import failed.');
  });
});
