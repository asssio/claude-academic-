# Claude CLI ↔ Android 手机桥接方案（原生 App）

## Context

用户需要一个类似 Claude Code ↔ VS Code 的桥接机制，让 Claude CLI 能通过 WiFi 局域网 WebSocket 与 Android 手机通信。手机端必须是**原生 Android App**（非 Auto.js），避免被应用检测封号。

功能需求：
- 远程运行 JS 脚本
- 获取设备信息
- 调试手机上的应用（Accessibility 自动化）
- 手机作为算力节点，将计算结果传回 PC
- 截图、UI 操作

## 架构

```
Claude CLI (PC) ←→ WebSocket (WiFi) ←→ PhoneBridge App (手机)
     ↓                                    ↓
  发送命令、接收结果                    Accessibility 自动化 + 截图 + Shell
```

## 文件结构

```
F:\space\phone_bridge\
├── android/                          # Android 原生项目
│   ├── app/
│   │   ├── build.gradle              # 构建配置
│   │   ├── proguard-rules.pro        # 混淆规则
│   │   └── src/main/
│   │       ├── AndroidManifest.xml   # 权限声明
│   │       ├── java/com/phonebridge/
│   │       │   ├── PhoneBridgeApplication.kt
│   │       │   ├── MainActivity.kt
│   │       │   ├── WebSocketServer.kt
│   │       │   ├── AccessibilityService.kt
│   │       │   ├── ScreenshotHelper.kt
│   │       │   └── CommandHandler.kt
│   │       └── res/
│   │           ├── layout/activity_main.xml
│   │           └── xml/accessibility_service_config.xml
│   ├── build.gradle
│   ├── settings.gradle
│   └── gradle.properties
├── bridge_client.py                  # PC 端 Python 客户端
└── README.md                         # 使用说明
```

## 协议设计

JSON 格式，WebSocket 双向通信，端口 8765。

### PC → 手机（命令）

```json
{
  "id": "cmd_001",
  "type": "command",
  "command": "run_script",
  "params": { "code": "...", "timeout": 30000 }
}
```

支持命令：
- `run_script` — 执行 JS 代码（Rhino/Nashorn 引擎）
- `device_info` — 获取设备信息（型号、版本、电量等）
- `screenshot` — 截图返回 base64
- `tap(x, y)` / `swipe(x1, y1, x2, y2)` / `input(text)` — UI 操作
- `find_view(text)` — 查找 UI 元素
- `shell(cmd)` — 执行 shell 命令
- `app_info(package)` — 获取应用信息
- `compute(task)` — 算力任务

### 手机 → PC（响应）

```json
{ "id": "cmd_001", "type": "response", "status": "ok", "result": { ... } }
```

### 手机 → PC（算力推送）

```json
{ "type": "compute_result", "task_id": "task_001", "data": { ... } }
```

## 实现要点

### 手机端
- **WebSocket 服务器**：使用 Java-WebSocket 库（org.java-websocket）
- **Accessibility Service**：实现 UI 自动化（点击、滑动、查找元素）
- **截图**：使用 MediaProjection API
- **JS 执行**：使用 Rhino 引擎（Android 内置）
- **前台服务**：保持后台运行，通知栏显示连接状态
- **鉴权**：简单 token 验证

### PC 端
- `PhoneBridge` 类封装连接、命令、结果
- 支持同步调用和异步回调
- 自动重连
- 可作为 Claude CLI 的 MCP server

## 验证

1. Android Studio 打开项目，编译安装到手机
2. 开启无障碍服务权限
3. PC 运行 bridge_client.py 连接手机 IP
4. 测试 device_info、screenshot、tap、run_script 命令