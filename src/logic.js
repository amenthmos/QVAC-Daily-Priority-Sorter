// QVAC Daily Priority Sorter — core logic.
// Given a messy todo list, reorders it by likely urgency/importance with
// brief reasoning, using ONLY the tasks actually listed. Never invents new
// tasks, and never silently drops a listed task.

import { completion } from "@qvac/sdk";

function looksUnusable(text) {
  if (!text || text.trim().length === 0) return true;
  const bad = ["i cannot", "i can't", "as an ai", "i'm not able", "i am not able"];
  const lower = text.toLowerCase();
  return bad.some((phrase) => lower.includes(phrase));
}

function splitTasks(raw) {
  return raw
    .split(/\n|,(?=\s*[A-Za-z])/)
    .map((s) => s.replace(/^[\s\-*\d.)]+/, "").trim())
    .filter((s) => s.length > 1);
}

function significantWords(s) {
  return s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 3);
}

// Try to match a model-produced line back to one of the original tasks by
// word overlap, so we can tell whether it invented a task or is just
// rephrasing a real one.
function matchOriginalTask(line, remainingTasks) {
  const lineWords = new Set(significantWords(line));
  let best = null;
  let bestScore = 0;
  for (const task of remainingTasks) {
    const taskWords = significantWords(task);
    if (taskWords.length === 0) continue;
    const overlap = taskWords.filter((w) => lineWords.has(w)).length;
    const score = overlap / taskWords.length;
    if (score > bestScore) {
      bestScore = score;
      best = task;
    }
  }
  return bestScore >= 0.4 ? best : null;
}

function parseRanked(text, tasks) {
  const lines = text
    .split("\n")
    .map((l) => l.replace(/^[\s\-*\d.)]+/, "").trim())
    .filter((l) => l.length > 1);

  const remaining = [...tasks];
  const ranked = [];
  for (const line of lines) {
    const m = line.match(/^(.+?)\s*[-–—:]\s*(.+)$/);
    const taskPart = m ? m[1].trim() : line;
    const reasonPart = m ? m[2].trim() : "";
    const matched = matchOriginalTask(taskPart, remaining);
    if (!matched) continue; // invented or unmatched task — drop this line
    ranked.push({ task: matched, reason: reasonPart });
    remaining.splice(remaining.indexOf(matched), 1);
  }
  return { ranked, remaining };
}

function fallbackOrder(tasks) {
  return tasks.map((t) => ({ task: t, reason: "" }));
}

export async function sortPriorities(modelId, body) {
  const raw = (body.tasks || "").trim();
  if (!raw) {
    const err = new Error("Please paste your todo list first.");
    err.statusCode = 400;
    throw err;
  }
  const tasks = splitTasks(raw);
  if (tasks.length === 0) {
    const err = new Error("Please list at least one task.");
    err.statusCode = 400;
    throw err;
  }

  const run = completion({
    modelId,
    history: [
      {
        role: "system",
        content:
          "You reorder a todo list by likely urgency/importance. You will be " +
          "given a numbered list of the person's ACTUAL tasks. Reorder them " +
          "from most to least urgent/important, one per line, formatted as " +
          '"Task text — brief reasoning". Use ONLY the exact tasks given — ' +
          "never invent new tasks, never merge two tasks into one, never " +
          "drop a task. Every task given must appear exactly once. No " +
          "preamble.",
      },
      {
        role: "user",
        content:
          "Tasks:\n1. Reply to client email about contract\n2. Water the plants\n3. Fix the production bug reported this morning\n4. Plan next quarter's roadmap",
      },
      {
        role: "assistant",
        content:
          "Fix the production bug reported this morning — active issue affecting users, needs immediate attention.\n" +
          "Reply to client email about contract — time-sensitive and affects a business relationship.\n" +
          "Plan next quarter's roadmap — important but not urgent today.\n" +
          "Water the plants — low urgency, can be done anytime today.",
      },
      {
        role: "user",
        content: `Tasks:\n${tasks.map((t, i) => `${i + 1}. ${t}`).join("\n")}`,
      },
    ],
    stream: true,
    completionOpts: { temperature: 0.4, maxTokens: 320 },
  });

  let text = "";
  for await (const token of run.tokenStream) text += token;
  text = text.trim().replace(/^here'?s[^:\n]*:\s*/i, "").trim();

  let ranked = [];
  if (!looksUnusable(text)) {
    const parsed = parseRanked(text, tasks);
    if (parsed.remaining.length === 0) {
      ranked = parsed.ranked;
    }
  }

  if (ranked.length !== tasks.length) ranked = fallbackOrder(tasks);

  return { tasks, ranked };
}
