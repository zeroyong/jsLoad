#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试meirentu.cc网站的图片提取功能
"""

import requests
from bs4 import BeautifulSoup
import sys
import os
from urllib.parse import urljoin

# 添加脚本目录到Python路径
script_dir = os.path.dirname(__file__)
sys.path.insert(0, os.path.join(script_dir, 'scripts'))

from multi_site_downloader import MultiSiteDownloader

def test_url_generation():
    """测试URL生成逻辑"""
    print("测试多页URL生成...")

    def generate_page_urls(base_url, total_pages):
        """生成页面URL"""
        urls = []
        for page_num in range(1, total_pages + 1):
            if page_num == 1:
                page_url = base_url
            else:
                # 构建页面URL
                if '-' in base_url and base_url.endswith('.html'):
                    last_dash_index = base_url.rfind('-')
                    base_part = base_url[:last_dash_index]
                    page_url = f"{base_part}-{page_num}.html"
                else:
                    page_url = base_url.replace('.html', f'-{page_num}.html')
            urls.append(page_url)
        return urls

    # 测试用例
    test_url = "https://meirentu.cc/pic/264828285861-2.html"
    print(f"基础URL: {test_url}")

    generated_urls = generate_page_urls(test_url, 5)
    for i, url in enumerate(generated_urls, 1):
        print(f"  第{i}页: {url}")

    print("URL生成测试完成\n")
    return True

def test_meirentu_extraction():
    """测试美人图网站的图片提取"""
    url = "https://meirentu.cc/pic/264828285861-2.html"

    # 加载下载器以获取配置
    downloader = MultiSiteDownloader()
    site_config = downloader.sites.get('meirentu_cc')

    if not site_config:
        print("❌ 未找到meirentu_cc的配置")
        return False

    print(f"找到配置: {site_config.display_name}")

    try:
        # 获取页面内容
        print("🌐 正在获取页面内容...")
        response = requests.get(
            url,
            headers=site_config.headers,
            timeout=30,
            proxies=site_config.proxies
        )
        response.raise_for_status()
        response.encoding = 'utf-8'

        # 解析HTML
        soup = BeautifulSoup(response.text, 'html.parser')

        # 提取标题
        title_element = soup.select_one(site_config.selectors['title'])
        if title_element:
            title = title_element.get_text().strip()
            print(f"📝 标题: {title}")
        else:
            print("❌ 未找到标题元素")
            print("尝试查找的CSS选择器:", site_config.selectors['title'])
            # 调试：显示页面中的h1元素
            h1_elements = soup.find_all('h1')
            print(f"页面中的h1元素: {len(h1_elements)} 个")
            for i, h1 in enumerate(h1_elements):
                print(f"  h1[{i}]: {h1}")

        # 提取图片
        print("\n🖼️  正在提取图片...")
        img_elements = soup.select(site_config.selectors['images'])
        print(f"使用CSS选择器: {site_config.selectors['images']}")
        print(f"找到 {len(img_elements)} 个图片元素")

        if img_elements:
            print("\n📋 图片列表:")
            for i, img in enumerate(img_elements):
                src = img.get('src', '')
                alt = img.get('alt', '无描述')
                print(f"  [{i+1}] src: {src}")
                print(f"      alt: {alt}")

                if src:
                    img_url = src if src.startswith('http') else urljoin(site_config.base_url, src)
                    print(f"      完整URL: {img_url}")
                print()
        else:
            print("❌ 未找到图片元素")
            print("调试信息:")
            # 显示页面中的所有img元素
            all_imgs = soup.find_all('img')
            print(f"页面中总共有 {len(all_imgs)} 个img元素")
            for i, img in enumerate(all_imgs):
                print(f"  img[{i}]: src={img.get('src', '')}, class={img.get('class', '')}")

            # 显示content_left相关元素
            content_left = soup.select('div.content_left')
            print(f"\ndiv.content_left 元素: {len(content_left)} 个")
            for i, div in enumerate(content_left):
                print(f"content_left[{i}]:")
                print(div.prettify()[:500] + "..." if len(div.prettify()) > 500 else div.prettify())

        return True

    except Exception as e:
        print(f"❌ 错误: {str(e)}")
        return False

def test_actual_download():
    """测试实际下载功能"""
    url = "https://meirentu.cc/pic/264828285861-2.html"

    downloader = MultiSiteDownloader()
    site_config = downloader.sites.get('meirentu_cc')

    if not site_config:
        print("❌ 未找到meirentu_cc的配置")
        return False

    print(f"\n🧪 开始测试实际下载功能...")
    print(f"网站: {site_config.display_name}")

    # 提取图片
    target_images, images_folder = downloader.extract_images_from_page(url, site_config)

    if not target_images:
        print("❌ 未找到图片")
        return False

    print(f"✅ 找到 {len(target_images)} 张图片")
    print(f"📁 保存到: {images_folder}")

    # 测试下载全部图片（使用多线程）
    print(f"\n下载测试: 全部 {len(target_images)} 张图片（使用多线程）")

    if not target_images:
        print("❌ 没有图片可下载")
        return False

    # 询问用户是否下载全部图片
    print(f"\n⚠️  警告: 将要下载 {len(target_images)} 张图片")
    print("这可能需要一些时间和带宽，是否继续？(y/N): ", end="")
    choice = input().lower().strip()

    if choice != 'y' and choice != 'yes':
        print("❌ 用户取消下载")
        return False

    # 使用下载器的多线程下载功能
    try:
        # 导入必要的模块
        from concurrent.futures import ThreadPoolExecutor, as_completed
        from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TaskProgressColumn
        from rich.console import Console

        console = Console()

        # 使用下载器的内置多线程下载功能
        success_count = 0
        failed_count = 0

        # 创建进度条
        progress = Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            BarColumn(),
            TaskProgressColumn(),
            console=console
        )

        with progress:
            # 主任务
            overall_task = progress.add_task(f"[bold yellow]下载进度 (0/{len(target_images)})", total=len(target_images))

            # 使用线程池并行下载
            with ThreadPoolExecutor(max_workers=site_config.max_workers) as executor:
                # 提交所有下载任务
                future_to_image = {}
                for img_url, filename in target_images:
                    task_id = progress.add_task(f"[cyan]{filename}", total=None, visible=False)
                    future = executor.submit(
                        downloader.download_single_image,
                        img_url, filename, progress, task_id, images_folder, site_config
                    )
                    future_to_image[future] = (img_url, filename)

                # 处理完成的任务
                for future in as_completed(future_to_image):
                    img_url, filename = future_to_image[future]
                    try:
                        success, result = future.result()
                        if success:
                            success_count += 1
                            print(f"✅ {filename} 下载成功")
                        else:
                            failed_count += 1
                            print(f"❌ {filename} 下载失败: {result}")
                    except Exception as e:
                        failed_count += 1
                        print(f"❌ {filename} 下载出错: {str(e)}")

                    # 更新进度
                    progress.update(overall_task, advance=1, description=f"[bold yellow]下载进度 ({success_count + failed_count}/{len(target_images)})")

        print(f"\n📊 下载结果: {success_count}/{len(target_images)} 成功, {failed_count} 失败")

        if failed_count > 0:
            print("\n❌ 部分图片下载失败，请检查网络连接或图片URL")

        return success_count > 0

    except Exception as e:
        print(f"❌ 多线程下载出错: {str(e)}")
        return False

def main():
    print("开始测试meirentu.cc网站...\n")

    # 测试URL生成
    test_url_generation()

    # 测试图片提取
    if test_meirentu_extraction():
        print("\n✅ 图片提取测试通过")
    else:
        print("\n❌ 图片提取测试失败")
        return

    # 测试实际下载
    if test_actual_download():
        print("\n🎉 所有测试通过！网站配置正确。")
    else:
        print("\n❌ 下载测试发现问题，请检查配置。")

if __name__ == "__main__":
    main()