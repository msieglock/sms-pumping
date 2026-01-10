from setuptools import setup, find_packages

setup(
    name="smsguard",
    version="1.0.0",
    description="SMSGuard SDK for Python - SMS Pumping Prevention",
    long_description=open("README.md").read() if open("README.md") else "",
    long_description_content_type="text/markdown",
    author="SMSGuard",
    author_email="support@smsguard.dev",
    url="https://github.com/smsguard/smsguard-python",
    packages=find_packages(),
    python_requires=">=3.8",
    install_requires=[
        "requests>=2.28.0",
    ],
    classifiers=[
        "Development Status :: 5 - Production/Stable",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
    ],
    keywords=["sms", "fraud", "prevention", "security", "twilio", "verification"],
)
