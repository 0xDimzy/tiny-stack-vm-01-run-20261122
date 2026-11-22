# Pocket Stack VM

[![make.fun · tiny-stack-vm-01-run-20261122](https://make.fun/badge/tiny-stack-vm-01-run-20261122.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122?utm_source=github&utm_medium=readme&utm_campaign=tiny-stack-vm-01-run-20261122)
[![rank](https://make.fun/badge/tiny-stack-vm-01-run-20261122/0xDimzy/tiny-stack-vm-01-run-20261122/rank.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=tiny-stack-vm-01-run-20261122)
[![reward](https://make.fun/badge/tiny-stack-vm-01-run-20261122/0xDimzy/tiny-stack-vm-01-run-20261122/reward.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122?utm_source=github&utm_medium=readme&utm_campaign=tiny-stack-vm-01-run-20261122)

A complete interpreter for make.fun's tiny stack ISA v1, built for the
[Build a tiny stack virtual machine](https://make.fun/bounty/tiny-stack-vm-01-run-20261122) bounty on [make.fun](https://make.fun).

`main.ts` (Node 22, no dependencies) runs every program under the input
directory and writes each one's exact output bytes and exit code: wrapping
32-bit arithmetic (`Math.imul`, unsigned div/mod/compare, masked shifts),
a 256-value stack, 64-deep calls, 256 memory words, all ten traps with
their own exit codes, and the 1,000,000-step / 65,536-byte output limits.

## Run

```sh
mkdir -p out && MAKEFUN_INPUT_DIR=<input> MAKEFUN_OUTPUT_DIR=out node main.ts
```
