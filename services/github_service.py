import requests
import streamlit as st

@st.cache_data
def fetch_github_repos(username, token=None):
    url = f"https://api.github.com/users/{username}/repos"
    headers = {
        'Accept': 'application/vnd.github.mercy-preview+json',
    }
    if token:
        headers['Authorization'] = f'token {token}'
    
    params = {'type': 'public', 'sort': 'updated', 'per_page': 100}
    response = requests.get(url, headers=headers, params=params)
    
    if response.status_code == 200:
        return response.json()
    elif response.status_code == 404:
        st.error("GitHub user not found.")
        return []
    elif response.status_code == 403:
        st.error("API rate limit exceeded. Please try again later.")
        return []
    else:
        st.error(f"Error fetching repositories. Status Code: {response.status_code}")
        return [] 