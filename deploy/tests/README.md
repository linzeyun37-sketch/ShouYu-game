# 页面回归检查

`browser_regression.js` 通过 Playwright CLI 的 `run-code` 执行，检查分类与难度双列、67 个游戏详情、搜索链接与筛选、返回列表、反馈编辑，以及题库草稿、防重复点击、失败恢复、超时和过期请求。

脚本会投稿和点赞，只允许访问 `127.0.0.1`。必须使用临时数据库；不要把测试服务指向正式数据库，也不要在正式网站运行此脚本。

在项目根目录先构建一个新目录，再启动本地服务：

```sh
python3 deploy/build_release.py output/ui-test/release
node deploy/bank_api/server.js --db output/ui-test/bank.sqlite --port 8766 --static output/ui-test/release/site
```

另一个终端使用已安装的 Playwright CLI（或 Codex 的 `playwright_cli.sh` 包装脚本）：

```sh
playwright-cli -s=signplay-check open http://127.0.0.1:8766/ --browser chrome
playwright-cli -s=signplay-check run-code --filename deploy/tests/browser_regression.js
playwright-cli -s=signplay-check close
```

检查输出的 `Result`，不能仅看命令退出状态；完成后停止本次启动的本地服务。独立后端测试为 `python3 deploy/bank_api/test_server.py`，自动使用临时数据库。
