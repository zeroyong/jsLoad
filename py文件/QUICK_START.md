# 多网站下载器快速开始指南

## 🚀 快速开始

### 1. 基本使用

```bash
# 启动剪贴板监听模式（自动检测支持的网站）
python scripts/multi_site_downloader.py

# 下载指定URL
python scripts/multi_site_downloader.py "https://mm.tvv.tw/archives/7162.html"

# 查看支持的网站列表
python scripts/multi_site_downloader.py --list-sites
```

### 2. 添加新网站支持

1. 在 `sites/` 目录下创建新的 JSON 配置文件
2. 参考现有配置文件格式
3. 重启程序即可自动加载

## 📁 文件结构

```
py文件/
├── scripts/
│   ├── multi_site_downloader.py    # 主程序
│   └── download_mm_images_fast.py  # 原有程序（保留）
├── sites/
│   ├── meimei_tvv_tw.json         # MM图片站配置
│   ├── example_com.json           # 示例配置
│   └── README.md                  # 详细配置说明
├── test_multi_site.py             # 测试脚本
└── QUICK_START.md                 # 本文档
```

## 🔧 配置示例

### 最小配置

```json
{
  "name": "my_site",
  "display_name": "我的网站",
  "base_url": "https://my-site.com",
  "url_pattern": "https://my-site\\.com/photos/\\d+",
  "description": "我的网站的图片下载",
  "selectors": {
    "title": ".photo-title",
    "images": ".photo-gallery img"
  }
}
```

### 完整配置

```json
{
  "name": "my_site",
  "display_name": "我的网站",
  "base_url": "https://my-site.com",
  "url_pattern": "https://my-site\\.com/photos/\\d+",
  "description": "我的网站的图片下载",
  "selectors": {
    "title": ".photo-title",
    "images": ".photo-gallery img"
  },
  "headers": {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
  },
  "image_headers": {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Referer": "https://my-site.com/"
  },
  "proxies": {
    "http": "http://127.0.0.1:7897",
    "https": "http://127.0.0.1:7897"
  },
  "timeout": {
    "connect": 15,
    "read": 60
  },
  "max_retries": 3,
  "retry_delay": 1,
  "max_workers": 8
}
```

## 🎯 支持的网站

当前已配置：

1. **MM图片站** (meimei_tvv_tw)
   - URL格式: `https://mm.tvv.tw/archives/数字.html`
   - 功能: 下载文章中的图片

2. **示例站点** (example_com)
   - URL格式: `https://example.com/gallery/数字`
   - 功能: 演示配置格式

## 🔍 调试技巧

### 1. CSS选择器调试

```javascript
// 在浏览器控制台中测试选择器
document.querySelector("h2.blog-details-headline");  // 测试标题选择器
document.querySelectorAll("img[src*='uploads']");    // 测试图片选择器
```

### 2. URL模式测试

```python
import re
pattern = r"https://mm\.tvv\.tw/archives/\d+\.html"
test_url = "https://mm.tvv.tw/archives/7162.html"
print(re.match(pattern, test_url))  # 应该返回匹配对象
```

### 3. 查看调试文件

程序会自动保存页面HTML用于调试：
- `{site_name}_page.html` - 下载的页面内容

## ⚡ 性能调优

### 并发数调整
- 网络好：`max_workers: 8-12`
- 网络一般：`max_workers: 4-6`
- 网络差：`max_workers: 2-3`

### 超时设置
- 国内网站：`connect: 10, read: 30`
- 国外网站：`connect: 15, read: 60`

## 🐛 常见问题

### Q: 图片下载失败怎么办？
A: 检查以下几点：
1. Referer头是否正确设置
2. User-Agent是否被屏蔽
3. 代理服务器是否正常工作

### Q: 如何添加新网站？
A: 三步即可：
1. 创建JSON配置文件
2. 确定CSS选择器
3. 测试URL匹配模式

### Q: 为什么页面解析失败？
A: 可能原因：
1. CSS选择器已过时
2. 网站结构发生变化
3. 需要特殊的请求头

## 📚 更多帮助

- 详细配置说明：查看 `sites/README.md`
- 测试架构功能：运行 `python test_multi_site.py`
- 项目总体说明：查看 `CLAUDE.md`