# 题库服务（自建数据库）

题库的投稿与点赞由本站自带的小服务完成，数据保存在服务器本机的 SQLite 文件中，不依赖任何外部数据库服务。网页与接口同源，网页请求的地址是 `api/...`，正式站点下即 `/signplay/api/...`。

## 文件

- `server.js`：服务本体，只使用 Node.js 内置模块（`node:http`、`node:sqlite`）。
- 数据库文件：由启动参数 `--db` 指定，**放在公共网站目录之外**，例如 `/var/lib/signplay-bank/bank.sqlite`。

## 环境

- Node.js 22.5 或以上（内置 `node:sqlite`）。请先确认服务器版本：`node --version`。
- 不需要 `npm install`，没有第三方依赖。

## 启动

```sh
node deploy/bank_api/server.js --db /var/lib/signplay-bank/bank.sqlite --port 8765 --trust-proxy
```

- 只监听 `127.0.0.1`，由 Nginx 转发，不对公网直接开放。
- `--trust-proxy`：经过 Nginx 转发时，用 `X-Forwarded-For` 识别访客（用于限制同一访客的点赞与投稿）。
- 建议设置环境变量 `BANK_SALT` 为一段随机字符串，用于访客标识加盐。

## Nginx 转发（需要你在服务器上添加，仓库内的配置不做修改）

在 `shouyulove.cn` 的 `/signplay/` 所在配置中加入（或放进 `/etc/nginx/snippets/signplay.conf`）：

```nginx
location /signplay/api/ {
    proxy_pass http://127.0.0.1:8765/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $remote_addr;
}
```

修改后执行 `nginx -t`，通过后再 `systemctl reload nginx`。

## 常驻运行（systemd 示例）

```ini
[Unit]
Description=signplay question bank
After=network.target

[Service]
ExecStart=/usr/bin/node /path/to/repo/deploy/bank_api/server.js --db /var/lib/signplay-bank/bank.sqlite --port 8765 --trust-proxy
Environment=BANK_SALT=换成一段随机字符串
Restart=always
User=www-data

[Install]
WantedBy=multi-user.target
```

## 接口

| 方法 | 地址 | 说明 |
| --- | --- | --- |
| GET | `/api/banks/:gid` | 读取题目，返回 `{编号: {text, likes}}` |
| POST | `/api/banks/:gid` | 投稿，请求体 `{"text": "题目"}` |
| POST | `/api/banks/:gid/:key/like` | 点赞，同一访客对同一题目只计一次 |

开放题库的游戏编号写在 `server.js` 的 `ALLOWED_GIDS` 中（目前为 01、02、04），与 `网站/js/banks.js` 保持一致。

限制：题目最多 40 个字；同一访客每分钟最多投稿 5 次；请求体最大 4 KB。

## 备份

数据只在 `bank.sqlite` 一个文件里。定期复制该文件即可备份；恢复时停止服务，替换文件，再启动。

## 与静态发布的关系

- `deploy/build_release.py` 只打包 `site/` 白名单中的网页与资料，**不包含** `bank_api/` 与数据库文件。
- 题库服务需要单独部署，且数据库不能放进 `site/`。
- 如果服务未启动或网络不通，网页会自动退回到只显示示例题目，不影响其他功能。
