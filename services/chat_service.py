from typing import Optional, Any
import logging
from langchain.agents import Tool, AgentType, initialize_agent
from langchain.memory import ConversationBufferMemory
from langchain_openai import ChatOpenAI
from services.pinecone_service import retrieve_info
import streamlit as st

def initialize_chat_agent(
    vector_store: Optional[Any] = None,
    embeddings: Optional[Any] = None,
    llm: Optional[Any] = None,
    index: Optional[Any] = None
) -> Any:
    """Initialize the chat agent with Pinecone retrieval capabilities."""
    try:
        # Initialize LLM
        llm = ChatOpenAI(
            temperature=0, 
            model="gpt-4-1106-preview",
            streaming=True
        )

        # Define the retrieval tool
        tools = [
            Tool(
                name="Pinecone Retrieval",
                func=lambda q: retrieve_info(index, embeddings, q),
                description="Use this to fetch relevant information about Dhruv's background and experience."
            )
        ]

        # Initialize memory
        memory = ConversationBufferMemory(
            memory_key="chat_history",
            return_messages=True
        )

        # Initialize the agent with memory
        agent = initialize_agent(
            tools=tools,
            llm=llm,
            agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION,
            memory=memory,
            verbose=True,
            handle_parsing_errors=True
        )

        return agent

    except Exception as e:
        logging.error(f"Error initializing chat agent: {str(e)}")
        raise

def generate_response(agent: Any, question: str) -> str:
    """Generate a response using the chat agent with specific instructions."""
    try:
        combined_input = f"""
Please respond to the question by reflecting Dhruv Kamalesh Kumar's professional background and experience. Maintain a polite and professional tone in the response.

Instructions:
    ~Keep responses under 200 words, focusing on the question.
    ~For very personal questions, respond with a concise, polite reply, ideally under 50 words.
    ~Only provide information that is relevant to the question.
    ~Avoid sharing personal contact details or sensitive information.
    ~Use professional language and tone throughout the response.
    ~Answer directly and concisely.
    ~Use pronouns like "I" or "me".

Now, here is the question to answer:
{question}
"""
        # Add typing indicator
        with st.empty():
            st.markdown("""
                <div class="typing-indicator">
                    <span class="typing-dot"></span>
                    <span class="typing-dot"></span>
                    <span class="typing-dot"></span>
                </div>
            """, unsafe_allow_html=True)
            
            response = agent.run(combined_input)
            
        return response
    except Exception as e:
        logging.error(f"Error generating response: {str(e)}")
        return "I apologize, I couldn't process that request. Please try again."

def handle_user_input(agent: Any, user_input: str) -> None:
    """Handle user input and update chat history."""
    try:
        if user_input.strip():
            # Add user message to chat history
            if 'chat_history' not in st.session_state:
                st.session_state.chat_history = []
                
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
            
    except Exception as e:
        logging.error(f"Error handling user input: {str(e)}")
        st.error("An error occurred while processing your message.")

def clear_chat_history() -> None:
    """Clear the chat history."""
    if 'chat_history' in st.session_state:
        st.session_state.chat_history = []