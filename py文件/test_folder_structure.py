#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试文件夹结构功能
"""

import sys
import os

# 添加脚本目录到Python路径
script_dir = os.path.dirname(__file__)
sys.path.insert(0, os.path.join(script_dir, 'scripts'))

from multi_site_downloader import MultiSiteDownloader

def test_folder_structure():
    """测试文件夹结构"""
    print("测试文件夹结构功能...\n")

    downloader = MultiSiteDownloader()

    # 测试URL检测
    test_urls = [
        "https://mm.tvv.tw/archives/7162.html",
        "https://meirentu.cc/pic/264828285861-2.html"
    ]

    for url in test_urls:
        site_config = downloader.detect_site(url)
        if site_config:
            print(f"✅ 检测到网站: {site_config.display_name}")
            print(f"   基础文件夹: images/{site_config.display_name}/")
            print(f"   配置名称: {site_config.name}")
            print()
        else:
            print(f"❌ 未检测到支持的网站: {url}")

    return True

def main():
    test_folder_structure()
    print("✅ 文件夹结构测试完成")
    print("\n📁 预期结构:")
    print("   images/")
    print("   ├── MM图片站/")
    print("   │   └── 文章标题/")
    print("   └── 美人图图片站/")
    print("       └── 文章标题/")

if __name__ == "__main__":
    main()