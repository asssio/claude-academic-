#!/usr/bin/env python3
"""Claude Code 通知提示音：每次回答完成后播放，播放5秒后自动关闭"""

import ctypes
import os
import time
import subprocess
import sys
import tempfile

# 通过 CLAUDE_CONFIG_DIR 环境变量定位 hooks 目录
_CLARIFY_CONFIG_DIR = os.environ.get('CLAUDE_CONFIG_DIR')
if _CLARIFY_CONFIG_DIR:
    _HOOKS_DIR = os.path.join(_CLARIFY_CONFIG_DIR, 'hooks')
else:
    _HOOKS_DIR = os.path.dirname(os.path.abspath(__file__))

MP3_FILE = os.path.join(_HOOKS_DIR, "basic-alarm-ringtone.mp3")
LOCK_FILE = os.path.join(tempfile.gettempdir(), ".claude_code_bell_lock")


def play(duration=5):
    if not os.path.isfile(MP3_FILE):
        return
    try:
        ctypes.windll.winmm.mciSendStringW(
            f'open "{MP3_FILE}" type mpegvideo alias alarm', None, 0, None
        )
        ctypes.windll.winmm.mciSendStringW("play alarm", None, 0, None)
        time.sleep(duration)
    except Exception:
        pass
    finally:
        try:
            ctypes.windll.winmm.mciSendStringW("stop alarm", None, 0, None)
            ctypes.windll.winmm.mciSendStringW("close alarm", None, 0, None)
        except Exception:
            pass
        finally:
            # 播放完成后删除锁文件
            try:
                if os.path.isfile(LOCK_FILE):
                    os.remove(LOCK_FILE)
            except Exception:
                pass


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--tool":
        # 从 PostToolUse hook 调用：检查锁文件，防止连续工具调用重复响铃
        if os.path.isfile(LOCK_FILE):
            # 锁文件存在，说明刚响过，跳过
            sys.exit(0)
        # 创建锁文件，标记已响应
        try:
            with open(LOCK_FILE, "w") as f:
                f.write(str(time.time()))
        except Exception:
            pass
        # 后台子进程播放，不阻塞 Claude Code
        subprocess.Popen(
            [sys.executable, __file__, "play"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    elif len(sys.argv) > 1 and sys.argv[1] == "play":
        play()
