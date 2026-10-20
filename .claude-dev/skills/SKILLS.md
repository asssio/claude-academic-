# Claude Code 技能索引

> Claude Code 已安装技能索引，位于 `.claude-dev/skills/` 目录。

---

## 快速索引

| 技能 | 分类 | 核心功能 | 触发场景 |
|-------|----------|--------------|---------|
| [sp_brainstorming](#sp_brainstorming) | 方法论 | 将想法转化为设计规范 | 任何创意工作前 |
| [sp_using-superpowers](#sp_using-superpowers) | 方法论 | 建立技能查找和使用规范 | 任何对话开始时 |
| [sp_writing-plans](#sp_writing-plans) | 方法论 | 编写分步实施计划 | 使用规范前编码 |
| [sp_dispatching-parallel-agents](#sp_dispatching-parallel-agents) | 方法论 | 并行分发独立任务 | 2+个独立任务 |
| [sp_subagent-driven-development](#sp_subagent-driven-development) | 方法论 | Subagent执行+两阶段审查 | 执行实施计划 |
| [sp_executing-plans](#sp_executing-plans) | 方法论 | 在单独会话中执行计划 | 带检查点的计划执行 |
| [sp_verification-before-completion](#sp_verification-before-completion) | 方法论 | 完成前验证 | 声称工作完成前 |
| [sp_writing-skills](#sp_writing-skills) | 方法论 | TDD方法编写技能 | 创建/编辑技能 |
| [frontend-dev](#frontend-dev) | 开发 | UI设计+电影级动画 | 构建落地页/仪表盘 |
| [fullstack-dev](#fullstack-dev) | 开发 | 全栈后端+前端集成 | 构建全栈应用/REST API |
| [flutter-dev](#flutter-dev) | 开发 | Flutter跨平台+状态管理 | Flutter应用开发 |
| [android-native-dev](#android-native-dev) | 开发 | Material Design 3 + Kotlin/Compose | Android原生开发 |
| [ios-application-dev](#ios-application-dev) | 开发 | UIKit/SnapKit/SwiftUI | iOS应用开发 |
| [react-native-dev](#react-native-dev) | 开发 | React Native/Expo开发 | RN/Expo应用开发 |
| [shader-dev](#shader-dev) | 开发 | GLSL光线行进/SDF/流体模拟 | 3D图形/视觉效果 |
| [minimax-docx](#minimax-docx) | 文档 | OpenXML SDK Word文档创建 | 报告/合同/表单 |
| [minimax-pdf](#minimax-pdf) | 文档 | 可视化PDF生成 | 报告/简历/提案 |
| [minimax-xlsx](#minimax-xlsx) | 文档 | Excel创建/编辑/验证 | 财务模型/电子表格 |
| [pptx-generator](#pptx-generator) | 文档 | PowerPoint生成/编辑 | PPT/演示文稿 |
| [minimax-music-gen](#minimax-music-gen) | 媒体 | MiniMax音乐API歌曲生成 | 音乐/歌词创作 |
| [minimax-music-playlist](#minimax-music-playlist) | 媒体 | 个性化播放列表生成 | 播放列表/音乐推荐 |
| [gif-sticker-maker](#gif-sticker-maker) | 媒体 | 照片转Funko风格GIF贴纸 | 贴纸/头像动画 |
| [mmx-cli](#mmx-cli) | 媒体 | MiniMax AI平台CLI | 文本/图像/视频/音乐生成 |
| [sp_receiving-code-review](#sp_receiving-code-review) | 代码质量 | 代码审查反馈处理 | 收到审查反馈后 |
| [sp_requesting-code-review](#sp_requesting-code-review) | 代码质量 | 代码审查请求规范 | 合并前验证 |
| [pr-review](#pr-review) | 代码质量 | 仓库PR验证 | PR审查 |
| [sp_systematic-debugging](#sp_systematic-debugging) | 调试/测试 | 系统化调试四阶段流程 | Bug/测试失败 |
| [sp_test-driven-development](#sp_test-driven-development) | 调试/测试 | 红绿重构TDD循环 | 实现功能前 |
| [sp_finishing-a-development-branch](#sp_finishing-a-development-branch) | 效率 | 分支完成结构化选项 | 实现完成后 |
| [sp_using-git-worktrees](#sp_using-git-worktrees) | 效率 | 隔离git worktrees | 隔离特性开发前 |
| [fixing-plugin-paths](#fixing-plugin-paths) | 效率 | 插件路径转相对路径 | 插件加载失败 |
| [find-skills](#find-skills) | 效率 | 搜索和安装技能 | 查找特定技能 |
| [fix-indented-text](#fix-indented-text) | 效率 | 修复缩进文本换行 | 文本换行异常 |
| [video-subtitle](#video-subtitle) | 媒体处理 | 视频字幕提取/翻译/烧录 | 中文字幕添加到英文视频 |
| [minimax-vision-analysis](#minimax-vision-analysis) | 媒体处理 | MiniMax图像分析/OCR | 分析/描述图像 |
| [csdn-Downloader](#csdn-downloader) | 媒体处理 | CSDN文章下载Markdown | 离线保存CSDN文章 |
| [videoDownloader](#videodownloader) | 媒体处理 | Bilibili视频下载 | 下载Bilibili视频 |
| [web-access](#web-access) | 网络 | 联网搜索/网页抓取 | 搜索信息/查看网页 |
| [DrissionPage-Skill-main](#drissionpage-skill-main) | 网络 | 浏览器自动化交互 | 网页截图/表单填写/数据抓取 |

---

## 方法论与工作流技能

### sp_brainstorming

**核心：** 通过协作对话将想法转化为完整设计和规范

**触发：** 任何创意工作前 - 创建功能、构建组件、添加功能或修改行为。在实施前探索用户意图、需求和设计

**流程：** 探索上下文 → 澄清问题 → 提出方案 → 展示设计 → 编写规范 → 规范自查 → 用户审查 → 调用writing-plans

---

### sp_using-superpowers

**核心：** 建立技能查找和使用标准，要求在任何响应前调用Skill工具

**触发：** 在任何对话开始时使用 - 建立如何查找和使用技能

---

### sp_writing-plans

**核心：** 基于规范编写详细的分步实施计划（TDD, DRY, YAGNI）

**触发：** 当有多步骤任务的规范或需求时，触摸代码前

---

### sp_dispatching-parallel-agents

**核心：** 将多个独立任务分发到隔离上下文的subagents并行工作

**触发：** 当面临2+个可以无共享状态或顺序依赖地处理的独立任务时

---

### sp_subagent-driven-development

**核心：** 通过为当前会话中的每个任务分发新的subagents来执行实施计划，每个任务后进行两阶段审查

**触发：** 当在当前会话中执行具有独立任务的实施计划时

---

### sp_executing-plans

**核心：** 在单独会话中带审查检查点执行书面实施计划

**触发：** 当有要在单独会话中带审查检查点执行的书面实施计划时

---

### sp_verification-before-completion

**核心：** 在声称成功前要求运行验证命令并确认输出

**触发：** 在声称工作完成、修复或通过前，在提交或创建PR前

---

### sp_writing-skills

**核心：** 应用TDD方法进行工作流文档编写 - 观察无技能的agent失败，编写技能文档，然后验证有效性

**触发：** 创建新技能、编辑现有技能或验证技能部署前的工作

---

## 开发与架构技能

### frontend-dev

**核心：** 使用高级UI设计和电影级动画构建前端

**触发：** 构建落地页、营销网站、仪表盘；生成图像/视频/音频/音乐；编写转化文案；创建生成艺术；实现电影级滚动动画

**流程：** 设计架构 → 动画架构 → 资源生成 → 文案 → 构建UI → 质量门控

---

### fullstack-dev

**核心：** 全栈后端架构和前端-后端集成，包括API设计、服务分层、错误处理、认证、缓存、实时功能和生产加固

**触发：** 构建全栈应用、创建REST API、脚手架后端服务、设计服务层、实现错误处理/认证/文件上传/实时功能

**流程：** 需求 → 架构 → 脚手架 → 实施 → 测试 → 交接总结

---

### flutter-dev

**核心：** Flutter跨平台开发指南，涵盖Widget模式、Riverpod/Bloc状态管理、GoRouter导航、性能优化和平台特定实现

**触发：** 构建Flutter应用、实现状态管理、设置GoRouter导航、创建自定义Widget、优化性能、编写Widget测试、跨平台开发

---

### android-native-dev

**核心：** Android原生应用开发和UI设计指南，涵盖Material Design 3、Kotlin/Compose开发、项目配置、无障碍和构建故障排除

**触发：** 开发Android原生应用、实现UI、审查Android代码

---

### ios-application-dev

**核心：** iOS应用开发指南，涵盖UIKit、SnapKit和SwiftUI，包括触摸目标、安全区域、导航模式、动态类型、深色模式、无障碍

**触发：** 开发iOS应用、实现UI、审查iOS代码、构建iPhone界面、Swift移动开发、Apple HIG合规、iOS无障碍实现

---

### react-native-dev

**核心：** React Native和Expo开发指南，涵盖组件、样式、动画、导航、状态管理、表单、网络、性能优化、测试、原生功能和企业工程

**触发：** 构建React Native或Expo应用、实现动画或原生UI、管理状态、获取数据、编写测试、优化性能、部署到App Store/Play Store

---

### shader-dev

**核心：** 创建令人惊叹的视觉效果的综合GLSL着色器技术 - 光线行进、SDF建模、流体模拟、粒子系统、程序化生成、光照、后处理和36+种技术

**触发：** 创建3D对象/场景、有机/扭曲形状、流体/烟雾效果、粒子效果（火、雪）、水/海洋表面、地形/景观、天空/大气、体积渲染、路径追踪/全局光照、Voxel世界、程序化音频/音乐

---

## 文档生成技能

### minimax-docx

**核心：** 使用OpenXML SDK (.NET)创建、编辑和格式化专业Word文档 (.docx)，支持三条管道：从头创建、填充/编辑内容、应用模板样式

**触发：** 当用户想要生成、修改或格式化Word文档时 - 包括报告、合同、表单、应用模板、排版

---

### minimax-pdf

**核心：** 基于设计系统（颜色、字体排版、间距）生成视觉精美的PDF文档（报告、简历、提案）

**触发：** 当用户要求制作PDF、生成报告、创建简历、漂亮PDF、专业文档、封面、格式Markdown/文本到PDF

---

### minimax-xlsx

**核心：** 使用财务格式化标准创建、读取、分析、编辑和验证Excel/电子表格文件 (.xlsx, .xlsm, .csv) 及公式验证

**触发：** 当用户要求创建、构建、修改、分析、读取、验证或格式化Excel电子表格、财务模型、数据透视表，或生成表格化Excel输出

---

### pptx-generator

**核心：** 使用PptxGenJS从头创建PowerPoint演示文稿（封面、目录、分节符、内容页、总结），或通过XML工作流编辑现有PPTX

**触发：** 当用户提到PPT、PPTX、PowerPoint、演示文稿、幻灯片、deck

---

## 媒体生成技能

### minimax-music-gen

**核心：** 通过MiniMax Music API生成带歌词的歌曲或器乐曲目，支持基本模式（一句话描述）和高级控制模式（编辑歌词、微调参数）

**触发：** 当用户想要生成音乐、歌曲、音频轨道、歌词创作、音频制作

---

### minimax-music-playlist

**核心：** 扫描用户音乐偏好（Apple Music/Spotify/手动描述），构建品味档案，生成带专辑封面的个性化主题播放列表

**触发：** 当用户请求播放列表生成、音乐品味分析、个性化音乐推荐

---

### gif-sticker-maker

**核心：** 将用户照片转换为4个带字幕的动态Funko Pop/Pop Mart风格GIF贴纸

**触发：** 当用户想要创建卡通贴纸、GIF表情包、表情包、动画头像

---

### mmx-cli

**核心：** 通过调用MiniMax AI平台的mmx CLI生成文本对话、图像、视频、语音、音乐并执行网络搜索

**触发：** 当用户想要创建媒体内容（图像/视频/音乐）、与MiniMax模型聊天、执行网络搜索

---

## 代码质量技能

### sp_receiving-code-review

**核心：** 接收和处理代码审查反馈的指南，强调技术验证而非盲目认同

**触发：** 收到代码审查反馈时，在实施建议前

---

### sp_requesting-code-review

**核心：** 标准化代码审查请求的时机、方法和流程

**触发：** 完成任务、实施重大功能或合并前

---

### pr-review

**核心：** 验证MiniMax Skills仓库PR是否符合结构和质量标准

**触发：** 审查PR、验证新技能提交、检查现有技能合规性

---

## 调试与测试技能

### sp_systematic-debugging

**核心：** 通过四个阶段（根因调查、模式分析、假设验证、实施）进行系统化调试，在提出修复前找到Bug根因

**触发：** 遇到任何Bug、测试失败或意外行为时，在提出修复前

---

### sp_test-driven-development

**核心：** 遵循红-绿-重构循环 - 先写失败测试，写最小代码通过测试，然后重构

**触发：** 实现任何功能或bug修复时，在编写实施代码前

---

## 工具与效率技能

### sp_finishing-a-development-branch

**核心：** 提供四个结构化选项（本地合并、创建PR、保留分支、丢弃）指导开发工作完成，处理worktree清理

**触发：** 实现完成、所有测试通过、需要决定如何集成工作时

---

### sp_using-git-worktrees

**核心：** 创建带智能目录选择和安全验证的隔离git worktrees，支持同时处理多个分支

**触发：** 需要在隔离当前工作区的环境中开始特性开发或执行实施计划前

---

### fixing-plugin-paths

**核心：** 将插件配置中的绝对路径转换为相对于 `.claude-dev/plugins/` 的路径，解决跨机器/目录迁移后的插件加载问题

**触发：** 插件加载失败、路径引用不存在的目录、或在机器/目录间迁移Claude Code后

---

### find-skills

**核心：** 通过Skills CLI (`npx skills`)从agent技能生态系统搜索和安装扩展技能

**触发：** 当用户问"如何做X"、寻找特定技能、或表达扩展agent能力的兴趣时

---

### fix-indented-text

**核心：** 读取文件，移除缩进文本中的换行符并拼接到上一行

**触发：** 文本换行异常、缩进文本换行需要修复时

---

## 媒体处理技能

### video-subtitle

**核心：** 使用Whisper提取英文字幕，通过Ollama翻译成中文，生成双语ASS字幕，使用ffmpeg烧录到视频中（GPU加速）

**触发：** 需要给英文视频添加中文字幕时

---

### minimax-vision-analysis

**核心：** 通过MiniMax视觉MCP工具分析图像内容，支持描述、OCR文本提取、UI审查、数据图表提取、目标检测和多模式

**触发：** 当用户分享图像文件路径/URL或请求分析/描述/理解/提取图像内容时

---

### csdn-Downloader

**核心：** 将CSDN文章下载为本地Markdown文档，自动下载并保存文章中的图片

**触发：** 当用户需要离线保存CSDN文章阅读时

---

### videoDownloader

**核心：** 使用yt-dlp下载Bilibili视频，支持单视频/播放列表下载、质量选择、封面嵌入和自动cookie管理

**触发：** 当用户需要下载Bilibili视频时

---

## 网络技能

### web-access

**核心：** 处理所有联网操作，包括搜索、网页抓取、登录后操作、网络交互等

**触发：** 用户要求搜索信息、查看网页内容、访问需要登录的网站、操作网页界面时

---

### DrissionPage-Skill-main

**核心：** 使用浏览器完成网页截图、页面快照、数据抓取、内容提取、自动登录、填写表单、点击按钮等DOM相关网页交互任务

**触发：** 任何依赖DOM、真实登录态、页面渲染结果的网页交互任务

---

## 技能目录结构

```
.claude-dev/skills/
├── Methodology/
│   ├── sp_brainstorming/
│   ├── sp_using-superpowers/
│   ├── sp_writing-plans/
│   ├── sp_dispatching-parallel-agents/
│   ├── sp_subagent-driven-development/
│   ├── sp_executing-plans/
│   ├── sp_verification-before-completion/
│   └── sp_writing-skills/
│
├── Development/
│   ├── frontend-dev/
│   ├── fullstack-dev/
│   ├── flutter-dev/
│   ├── android-native-dev/
│   ├── ios-application-dev/
│   ├── react-native-dev/
│   └── shader-dev/
│
├── Document Generation/
│   ├── minimax-docx/
│   ├── minimax-pdf/
│   ├── minimax-xlsx/
│   └── pptx-generator/
│
├── Media Generation/
│   ├── minimax-music-gen/
│   ├── minimax-music-playlist/
│   ├── gif-sticker-maker/
│   └── mmx-cli/
│
├── Code Quality/
│   ├── sp_receiving-code-review/
│   ├── sp_requesting-code-review/
│   └── pr-review/
│
├── Debug/Test/
│   ├── sp_systematic-debugging/
│   └── sp_test-driven-development/
│
├── Tools/
│   ├── sp_finishing-a-development-branch/
│   ├── sp_using-git-worktrees/
│   ├── fixing-plugin-paths/
│   ├── find-skills/
│   └── fix-indented-text/
│
├── Media Processing/
│   ├── video-subtitle/
│   ├── minimax-vision-analysis/
│   ├── csdn-Downloader/
│   └── videoDownloader/
│
└── Network/
    ├── web-access/
    └── DrissionPage-Skill-main/
```

---

## 使用指南

### 按工作阶段

| 阶段 | 推荐技能 |
|-------|------------------|
| 想法验证 | sp_brainstorming → sp_writing-plans |
| 实施 | sp_dispatching-parallel-agents / sp_subagent-driven-development |
| 代码审查 | sp_receiving-code-review / pr-review |
| 完成 | sp_verification-before-completion / sp_finishing-a-development-branch |

### 按需求类型

| 需求 | 推荐技能 |
|------------|------------------|
| 文档生成 | minimax-docx / minimax-pdf / minimax-xlsx / pptx-generator |
| 媒体生成 | minimax-music-gen / gif-sticker-maker / mmx-cli |
| 移动开发 | flutter-dev / android-native-dev / ios-application-dev / react-native-dev |
| 媒体处理 | video-subtitle / minimax-vision-analysis / csdn-Downloader / videoDownloader |
| 网页抓取 | web-access / DrissionPage-Skill-main |
| 代码调试 | sp_systematic-debugging / sp_test-driven-development |
