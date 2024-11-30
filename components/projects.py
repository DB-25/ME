import streamlit as st
from services.github_service import fetch_github_repos
from config.settings import GITHUB_USERNAME

def render_filters(languages):
    col1, col2, col3 = st.columns(3)
    with col1:
        selected_languages = st.multiselect("Filter by Language", sorted(languages))
    with col2:
        sort_by = st.selectbox("Sort by", ["Latest", "Most Stars", "Most Forks"])
    with col3:
        search = st.text_input("Search projects", "").lower()
    return selected_languages, sort_by, search

def filter_repos(repos, selected_languages, search):
    filtered_repos = repos.copy()
    
    if selected_languages:
        filtered_repos = [repo for repo in filtered_repos 
                         if repo.get('language') in selected_languages]
    
    if search:
        filtered_repos = [repo for repo in filtered_repos 
                         if search in repo['name'].lower() 
                         or search in (repo.get('description', '')).lower()
                         or any(search in topic.lower() for topic in repo.get('topics', []))]
    
    return filtered_repos

def sort_repos(repos, sort_by):
    if sort_by == "Most Stars":
        return sorted(repos, key=lambda x: x['stargazers_count'], reverse=True)
    elif sort_by == "Most Forks":
        return sorted(repos, key=lambda x: x['forks_count'], reverse=True)
    else:  # Latest
        return sorted(repos, key=lambda x: x['updated_at'], reverse=True)

def render_project_card(repo):
    # Format stats if they exist
    stats_html = ""
    if repo.get('stargazers_count', 0) > 0 or repo.get('forks_count', 0) > 0:
        stats = []
        if repo.get('stargazers_count', 0) > 0:
            stats.append(f'<span class="stat-item">⭐ {repo["stargazers_count"]}</span>')
        if repo.get('forks_count', 0) > 0:
            stats.append(f'<span class="stat-item">🍴 {repo["forks_count"]}</span>')
        if stats:
            stats_html = f'<div class="project-stats">{"".join(stats)}</div>'

    # Format badges
    badges_html = []
    if repo.get('language'):
        badges_html.append(f'<span class="tech-badge">{repo["language"]}</span>')
    for topic in repo.get('topics', []):
        badges_html.append(f'<span class="tech-badge">{topic}</span>')
    
    # Construct the card HTML
    card_html = [
        '<div class="gradient-card project-card">',
            '<div class="project-header">',
                f'<h3 class="project-title">{repo["name"]}</h3>',
                f'<a href="{repo["html_url"]}" target="_blank" class="project-link">',
                    '<i class="fab fa-github"></i>',
                '</a>',
            '</div>',
            f'<p class="project-description">{repo.get("description", "No description available.")}</p>',
            '<div class="project-footer">',
                '<div class="tech-badges">',
                    ''.join(badges_html),
                '</div>',
                stats_html,
            '</div>',
        '</div>'
    ]
    
    return ''.join(card_html)

def render():
    st.markdown("""
        <div class="section-header">
            <h2>Featured Projects</h2>
            <p>Explore some of my recent work</p>
        </div>
    """, unsafe_allow_html=True)
    
    # Fetch repositories
    repos = fetch_github_repos(GITHUB_USERNAME)
    
    # Extract languages
    languages = {repo.get('language') for repo in repos if repo.get('language')}
    
    # Filters in a glass card
    with st.container():
        st.markdown('<div class="glass-card">', unsafe_allow_html=True)
        selected_languages, sort_by, search = render_filters(languages)
        st.markdown('</div>', unsafe_allow_html=True)
    
    # Apply filters and sorting
    filtered_repos = filter_repos(repos, selected_languages, search)
    sorted_repos = sort_repos(filtered_repos, sort_by)
    
    # Display results count
    st.write(f"Showing {len(sorted_repos)} projects")
    
    # Create project grid
    st.markdown('<div class="project-grid">', unsafe_allow_html=True)
    for repo in sorted_repos:
        st.markdown(render_project_card(repo), unsafe_allow_html=True)
    st.markdown('</div>', unsafe_allow_html=True)
    