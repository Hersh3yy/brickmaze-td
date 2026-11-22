// Balance report: plays headless bot matches in parallel (one worker per core) and
// prints how far each difficulty and strategy gets, and which waves end runs.
//
//   npm run balance                      # default: 6 seeds, Kitchen map
//   BALANCE_SEEDS=12 npm run balance     # more matches per combination
//   BALANCE_MAPS=crossroad,twin_choke npm run balance
//
// The report is also written to balance/last-report.txt.

import { writeFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { Worker, isMainThread, parentPort } from 'node:worker_threads';
import { createJiti } from 'jiti';

// interopDefault off: otherwise every access to an imported value goes through a proxy,
// which cost about a fifth of the run time.
const jiti = createJiti(import.meta.url, { interopDefault: false });

if (!isMainThread) {
  // Worker: load the TypeScript bot once, then play whatever match the main thread sends.
  const { STRATEGIES, playMatch } = await jiti.import('./bot.ts');
  parentPort.on('message', (job) => {
    const strategy = STRATEGIES.find((s) => s.name === job.strategy);
    parentPort.postMessage(playMatch(strategy, job.difficulty, job.map, job.seed));
  });
} else {
  const started = Date.now();
  const { STRATEGIES } = await jiti.import('./bot.ts');
  const { DIFFICULTY_LIST } = await jiti.import('../app/game/domain/constants.ts');

  const seeds = Number(process.env.BALANCE_SEEDS ?? 6);
  const maps = process.env.BALANCE_MAPS ? process.env.BALANCE_MAPS.split(',') : ['crossroad'];

  const jobs = [];
  for (const difficulty of DIFFICULTY_LIST)
    for (const strategy of STRATEGIES)
      for (const map of maps)
        for (let s = 1; s <= seeds; s++)
          jobs.push({ difficulty, strategy: strategy.name, map, seed: s * 7919 });

  const workerCount = Math.max(1, Math.min(jobs.length, availableParallelism() - 1));
  const results = [];
  let next = 0;

  await new Promise((resolve, reject) => {
    let running = 0;
    for (let i = 0; i < workerCount; i++) {
      const worker = new Worker(new URL(import.meta.url));
      running += 1;
      const feed = () => {
        if (next < jobs.length) worker.postMessage(jobs[next++]);
        else {
          void worker.terminate();
          running -= 1;
          if (running === 0) resolve();
        }
      };
      worker.on('message', (result) => {
        results.push(result);
        process.stderr.write(`\r  ${results.length}/${jobs.length} matches`);
        feed();
      });
      worker.on('error', reject);
      worker.once('online', feed);
    }
  });
  process.stderr.write('\n');

  const quantile = (sorted, q) =>
    sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))))];

  const lines = [];
  const secs = ((Date.now() - started) / 1000).toFixed(1);
  lines.push(
    `Balance report: ${results.length} matches on ${maps.join(', ')}, ${seeds} seeds each, ${workerCount} workers, ${secs}s`
  );
  lines.push('');
  lines.push('difficulty  strategy    wins  waves cleared: min / median / max');
  for (const difficulty of DIFFICULTY_LIST) {
    for (const strategy of STRATEGIES) {
      const rs = results.filter((r) => r.difficulty === difficulty && r.strategy === strategy.name);
      const cleared = rs.map((r) => r.wavesCleared).sort((a, b) => a - b);
      const wins = rs.filter((r) => r.won).length;
      lines.push(
        `${difficulty.padEnd(10)}  ${strategy.name.padEnd(10)}  ${`${wins}/${rs.length}`.padStart(5)}  ` +
          `${String(cleared[0]).padStart(3)} / ${String(quantile(cleared, 0.5)).padStart(3)} / ${String(cleared.at(-1)).padStart(3)}`
      );
    }
    lines.push('');
  }

  lines.push('Wave that ended the run (all difficulties and strategies; a wall is a tall bar):');
  const deaths = new Map();
  for (const r of results) {
    if (r.won) continue;
    const w = r.wavesCleared + 1;
    deaths.set(w, (deaths.get(w) ?? 0) + 1);
  }
  for (const w of [...deaths.keys()].sort((a, b) => a - b)) {
    lines.push(`  wave ${String(w).padStart(2)}: ${'#'.repeat(deaths.get(w))} ${deaths.get(w)}`);
  }

  const report = lines.join('\n');
  writeFileSync(new URL('./last-report.txt', import.meta.url), `${report}\n`);
  console.log(report);
}
