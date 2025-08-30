# ml-service/setup.py
from setuptools import setup, find_packages

setup(
    name="text-humanization-service",
    version="1.0.0",
    packages=find_packages(),
    install_requires=[
        "fastapi>=0.104.1",
        "uvicorn[standard]>=0.24.0",
        "torch>=2.1.0",
        "transformers>=4.35.0",
        "sentence-transformers>=2.2.2",
        "spacy>=3.7.2",
        "numpy>=1.24.3",
        "pydantic>=2.5.0",
        "python-multipart>=0.0.6",
        "accelerate>=0.24.1",
    ],
)