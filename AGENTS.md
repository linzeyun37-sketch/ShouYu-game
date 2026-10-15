# 指间趣游维护入口

## 2026-10-15 阿里云维护入口（流量已切换）

维护 SSH 别名为 `shouyulove-aliyun`，固定连接 `root@101.37.209.227`（ECS `i-bp1hi3u3w5p3vg4owfl0`）。不用 `yanyuan-calendar` 作为本项目的发布入口。2026-10-15 已完成流量与可写服务切换，域名 @、www 已指向该 ECS；DNS、证书、最终页面验收和本站自动续期演练均已通过。

公共链接仍为 `/var/www/shouyulove-signplay`，版本目录 `/var/www/shouyulove-signplay-releases`，Nginx 片段仍为 `/etc/nginx/snippets/signplay.conf`。构建和发布器路径不变；上传、生成 request 和执行发布器均以新机当前状态为准，不能复用旧机发布请求。

先读 `网站/README.md`、`deploy/README.md` 并查看 Git 状态。项目仓库为 `linzeyun37-sketch/ShouYu-game`，正式入口为 https://shouyulove.cn/signplay/ ，设计者为伍家阳。

页面源码位于 `网站/`，单文件版由 `网站/build_single.py` 生成；服务器版本由 `deploy/build_release.py` 生成。保留已确认的暖色配色、Logo、布局和游戏规则。已删除的重复说明及搜索、资料、反馈页面包屑不要恢复。

部署只上传构建后的 `site/` 白名单；维护脚本与发布记录留在非公开目录。保留旧版本和配置备份，不更改其他子站。修改完成后按用户要求更新仓库与服务器；部署前后核对下载路径并检查桌面和手机。

主站名称、简介、署名和地址先更新工作区指定的 Obsidian 原稿，再同步主站首页与 `/portfolio/`。两个仓库分别提交推送。主站本机目录保留历史未提交状态，应继续使用隔离发布副本，不整体提交或清理它。
