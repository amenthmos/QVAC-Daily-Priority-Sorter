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

## Example

Input: `{"tasks":"Reply to client email about contract\nWater the plants\nFix the production bug reported this morning\nPlan next quarter's roadmap"}`

`src/logic.js` splits this into 4 distinct tasks, asks the model to reorder them with brief reasoning, then matches each returned line back to one of your original tasks by word overlap. The response shape:
```json
{"tasks":["Reply to client email about contract","Water the plants","Fix the production bug reported this morning","Plan next quarter's roadmap"],
 "ranked":[{"task":"...","reason":"..."}, ...]}
```
If the model invents, merges, or drops a task, `ranked` falls back to your exact original list in its original order (each with an empty `reason`) rather than showing an untrustworthy reordering — see `fallbackOrder()` in `src/logic.js`.

## License

MIT
