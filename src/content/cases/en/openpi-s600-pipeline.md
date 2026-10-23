---
title: Connecting Pi0 inference to robot execution on RDK S600
description: Integrating ROS 2 observations, model preprocessing, inference transport, and joint-action execution into one deployment pipeline.
lang: en
slug: openpi-s600-pipeline
date: 2026-02-04
tags: [Robotics, ROS 2, VLA, Deployment]
repository: D-Robotics/openpi_runtime
pr: 5
order: 5
evidence: Merged · Deployment pipeline and demonstration included
---

## The integration problem

A vision-language-action model returns action predictions, but a robot deployment also needs compatible observations, transport, state reconstruction, and commands the controller can execute. [PR #5](https://github.com/D-Robotics/openpi_runtime/pull/5) adds a Pi0 inference pipeline for RDK S600 to D-Robotics OpenPI Runtime.

The change spans the S600 inference node, preprocessing and postprocessing utilities, a tensor transport server, robot control, launch configuration, and deployment documentation. A demonstration video and cover image are included in the contribution.

## Keeping observations consistent

The ROS 2 node collects head-camera and wrist-camera images alongside joint state. A reference-topic synchronizer selects nearby messages within a configured time window, and the inference loop rejects observations that are too old. The default synchronization window is 100 ms.

Images are resized to 224 by 224 and converted into the expected layout. Missing camera views receive zero-filled placeholders. The available seven-dimensional arm state is padded to the model's 14-dimensional state representation.

These adaptations make the data contract explicit. Padding supplies the required shape; it does not provide observations from an additional physical arm or camera. Joint state arrives without a message header timestamp, so the node assigns its receipt time, which limits the synchronization guarantee.

## From tensors to commands

The main loop preprocesses images, tokenizes the task prompt, and normalizes state using the configured statistics. It sends typed tensors through the transport server and receives model outputs. Postprocessing decodes the action sequence and restores delta actions relative to the observation state before publishing the controlled arm's joint and gripper values.

The execution code treats joints and the gripper separately. It interpolates from the current joint state to the first action, applies a first-order blend to intermediate targets, and interpolates toward the final action. Gripper targets are published directly.

Interpolation adds execution time and changes how model targets reach the controller. The code also records time spent collecting data, preprocessing, waiting for inference, postprocessing, and executing actions, making those costs visible individually.

## Evidence and limits

The merged change includes synchronization checks for matching messages, rejecting messages outside the time window, and reporting statistics, as well as a transport test script. The public PR does not attach a complete automated test run, so these files are evidence of included checks rather than proof that a suite passed.

The original PR description reports approximately 0.5 seconds from acquisition through inference and action execution, with transmission as the main delay. Its updated README gives an example full-loop total of about 896 ms, including about 701 ms for execution. These records use different reported timings and do not establish a controlled benchmark or speedup; neither is presented here as a latency guarantee.

[PR #5](https://github.com/D-Robotics/openpi_runtime/pull/5) was merged on February 4, 2026. It contributes a documented deployment path from ROS observations to robot commands. Task success rate, trajectory quality, and control stability require separate hardware evaluation and are not quantified by the public PR record.
