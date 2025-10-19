export class ImportController {
  constructor() {
    this.currentToken = 0;
    this.abortController = null;
    this.pending = false;
  }

  start() {
    this.currentToken += 1;
    const token = this.currentToken;
    if (this.abortController) this.abortController.abort();
    this.abortController = new AbortController();
    this.pending = true;
    return { token, signal: this.abortController.signal };
  }

  isCurrent(token) {
    return token === this.currentToken;
  }

  finish(token) {
    if (this.isCurrent(token)) {
      this.pending = false;
    }
  }

  cancel() {
    if (this.abortController) this.abortController.abort();
    this.pending = false;
  }
}