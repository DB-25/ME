# ME - 🤖 Generative AI-Powered Interactive App

An advanced interactive application leveraging cutting-edge Generative AI technologies to provide personalized responses and insights about **Dhruv Kamalesh Kumar**. The app employs an AI agent architecture with plans for further integrations, utilizes a Retrieval-Augmented Generation (RAG) function, and integrates with Pinecone for vector similarity search.

**🌐 Live Demo**: [https://dhruvkamaleshkumar.streamlit.app/](https://dhruvkamaleshkumar.streamlit.app/)

## 📖 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Technologies Used](#-technologies-used)
- [Installation](#-installation)
- [Usage](#-usage)
- [Configuration](#-configuration)
- [Project Structure](#-project-structure)
- [Future Plans](#-future-plans)
- [Contributing](#-contributing)
- [License](#-license)
- [Contact](#-contact)

## ✨ Features

- **AI Agent Architecture**: Utilizes an AI agent to handle complex tasks, reasoning, and decision-making for generating responses.
- **Retrieval-Augmented Generation (RAG)**: Combines retrieved documents with generative models to produce contextually relevant answers.
- **Pinecone Integration**: Employs Pinecone as a vector database for efficient similarity search and retrieval of relevant information.
- **Interactive Q&A**: Users can ask questions and receive AI-generated responses based on Dhruv's professional background and experiences.
- **Dynamic Projects Showcase**: Fetches GitHub repositories dynamically and groups them based on AI-driven keyword analysis.
- **Modern UI**: Features a sleek, responsive user interface built with Streamlit, including navigation, profile highlights, and contact options.
- **Resume Download**: Allows users to download Dhruv's resume directly from the app.

## 🛠️ Architecture

The application's architecture is designed around an AI agent that orchestrates various components to provide intelligent and context-aware responses.

### Components:

1. **User Interface (Streamlit)**: Provides an interactive and user-friendly interface for users to engage with the app.
2. **AI Agent (LangChain + OpenAI GPT-4)**:
   - Utilizes [LangChain](https://github.com/hwchase17/langchain) to manage interactions and reasoning with the language model.
   - Employs OpenAI's GPT-4 for generating coherent and contextually relevant responses.
3. **Retrieval-Augmented Generation (RAG)**:
   - Retrieves relevant documents from a knowledge base using semantic search.
   - Enhances the generation process by providing the language model with pertinent context.
4. **Pinecone Vector Database**:
   - Stores embeddings of documents and enables fast similarity searches.
   - Integrates with the AI agent to supply relevant information for RAG.
5. **GitHub Integration**:
   - Fetches repositories using the GitHub API.
   - Analyzes repository data to group projects dynamically.

### Data Flow:

- **User Input**: Users input questions or interact with the app.
- **AI Agent Processing**:
  - The agent interprets the input and determines the necessary actions.
  - If required, it retrieves relevant documents using Pinecone.
- **RAG Functionality**:
  - Combines retrieved information with the language model's capabilities to generate responses.
- **Response Generation**: The AI agent produces a final response, which is displayed to the user.

## 🚀 Technologies Used

- **[Streamlit](https://streamlit.io/)**: For building the interactive web application.
- **[OpenAI GPT-4](https://openai.com/)**: As the core language model for generating AI responses.
- **[LangChain](https://github.com/hwchase17/langchain)**: To structure the AI agent's reasoning and interaction with the language model.
- **[Pinecone](https://www.pinecone.io/)**: A vector database for efficient storage and retrieval of embeddings.
- **[GitHub API](https://docs.github.com/en/rest)**: For dynamic fetching and analysis of repositories.
- **[Retrieval-Augmented Generation (RAG)](https://www.pinecone.io/learn/retrieval-augmented-generation/)**: To enhance responses with relevant, retrieved information.

## 📥 Installation

### Prerequisites

- Python 3.7 or higher
- OpenAI API key
- Pinecone API key and environment
- GitHub Personal Access Token (optional, for higher API rate limits)

### Clone the Repository

```bash
git clone https://github.com/DB-25/ME.git
cd ME
```

### Create a Virtual Environment

```bash
python -m venv venv
source venv/bin/activate  # On Windows use `venv\Scripts\activate`
```

### Install Dependencies

```bash
pip install -r requirements.txt
```

### Set Up Environment Variables

Create a `.env` file in the root directory and add your API keys:

```env
OPENAI_API_KEY=your_openai_api_key
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_ENVIRONMENT=your_pinecone_environment
GITHUB_TOKEN=your_github_token  # Optional
```

### Prepare Required Files

- Place your `resume.pdf` and `memoji.png` in the root directory.
- Ensure you have the `ME.csv` file with your documents for the RAG function.

## 🎮 Usage

Run the Streamlit app:

```bash
streamlit run app.py
```

Navigate to `http://localhost:8501` in your web browser to access the app.

**🌐 Or visit the live demo**: [https://dhruvkamaleshkumar.streamlit.app/](https://dhruvkamaleshkumar.streamlit.app/)

## ⚙️ Configuration

- **OpenAI Model**: The app uses `gpt-4-1106-preview`. You can change the model in the code if needed.
- **GitHub Username**: Update the `github_username` variable in the `main()` function to match your GitHub username.
- **Grouping Keywords**: Modify the `group_keywords` dictionary to customize how projects are grouped.
- **AI Agent Settings**: Adjust the `temperature` and other parameters in the `ChatOpenAI` initialization for different response behaviors.

## 📁 Project Structure

- `app.py`: The main application script containing the Streamlit app and AI agent logic.
- `requirements.txt`: Lists all Python dependencies.
- `ME.csv`: Contains documents used in the RAG process.
- `resume.pdf`: Dhruv's resume available for download.
- `memoji.png`: Profile image displayed in the app.

## 🔮 Future Plans

- **Integrate Additional AI Models**: Plan to incorporate other models like GPT-4 with plugins for enhanced capabilities.
- **Expand RAG Functionality**: Improve document retrieval methods and integrate more extensive knowledge bases.
- **Enhance AI Agent**: Implement more complex reasoning and decision-making processes within the AI agent architecture.
- **Add Chat History**: Allow users to view and interact with past conversations.
- **Deploy to Cloud Platforms**: Host the app on platforms like AWS or Heroku for broader accessibility.
- **User Authentication**: Implement login functionality for personalized experiences.

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request for any enhancements, bug fixes, or suggestions.

## 📄 License

This project is licensed under the MIT License.

## 📬 Contact

- **Email**: [dhruvbaradiya@gmail.com](mailto:dhruvbaradiya@gmail.com)
- **LinkedIn**: [linkedin.com/in/dhruvkamaleshkumar](https://www.linkedin.com/in/dhruvkamaleshkumar/)
- **GitHub**: [github.com/DB-25](https://github.com/DB-25)
