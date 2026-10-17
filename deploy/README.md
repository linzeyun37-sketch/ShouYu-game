# 指间趣游服务器发布

## 2026-10-15 阿里云维护入口（流量已切换）

维护 SSH 别名为 `shouyulove-aliyun`，固定连接 `root@101.37.209.227`（ECS `i-bp1hi3u3w5p3vg4owfl0`）。不用 `yanyuan-calendar` 作为本项目的发布入口。2026-10-15 已完成流量与可写服务切换，域名 @、www 已指向该 ECS；DNS、证书、最终页面验收和本站自动续期演练均已通过。

公共链接仍为 `/var/www/shouyulove-signplay`，版本目录 `/var/www/shouyulove-signplay-releases`，Nginx 片段仍为 `/etc/nginx/snippets/signplay.conf`。构建和发布器路径不变；上传、生成 request 和执行发布器均以新机当前状态为准，不能复用旧机发布请求。

正式地址：https://shouyulove.cn/signplay/ 。设计者：伍家阳。

迁移后通过 `shouyulove-aliyun` 维护网站，公共链接 `/var/www/shouyulove-signplay` 指向 `/var/www/shouyulove-signplay-releases/` 中的独立版本。Nginx 片段为 `/etc/nginx/snippets/signplay.conf`，由现有 shouyulove.cn 配置引用。

## 构建

在仓库根目录运行：

```sh
python3 deploy/build_release.py output/deployment/<新版本目录>
```

构建不覆盖已有目录。`site/` 仅包含自带 CSS、JavaScript、Logo 与字体的 `index.html`，以及游戏数据中实际引用的资料；`manifest.json` 记录文件大小和 SHA-256。当前清单为 47 个文件，其中 46 份游戏资料，共 10,440,217 字节。字体许可证已包含在内嵌字体的元数据中，源字体和构建缓存不进入公共目录。

源码预览及 GitHub Pages 保留上一级相对资料路径；服务器页面改用 `./resources/`。单独下载 HTML 后打开时，资料从正式站点加载。不要手工调整原始资料的目录与文件名，也不要把 Git、归档、审查记录或构建脚本放进公共目录。

## 发布与核验

1. 核对当前公共链接、父级 Nginx 配置及仓库状态。用新版本名备份已有运行版本和配置。题库服务按 [题库部署说明](bank_api/README.md) 单独发布并验证回环接口，代码与数据库都不放入 `site/`。
2. 将 `site/`、清单、`publish_release.py` 和 `nginx-signplay.conf` 上传到新的非公开暂存目录。
3. 根据当时线上状态创建 `request.json`：填写唯一 `release`（格式为 UTC 时间加 `-signplay`）、`old_release`、`parent_sha256`、`old_snippet_sha256`、`manifest_sha256`、`snippet_sha256`。首次发布的 `old_release` 为 `null`；后续填写当前公共链接的真实目标。
4. 在暂存目录执行 `sudo python3 publish_release.py`。脚本验证清单与旧配置，备份后切换链接，检查并重载 Nginx，再从本机 HTTP 校验全部文件和三个题库接口；失败时恢复旧配置和链接。
5. 从公网检查首页、搜索、资料下载和手机显示，并确认主站首页与 `/portfolio/` 都能打开正式地址。验证请求使用 `ShouYuLove-QA` 用户代理。

2026-10-15 首次发布目录：`20261014T161917Z-signplay`。47 个公网文件均已按 SHA-256 核对，首页和手机显示已检查。配置与回滚记录位于服务器 `/var/backups/shouyulove-signplay/20261014T161917Z-signplay/`。

2026-10-15 文案与字体更新：`20261015T104407Z-signplay`。去掉分类卡片副标题及类似重复提示，标题、正文与数字统一使用无衬线字体，页脚改为“手语分社 · 心创组 设计者：伍家阳 鸣谢：手语分社秘书处”。上一版本 `20261015T020134Z-signplay` 保留；本次回滚记录位于 `/var/backups/shouyulove-signplay/20261015T104407Z-signplay/`。

2026-10-15 题库更新：静态版本 `20261015T153301Z-signplay`，题库服务版本 `20261015T152709Z-signplay`。同步 GitHub `c6d4d2f` 的三个游戏题库、投稿与点赞，以及“抢数字”和“闹钟炸弹”的规则调整；补上服务端示例题目校验、重复点赞并发处理和前端切换游戏的请求校验。题库常驻服务为 `signplay-bank.service`，数据库独立保存在 `/var/lib/signplay-bank/bank.sqlite`。上一静态版本 `20261015T104407Z-signplay` 保留，本次配置回滚记录位于 `/var/backups/shouyulove-signplay/20261015T153301Z-signplay/`。首次静态发布在 Nginx 重载期间遇到旧路由返回 404 并自动回滚；发布器增加接口就绪等待后重新发布通过，首次尝试的版本和日志继续保留。

2026-10-17 字体与界面更新：`20261017T021302Z-signplay`。内嵌圆体正文和游戏标题字体，增大正文、文件名与控件字号；资料页桌面双列、手机单列，下载按钮及筛选菜单同步调整。上一静态版本 `20261015T153301Z-signplay` 保留，本次配置回滚记录位于 `/var/backups/shouyulove-signplay/20261017T021302Z-signplay/`。本次只发布静态页面，题库服务代码与数据库沿用原版本。

2026-10-17 阅读字号修订：`20261017T022045Z-signplay`。标题改为端正的加粗圆体，正文为桌面 20px / 手机 19px，资料名称为 22px / 20px，资料说明为 17px，数量与状态标签最小 16px。当前发布包仅内嵌圆体；旧装饰字体资产和上一版本 `20261017T021302Z-signplay` 保留。本次配置备份位于 `/var/backups/shouyulove-signplay/20261017T022045Z-signplay/`。

## 回滚

保留所有历史版本。先读取对应备份中的 `previous.json`、`parent.conf` 和可选 `snippet.conf`，再恢复父级配置、独立片段及公共链接。首次发布前没有本站链接和片段；回滚首版时只撤下这两个本次创建的入口。恢复后运行 `nginx -t` 并重载 Nginx，核验主站与其他子站。
