from pinecone import Pinecone, ServerlessSpec
from langchain_community.document_loaders.csv_loader import CSVLoader
from langchain_community.embeddings.openai import OpenAIEmbeddings
from config.settings import PINECONE_API_KEY, PINECONE_ENVIRONMENT, PINECONE_INDEX_NAME, OPENAI_API_KEY
import logging

def initialize_pinecone():
    try:
        pc = Pinecone(api_key=PINECONE_API_KEY)
        spec = ServerlessSpec(cloud="aws", region=PINECONE_ENVIRONMENT)
        
        if PINECONE_INDEX_NAME not in pc.list_indexes().names():
            pc.create_index(name=PINECONE_INDEX_NAME, dimension=3072, spec=spec)
        
        return pc.Index(PINECONE_INDEX_NAME)
    except Exception as e:
        logging.error(f"Error initializing Pinecone: {str(e)}")
        raise

def load_documents():
    try:
        loader = CSVLoader(file_path="ME.csv")
        return loader.load()
    except Exception as e:
        logging.error(f"Error loading documents: {str(e)}")
        raise

def get_embeddings():
    try:
        return OpenAIEmbeddings(
            api_key=OPENAI_API_KEY,
            model="text-embedding-3-large"
        )
    except Exception as e:
        logging.error(f"Error getting embeddings: {str(e)}")
        raise

def load_to_pinecone(index, documents, embeddings):
    try:
        existing_ids = {match.id for match in index.query(vector=[0] * 3072, top_k=1).matches}
        if existing_ids:
            print("Data already exists in Pinecone. Skipping upload.")
            return

        docs_content = [doc.page_content for doc in documents]
        embeddings_list = embeddings.embed_documents(docs_content)
        
        vectors_to_upsert = [
            (str(i), embedding, {"content": content}) 
            for i, (embedding, content) in enumerate(zip(embeddings_list, docs_content))
        ]
        
        index.upsert(vectors=vectors_to_upsert)
    except Exception as e:
        logging.error(f"Error loading to Pinecone: {str(e)}")
        raise

def retrieve_info(index, embeddings, query: str) -> str:
    """Retrieve information from Pinecone index."""
    try:
        query_embedding = embeddings.embed_query(query)
        result = index.query(
            vector=query_embedding,
            top_k=4,
            include_metadata=True
        )
        page_contents_array = [match['metadata']['content'] for match in result['matches']]
        return "\n".join(page_contents_array)
    except Exception as e:
        logging.error(f"Error retrieving info: {str(e)}")
        return "I apologize, I encountered an error while retrieving the information." 