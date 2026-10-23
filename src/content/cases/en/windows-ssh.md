---
title: Making Colab CLI SSH work on Windows
description: Following a connection failure through argument quoting, process signals, and a real Windows-to-Colab SSH session.
lang: en
slug: windows-ssh
date: 2026-10-22
tags: [Python, SSH, Cross-platform]
repository: googlecolab/google-colab-cli
pr: 181
order: 1
evidence: 115 SSH tests passed · Live connection verified
---

> This case study is based on the public description and validation record of [PR #181](https://github.com/googlecolab/google-colab-cli/pull/181). The reported results describe that contribution's test environment and scope.

## The problem

On native Windows, the generated SSH `ProxyCommand` used POSIX single quotes around the Python executable path. When the installation path contained spaces, the command failed to launch. A second failure occurred before connecting: `ssh --proxy-mode --rm` referenced `signal.SIGHUP`, which is unavailable on Windows.

These failures crossed several boundaries: Python generated a command string, OpenSSH interpreted it, and a child process launched the proxy. Correctness needed to survive that whole path.

## Diagnosis

The command-quoting diagnosis had already been documented by another contributor in [discussion #97](https://github.com/googlecolab/google-colab-cli/discussions/97). The contribution built on that finding and addressed the related process-lifecycle issues.

Three platform assumptions needed attention:

| Boundary | Existing assumption | Change |
| --- | --- | --- |
| Command construction | POSIX quoting works everywhere | Use the platform's argument-quoting rules |
| Cleanup signals | `SIGHUP` is always present | Register only available signals |
| Known-hosts sink | A POSIX null-device path is available | Use `os.devnull` |

Paths containing spaces were important test inputs. Simple executable paths could conceal a quoting bug and make a broken implementation appear portable.

## Implementation and tradeoffs

Windows command construction uses `subprocess.list2cmdline`; the POSIX path retains `shlex.join`. Existing exact-argument and security regression coverage remains in place.

Cleanup registers the signals available on the current platform. The known-hosts sink uses `os.devnull`, leaving the platform-specific device name to Python.

The scope was deliberately incremental: fix the SSH blockers and preserve the existing Linux/macOS support statement. Native Windows console behavior, temporary-file editing, and headless REPL construction remained separate work.

## Validation

The validation record names native Windows 11 build 26200, Python 3.12.14, and Windows OpenSSH.

- **Regression first:** all 22 new regression cases failed before the production changes and passed after them.
- **SSH coverage:** 115 SSH tests passed, including real Windows child-process tests using a Python installation path containing spaces and an OpenSSH launch check with a local stub.
- **Cross-platform checks:** the [three-platform SSH validation](https://github.com/lw-liuwang/google-colab-cli/actions/runs/39382797104) passed on Windows, Linux, and macOS.
- **Live integration:** on October 20, native Windows OpenSSH connected to a Colab CPU runtime using the generated `ProxyCommand` and an identity path containing spaces. The remote shell returned `windows-ssh-ok`.
- **Resource cleanup:** the recorded test runtime was released, and the final session query reported no active assignments. The script targeted its own endpoint and preserved unrelated sessions.

The full Windows suite still had failures. Before the fix it recorded 21 failures, 333 passes, and 2 skips; afterward it recorded 15 failures, 362 passes, and 2 skips. The remaining failure categories were reproduced before the change. The evidence supports the SSH fix within its tested scope.

## Outcome and limits

[PR #181](https://github.com/googlecolab/google-colab-cli/pull/181) was merged on October 22, 2026.

The implementation removes the documented SSH blockers. Complete native Windows support and guaranteed cleanup after forced termination remain outside the claim. The useful engineering lesson is to test the actual process boundary: correct-looking command text alone cannot establish that the receiving program launches the intended process.
