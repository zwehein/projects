# AI-Powered Academic Collaboration Network

An interactive “six degrees” explorer for academic research. Starting from Scopus publication records, the project builds a co-authorship network and combines graph analysis with language-model embeddings to help users discover connections between researchers.

## What it does

- Builds a co-author graph from `scopus_data_updated.csv`, with publication titles attached to collaborations.
- Finds shortest collaboration paths between author names.
- Encodes author publication titles with `sentence-transformers/all-MiniLM-L6-v2` and recommends semantically related researchers.
- Trains a logistic regression model to estimate whether an author is a high-degree “super-connector.”
- Presents path exploration and AI insights in a Streamlit app.

## Built with

Python · pandas · NetworkX · sentence-transformers · scikit-learn · Streamlit

## Run locally

Create a Python environment, install the listed packages, and prepare the project artifacts by running the notebook:

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
python -m pip install -r requirements.txt
```

Run `finalproj-nx.ipynb` from top to bottom to build the graph, author metadata, embeddings, and classifier in `artifacts/`. The source Scopus CSV must be available at the project root. Then start the app:

```bash
streamlit run streamlit_app.py
```

## Main files

- `finalproj-nx.ipynb` — data processing, network analysis, embeddings, and model preparation.
- `streamlit_app.py` — interactive author path and AI insights interface.
- `requirements.txt` — Python dependencies.
- `artifacts/` — generated graph, author metadata, embeddings, and model files.

Generated artifacts are created by the notebook; regenerate them after changing the source data. The embedding model may require a first-run download.
