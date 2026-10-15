# 题库服务（自建数据库）

题库的投稿与点赞由本站自带的小服务完成，数据保存在服务器本机的 SQLite 文件中，不依赖任何外部数据库服务。网页与接口同源，网页请求的地址是 `api/...`，正式站点下即 `/signplay/api/...`。

## 文件

- `server.js`：服务本体，只使用 Node.js 内置模块（`node:http`、`node:sqlite`）。
- `../../网站/js/banks.js`：前后端共用的示例题目；发布服务时保留这个相对目录。
- `signplay-bank.service`：正式环境的 systemd 配置。
- 数据库文件：由启动参数 `--db` 指定，**放在公共网站目录之外**，例如 `/var/lib/signplay-bank/bank.sqlite`。

## 环境

- Node.js 需支持直接加载 `node:sqlite`；正式服务器已核对为 22.22.1。检查命令：`node -e 'require("node:sqlite")'`。
- 不需要 `npm install`，没有第三方依赖。

## 启动

```sh
node deploy/bank_api/server.js --db /var/lib/signplay-bank/bank.sqlite --port 8765 --trust-proxy
```

- 只监听 `127.0.0.1`，由 Nginx 转发，不对公网直接开放。
- `--trust-proxy`：经过 Nginx 转发时，用 `X-Forwarded-For` 识别访客（用于限制同一访客的点赞与投稿）。
- 建议设置环境变量 `BANK_SALT` 为一段随机字符串，用于访客标识加盐。

## Nginx 转发

仓库 `deploy/nginx-signplay.conf` 已包含题库转发，随静态发布器安装到 `/etc/nginx/snippets/signplay.conf`：

```nginx
location ^~ /signplay/api/ {
    proxy_pass http://127.0.0.1:8765/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
    client_max_body_size 4k;
}
```

发布器会在共享 Nginx 发布锁内检查并重载配置，失败时恢复旧配置和网站链接。

## 正式服务

通过 `shouyulove-aliyun` 维护，服务名 `signplay-bank.service`。运行代码在 `/opt/signplay-bank/releases/<版本>/`，`/opt/signplay-bank/current` 指向当前版本。运行白名单为 `deploy/bank_api/server.js` 与 `网站/js/banks.js`。

服务以专用账户 `signplay-bank` 运行，属于既有 `system-shouyulove.slice`。数据库保存在 `/var/lib/signplay-bank/bank.sqlite`，目录权限为 0700；加盐值由 `/etc/signplay-bank.env` 提供，文件仅 root 可读，不提交仓库。

发布顺序：先运行 `python3 deploy/bank_api/test_server.py`；上传后在服务器用临时数据库再运行测试；安装新服务版本并核验回环接口；最后运行主发布器切换网页与 Nginx。更新服务前用下述备份方法备份已有数据库，保留旧代码版本、服务配置和静态站点备份。首次安装时创建专用账户并安装本目录的 systemd 单元，再执行 `systemctl daemon-reload` 和 `systemctl enable --now signplay-bank`。

更新代码使用新的版本目录，只切换 `current` 链接后重启服务，不覆盖数据库。回滚时恢复上一个代码链接及 Nginx 配置；无需回滚没有发生结构变更的数据库，避免丢失发布后投稿。

## 接口

| 方法 | 地址 | 说明 |
| --- | --- | --- |
| GET | `/api/banks/:gid` | 读取题目，返回 `{编号: {text, likes}}` |
| POST | `/api/banks/:gid` | 投稿，请求体 `{"text": "题目"}` |
| POST | `/api/banks/:gid/:key/like` | 点赞，请求体可为 `{}`；同一访客对同一题目只计一次 |

开放题库的游戏编号与示例题目直接从 `网站/js/banks.js` 读取（目前为 01、02、04）。访客按来源地址和浏览器标识加盐识别；示例题目文字不接受客户端覆盖。

限制：题目最多 40 个字；同一访客每分钟最多投稿 5 次；请求体最大 4 KB。

## 备份

使用 SQLite 的在线备份接口取得一致快照；不要在服务写入时直接复制数据库文件。例如在服务器上以 root 运行：

```sh
python3 - <<'PY'
from datetime import datetime, timezone
from pathlib import Path
import os, sqlite3
os.umask(0o077)
target = Path('/var/backups/signplay-bank')
target.mkdir(parents=True, exist_ok=True)
name = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ.sqlite')
with sqlite3.connect('file:/var/lib/signplay-bank/bank.sqlite?mode=ro', uri=True) as source:
    with sqlite3.connect(target / name) as backup:
        source.backup(backup)
PY
```

恢复数据库时停止服务，替换文件并恢复 `signplay-bank` 所有权及 0600 权限，再启动。

## 与静态发布的关系

- `deploy/build_release.py` 只打包 `site/` 白名单中的网页与资料，**不包含** `bank_api/` 与数据库文件。
- 题库服务需要单独部署，且数据库不能放进 `site/`。
- 如果服务未启动或网络不通，网页会自动退回到只显示示例题目，不影响其他功能。
