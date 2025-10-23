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
});

