# 多网站下载器配置说明

## 架构设计

这个多网站下载器使用 JSON 配置文件来管理不同网站的下载规则，实现了代码复用和易于扩展的设计。

## 目录结构

```
py文件/
├── scripts/
│   ├── multi_site_downloader.py  # 主下载程序
│   └── download_mm_images_fast.py # 原有的单网站下载器
└── sites/                        # 网站配置文件目录
    ├── meimei_tvv_tw.json       # MM图片站配置
    ├── example_com.json         # 示例配置
    └── README.md                # 本文档
```

## 配置文件结构

每个网站配置文件包含以下字段：

### 基础配置
- `name`: 网站唯一标识符（用于内部引用）
- `display_name`: 网站显示名称（用于用户界面）
- `base_url`: 网站基础URL
- `url_pattern`: URL匹配模式（正则表达式）
- `description`: 网站描述

### 选择器配置
- `selectors.title`: CSS选择器，用于提取页面标题
- `selectors.images`: CSS选择器，用于提取图片元素

### 请求配置
- `headers`: 页面请求的HTTP头
- `image_headers`: 图片下载的HTTP头
- `proxies`: 代理配置
- `timeout`: 超时设置（connect和read）

### 下载配置
- `max_retries`: 最大重试次数
- `retry_delay`: 重试延迟（秒）
- `max_workers`: 并发下载线程数

## 添加新网站

1. 在 `sites/` 目录下创建新的 JSON 配置文件
2. 按照示例格式填写网站信息
3. 重启下载器程序即可自动加载新配置

### 示例：添加新网站配置

```json
{
  "name": "new_site",
  "display_name": "新网站",
  "base_url": "https://new-site.com",
  "url_pattern": "https://new-site\\.com/album/\\d+",
  "description": "新网站的图片下载",
  "selectors": {
    "title": ".album-title",
    "images": ".photo img"
  },
  "headers": {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
  },
  "image_headers": {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Referer": "https://new-site.com/"
  },
  "max_workers": 4
}
```

## 使用方法

### 命令行使用
```bash
# 列出支持的网站
python multi_site_downloader.py --list-sites

# 下载指定URL
python multi_site_downloader.py "https://mm.tvv.tw/archives/7162.html"

# 启动剪贴板监听模式
python multi_site_downloader.py
```

### 剪贴板监听模式
程序会自动检测剪贴板中的URL，如果匹配任何已配置的网站模式，就会自动开始下载。

## 配置调试

1. **CSS选择器调试**：
   - 使用浏览器开发者工具检查元素
   - 确保选择器能正确匹配目标元素

2. **URL模式调试**：
   - 使用正则表达式测试工具验证模式
   - 确保能正确匹配目标URL格式

3. **请求头调试**：
   - 参考网站的网络请求
   - 设置合适的 User-Agent 和 Referer

## 常见问题

1. **图片下载失败**：
   - 检查图片URL是否正确
   - 验证 Referer 头设置
   - 调整超时时间

2. **页面解析失败**：
   - 检查CSS选择器是否正确
   - 确认页面结构是否发生变化
   - 查看保存的HTML调试文件

3. **代理连接问题**：
   - 确认代理服务器地址和端口
   - 测试代理是否正常工作

## 性能优化

- 根据网络状况调整 `max_workers`
- 适当设置超时时间避免长时间等待
- 使用合适的重试策略避免过度请求