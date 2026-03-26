# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a web scraping and automation toolkit focused on downloading novels, images, and enhancing web browsing experiences. The project contains both Python scripts for backend scraping and JavaScript userscripts for browser automation.

## Directory Structure

```
D:\pycharm编程记录\xs下载\小说\js\jsLoad\
├── py文件\                 # Python scripts
│   ├── download_novel.py   # Main novel downloader with clipboard monitoring
│   ├── download_mm_api.py  # Image downloader for meimei.tvv.tw
│   ├── fetch_wallpapers.py # Wallpaper downloader
│   └── test_*.py          # Test scripts
├── API\                   # API documentation
│   ├── mei.md             # Image API interface documentation
│   ├── task.md            # Task records and updates
│   └── 哲风api.md          # Additional API documentation
├── js脚本\                # JavaScript userscripts
│   ├── autoDown.js        # Video ad blocker and page enhancer
│   ├── 添加复制按钮.js     # Copy button enabler
│   └── 左右键切换页数.js   # Page navigation with arrow keys
└── 小说下载\              # Downloaded novel storage
```

## Common Commands

### Python Scripts
```bash
# Run novel downloader (monitors clipboard for URLs)
cd "D:\pycharm编程记录\xs下载\小说\js\jsLoad\py文件"
python download_novel.py

# Run image downloader
python download_mm_api.py

# Run wallpaper downloader
python fetch_wallpapers.py

# Run batch files
run_download.bat
run_novel_download.bat
```

### Dependencies
```bash
pip install requests beautifulsoup4 rich pyperclip
```

## Code Architecture

### Python Modules

1. **download_novel.py** - Novel Downloader
   - Clipboard monitoring for automatic URL detection
   - Multi-threaded downloading with progress bars
   - Chapter merging functionality
   - Uses: requests, BeautifulSoup, concurrent.futures, rich

2. **download_mm_api.py** - Image Downloader
   - Web scraping for image URLs
   - API-based image downloading with optimized headers
   - Retry logic and timeout handling for stable downloads
   - Proxy support for network requests
   - Multi-threaded downloading with progress tracking
   - Uses: requests, BeautifulSoup, concurrent.futures, rich

3. **fetch_wallpapers.py** - Wallpaper Downloader
   - Multiple search strategies for finding images
   - JSON and CSV data export
   - Uses: requests, BeautifulSoup, json, csv

### JavaScript Userscripts

1. **autoDown.js** - Video Site Enhancer
   - Ad blocking and popup prevention
   - Sidebar toggle functionality
   - Arrow key navigation for pagination
   - Video link handling

2. **其他用户脚本** - Browser Enhancement
   - Copy button functionality
   - Page navigation improvements
   - Pinterest login popup blocking

## API Documentation

- **mei.md**: Contains image API interface details for meimei.tvv.tw
- **task.md**: Task records and project updates
- **哲风api.md**: Additional API documentation

## Development Patterns

### Web Scraping Pattern
```python
import requests
from bs4 import BeautifulSoup

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
}
response = requests.get(url, headers=headers)
soup = BeautifulSoup(response.text, 'html.parser')
# Parse and extract data
```

### Multi-threaded Downloading
```python
from concurrent.futures import ThreadPoolExecutor, as_completed

with ThreadPoolExecutor(max_workers=6) as executor:
    futures = [executor.submit(download_function, url) for url in urls]
    for future in as_completed(futures):
        result = future.result()
```

### Optimized Image Downloading
```python
# Image downloads with retry logic, proxy support and proper headers
def download_with_retry(img_url, max_retries=3):
    proxies = {
        'http': 'http://127.0.0.1:7897',
        'https': 'http://127.0.0.1:7897'
    }

    for attempt in range(max_retries):
        try:
            headers = {
                'Referer': 'https://mm.tvv.tw/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
            }
            response = requests.get(img_url, headers=headers, timeout=(10, 30), stream=True, proxies=proxies)
            # Process download with progress tracking
        except Exception as e:
            if attempt < max_retries - 1:
                time.sleep(2 ** attempt)  # Exponential backoff
                continue
            else:
                raise e
```

### Progress Bar Implementation
```python
from rich.progress import Progress

with Progress() as progress:
    task = progress.add_task("[green]Downloading...", total=total_files)
    # Update progress as files download
```

## File Management

- Downloaded novels are saved in `小说下载/` directory
- Downloaded images are saved in `py文件/images/` directory
- Temporary HTML files for debugging are saved as `temp_page.html`
- Data exports are saved as JSON and CSV files

## Task Documentation

Always update the `API/task.md` file when completing tasks to maintain project records and progress tracking.

## Security Notes

- Scripts use proper User-Agent headers to avoid blocking
- Referer headers are set appropriately for image APIs
- Error handling is implemented for network requests
- Retry logic with exponential backoff prevents aggressive retries
- No sensitive information should be committed to the repository

# 行为准则
- 始终在现有文件中进行修改。
- 保持使用中文
- 除非明确要求创建新模块，否则严禁创建副本或带后缀的新文件。
- 优先使用 `sed` 或局部编辑工具修改代码行。
- 任务完成后同步更新到task.md文件
- 调试py文件不需要保存html文件到本地
