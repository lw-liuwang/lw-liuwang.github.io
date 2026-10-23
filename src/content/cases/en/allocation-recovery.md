---
title: Recovering a Colab allocation after a timeout
description: Handling an uncertain HTTP outcome with configurable timeouts, same-notebook reconciliation, and bounded retries.
lang: en
slug: allocation-recovery
date: 2026-10-14
tags: [Python, HTTP, Reliability]
repository: googlecolab/google-colab-cli
pr: 172
order: 2
evidence: 27 focused tests passed · Merged upstream
---

> This case study is based on the public description and validation record of [PR #172](https://github.com/googlecolab/google-colab-cli/pull/172). Historical hardware validation and branch-specific checks are distinguished below.

## The problem

A slow Colab allocation POST can outlast the client's HTTP read timeout even after the backend creates a runtime. The client sees an exception while the server may already have assigned resources.

That leaves an uncertain outcome. A request timeout reports that the client did not receive a response in time; it does not establish whether the allocation took effect.

## Reasoning about recovery

The original notebook hash provides the identity needed to query for an existing assignment. The recovery sequence checks that identity after a transient POST failure, adopts an assignment when one is found, and preserves the identity if a retry is needed.

| Observation | Response |
| --- | --- |
| Assignment exists for the original notebook hash | Return that assignment |
| Assignment is absent after a transient failure | Retry within the configured budget, using refreshed XSRF state |
| Non-transient error or retry budget exhausted | Propagate the failure |

The transient failure set is explicit: allocation POST `ReadTimeout` and HTTP 502, 503, or 504. Existing HTTP 412 and other non-transient handling remains in place.

## Implementation and tradeoffs

Three environment variables expose the policy:

```text
COLAB_CLI_REQUEST_TIMEOUT
COLAB_CLI_ASSIGN_RETRIES
COLAB_CLI_RETRY_BACKOFF
```

An explicit caller `timeout=` takes precedence over the environment. When the timeout environment variable is unset, the underlying default is preserved.

The retry count defaults to three, with a ten-second base for bounded exponential backoff. A retry count of zero disables recovery attempts. Failed reconciliation GETs and exhausted retries propagate so the caller receives a definite error rather than waiting indefinitely.

There is an important remaining assumption: querying and then re-POSTing with the same notebook hash does not establish a general backend idempotency guarantee. An allocation could materialize after the reconciliation GET. The PR documents this race and discusses a more conservative GET-only reconciliation policy in [discussion #141](https://github.com/googlecolab/google-colab-cli/discussions/141).

## Validation

The published change records **27 focused tests passing** across `tests/test_client.py` and `tests/test_consumption_client.py`. The covered behaviors include:

- Timeout precedence and preserving defaults.
- Adopting an existing assignment and refreshing the XSRF token.
- Eventual retry success, exponential backoff, and retry exhaustion.
- Non-retryable errors and explicitly disabling retries.

Focused Ruff checks and `git diff --check` passed. The modified client also completed a real read-only assignment-list request.

A previous locally patched CLI recovered a TPU v6e1 allocation after three read timeouts, approximately 7 minutes and 18 seconds overall, followed by a successful remote JAX device query. The PR explicitly identifies that run as **historical validation**. A fresh end-to-end allocation/recovery run for the published branch was still outstanding in the recorded description.

## Outcome and limits

[PR #172](https://github.com/googlecolab/google-colab-cli/pull/172) was merged on October 14, 2026.

The change makes timeout and recovery behavior configurable and bounds repeated attempts. It leaves kernel execution timeouts, runtime lifetime, and quotas unchanged.

The general lesson is to treat a timed-out state-changing request as an uncertain outcome. Recovery needs an operation identity, a way to observe server state, a finite policy, and an explicit account of the races that remain.
