#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试多网站下载器架构
"""

import sys
import os

# 添加脚本目录到Python路径
script_dir = os.path.dirname(__file__)
sys.path.insert(0, os.path.join(script_dir, 'scripts'))

from multi_site_downloader import MultiSiteDownloader

def test_site_loading():
    """测试网站配置加载"""
    print("测试网站配置加载...")
    downloader = MultiSiteDownloader()

    if not downloader.sites:
        print("❌ 没有加载到任何网站配置")
        return False

    print(f"✅ 成功加载了 {len(downloader.sites)} 个网站配置:")
    for name, config in downloader.sites.items():
        print(f"  - {config.display_name} ({name}): {config.description}")

    return True

def test_url_detection():
    """测试URL检测功能"""
    print("\n测试URL检测功能...")
    downloader = MultiSiteDownloader()

    test_urls = [
        "https://mm.tvv.tw/archives/7162.html",
        "https://example.com/gallery/123",
        "https://unsupported-site.com/page/1"
    ]

    for url in test_urls:
        site_config = downloader.detect_site(url)
        if site_config:
            print(f"✅ {url} -> {site_config.display_name}")
        else:
            print(f"❌ {url} -> 不支持的网站")

    return True

def test_config_validation():
    """测试配置文件有效性"""
    print("\n测试配置文件有效性...")
    downloader = MultiSiteDownloader()

    for name, config in downloader.sites.items():
        # 检查必需的字段
        required_fields = ['name', 'display_name', 'base_url', 'url_pattern', 'selectors']
        missing_fields = []

        for field in required_fields:
            if not hasattr(config, field) or not getattr(config, field):
                missing_fields.append(field)

        if missing_fields:
            print(f"❌ {name}: 缺少必需字段 {missing_fields}")
        else:
            print(f"✅ {name}: 配置完整")

    return True

def main():
    print("开始测试多网站下载器架构...\n")

    tests = [
        test_site_loading,
        test_url_detection,
        test_config_validation
    ]

    passed = 0
    for test in tests:
        try:
            if test():
                passed += 1
        except Exception as e:
            print(f"❌ 测试失败: {e}")

    print(f"\n测试完成: {passed}/{len(tests)} 个测试通过")

    if passed == len(tests):
        print("🎉 所有测试通过！多网站下载器架构正常工作。")
    else:
        print("⚠️  部分测试失败，请检查配置文件和代码。")

if __name__ == "__main__":
    main()