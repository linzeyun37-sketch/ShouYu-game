# 指间趣游网页字体：资源圆体

品牌标题、页面标题、正文、资料名称、数字与控件统一使用 [Resource Han Rounded 资源圆体](https://github.com/CyanoHao/Resource-Han-Rounded) v1.910 简体中文版。正文采用 500 字重、16px，标题采用 700 字重，字号随页面层级与屏幕大小调整。

网页子集名为 `SignPlay Resource`，保留字重轴 `wght`（200–900）和圆角轴 `ROND`，使用默认的全圆角值 100。当前 WOFF2 约 667 KiB，覆盖 1,137 个字符（包括静态文字与 ASCII）；新投稿中未收录的字使用系统无衬线字体回退。旧字体保留在 `../type-v1/`，不再打包进页面。

上游发布包地址、包内字体文件、SHA-256 与固定版本的许可证地址见 `sources.json`。`resource-OFL.txt` 保留作者 Cyano Hao 与 Adobe 的版权声明和完整 SIL Open Font License 1.1；完整许可证也写入子集字体的 name 表，随单文件 HTML 内嵌发布。

新增静态文案后，在项目根目录运行：

```sh
python3 网站/build_fonts.py
```

子集构建需要 FontTools、Brotli 和能解压 7z 的 `bsdtar`（macOS 自带 `tar` 也支持）。脚本下载上游包到忽略目录 `output/font-source/`，验证包的 SHA-256，只解出指定字体，再验证字体 SHA-256 后生成 WOFF2。普通 `build_single.py` / `build_single.ps1` 直接使用已经提交的子集，不需要联网、解压器或字体安装。
