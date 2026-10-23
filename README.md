# lw-liuwang.github.io

个人开源作品集，仅提供英文版本。使用 Astro 构建为静态网站，适配 GitHub Pages。

目前展示 Google Colab CLI 的 [#181](https://github.com/googlecolab/google-colab-cli/pull/181)、[#172](https://github.com/googlecolab/google-colab-cli/pull/172)，vLLM [#52243](https://github.com/vllm-project/vllm/pull/52243)，SGLang JAX [#1806](https://github.com/sgl-project/sglang-jax/pull/1806)，以及 D-Robotics OpenPI Runtime [#5](https://github.com/D-Robotics/openpi_runtime/pull/5)。案例文字根据公开 PR 记录整理，区分历史验证与尚未完成的检查。博客与简历正文由作者补充。

## 本地运行

使用 `.node-version` 指定的 Node.js 版本或更高版本（最低 22.23.4）。

```bash
npm ci
npm run dev
```

打开终端中显示的地址，通常为 `http://localhost:4321`。

```bash
npm run check
npm run build
npx playwright install --no-shell chromium
npm test
```

## 内容维护

- 首页入口：`/`。
- 贡献案例：`src/content/cases/en/` 下的 Markdown 文件。
- 个人项目：编辑 `src/data/portfolio.ts`，目前仅展示 RoboRT，导航中的 Projects 跳转至首页项目区域。
- 博客：`src/content/writing/en/`。已有 `draft: true` 的示例模板；填完后改成 `false` 即可发布。
- 简历：编辑 `src/content/resume/en.md`，通过 `experiences` 维护公司、岗位、起止月份和图标路径，通过 `awards` 维护奖项。`published: true` 时直接显示在首页姓名下方，也可追加二级及以下 Markdown 标题和正文。
- 网站样式：`src/styles/global.css`。
- GitHub 数据：`src/data/github.json` 是随站点发布的快照，页面加载无需调用 GitHub API。

```bash
npm run sync:github
```

此命令仅更新 `scripts/sync-github.mjs` 中指定的 PR，不会引入其他贡献，并校验作者为 `lw-liuwang`。可使用 `GITHUB_TOKEN` 环境变量提高 API 限额；令牌不会写入站点。

## GitHub Pages

仓库包含 `.github/workflows/deploy.yml`。在 GitHub 仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**，推送到 `main` 后自动检查、构建并部署。

站点地址：<https://lw-liuwang.github.io/>。部署过程使用提交中的数据快照，不依赖 GitHub API 的可用性。

## 资源

- 头像来自作者的公开 GitHub 账号，保存在 `public/avatar.png`。
- Colab CLI 使用作者提供的 Google 图标，保存在 `public/google.svg`。
- vLLM、SGLang 和 D-Robotics 图标来自对应 GitHub 组织的公开头像，保存在 `public/vllm.png`、`public/sglang.png` 和 `public/d-robotics.png`。
- 百度和地平线图标由作者提供，保存在 `public/baidu.svg` 和 `public/horizon-robotics.svg`。
- RoboRT 图标来自项目仓库的 `docs/figs/robort_icon.png`，保存在 `public/robort.png`。
- DM Sans 字体通过 `@fontsource-variable/dm-sans` 本地打包，使用 SIL Open Font License。页面无需请求外部字体服务。
