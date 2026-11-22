// Tiny stack VM for make.fun's stack ISA v1: wrapping 32-bit ints, 256-value stack,
// 64 calls, 256 memory words, ten traps, step/output limits. One run, every instance.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const enc = new TextEncoder();

// opcode -> [immediate bytes, values popped, values pushed], undefined when unknown
function shapeOf(op) {
  if (!(op <= 7 || (op >= 16 && op <= 30) || (op >= 32 && op <= 34) || (op >= 48 && op <= 52) || op === 64 || op === 65 || (op >= 80 && op <= 83))) return;
  const imm = op === 1 ? 1 : op === 2 ? 4 : op >= 48 && op <= 51 ? 2 : 0;
  const pops = [0, 1, 2, 48, 51, 52, 82].includes(op) ? 0 : [3, 4, 23, 27, 49, 50, 64, 80, 81, 83].includes(op) ? 1 : op === 7 ? 3 : 2;
  const push = op === 4 || op === 5 ? 2 : op === 6 || op === 7 ? 3 : [0, 3, 48, 49, 50, 51, 52, 65, 80, 81, 83].includes(op) ? 0 : 1;
  return [imm, pops, push];
}

function run(prog, inp) {
  const n = prog.length;
  const st = new Int32Array(256);
  let sp = 0;
  const cs = new Int32Array(64);
  let csp = 0;
  const mem = new Int32Array(256);
  const out = new Uint8Array(65536);
  let olen = 0;
  let ip = 0;
  let pc = 0;
  let steps = 0;
  const end = (code) => ({ bytes: out.slice(0, olen), code });
  for (;;) {
    if (steps === 1000000) return end(10);
    if (pc < 0 || pc >= n) return end(9);
    const op = prog[pc];
    const shape = shapeOf(op);
    if (shape === undefined) return end(5);
    const imm = shape[0];
    if (pc + imm >= n) return end(9);
    steps++;
    if (sp < shape[1]) return end(2);
    if (sp - shape[1] + shape[2] > 256) return end(3);
    const next = pc + 1 + imm;
    pc = next;
    switch (op) {
      case 0x00: return end(0);
      case 0x01: st[sp++] = (prog[next - 1] << 24) >> 24; break;
      case 0x02:
        st[sp++] = prog[next - 4] | (prog[next - 3] << 8) | (prog[next - 2] << 16) | (prog[next - 1] << 24);
        break;
      case 0x03: sp--; break;
      case 0x04: st[sp] = st[sp - 1]; sp++; break;
      case 0x05: { const t = st[sp - 1]; st[sp - 1] = st[sp - 2]; st[sp - 2] = t; break; }
      case 0x06: st[sp] = st[sp - 2]; sp++; break;
      case 0x07: { const a = st[sp - 3]; st[sp - 3] = st[sp - 2]; st[sp - 2] = st[sp - 1]; st[sp - 1] = a; break; }
      case 0x17: st[sp - 1] = -st[sp - 1] | 0; break;
      case 0x1b: st[sp - 1] = ~st[sp - 1]; break;
      default: { // binary ops 0x10-0x16, 0x18-0x1a, 0x1c-0x1e, 0x20-0x22 (shapeOf already validated the opcode)
        const b = st[sp - 1];
        const a = st[sp - 2];
        if (op >= 19 && op <= 22 && b === 0) return end(4);
        const r = op >= 32
          ? (op === 32 ? a === b : op === 33 ? a < b : (a >>> 0) < (b >>> 0)) ? 1 : 0
          : [(a + b) | 0, (a - b) | 0, Math.imul(a, b), a === -2147483648 && b === -1 ? a : (a / b) | 0, b === -1 ? 0 : a % b | 0, Math.floor((a >>> 0) / (b >>> 0)) | 0, (a >>> 0) % (b >>> 0) | 0, 0, a & b, a | b, a ^ b, 0, a << (b & 31), a >> (b & 31), (a >>> (b & 31)) | 0][op - 16];
        sp -= 2;
        st[sp++] = r;
        break;
      }
      case 0x30: case 0x31: case 0x32: {
        const rel = ((prog[next - 2] | (prog[next - 1] << 8)) << 16) >> 16;
        let take = op === 0x30;
        if (!take) { const v = st[--sp]; take = op === 0x31 ? v === 0 : v !== 0; }
        if (take) pc = next + rel;
        break;
      }
      case 0x33:
        if (csp === 64) return end(7);
        cs[csp++] = next;
        pc = prog[next - 2] | (prog[next - 1] << 8);
        break;
      case 0x34:
        if (csp === 0) return end(8);
        pc = cs[--csp];
        break;
      case 0x40: {
        const addr = st[sp - 1];
        if (addr < 0 || addr > 255) return end(6);
        st[sp - 1] = mem[addr];
        break;
      }
      case 0x41: {
        const addr = st[sp - 1];
        if (addr < 0 || addr > 255) return end(6);
        mem[addr] = st[sp - 2];
        sp -= 2;
        break;
      }
      case 0x50: {
        const bs = enc.encode(String(st[sp - 1]));
        if (olen + bs.length > 65536) return end(11);
        sp--;
        out.set(bs, olen);
        olen += bs.length;
        break;
      }
      case 0x51:
        if (olen + 1 > 65536) return end(11);
        out[olen++] = st[--sp] & 255;
        break;
      case 0x52: st[sp++] = ip < inp.length ? inp[ip++] : -1; break;
      case 0x53: return end(st[--sp] & 255);
    }
  }
}

const I = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
for (const id of readdirSync(I).sort()) {
  let r = { bytes: new Uint8Array(0), code: 0 };
  try { r = run(new Uint8Array(readFileSync(join(I, id, 'program.bin'))), new Uint8Array(readFileSync(join(I, id, 'input.bin')))); } catch { /* one bad instance must not sink the set */ }
  mkdirSync(join(O, id), { recursive: true });
  writeFileSync(join(O, id, 'stdout.bin'), r.bytes);
  writeFileSync(join(O, id, 'exit.txt'), `${r.code}\n`);
}
