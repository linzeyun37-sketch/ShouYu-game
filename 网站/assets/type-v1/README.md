# 指间趣游网页字体

- 当前标题与正文：寒蝉全圆体 3.0，来自 [ChillRound](https://github.com/Warren2060/ChillRound)，子集字体名为 `SignPlay Round`。标题使用加粗字重，保持端正、圆润的字形。
- 历史字体：站酷快乐体，来自 [ZCOOL KuaiLe](https://github.com/googlefonts/zcool-kuaile)，子集字体名为 `SignPlay Play`。源记录与文件保留，当前页面不引用或打包此字体。

固定的上游提交、下载地址和原始字体 SHA-256 见 `sources.json`。两款字体均使用随目录提供的 SIL Open Font License 1.1。子集保留原版权，重新命名，完整许可证也写入字体 name 表，随单文件 HTML 内嵌发布。

当前使用的 WOFF2 覆盖网站静态文字和 ASCII，约 188 KiB。新增投稿中未收录的字使用系统无衬线字体回退。标题、正文、资料名称、计数和控件均使用圆体，游戏计数使用规整数字。

更改静态文案后，可在项目根目录运行 `python3 网站/build_fonts.py` 重新生成子集。该步骤需要 FontTools 和 Brotli，首次运行从固定上游地址下载字体到忽略目录 `output/font-source/` 并核对 SHA-256；普通 `build_single.py` / `build_single.ps1` 直接使用本目录已提交的 WOFF2，不需要联网或安装字体。
