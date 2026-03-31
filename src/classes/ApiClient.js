const { createHash, createHmac } = require('node:crypto');
const { networkInterfaces } = require('node:os');
const { existsSync, readFileSync, writeFileSync, mkdirSync } = require('fs');
const { join, dirname } = require('path');

module.exports = class ApiClient {
  #path;
  #token = null;
  #self = null;
  #heartbeatInterval = null;

  constructor(dir) {
    this.#path = join(dir, 'data.bin');
  }

  #magic() {
    return Buffer.from(process.env.STORE_MAGIC, 'hex');
  }

  #getHwid() {
    const macs = [];

    for (const iface of Object.values(networkInterfaces())) {
      for (const addr of iface) {
        if (!addr.internal && addr.mac && addr.mac !== '00:00:00:00:00:00') {
          macs.push(addr.mac);
        }
      }
    }

    if (!macs.length) throw new Error('aucune interface réseau trouvée');

    return createHash('sha256').update(macs.sort()[0]).digest('hex');
  }

  #createClientToken() {
    const hwid = this.#getHwid();
    const hwidB64 = Buffer.from(hwid).toString('base64url');
    const sig = createHmac('sha256', process.env.KEY_B).update(hwid).digest('base64url');

    return `${hwidB64}.${sig}`;
  }

  #read() {
    if (!existsSync(this.#path)) return null;

    const buf = readFileSync(this.#path);
    const magic = this.#magic();

    if (buf.length < magic.length || !buf.subarray(0, magic.length).equals(magic)) return null;

    return buf.subarray(magic.length).toString('utf8').trim();
  }

  #write(token) {
    const magic = this.#magic();

    mkdirSync(dirname(this.#path), { recursive: true });
    writeFileSync(this.#path, Buffer.concat([magic, Buffer.from(token, 'utf8')]));
  }

  async #register() {
    const res = await fetch(`http://${process.env.API}/register`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.#createClientToken()}` },
      signal: AbortSignal.timeout(10000)
    });

    if (!res.ok) throw new Error(`register: ${res.status}`);

    const { token } = await res.json();

    return token;
  }

  async init() {
    const stored = this.#read();

    if (stored) {
      this.#token = stored;
      return;
    }

    this.#token = await this.#register();
    this.#write(this.#token);
  }

  setSelf(username) {
    this.#self = username ?? null;
    this.#syncHeartbeat();
  }

  #syncHeartbeat() {
    if (this.#self) {
      if (this.#heartbeatInterval) return;
      this.#beat();
      this.#heartbeatInterval = setInterval(() => this.#beat(), 10_000);
    } else {
      if (!this.#heartbeatInterval) return;
      clearInterval(this.#heartbeatInterval);
      this.#heartbeatInterval = null;
    }
  }

  async #beat() {
    if (!this.#self || !this.#token) return;

    try {
      await fetch(`http://${process.env.API}/users/me`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${this.#token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username: this.#self }),
        signal: AbortSignal.timeout(5000)
      });
    } catch {}
  }

  get token() {
    return this.#token;
  }
};