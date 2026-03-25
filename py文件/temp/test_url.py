# -*- coding: utf-8 -*-
import requests
from bs4 import BeautifulSoup

url = 'https://mm.tvv.tw/archives/7176.html'
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}

try:
    print(f"正在访问: {url}")
    response = requests.get(url, headers=headers, timeout=10)
    print(f"响应状态码: {response.status_code}")
    print(f"响应编码: {response.encoding}")
    print(f"响应大小: {len(response.text)} 字符")

    # 保存原始HTML
    with open('temp_page.html', 'w', encoding='utf-8') as f:
        f.write(response.text)
    print("页面已保存到 temp_page.html")

    # 解析HTML
    soup = BeautifulSoup(response.text, 'html.parser')

    # 查找所有图片
    all_imgs = soup.find_all('img')
    print(f"\n找到 {len(all_imgs)} 个图片标签")

    for i, img in enumerate(all_imgs[:10]):  # 只显示前10个
        src = img.get('src', '')
        img_class = img.get('class', [])
        print(f"[{i+1}] src: {src}")
        print(f"    class: {img_class}")
        print()

except Exception as e:
    print(f"发生错误: {str(e)}")