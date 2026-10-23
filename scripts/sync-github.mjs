import { mkdir, writeFile } from 'node:fs/promises';

const username = 'lw-liuwang';
const headers = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
};

async function github(path) {
  const response = await fetch(`https://api.github.com/${path}`, {
    headers,
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`GitHub ${response.status}: ${path}`);
  return response.json();
}

const selected = [
  ['googlecolab/google-colab-cli', 181],
  ['googlecolab/google-colab-cli', 172],
  ['vllm-project/vllm', 52243],
  ['sgl-project/sglang-jax', 1806],
  ['D-Robotics/openpi_runtime', 5],
];
const prs = [];
for (const [repository, number] of selected) {
  const item = await github(`repos/${repository}/pulls/${number}`);
  if (item.user.login !== username) throw new Error(`Unexpected author on PR #${number}`);
  prs.push({
    repository,
    number: item.number,
    title: item.title,
    url: item.html_url,
    status: item.merged_at ? 'merged' : item.state === 'closed' ? 'closed' : item.draft ? 'draft' : 'open',
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    mergedAt: item.merged_at,
  });
}

const snapshot = { username, updatedAt: new Date().toISOString(), prs };
await mkdir(new URL('../src/data/', import.meta.url), { recursive: true });
await writeFile(new URL('../src/data/github.json', import.meta.url), `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(`Saved ${prs.length} upstream PRs across ${new Set(prs.map((p) => p.repository)).size} projects.`);
