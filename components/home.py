import streamlit as st
from utils.image_utils import img_to_base64
from services.chat_service import generate_response, handle_user_input, clear_chat_history
from data.achievements import get_achievements

def render_hero_section(image_base64):
    st.markdown(f"""
    <div class="hero-section">
        <div class="hero-content">
            <img src="data:image/png;base64,{image_base64}" class="hero-avatar" alt="Dhruv Kumar">
            <div class="hero-text">
                <h1 class="hero-title">Hey, I'm Dhruv Kamalesh Kumar <span class="hero-alias">aka <span class="gamer-tag">DB25</span></span></h1>
                <p class="hero-subtitle">AI Engineer &amp; Full Stack Developer</p>
                <div class="hero-badges">
                    <span class="tech-badge">Python</span>
                    <span class="tech-badge">AI/ML</span>
                    <span class="tech-badge">Full Stack</span>
                    <span class="tech-badge">AWS</span>
                </div>
            </div>
        </div>
    </div>
    """, unsafe_allow_html=True)

def render_chat_section(agent):
    # Initialize chat history
    if 'chat_history' not in st.session_state:
        st.session_state.chat_history = []

    # Chat Container
    st.markdown("""
    <div class="chat-card">
        <div class="chat-header">
            <div class="chat-title">
                <div class="chat-avatar pulse">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="chat-info">
                    <h3>DB25 AI Assistant</h3>
                    <p class="chat-subtitle">Ask me anything about Dhruv's experience</p>
                </div>
            </div>
            <button class="clear-chat-btn glass-effect" onclick="clearChat()">
                <i class="fas fa-trash"></i>
            </button>
        </div>
        <div class="chat-messages custom-scrollbar" id="chat-messages">
    """, unsafe_allow_html=True)

    # Render messages
    for msg in st.session_state.chat_history:
        if msg['type'] == 'user-message':
            st.markdown(f"""
            <div class="message user-message">
                <div class="message-bubble glass-effect">
                    <p>{msg['content']}</p>
                    <span class="message-time">You</span>
                </div>
            </div>
            """, unsafe_allow_html=True)
        else:
            st.markdown(f"""
            <div class="message bot-message">
                <div class="message-avatar pulse-subtle">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="message-content">
                    <div class="message-bubble glass-effect">
                        <p>{msg['content']}</p>
                        <span class="message-time">DB25 AI</span>
                    </div>
                </div>
            </div>
            """, unsafe_allow_html=True)

    # Input container with send button
    st.markdown("""
        </div>
        <form class="chat-input-container glass-effect" onsubmit="handleSubmit(event)">
            <input type="text" 
                   placeholder="Type your message..." 
                   id="chat-input"
                   class="glass-input"
            />
            <button type="submit" class="send-button pulse-hover">
                <i class="fas fa-paper-plane"></i>
            </button>
        </form>
    </div>
    """, unsafe_allow_html=True)

    # Handle clear chat
    if st.session_state.get('clear_chat'):
        clear_chat_history()
        st.session_state.clear_chat = False
        st.rerun()

    # Handle incoming messages
    if 'user_input' in st.session_state and st.session_state.user_input:
        handle_user_input(agent, st.session_state.user_input)
        st.session_state.user_input = ""
        st.rerun()

def render_achievements_section():
    st.markdown("""
    <div class="achievements-section">
        <h3>🏆 Achievements & Education</h3>
    </div>
    """, unsafe_allow_html=True)

    achievements = get_achievements()

    for achievement in achievements:
        links_html = ''
        if achievement.get('links'):
            links_html = '<div class="achievement-links">' + ''.join([
                f'<a href="{link["url"]}" target="_blank" class="achievement-link">{link["label"]}</a>'
                for link in achievement['links']
            ]) + '</div>'

        images_html = ''
        if achievement['images']:
            images_html = '<div class="achievement-images">' + ''.join([
                f'<img src="{image}" class="achievement-image" />'
                for image in achievement['images']
            ]) + '</div>'

        st.markdown(f"""
        <div class="achievement-card">
            <div class="achievement-header">
                <span class="achievement-emoji">{achievement['emoji']}</span>
                <h4>{achievement['title']}</h4>
            </div>
            {'<div class="achievement-institution">' + achievement['institution'] + '</div>' if achievement['institution'] else ''}
            <p>{achievement['description']}</p>
            {links_html}
            {images_html}
        </div>
        """, unsafe_allow_html=True)

def render(agent):
    try:
        # Load memoji image
        image_base64 = img_to_base64("memoji.png")

        # Hero Section
        render_hero_section(image_base64)

        # Create columns with 2:1 ratio
        col1, col2 = st.columns([2, 1])  # 2:1 ratio split

        # Chat Section (2/3 width)
        with col1:
            render_chat_section(agent)

        # Achievements Section (1/3 width)
        with col2:
            render_achievements_section()

    except Exception as e:
        st.error(f"An error occurred while rendering the home page: {str(e)}")
