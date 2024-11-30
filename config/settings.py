import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# API Keys
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_ENVIRONMENT = os.getenv("PINECONE_ENVIRONMENT")

# Pinecone Settings
PINECONE_INDEX_NAME = "me"

# GitHub Settings
GITHUB_USERNAME = "DB-25"

# Page Config
PAGE_CONFIG = {
    "page_title": "Get to Know Me",
    "page_icon": ":male-technologist:",
    "layout": "wide",
    "initial_sidebar_state": "collapsed"
} 