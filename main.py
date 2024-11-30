import streamlit as st
from config.settings import PAGE_CONFIG
from utils.style_utils import load_styles
from components import home, projects, contact
from services.pinecone_service import (
    initialize_pinecone, load_documents, get_embeddings,
    load_to_pinecone
)
from services.chat_service import initialize_chat_agent, generate_response

def main():
    # Page configuration
    st.set_page_config(**PAGE_CONFIG)
    
    # Initialize session state
    if "selected_question" not in st.session_state:
        st.session_state.selected_question = ""
        
    if "chat_history" not in st.session_state:
        st.session_state.chat_history = []
    
    # Load styles
    load_styles()
    
    # Initialize services (with caching to prevent reinitialization)
    @st.cache_resource
    def init_services():
        index = initialize_pinecone()
        documents = load_documents()
        embeddings = get_embeddings()
        load_to_pinecone(index, documents, embeddings)
        agent = initialize_chat_agent(index=index, embeddings=embeddings)
        return agent
    
    # Get or initialize agent
    agent = init_services()
    
    # Create tabs
    tabs = st.tabs(["Home", "Projects", "Contact"])
    
    # Render tabs
    with tabs[0]:
        home.render(agent)
    
    with tabs[1]:
        projects.render()
    
    with tabs[2]:
        contact.render()

if __name__ == "__main__":
    main()
