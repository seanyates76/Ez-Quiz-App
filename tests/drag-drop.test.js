'use strict';

const { loadBrowserModule } = require('./utils');

describe('attachDragDrop', () => {
  let attachDragDrop;

  beforeAll(() => {
    ({ attachDragDrop } = loadBrowserModule('public/js/drag-drop.js', ['attachDragDrop']));
  });

  let elem;
  beforeEach(() => {
    document.body.innerHTML = '<div id="affix"></div>';
    elem = document.getElementById('affix');
  });

  test('attaches and invokes handlers once', () => {
    const enter = jest.fn();
    const drop = jest.fn();
    const { dispose } = attachDragDrop(elem, { onDragEnter: enter, onDrop: drop });

    elem.dispatchEvent(new Event('dragenter', { bubbles: true }));
    expect(enter).toHaveBeenCalledTimes(1);

    elem.dispatchEvent(new Event('drop', { bubbles: true }));
    expect(drop).toHaveBeenCalledTimes(1);

    dispose();
  });

  test('dispose removes listeners', () => {
    const over = jest.fn();
    const { dispose } = attachDragDrop(elem, { onDragOver: over });

    elem.dispatchEvent(new Event('dragover', { bubbles: true }));
    expect(over).toHaveBeenCalledTimes(1);

    dispose();
    // after dispose, calling should not call handler again
    elem.dispatchEvent(new Event('dragover', { bubbles: true }));
    expect(over).toHaveBeenCalledTimes(1);
  });

  test('re-attach after dispose does not duplicate listeners', () => {
    const leave = jest.fn();
    const handle1 = attachDragDrop(elem, { onDragLeave: leave });
    handle1.dispose();

    const handle2 = attachDragDrop(elem, { onDragLeave: leave });
    elem.dispatchEvent(new Event('dragleave', { bubbles: true }));
    expect(leave).toHaveBeenCalledTimes(1);

    handle2.dispose();
  });

  test('preventDefault is on by default', () => {
    const over = jest.fn();
    attachDragDrop(elem, { onDragOver: over });
    const evt = new Event('dragover', { bubbles: true, cancelable: true });
    elem.dispatchEvent(evt);
    expect(over).toHaveBeenCalledTimes(1);
    expect(evt.defaultPrevented).toBe(true);
  });

  test('preventDefault can be disabled', () => {
    const over = jest.fn();
    attachDragDrop(elem, { onDragOver: over }, { preventDefault: false });
    const evt = new Event('dragover', { bubbles: true, cancelable: true });
    elem.dispatchEvent(evt);
    expect(over).toHaveBeenCalledTimes(1);
    expect(evt.defaultPrevented).toBe(false);
  });

  test('controller.abort tears down listeners', () => {
    const drop = jest.fn();
    const handle = attachDragDrop(elem, { onDrop: drop });
    elem.dispatchEvent(new Event('drop', { bubbles: true }));
    expect(drop).toHaveBeenCalledTimes(1);
    // Abort and ensure handler no longer fires
    handle.controller.abort();
    elem.dispatchEvent(new Event('drop', { bubbles: true }));
    expect(drop).toHaveBeenCalledTimes(1);
  });

  test('dispose is idempotent', () => {
    const enter = jest.fn();
    const handle = attachDragDrop(elem, { onDragEnter: enter });
    handle.dispose();
    expect(() => handle.dispose()).not.toThrow();
    elem.dispatchEvent(new Event('dragenter', { bubbles: true }));
    expect(enter).toHaveBeenCalledTimes(0);
  });

  test('returns handle with controller and dispose', () => {
    const drop = jest.fn();
    const handle = attachDragDrop(elem, { onDrop: drop });
    expect(handle && typeof handle).toBe('object');
    expect(typeof handle.dispose).toBe('function');
    expect(handle.controller).toBeTruthy();
    // controller.abort may be a function in native or our fallback
    expect(typeof handle.controller.abort).toBe('function');
    handle.dispose();
  });

  test('throws on invalid element', () => {
    expect(() => attachDragDrop(null)).toThrow(/DOM node/i);
    expect(() => attachDragDrop({})).toThrow();
  });
});
