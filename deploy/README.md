# 指间趣游服务器发布

正式地址：https://shouyulove.cn/signplay/ 。设计者：伍家阳。

网站部署在 `ubuntu@49.232.193.175`，公共链接 `/var/www/shouyulove-signplay` 指向 `/var/www/shouyulove-signplay-releases/` 中的独立版本。Nginx 片段为 `/etc/nginx/snippets/signplay.conf`，由现有 shouyulove.cn 配置引用。

## 构建

在仓库根目录运行：

```sh
python3 deploy/build_release.py output/deployment/<新版本目录>
```

构建不覆盖已有目录。`site/` 仅包含自带 CSS、JavaScript、Logo 的 `index.html`，以及游戏数据中实际引用的资料；`manifest.json` 记录文件大小和 SHA-256。当前清单为 47 个文件，其中 46 份游戏资料，共 10,173,622 字节。

源码预览及 GitHub Pages 保留上一级相对资料路径；服务器页面改用 `./resources/`。单独下载 HTML 后打开时，资料从正式站点加载。不要手工调整原始资料的目录与文件名，也不要把 Git、归档、审查记录或构建脚本放进公共目录。

## 发布与核验

1. 核对当前公共链接、父级 Nginx 配置及仓库状态。用新版本名备份已有运行版本和配置。
2. 将 `site/`、清单、`publish_release.py` 和 `nginx-signplay.conf` 上传到新的非公开暂存目录。
3. 根据当时线上状态创建 `request.json`：填写唯一 `release`（格式为 UTC 时间加 `-signplay`）、`old_release`、`parent_sha256`、`manifest_sha256`、`snippet_sha256`。首次发布的 `old_release` 为 `null`；后续填写当前公共链接的真实目标。
4. 在暂存目录执行 `sudo python3 publish_release.py`。脚本验证清单与旧配置，备份后切换链接，检查并重载 Nginx，再从本机 HTTP 校验全部文件；失败时恢复旧配置和链接。
5. 从公网检查首页、搜索、资料下载和手机显示，并确认主站首页与 `/portfolio/` 都能打开正式地址。验证请求使用 `ShouYuLove-QA` 用户代理。

2026-10-15 首次发布目录：`20261014T161917Z-signplay`。47 个公网文件均已按 SHA-256 核对，首页和手机显示已检查。配置与回滚记录位于服务器 `/var/backups/shouyulove-signplay/20261014T161917Z-signplay/`。

## 回滚

保留所有历史版本。先读取对应备份中的 `previous.json`、`parent.conf` 和可选 `snippet.conf`，再恢复父级配置、独立片段及公共链接。首次发布前没有本站链接和片段；回滚首版时只撤下这两个本次创建的入口。恢复后运行 `nginx -t` 并重载 Nginx，核验主站与其他子站。
