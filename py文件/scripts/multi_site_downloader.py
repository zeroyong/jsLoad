# -*- coding: utf-8 -*-
import requests
from bs4 import BeautifulSoup
import os
import time
import re
import json
import pyperclip
from urllib.parse import urljoin
from concurrent.futures import ThreadPoolExecutor, as_completed
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TaskProgressColumn, TimeRemainingColumn
from rich.table import Table
from rich.panel import Panel
from rich.live import Live
import sys
import glob

# 初始化 rich console
console = Console()

class SiteConfig:
    """网站配置类"""
    def __init__(self, config_path):
        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)

        self.name = config['name']
        self.display_name = config['display_name']
        self.base_url = config['base_url']
        self.url_pattern = config['url_pattern']
        self.description = config['description']
        self.selectors = config['selectors']
        self.headers = config['headers']
        self.image_headers = config['image_headers']
        self.proxies = config.get('proxies', {})
        self.timeout = config.get('timeout', {'connect': 15, 'read': 60})
        self.max_retries = config.get('max_retries', 3)
        self.retry_delay = config.get('retry_delay', 1)
        self.max_workers = config.get('max_workers', 8)

class MultiSiteDownloader:
    """多网站下载器"""

    def __init__(self):
        self.sites_config_dir = os.path.join(os.path.dirname(__file__), '..', 'sites')
        self.sites = self._load_sites()

    def _load_sites(self):
        """加载所有网站配置"""
        sites = {}
        if os.path.exists(self.sites_config_dir):
            config_files = glob.glob(os.path.join(self.sites_config_dir, '*.json'))
            for config_file in config_files:
                try:
                    site_config = SiteConfig(config_file)
                    sites[site_config.name] = site_config
                    console.print(f"[green]✓[/green] 已加载网站配置: {site_config.display_name}")
                except Exception as e:
                    console.print(f"[red]✗[/red] 加载配置失败 {config_file}: {str(e)}")
        return sites

    def detect_site(self, url):
        """检测URL对应的网站"""
        for site_name, site_config in self.sites.items():
            if re.match(site_config.url_pattern, url):
                return site_config
        return None

    def download_single_image(self, img_url, filename, progress, task_id, save_folder, site_config):
        """下载单个图片的函数"""
        max_retries = site_config.max_retries
        retry_delay = site_config.retry_delay

        for attempt in range(max_retries):
            try:
                # 使用网站特定的图片请求头
                headers = site_config.image_headers.copy()

                # 设置超时时间
                timeout = (site_config.timeout['connect'], site_config.timeout['read'])

                response = requests.get(
                    img_url,
                    headers=headers,
                    timeout=timeout,
                    stream=True,
                    proxies=site_config.proxies
                )
                response.raise_for_status()

                total_size = int(response.headers.get('content-length', 0))
                filepath = os.path.join(save_folder, filename)

                # 使用流式下载并更新进度条
                progress.update(task_id, total=total_size, visible=True)

                downloaded = 0
                last_update_time = time.time()
                start_download_time = time.time()

                with open(filepath, 'wb') as f:
                    for data in response.iter_content(chunk_size=16384):
                        if data:
                            size = f.write(data)
                            downloaded += size

                            # 每0.5秒更新一次进度
                            current_time = time.time()
                            if current_time - last_update_time >= 0.5:
                                elapsed_time = current_time - start_download_time
                                speed = downloaded / elapsed_time if elapsed_time > 0 else 0

                                if speed < 1024:
                                    speed_str = f"{speed:.1f} B/s"
                                elif speed < 1024 * 1024:
                                    speed_str = f"{speed/1024:.1f} KB/s"
                                else:
                                    speed_str = f"{speed/(1024*1024):.1f} MB/s"

                                progress.update(task_id, advance=size, description=f"[cyan]{filename} ({speed_str})")
                                last_update_time = current_time

                    # 确保最终进度更新到100%
                    if downloaded < total_size:
                        progress.update(task_id, completed=total_size)
                    else:
                        progress.update(task_id, advance=size)

                return True, filename

            except Exception as e:
                if attempt < max_retries - 1:
                    time.sleep(retry_delay * (attempt + 1))  # 指数退避
                    continue
                else:
                    return False, f"{filename}: {str(e)} (重试 {max_retries} 次后失败)"

    def extract_images_from_page(self, url, site_config):
        """从页面提取图片"""
        try:
            with console.status("[bold green]正在获取网页内容...", spinner="dots"):
                response = requests.get(
                    url,
                    headers=site_config.headers,
                    timeout=30,
                    proxies=site_config.proxies
                )
                response.raise_for_status()
                response.encoding = 'utf-8'

                # 保存页面用于调试
                with open(f'{site_config.name}_page.html', 'w', encoding='utf-8') as f:
                    f.write(response.text)

                # 解析HTML
                soup = BeautifulSoup(response.text, 'html.parser')

                # 获取文章标题
                title_element = soup.select_one(site_config.selectors['title'])
                if title_element:
                    folder_name = title_element.get_text().strip()
                    # 清理文件夹名称，移除非法字符
                    folder_name = re.sub(r'[<>:"/\\|?*]', '', folder_name)
                    folder_name = folder_name[:50]  # 限制长度
                else:
                    folder_name = f"{site_config.name}_{int(time.time())}"

                # 创建以标题命名的文件夹
                images_folder = os.path.join('images', folder_name)
                if not os.path.exists(images_folder):
                    os.makedirs(images_folder)

                console.print(f"[bold green]✓[/bold green] 文章标题: [cyan]{folder_name}[/cyan]")
                console.print(f"[bold green]✓[/bold green] 保存路径: [cyan]{images_folder}[/cyan]\n")

                # 提取图片
                target_images = []
                img_elements = soup.select(site_config.selectors['images'])

                for img in img_elements:
                    src = img.get('src', '')
                    if src:
                        img_url = src if src.startswith('http') else urljoin(site_config.base_url, src)
                        filename = os.path.basename(img_url.split('?')[0]) or f"image_{len(target_images)+1}.jpg"
                        target_images.append((img_url, filename))

                return target_images, images_folder

        except Exception as e:
            console.print(f"[bold red]获取页面失败: {str(e)}[/bold red]")
            return [], None

    def download_from_url(self, url):
        """从指定URL下载图片"""
        # 检测网站类型
        site_config = self.detect_site(url)
        if not site_config:
            console.print(f"[bold red]未支持的网站: {url}[/bold red]")
            console.print(f"[yellow]当前支持的网站: {', '.join([s.display_name for s in self.sites.values()])}[/yellow]")
            return

        console.print(f"[bold blue]检测到网站: {site_config.display_name}[/bold blue]")

        # 提取图片
        target_images, images_folder = self.extract_images_from_page(url, site_config)

        if not target_images:
            console.print("[bold red]未找到符合要求的图片[/bold red]")
            return

        console.print(f"[bold green]✓[/bold green] 找到 [bold cyan]{len(target_images)}[/bold cyan] 张图片\n")

        # 使用 rich progress 管理下载进度
        progress = Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            BarColumn(),
            TaskProgressColumn(),
            "•",
            TimeRemainingColumn(),
            console=console
        )

        successful_downloads = 0
        failed_downloads = []
        start_time = time.time()

        with progress:
            # 主进度条
            overall_task = progress.add_task("[bold yellow]总体进度", total=len(target_images))

            # 使用网站配置的并发数
            with ThreadPoolExecutor(max_workers=site_config.max_workers) as executor:
                futures = []
                for img_url, filename in target_images:
                    # 为每个文件创建一个子进度条
                    task_id = progress.add_task(f"[cyan]{filename}", total=None, visible=False)
                    futures.append(executor.submit(
                        self.download_single_image,
                        img_url,
                        filename,
                        progress,
                        task_id,
                        images_folder,
                        site_config
                    ))

                for future in as_completed(futures):
                    success, result = future.result()
                    if success:
                        successful_downloads += 1
                    else:
                        failed_downloads.append(result)

                    progress.update(overall_task, advance=1)

        end_time = time.time()

        # 展示结果表格
        table = Table(title="下载总结", show_header=True, header_style="bold magenta")
        table.add_column("项目", style="dim")
        table.add_column("数值", justify="right")

        table.add_row("总图片数", str(len(target_images)))
        table.add_row("成功下载", f"[green]{successful_downloads}[/green]")
        table.add_row("失败下载", f"[red]{len(failed_downloads)}[/red]")
        table.add_row("总耗时", f"{end_time - start_time:.2f}s")

        if successful_downloads > 0:
            avg_speed = successful_downloads / (end_time - start_time) if (end_time - start_time) > 0 else 0
            table.add_row("平均速度", f"{avg_speed:.1f} 文件/秒")

        console.print(table)

        if failed_downloads:
            console.print("\n[bold red]失败详情:[/bold red]")
            for error in failed_downloads:
                console.print(f"- {error}")

        console.print(f"\n[bold green]图片已保存至: [underline]{images_folder}[/underline] 文件夹[/bold green]")

    def list_supported_sites(self):
        """列出支持的网站"""
        console.print(Panel.fit("[bold blue]支持的网站列表[/bold blue]", border_style="green"))

        table = Table(show_header=True, header_style="bold magenta")
        table.add_column("网站名称", style="cyan")
        table.add_column("显示名称", style="green")
        table.add_column("描述", style="yellow")
        table.add_column("URL模式", style="dim")

        for site_config in self.sites.values():
            table.add_row(
                site_config.name,
                site_config.display_name,
                site_config.description,
                site_config.url_pattern
            )

        console.print(table)

def main():
    downloader = MultiSiteDownloader()

    # 创建images文件夹
    if not os.path.exists('images'):
        os.makedirs('images')

    console.print(Panel.fit("[bold blue]多网站图片下载器[/bold blue]", border_style="green"))

    # 检查是否传入了命令行参数
    if len(sys.argv) > 1:
        if sys.argv[1] == "--list-sites":
            downloader.list_supported_sites()
            return

        # 如果传入了URL参数，直接下载
        url = sys.argv[1]
        downloader.download_from_url(url)
    else:
        # 否则启动剪贴板监听
        console.print(Panel.fit("[bold blue]多网站图片下载器 (剪贴板监听模式)[/bold blue]", border_style="green"))

        processed_urls = set()
        console.print("开始监听剪贴板... 按 'n' 键可随时退出。")
        console.print(f"当前支持 {len(downloader.sites)} 个网站: {', '.join([s.display_name for s in downloader.sites.values()])}")

        last_clipboard = pyperclip.paste()
        try:
            while True:
                # 检查键盘输入
                try:
                    import msvcrt
                    if msvcrt.kbhit() and msvcrt.getch().decode().lower() == 'n':
                        console.print("\n[bold yellow]检测到 'n'，程序即将退出。[/bold yellow]")
                        break
                except:
                    pass

                current_clipboard = pyperclip.paste()
                if current_clipboard != last_clipboard:
                    last_clipboard = current_clipboard
                    console.print(f"[剪贴板变化] {current_clipboard}")

                    # 检测是否匹配任何支持的网站
                    site_config = downloader.detect_site(current_clipboard)
                    if site_config and current_clipboard not in processed_urls:
                        console.print(f"\n[bold green]检测到新的{site_config.display_name}链接:[/bold green] {current_clipboard}")
                        processed_urls.add(current_clipboard)

                        # 开始下载
                        downloader.download_from_url(current_clipboard)
                        console.print(f"\n[bold blue]继续监听剪贴板... 支持网站: {', '.join([s.display_name for s in downloader.sites.values()])}[/bold blue]")
                        console.print("按 'n' 键可随时退出。")
                time.sleep(1)

        except KeyboardInterrupt:
            console.print("\n[bold yellow]程序被用户中断 (Ctrl+C)。[/bold yellow]")
        finally:
            console.print("[bold yellow]监听已停止。[/bold yellow]")

if __name__ == "__main__":
    main()