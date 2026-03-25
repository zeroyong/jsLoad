# -*- coding: utf-8 -*-
import requests
from bs4 import BeautifulSoup
import os
import time
from urllib.parse import urljoin
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed

# 创建images文件夹
if not os.path.exists('images'):
    os.makedirs('images')

def download_single_image(args):
    """下载单个图片的函数"""
    img_url, filename, index, total = args
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }

        response = requests.get(img_url, headers=headers, timeout=10)
        response.raise_for_status()

        filepath = os.path.join('images', filename)
        with open(filepath, 'wb') as f:
            f.write(response.content)

        return f"[{index}/{total}] 下载成功: {filename}", True
    except Exception as e:
        return f"[{index}/{total}] 下载失败 {filename}: {str(e)}", False

def main():
    url = 'https://mm.tvv.tw/archives/7176.html'
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }

    try:
        print("正在访问网页...")
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        response.encoding = 'utf-8'

        # 保存页面用于调试
        with open('mm_page.html', 'w', encoding='utf-8') as f:
            f.write(response.text)
        print("✓ 网页已保存")

        # 解析HTML
        soup = BeautifulSoup(response.text, 'html.parser')

        # 查找目标图片
        target_images = []
        all_imgs = soup.find_all('img')

        print(f"正在查找图片...")
        for img in all_imgs:
            src = img.get('src', '')
            # 查找符合指定模式的图片
            if 'meimei.tvv.tw/meimei/uploads' in src:
                # 转换为绝对URL
                if src.startswith('http'):
                    img_url = src
                else:
                    img_url = urljoin('https://mm.tvv.tw', src)

                # 生成文件名
                filename = os.path.basename(img_url.split('?')[0])  # 移除URL参数
                if not filename:
                    filename = f"image_{len(target_images)+1}.jpg"

                target_images.append((img_url, filename))

        print(f"\n找到 {len(target_images)} 张目标图片")

        if not target_images:
            print("未找到符合要求的图片")
            return

        # 显示找到的图片
        for i, (img_url, filename) in enumerate(target_images, 1):
            print(f"[{i}] {img_url}")

        print(f"\n开始下载图片...")

        # 准备下载任务
        download_tasks = []
        for i, (img_url, filename) in enumerate(target_images, 1):
            download_tasks.append((img_url, filename, i, len(target_images)))

        # 使用线程池并发下载
        successful_downloads = 0
        start_time = time.time()

        with ThreadPoolExecutor(max_workers=5) as executor:
            future_to_task = {executor.submit(download_single_image, task): task for task in download_tasks}

            for future in as_completed(future_to_task):
                message, success = future.result()
                print(message)
                if success:
                    successful_downloads += 1

        end_time = time.time()

        print(f"\n=== 下载完成 ===")
        print(f"总图片数: {len(target_images)}")
        print(f"成功下载: {successful_downloads}")
        print(f"下载用时: {end_time - start_time:.2f} 秒")
        print(f"图片保存在: images/ 文件夹")

    except Exception as e:
        print(f"发生错误: {str(e)}")

if __name__ == "__main__":
    main()