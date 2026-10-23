---
title: Aligning fused RMSNorm rounding across vLLM backends
description: Tracing BF16 and FP16 differences to an early rounding step in the CUDA kernel, then testing the arithmetic contract directly.
lang: en
slug: vllm-rmsnorm-rounding
date: 2026-08-14
tags: [CUDA, Numerical accuracy, BF16, FP16]
repository: vllm-project/vllm
pr: 52243
order: 3
evidence: Historical CUDA regressions passed · Rebased revision needs GPU validation
---

## The problem

vLLM's native IR and CUDA `vllm_c` implementations of fused residual addition and RMSNorm rounded intermediate values at different points. Because compilation settings can change which implementation runs, the same model could receive different arithmetic depending on execution mode. [Issue #52104](https://github.com/vllm-project/vllm/issues/52104) reported BF16 token divergence for GLM-4.7-Flash.

The contribution in [PR #52243](https://github.com/vllm-project/vllm/pull/52243) targets the kernel's numerical behavior. Matching that behavior is a necessary step toward investigating model divergence; kernel tests alone cannot establish token parity.

## Finding the rounding boundary

The native implementation adds input and residual in FP32, then uses that unrounded sum to calculate variance and normalize. It separately rounds the sum when writing the residual back to BF16 or FP16.

Both CUDA paths rounded the sum before calculating variance. That made the residual output look reasonable while changing the values used for normalization.

| Stage | Previous CUDA behavior | Native IR contract |
| --- | --- | --- |
| Residual addition | Round sum to input dtype early | Retain FP32 sum |
| Variance and normalization | Use rounded sum | Use FP32 sum |
| Residual write-back | Store rounded sum | Round only for storage |
| Weighted output | Different intermediate rounding | Cast normalized value to weight dtype before multiplication |

## Implementation and tradeoffs

The patch updates both the vectorized and generic paths in `csrc/layernorm_kernels.cu`. Variance uses the FP32 sum; a second pass recomputes that sum, writes the rounded residual, and normalizes from FP32. A vector helper in `csrc/type_convert.cuh` preserves FP32 addition when accumulating squared values.

Recomputing the sum introduces additional input reads and arithmetic. The PR does not provide a performance benchmark, so the numerical fix carries no throughput claim.

## Testing the contract

Eight focused regressions cover BF16 and FP16, token counts of 8 and 512, and hidden sizes of 2048 and 8192. Non-uniform random inputs matter: normalization can cancel the scale of a uniform row and hide the rounding error.

The reference keeps addition and variance in FP32 and reproduces the native output casts explicitly. Residual output must match bit for bit. Normalized output allows fewer than 1% differing elements to accommodate FP32 reduction-order differences; exact output equality would conflate that noise with the early-rounding defect.

## Validation and limits

Before the rebase, the recorded NVIDIA A10 run used CUDA 13.0 and PyTorch 2.11.0+cu130 with a rebuilt SM8.6 extension. All eight focused regressions passed; the full layernorm file recorded 1,450 passes and 184 skips.

Those CUDA results were not reproduced on the current rebased revision. After upstream moved the kernel sources, the October 21 rebase passed syntax, whitespace, and 13 individually invoked pre-commit hooks. The full pre-commit command stopped during Node environment setup. The host had no CUDA toolkit or GPU.

The PR is open as of October 23, 2026. GPU validation of the rebased code and compiled-versus-uncompiled GLM-4.7-Flash evaluation remain outstanding. There is no current-revision model-quality, token-parity, or performance result.
