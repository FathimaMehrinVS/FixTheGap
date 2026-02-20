import os
from dotenv import load_dotenv

# This reads the .env file
load_dotenv()

# Get your API key
tavily_api_key = os.getenv("TAVILY_API_KEY")

