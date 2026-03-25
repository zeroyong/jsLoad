# Python脚本目录说明

## 目录结构

```
py文件/
├── scripts/          # 主要脚本文件
│   ├── download_novel.py           # 小说下载器（剪贴板监听）
│   ├── download_mm_api.py          # 图片下载器（API接口）
│   ├── download_mm_images_fast.py  # 图片下载器（快速版）
│   ├── fetch_wallpapers.py         # 壁纸下载器
│   ├── run_download.bat            # 下载脚本批处理文件
│   └── run_novel_download.bat      # 小说下载批处理文件
├── data/             # 数据文件
│   ├── wallpaper_data.json         # 壁纸数据
│   ├── wallpaper_data_multipage.csv # 壁纸数据(CSV)
│   └── wallpaper_data_multipage.json # 壁纸数据(多页)
├── temp/             # 临时文件和测试文件
│   ├── temp_page.html              # 临时HTML页面
│   ├── mm_page.html                # MM页面HTML
│   ├── simple_test.py              # 简单测试脚本
│   ├── test_url.py                 # URL测试脚本
│   └── test_multipage.py           # 多页测试脚本
├── images/           # 下载的图片
├── 小说下载/          # 下载的小说
└── README.md         # 本说明文件
```

## 主要脚本功能

### download_novel.py
- 小说下载主程序
- 支持剪贴板监听自动下载
- 多线程并发下载
- 章节合并功能
- 使用方式：`python scripts/download_novel.py`

### download_mm_api.py
- 图片下载器（基于API接口）
- 支持meimei.tvv.tw域名
- 正确的HTTP请求头处理
- 使用方式：`python scripts/download_mm_api.py`

### fetch_wallpapers.py
- 壁纸下载器
- 支持多站点壁纸抓取
- 数据导出为JSON和CSV格式
- 使用方式：`python scripts/fetch_wallpapers.py`

## 数据文件

- `wallpaper_data.json` - 壁纸数据（JSON格式）
- `wallpaper_data_multipage.csv` - 壁纸数据（CSV格式，多页）
- `wallpaper_data_multipage.json` - 壁纸数据（JSON格式，多页）

## 临时文件

- HTML页面文件用于调试
- 测试脚本用于功能验证

## 使用说明

1. 主要脚本都在 `scripts/` 目录下
2. 下载的图片保存在 `images/` 目录
3. 下载的小说保存在 `小说下载/` 目录
4. 数据导出文件在 `data/` 目录
5. 临时文件在 `temp/` 目录，可定期清理