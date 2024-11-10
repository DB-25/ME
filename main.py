import streamlit as st
import base64
import requests
from langchain_community.document_loaders.csv_loader import CSVLoader
from langchain_community.embeddings.openai import OpenAIEmbeddings
from langchain_openai import ChatOpenAI
from dotenv import load_dotenv
import openai
import os
from pinecone import Pinecone, ServerlessSpec
from langchain.agents import initialize_agent, AgentType, Tool

# Load environment variables
load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

# Initialize Pinecone
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index_name = "me"
spec = ServerlessSpec(cloud="aws", region=os.getenv("PINECONE_ENVIRONMENT"))

# Check if index exists, create if necessary
if index_name not in pc.list_indexes().names():
    pc.create_index(name=index_name, dimension=3072, spec=spec)

index = pc.Index(index_name)

# Load documents
loader = CSVLoader(file_path="ME.csv")
documents = loader.load()
embeddings = OpenAIEmbeddings(model="text-embedding-3-large")

def load_to_pinecone():
    existing_ids = {match.id for match in index.query(vector=[0] * 3072, top_k=1).matches}
    if existing_ids:
        print("Data already exists in Pinecone. Skipping upload.")
        return

    docs_content = [doc.page_content for doc in documents]
    embeddings_list = embeddings.embed_documents(docs_content)
    for i, embedding in enumerate(embeddings_list):
        index.upsert([(str(i), embedding, {"content": docs_content[i]})])

load_to_pinecone()

def retrieve_info(query):
    query_embedding = embeddings.embed_query(query)
    result = index.query(vector=query_embedding, top_k=4, include_metadata=True)
    page_contents_array = [match['metadata']['content'] for match in result['matches']]
    return page_contents_array

def pinecone_retrieval_tool(input_text: str) -> str:
    relevant_data = retrieve_info(input_text)
    return "\n".join(relevant_data)

llm = ChatOpenAI(temperature=0, model="gpt-4-1106-preview")
tools = [Tool(name="Pinecone Retrieval", func=retrieve_info, description="Fetch relevant information using Pinecone.")]
agent = initialize_agent(tools=tools, llm=llm, agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION, verbose=True)

def generate_response(question):
    combined_input = f"""
Please respond to the question by reflecting Dhruv Kamalesh Kumar’s professional background and experience. Maintain a polite and professional tone in the response.

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
    response = agent.run(combined_input)
    return response

# Function to convert image to base64
def img_to_base64(image_path):
    with open(image_path, "rb") as img_file:
        return base64.b64encode(img_file.read()).decode()

# Convert memoji.png to base64
image_base64 = img_to_base64("memoji.png")

# Function to fetch GitHub repositories with topics
@st.cache_data
def fetch_github_repos(username, token=None):
    url = f"https://api.github.com/users/{username}/repos"
    headers = {
        'Accept': 'application/vnd.github.mercy-preview+json',  # To get topics
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
        st.error(f"Error fetching repositories from GitHub. Status Code: {response.status_code}")
        return []

# Function to initialize pagination state
def init_pagination(total_pages):
    if 'current_page' not in st.session_state:
        st.session_state.current_page = 1
    if 'total_pages' not in st.session_state:
        st.session_state.total_pages = total_pages

# Streamlit app setup
def main():
    st.set_page_config(
        page_title="Get to Know Me",
        page_icon=":male-technologist:",
        layout="wide",
        initial_sidebar_state="collapsed",  # Collapse sidebar since we're not using it for navigation
    )

    if "selected_question" not in st.session_state:
        st.session_state.selected_question = ""

    # Add custom CSS for styling and animations
    st.markdown("""
        <style>
        /* General Styles */
        body {
            background-color: #f5f5f5;
        }

        /* Home Tab Styles */
        .greeting {
            font-size: 2.5em;
            font-weight: bold;
            color: var(--text-color);
            animation: fadeIn 2s ease-in-out;
        }

        .bio {
            font-size: 1.2em;
            color: var(--text-color);  /* Changed from fixed color to theme variable */
            margin-top: 20px;
            line-height: 1.5;
        }

        .roles {
            font-size: 1.1em;
            color: var(--text-color);
            margin-top: 15px;
            font-style: italic;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        /* Download Resume Button Styles */
        .download-button {
            background-color: #6f42c1;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 25px;
            font-size: 1em;
            cursor: pointer;
            transition: background-color 0.3s, transform 0.3s;
            margin-top: 20px;
        }
        .download-button:hover {
            background-color: #5a32a3;
            transform: scale(1.05);
        }

        /* Project Card Styles */
        .project-card {
            border: 1px solid #e1e4e8;
            padding: 20px;
            border-radius: 10px;
            transition: box-shadow 0.3s, transform 0.3s;
            background-color: #ffffff;
            color: #333333; /* Ensure text is visible */
        }
        .project-card:hover {
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            transform: translateY(-5px);
        }
        .project-title {
            font-size: 1.5em;
            margin-bottom: 10px;
            color: #0366d6; /* Distinct color for titles */
        }
        .project-title a {
            color: inherit;
            text-decoration: none;
        }
        .project-title a:hover {
            text-decoration: underline;
        }
        .badge {
            display: inline-block;
            padding: 5px 10px;
            margin: 2px;
            font-size: 0.9em;
            color: #ffffff;
            border-radius: 5px;
        }
        .language-badge {
            background-color: #0366d6;
        }
        .topic-badge {
            background-color: #6f42c1;
        }
        .project-card p {
            color: #555555;
        }

        /* Suggested Questions and Chat Interface Styles */
        .suggested-questions {
            margin-top: 40px;
        }
        .suggested-questions button {
            background-color: #f0f0f0;
            color: #333333;
            padding: 8px 15px;
            border: none;
            border-radius: 20px;
            font-size: 0.9em;
            cursor: pointer;
            margin: 5px;
            transition: background-color 0.3s, transform 0.2s;
        }
        .suggested-questions button:hover {
            background-color: #e0e0e0;
            transform: scale(1.05);
        }
        </style>
    """, unsafe_allow_html=True)

    tabs = st.tabs(["Home", "Projects", "Contact"])

    # --------------------- #
    #        Home Tab       #
    # --------------------- #
    with tabs[0]:
        # Create two main columns: Left (text) and Right (image and badges)
        left_col, right_col = st.columns([3, 1])

        with left_col:
            # Greeting

            image_col, title_col = st.columns([1, 4])
            with image_col:
                # Profile Image (Memoji)
                st.image("memoji.png", width=150)
            with title_col:
                st.text("")
                st.text("")
                st.markdown('<div class="greeting" style="display: flex; align-items: center; height: 100%;">Hey there! I\'m Dhruv — or DB25 if you catch me in the gaming world.</div>', unsafe_allow_html=True)

            # Bio
            st.markdown("""
                <div class="bio">
                    I am a passionate Software Engineer with a love for building high-performance PCs and crafting delicious meals. I enjoy solving complex puzzles, starting with a single Rubik's cube and expanding my collection to five different varieties. When I'm not immersed in technology, you'll find me playing Valorant or streaming on YouTube, sharing my gaming adventures with the community.
                </div>
            """, unsafe_allow_html=True)

            # Roles
            st.markdown('<div class="roles">Software Engineer | AI Enthusiast </div>', unsafe_allow_html=True)

        with right_col:

            # Social Badges
            st.markdown('<div class="social-badges">', unsafe_allow_html=True)
            # Arrange badges in rows for alignment

            st.markdown(
                "[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-blue?logo=linkedin&style=for-the-badge)](https://www.linkedin.com/in/dhruvkamaleshkumar/)",
                unsafe_allow_html=True
            )
            st.markdown(
                "[![GitHub](https://img.shields.io/badge/GitHub-Follow-181717?logo=github&style=for-the-badge)](https://github.com/DB-25)",
                unsafe_allow_html=True
            )
            st.markdown(
                "[![Email](https://img.shields.io/badge/Email-Contact%20Me-D14836?logo=gmail&style=for-the-badge)](mailto:dhruvbaradiya@gmail.com)",
                unsafe_allow_html=True
            )

            # Download Resume Button with Custom Styling
            with open("resume.pdf", "rb") as file:
                resume_data = base64.b64encode(file.read()).decode()
                st.markdown(f'''
                    <a href="data:application/octet-stream;base64,{resume_data}" download="Dhruv_Kumar_Resume.pdf">
                        <button class="download-button">📄 Download Resume</button>
                    </a>
                ''', unsafe_allow_html=True)

        # --------------------- #
        # add a divider
        st.markdown("---")

        chat_col, achievements_col = st.columns([3, 1])

        with chat_col:
            # Suggested Questions and Chat Interface
            st.markdown('<div class="suggested-questions">', unsafe_allow_html=True)
            st.subheader("Ask Me Anything")
            example_questions = [
                "What are your skills?",
                "Tell me about your projects.",
                "Describe your experience.",
                "What are your career goals?",
                "What technologies are you passionate about?",
                "How do you approach problem-solving?",
            ]

            # Display suggested questions as buttons
            st.write("### Suggested Questions:")
            cols = st.columns(len(example_questions))
            for i, question in enumerate(example_questions):
                if cols[i].button(question, key=f"question_{i}"):
                    st.session_state.selected_question = question

            # Question Input
            message = st.text_input(
                "Hi, I’m Dhruv! Feel free to ask me any questions you have:",
                value=st.session_state.selected_question,
            )

            if message:
                st.session_state.selected_question = ""
                with st.spinner("Generating response..."):
                    result = generate_response(message)
                st.markdown("#### Response:")
                st.write(result)
            st.markdown('</div>', unsafe_allow_html=True)

        with achievements_col:
            st.subheader("Recent Achievements")

            # Define your achievements data
            achievements = [
                {
                    'date': 'Bachelor of Technology in Computer Science',
                    'emoji': '🎓',
                    'title': 'Bachelor of Technology in Computer Science',
                    'institution': 'Acharya Institute of Technology - VTU',
                    'description': 'Graduated with a strong foundation in computer science principles and practices.',
                    'images': []  # No images for this achievement
                },
                {
                    'date': 'Master of Science in Artificial Intelligence',
                    'emoji': '🎓',
                    'title': 'Master of Science in Artificial Intelligence',
                    'institution': 'Northeastern University (NEU)',
                    'description': 'Specializing in cutting-edge AI technologies and applications. Expected Graduation: December 2024.',
                    'images': []  # Add images if available
                },
                {
                    'date': 'Presented at AWS',
                    'emoji': '🏆',
                    'title': 'Presented a Gen-AI RAG Chatbot at Amazon Web Services (AWS)',
                    'institution': '',
                    'description': 'Delivered a comprehensive presentation on a Generative AI Retrieval-Augmented Generation (RAG) Chatbot, showcasing expertise in AI-driven solutions.',
                    'links': [
                        {'label': 'LinkedIn Post',
                         'url': 'https://www.linkedin.com/feed/update/urn:li:activity:7238027177252847616/'}
                    ],
                    'images': [
                        'images/aws_presentation1.jpeg',
                        'images/aws_presentation2.jpeg'
                    ]
                },
                {
                    'date': 'State Gen-AI Projects Presentation',
                    'emoji': '🤝',
                    'title': 'State Gen-AI Projects Presentation to Governor Healey',
                    'institution': '',
                    'description': 'Worked on state Gen-AI projects and had the opportunity to present the outcomes to Governor Healey.',
                    'links': [
                        {'label': 'Official Announcement',
                         'url': 'https://www.mass.gov/news/governor-healey-meets-with-northeastern-students-working-with-administration-on-ai-project-under-innovatema-partnership'},
                        {'label': "Governor Healey's Twitter Post",
                         'url': 'https://x.com/MassGovernor/status/1806407066116080012'},
                        {'label': 'GovTech Coverage',
                         'url': 'https://www.govtech.com/education/higher-ed/northeastern-university-student-projects-improve-government-with-ai'}
                    ],
                    'images': [
                        'images/gov_presentation1.jpeg',
                        'images/gov_presentation2.jpg',
                        'images/gov_presentation3.jpeg',
                    ]
                },
                # Add more achievements as needed
            ]

            achievements.reverse()  # Reverse the order to show the latest achievements first
            # Iterate through each achievement and display as a card
            for achievement in achievements:
                # Display the emoji and title
                if 'links' in achievement and len(achievement['links']) > 0:
                    # Make the title clickable with the first link
                    primary_link = achievement['links'][0]['url']
                    st.markdown(
                        f"**{achievement['emoji']} [{achievement['title']}]({primary_link})**",
                        unsafe_allow_html=False
                    )
                else:
                    st.markdown(
                        f"**{achievement['emoji']} {achievement['title']}**",
                        unsafe_allow_html=False
                    )

                # Display the institution if available
                if achievement.get('institution'):
                    st.markdown(f"*{achievement['institution']}*")

                # Display the description
                st.write(achievement['description'])

                # Display additional links if any
                if 'links' in achievement and len(achievement['links']) > 1:
                    for link in achievement['links'][1:]:
                        st.markdown(f"- [{link['label']}]({link['url']})")

                # Display image carousel if images are present
                if 'images' in achievement and len(achievement['images']) > 0:
                    # Create tabs to simulate a carousel
                    image_tabs = st.tabs([f"Image {i + 1}" for i in range(len(achievement['images']))])
                    for i, image_path in enumerate(achievement['images']):
                        with image_tabs[i]:
                            if os.path.exists(image_path):
                                st.image(image_path, use_column_width=True)
                            else:
                                st.warning(f"Image not found: {image_path}")

                # Add a horizontal divider between achievements
                st.markdown("---")

    # --------------------- #
    #      Projects Tab     #
    # --------------------- #
    with tabs[1]:
        st.header("Projects")

        # Fetch GitHub repositories
        github_username = "DB-25"  # Replace with your GitHub username
        github_token = os.getenv("GITHUB_TOKEN")  # Optional: GitHub Personal Access Token for higher rate limits
        repos = fetch_github_repos(github_username, token=github_token)

        if repos:
            # Pagination parameters
            PAGE_SIZE = 6  # Number of projects per page
            total_repos = len(repos)
            total_pages = (total_repos + PAGE_SIZE - 1) // PAGE_SIZE  # Ceiling division

            # Initialize pagination state
            init_pagination(total_pages)

            # Ensure current_page is within bounds
            st.session_state.current_page = max(1, min(st.session_state.current_page, st.session_state.total_pages))

            # Calculate start and end indices
            start_idx = (st.session_state.current_page - 1) * PAGE_SIZE
            end_idx = start_idx + PAGE_SIZE
            current_repos = repos[start_idx:end_idx]

            # Display current page projects
            num_cols = 3  # Number of columns per row
            repo_chunks = [current_repos[i:i + num_cols] for i in range(0, len(current_repos), num_cols)]

            for chunk in repo_chunks:
                cols = st.columns(len(chunk))
                for i, repo in enumerate(chunk):
                    with cols[i]:
                        # Prepare language badge
                        language = repo.get('language', 'N/A')
                        language_badge = f'<span class="badge language-badge">{language}</span>' if language else ''

                        # Prepare topic badges
                        topics = repo.get('topics', [])
                        if not topics:
                            # Fetch topics if not already present
                            topics_url = repo.get('url') + '/topics'
                            headers = {
                                'Accept': 'application/vnd.github.mercy-preview+json',
                            }
                            if github_token:
                                headers['Authorization'] = f'token {github_token}'
                            topics_response = requests.get(topics_url, headers=headers)
                            if topics_response.status_code == 200:
                                topics = topics_response.json().get('names', [])
                            else:
                                topics = []

                        topic_badges = ' '.join([f'<span class="badge topic-badge">{topic}</span>' for topic in topics])

                        # Display project card
                        st.markdown(
                            f"""
                            <div class="project-card">
                                <div class="project-title"><a href="{repo['html_url']}" target="_blank">{repo['name']}</a></div>
                                <p>{repo.get('description', 'No description provided.')}</p>
                                <div>{language_badge}</div>
                                <div>{topic_badges}</div>
                            </div>
                            """,
                            unsafe_allow_html=True,
                        )

                        # Display stars and forks if they are greater than zero
                        stars = repo.get('stargazers_count', 0)
                        forks = repo.get('forks_count', 0)
                        stats = []
                        if stars > 0:
                            stats.append(f"**⭐ Stars:** {stars}")
                        if forks > 0:
                            stats.append(f"**🍴 Forks:** {forks}")
                        if stats:
                            st.write(" | ".join(stats))

            # Pagination controls
            st.markdown("---")
            pagination_cols = st.columns(3)
            with pagination_cols[0]:
                if st.session_state.current_page > 1:
                    if st.button("⏮️ Previous"):
                        st.session_state.current_page -= 1
                        st.experimental_rerun()
            with pagination_cols[1]:
                st.write(f"Page {st.session_state.current_page} of {st.session_state.total_pages}")
            with pagination_cols[2]:
                if st.session_state.current_page < st.session_state.total_pages:
                    if st.button("Next ⏭️"):
                        st.session_state.current_page += 1
                        st.experimental_rerun()
        else:
            st.write("No repositories found or an error occurred.")

    # --------------------- #
    #      Contact Tab      #
    # --------------------- #
    with tabs[2]:
        st.header("Contact Me")
        st.write("Feel free to reach out through any of the following methods:")
        st.write("- **Email:** [dhruvbaradiya@gmail.com](mailto:dhruvbaradiya@gmail.com)")
        st.write("- **Phone:** +1 737-296-4694")
        st.write("- **LinkedIn:** [linkedin.com/in/dhruvkamaleshkumar](https://www.linkedin.com/in/dhruvkamaleshkumar/)")
        st.write("- **GitHub:** [github.com/DB-25](https://github.com/DB-25)")

if __name__ == "__main__":
    main()
