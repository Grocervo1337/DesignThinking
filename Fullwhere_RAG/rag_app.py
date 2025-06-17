import os
import sys
import time
from dotenv import load_dotenv

from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_community.vectorstores import OpenSearchVectorSearch
from langchain_community.document_loaders import UnstructuredMarkdownLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.chains import RetrievalQA
from opensearchpy import (
    OpenSearch,
    RequestsHttpConnection,
    exceptions as opensearch_exceptions,
)
from flask import Flask, request, jsonify
from flask_cors import CORS

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENSEARCH_URL = os.getenv("OPENSEARCH_URL")
INDEX_NAME = os.getenv("INDEX_NAME")

if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY non trouvé dans les variables d'environnement.")
if not OPENSEARCH_URL:
    raise ValueError("OPENSEARCH_URL non trouvé dans les variables d'environnement.")
if not INDEX_NAME:
    raise ValueError("INDEX_NAME non trouvé dans les variables d'environnement.")

DATA_PATH = "./data"

embeddings_model = OpenAIEmbeddings(
    model="text-embedding-3-large", openai_api_key=OPENAI_API_KEY
)
llm = ChatOpenAI(
    model_name="gpt-4.1-2025-04-14", temperature=0, openai_api_key=OPENAI_API_KEY
)


def get_opensearch_client():
    """Crée et retourne un client OpenSearch."""
    client = OpenSearch(
        hosts=[OPENSEARCH_URL],
        http_auth=None,
        use_ssl=OPENSEARCH_URL.startswith("https"),
        verify_certs=False,
        ssl_assert_hostname=False,
        ssl_show_warn=False,
        connection_class=RequestsHttpConnection,
    )
    return client


def wait_for_opensearch(client, timeout=120):
    """Attend qu'OpenSearch soit disponible."""
    start_time = time.time()
    print("Attente d'OpenSearch...")
    while time.time() - start_time < timeout:
        try:
            if client.ping():
                print("OpenSearch est disponible.")
                return True
            time.sleep(5)
        except opensearch_exceptions.ConnectionError:
            print("Connexion à OpenSearch échouée, nouvelle tentative dans 5s...")
            time.sleep(5)
        except Exception as e:
            print(f"Erreur inattendue lors de la connexion à OpenSearch: {e}")
            time.sleep(5)
    print("Timeout: OpenSearch n'est pas disponible après", timeout, "secondes.")
    return False


def create_index_if_not_exists(client):
    """Crée l'index avec le mapping k-NN si il n'existe pas."""
    if not client.indices.exists(index=INDEX_NAME):
        index_body = {
            "settings": {
                "index.knn": True,
                "index.knn.space_type": "cosinesimil",
            },
            "mappings": {
                "properties": {
                    "text": {"type": "text"},
                    "metadata": {"type": "object", "enabled": False},
                    "vector_field": {
                        "type": "knn_vector",
                        "dimension": 3072,
                        "method": {
                            "name": "hnsw",
                            "space_type": "innerproduct",
                            "engine": "faiss",
                            "parameters": {"ef_construction": 128, "m": 24},
                        },
                    },
                }
            },
        }
        try:
            client.indices.create(index=INDEX_NAME, body=index_body)
            print(f"Index '{INDEX_NAME}' créé avec succès.")
        except opensearch_exceptions.RequestError as e:
            if e.error == "resource_already_exists_exception":
                print(f"Index '{INDEX_NAME}' existe déjà.")
            else:
                print(
                    f"Erreur lors de la création de l'index: {e.info['error']['root_cause']}"
                )
                raise
    else:
        print(f"Index '{INDEX_NAME}' existe déjà.")


def ingest_data():
    """Charge, découpe, vectorise et ingère les documents Markdown dans OpenSearch."""
    print("Démarrage de l'ingestion des données...")
    client = get_opensearch_client()
    if not wait_for_opensearch(client):
        sys.exit("Impossible de se connecter à OpenSearch. Arrêt de l'ingestion.")

    create_index_if_not_exists(client)

    documents = []
    for filename in os.listdir(DATA_PATH):
        if filename.endswith(".md"):
            file_path = os.path.join(DATA_PATH, filename)
            print(f"Chargement de {file_path}...")
            loader = UnstructuredMarkdownLoader(file_path)
            documents.extend(loader.load())

    if not documents:
        print("Aucun document Markdown trouvé dans le dossier Data.")
        return

    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    split_docs = text_splitter.split_documents(documents)

    print(f"Nombre de documents chargés: {len(documents)}")
    print(f"Nombre de chunks créés après découpage: {len(split_docs)}")

    opensearch_vector_store = OpenSearchVectorSearch(
        opensearch_url=OPENSEARCH_URL,
        index_name=INDEX_NAME,
        embedding_function=embeddings_model,
        http_auth=None,
        use_ssl=OPENSEARCH_URL.startswith("https"),
        verify_certs=False,
        ssl_assert_hostname=False,
        ssl_show_warn=False,
        bulk_size=1000,
        timeout=60,
        engine="faiss",
    )

    print(f"Ingestion des chunks dans l'index '{INDEX_NAME}'...")
    opensearch_vector_store.add_documents(split_docs, bulk_size=1000)
    print("Ingestion terminée.")


def query_rag(user_query: str):
    """Interroge le RAG et retourne la réponse sourcée."""
    print(f"\nRequête: {user_query}")
    client = get_opensearch_client()
    if not wait_for_opensearch(client):
        return {"error": "Impossible de se connecter à OpenSearch."}

    if not client.indices.exists(index=INDEX_NAME):
        return {
            "error": f"L'index '{INDEX_NAME}' n'existe pas. Veuillez d'abord ingérer des données."
        }

    vector_store = OpenSearchVectorSearch(
        index_name=INDEX_NAME,
        embedding_function=embeddings_model,
        opensearch_url=OPENSEARCH_URL,
        http_auth=None,
        use_ssl=OPENSEARCH_URL.startswith("https"),
        verify_certs=False,
        ssl_assert_hostname=False,
        ssl_show_warn=False,
    )

    retriever = vector_store.as_retriever(search_kwargs={"k": 3})

    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",
        retriever=retriever,
        return_source_documents=True,
    )

    print("Génération de la réponse...")
    response = qa_chain.invoke({"query": user_query})

    sources = []
    if response.get("source_documents"):
        for doc in response["source_documents"]:
            source_info = {"content": doc.page_content}
            if "source" in doc.metadata:
                source_info["file"] = doc.metadata["source"]
            sources.append(source_info)

    return {"answer": response.get("result"), "sources": sources}


app = Flask(__name__)
CORS(app)


@app.route("/query", methods=["POST"])
def handle_query():
    data = request.get_json()
    user_query = data.get("query")
    if not user_query:
        return jsonify({"error": "La requête ne peut pas être vide."}), 400

    result = query_rag(user_query)
    if "error" in result:
        return jsonify(result), 500
    return jsonify(result)


@app.route("/ingest", methods=["POST"])
def handle_ingest():
    try:
        ingest_data()
        return jsonify({"status": "Ingestion terminée avec succès."})
    except Exception as e:
        return jsonify({"error": f"Erreur pendant l'ingestion: {str(e)}"}), 500


if __name__ == "__main__":
    # L'ingestion initiale peut être lancée via une requête POST sur /ingest
    app.run(host="0.0.0.0", port=5001)
