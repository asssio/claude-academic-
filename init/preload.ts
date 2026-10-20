// 切换到调用者工作目录
if (process.env.CALLER_DIR) {
  process.chdir(process.env.CALLER_DIR);
}
