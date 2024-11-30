from typing import Optional, Any
import logging
from langchain.agents import Tool, AgentType, initialize_agent
from langchain.memory import ConversationBufferMemory
from langchain.chat_models import ChatOpenAI
from langchain.embeddings.base import Embeddings
from langchain.vectorstores.base import VectorStore
from services.pinecone_service import retrieve_info
import streamlit as st

def initialize_chat_agent(
    vector_store: Optional[VectorStore] = None,
    embeddings: Optional[Embeddings] = None,
    llm: Optional[Any] = None,
    index: Optional[Any] = None
) -> Any:
    """
    Initialize the chat agent with necessary tools and configuration.
    """
    try:
        # Initialize LLM if not provided
        if llm is None:
            llm = ChatOpenAI(
                temperature=0.01,
                model="gpt-4-1106-preview"
            )

        # Initialize memory
        memory = ConversationBufferMemory(
            memory_key="chat_history",
            return_messages=True
        )

        # Define the retrieval function wrapper
        def retrieve_wrapper(query: str) -> str:
            try:
                return retrieve_info(index, embeddings, query)
            except Exception as e:
                logging.error(f"Error in retrieve_wrapper: {str(e)}")
                return "I apologize, I couldn't retrieve the information."

        # Define tools
        tools = [
            Tool(
                name="Information Lookup",
                func=retrieve_wrapper,
                description="Search for information about Dhruv's background and experience"
            )
        ]

        # Initialize the agent
        agent = initialize_agent(
            tools=tools,
            llm=llm,
            agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION,
            memory=memory,
            verbose=True,
            handle_parsing_errors=True,
            max_iterations=3
        )

        return agent

    except Exception as e:
        logging.error(f"Error initializing chat agent: {str(e)}")
        raise

def generate_response(agent: Any, question: str) -> str:
    """Generate a response using the chat agent."""
    try:
        # Add typing indicator
        with st.empty():
            st.markdown("""
                <div class="typing-indicator">
                    <span class="typing-dot"></span>
                    <span class="typing-dot"></span>
                    <span class="typing-dot"></span>
                </div>
            """, unsafe_allow_html=True)
            
            response = agent.run(question)
            
        return response
    except Exception as e:
        logging.error(f"Error generating response: {str(e)}")
        return "I apologize, I couldn't process that request. Please try again."

def handle_user_input(agent: Any, user_input: str) -> None:
    """Handle user input and update chat history."""
    try:
        if user_input.strip():
            # Add user message to chat history
            st.session_state.chat_history.append({
                'type': 'user-message',
                'content': user_input
            })
            
            # Generate and add bot response
            response = generate_response(agent, user_input)
            st.session_state.chat_history.append({
                'type': 'bot-message',
                'content': response
            })
            
            # Clear the input
            st.session_state.user_input = ""
            
    except Exception as e:
        logging.error(f"Error handling user input: {str(e)}")
        st.error("An error occurred while processing your message.")

def clear_chat_history() -> None:
    """Clear the chat history."""
    try:
        if 'chat_history' in st.session_state:
            st.session_state.chat_history = []
            
    except Exception as e:
        logging.error(f"Error clearing chat history: {str(e)}")
        st.error("An error occurred while clearing the chat history.")