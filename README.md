# QVAC Daily Priority Sorter

Paste a messy todo list, and an on-device AI reorders it by likely urgency/importance with brief reasoning — using only the tasks you actually listed, never inventing new ones. No cloud call, no API key.

## Run

```bash
npm install
npm start
```

Then open http://localhost:32018

## QVAC SDK version

`@qvac/sdk` ^0.19.0 (see `package.json`).

## How it works

Built on [Tether's QVAC SDK](https://www.npmjs.com/package/@qvac/sdk) — all inference runs on-device, no cloud call, no API key. The app loads `LLAMA_3_2_1B_INST_Q4_0` locally with `loadModel()`, generates with `completion()` (streamed via `tokenStream`), and releases the model with `unloadModel()` on shutdown.

Each model-produced line is matched back to one of your original tasks by word overlap. If the model invents a task, merges two tasks, or drops one, the app falls back to your original list order instead of showing an unreliable reordering.

## License

MIT
