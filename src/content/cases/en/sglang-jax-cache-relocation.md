---
title: Preserving JAX compilation cache hits after relocation
description: Isolating a path-dependent cache key and verifying cold, warm, and copied-cache behavior in fresh processes on CPU and TPU.
lang: en
slug: sglang-jax-cache-relocation
date: 2026-10-19
tags: [JAX, TPU, Compilation cache, Regression testing]
repository: sgl-project/sglang-jax
pr: 1806
order: 4
evidence: CPU regression · TPU cache-hit probe
---

## The problem

A populated persistent compilation cache should remain useful when copied to another directory or mounted at a different absolute path. In SGLang JAX, moving it could cause every function to compile again while the server otherwise started normally. [Issue #1774](https://github.com/sgl-project/sglang-jax/issues/1774) documented this behavior.

[PR #1806](https://github.com/sgl-project/sglang-jax/pull/1806) changes the scheduler's cache policy and adds a regression that exercises relocation. This contribution is to the official SGLang JAX repository.

## Following the cache key

`Scheduler._setup_jit_cache` enabled `jax_persistent_cache_enable_xla_caches="all"`. This included a GPU kernel-cache file whose absolute path became part of the persistent compilation cache key. Changing the cache directory therefore changed the key, even for the CPU and TPU reproductions.

The diagnosis connects the scheduler setting to [JAX issue #41044](https://github.com/jax-ml/jax/issues/41044) and [upstream fix #41263](https://github.com/jax-ml/jax/pull/41263). It explains why moving identical files could invalidate the cache without changing the compiled computation.

## A focused policy change

The patch enables only `xla_gpu_per_fusion_autotune_cache_dir`, matching the pinned JAX 0.11.1 default. Persistent compilation caching and the autotune cache remain enabled; the path-dependent GPU kernel subcache is excluded.

This avoids custom cache-key rewriting. The migration cost is explicit: entries generated under the previous `"all"` setting need to be regenerated once. GPU performance was not benchmarked.

## Proving reuse across processes

The regression calls the real scheduler setup method and runs each phase in a fresh subprocess. Otherwise, the in-memory JIT cache could hide a persistent-cache miss.

A CPU workload combines matrix multiplication, `tanh`, and reduction, with numerical output checked against NumPy. The test verifies a cold miss, a hit in the original directory, and a hit after copying it. It checks function-specific JAX cache logs and unchanged cache filenames, rather than treating a short runtime as proof of a hit. The test is registered in the CPU suite.

```bash
JAX_PLATFORMS=cpu USE_DEVICE_TYPE=cpu python test/srt/test_jit_cache.py
```

The recorded regression fails before the fix and passes with JAX and jaxlib 0.11.1.

## TPU evidence and limits

A separate probe used one Colab v6e1 device, reported as TPU v6 lite, with JAX/jaxlib 0.11.1 and libtpu 0.0.46.3. It extracted the actual scheduler setup method with Python AST to avoid loading unrelated inference dependencies, and again used a fresh process for each phase.

| Setting | Cold directory | Original directory | Copied directory |
| --- | --- | --- | --- |
| Previous `all` | Miss | Hit | Miss |
| Autotune-only | Miss | Hit | Hit |

All six numerical outputs were bit-identical. The recorded pre-commit run passed with mypy skipped after its isolated installation stopped; Ruff, Black, and isort also passed directly.

The PR is open as of October 23, 2026. These results establish cache behavior for the tested workloads. They do not measure full model-server startup, inference throughput, model accuracy, or GPU performance.
