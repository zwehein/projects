import json
import random
import re
from pathlib import Path

import joblib
import matplotlib.pyplot as plt
import networkx as nx
import numpy as np
import pandas as pd
import streamlit as st

# Saved via notebook output: artifacts\\author_graph.joblib
GRAPH_PATH = Path(r"artifacts\author_graph.joblib")
AUTHOR_NAMES_PATH = Path(r"artifacts\author_names.json")
EMBEDDINGS_PATH = Path(r"artifacts\author_embeddings.npz")
EMBEDDING_META_PATH = Path(r"artifacts\author_embedding_index.joblib")
SUPER_CONNECTOR_MODEL_PATH = Path(r"artifacts\super_connector_model.joblib")

plt.style.use("seaborn-v0_8")


def normalize_author(name: str) -> str:
    cleaned = re.sub(r"\s+", " ", str(name).strip())
    return cleaned.title()


def format_path(
    graph: nx.Graph, path: list[int], auid_to_names: dict[int, list[str]]
) -> pd.DataFrame:
    rows = []
    for author_a, author_b in zip(path[:-1], path[1:]):
        papers = graph[author_a][author_b]["papers"]
        rows.append(
            {
                "from": format_author_label(author_a, auid_to_names),
                "to": format_author_label(author_b, auid_to_names),
                "sample_papers": ", ".join(papers[:3]),
                "shared_paper_count": len(papers),
            }
        )
    return pd.DataFrame(rows)


def resolve_author_input(
    raw_value: str,
    name_to_auids: dict[str, list[int]],
) -> tuple[int | None, str | None, list[int]]:
    cleaned = (raw_value or "").strip()
    if not cleaned:
        return None, None, []

    compact = re.sub(r"\s", "", cleaned)
    if compact.isdigit():
        return int(compact), cleaned, []

    normalized = normalize_author(cleaned)
    auids = name_to_auids.get(normalized, [])
    if not auids:
        return None, normalized, []
    return auids[0], normalized, auids


def derive_author_pool(graph_loaded: bool, metadata: dict | None) -> list[str]:
    suggestions = load_author_names()
    if suggestions:
        return suggestions
    if graph_loaded and metadata:
        return sorted(metadata["name_to_auids"].keys())
    return []


@st.cache_resource(show_spinner=False)
def load_graph() -> nx.Graph:
    if not GRAPH_PATH.exists():
        raise FileNotFoundError(
            f"Graph artifact not found at {GRAPH_PATH.resolve()}. Run the notebook to (re)generate it."
        )
    return joblib.load(GRAPH_PATH)

def load_author_names() -> list[str]:
    if not AUTHOR_NAMES_PATH.exists():
        return []
    try:
        names = json.loads(AUTHOR_NAMES_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return []
    return [normalize_author(name) for name in names]


def build_author_metadata(graph: nx.Graph) -> dict[str, dict]:
    auid_to_names_raw = graph.graph.get("auid_to_names", {}) or {}
    name_to_auids_raw = graph.graph.get("name_to_auids", {}) or {}

    auid_to_names: dict[int, list[str]] = {}
    for auid_str, names in auid_to_names_raw.items():
        try:
            auid = int(auid_str)
        except (TypeError, ValueError):
            continue
        cleaned = [normalize_author(name) for name in names]
        auid_to_names[auid] = cleaned or [f"AUID {auid}"]

    name_to_auids: dict[str, list[int]] = {}
    for name, auids in name_to_auids_raw.items():
        normalized = normalize_author(name)
        numeric_ids = sorted({int(auid) for auid in auids if str(auid).isdigit()})
        if numeric_ids:
            name_to_auids[normalized] = numeric_ids

    return {"auid_to_names": auid_to_names, "name_to_auids": name_to_auids}


@st.cache_resource(show_spinner=False)
def load_embeddings_bundle() -> dict | None:
    if not EMBEDDINGS_PATH.exists():
        return None
    data = np.load(EMBEDDINGS_PATH)
    embeddings = data["embeddings"].astype(np.float32)
    auids = data["auids"].astype(np.int64)
    cluster_labels = data.get("cluster_labels")
    norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
    normalized = embeddings / np.clip(norms, a_min=1e-9, a_max=None)
    index = {int(auid): idx for idx, auid in enumerate(auids)}
    cluster_counts = None
    if cluster_labels is not None:
        unique, counts = np.unique(cluster_labels, return_counts=True)
        cluster_counts = {int(label): int(count) for label, count in zip(unique, counts)}
    metadata = joblib.load(EMBEDDING_META_PATH) if EMBEDDING_META_PATH.exists() else {}
    return {
        "embeddings": embeddings,
        "normalized": normalized,
        "auids": auids,
        "cluster_labels": cluster_labels,
        "cluster_counts": cluster_counts,
        "index": index,
        "metadata": metadata,
    }


@st.cache_resource(show_spinner=False)
def load_super_connector_model() -> dict | None:
    if not SUPER_CONNECTOR_MODEL_PATH.exists():
        return None
    return joblib.load(SUPER_CONNECTOR_MODEL_PATH)


def compute_graph_insights(graph: nx.Graph) -> dict[str, pd.Series]:
    cached = st.session_state.get("graph_insights")
    if cached:
        return cached

    degree_values = pd.Series(dict(graph.degree()), name="degree")
    component_sizes = pd.Series(
        [len(component) for component in nx.connected_components(graph)],
        name="component_size",
    )
    edge_weights = pd.Series(
        nx.get_edge_attributes(graph, "weight"),
        name="collaborations",
    )

    insights = {
        "degree_values": degree_values,
        "component_sizes": component_sizes,
        "edge_weights": edge_weights,
    }
    st.session_state["graph_insights"] = insights
    return insights


graph_size_mb = GRAPH_PATH.stat().st_size / 1_048_576 if GRAPH_PATH.exists() else None


def ensure_graph_loaded(graph_size_hint: float | None) -> nx.Graph:
    if "author_graph" not in st.session_state:
        size_hint = f" (~{graph_size_hint:,.2f} MB)" if graph_size_hint else ""
        with st.spinner(f"Loading author graph{size_hint}. This can take a while..."):
            st.session_state["author_graph"] = load_graph()
            st.session_state.pop("graph_insights", None)
    if "author_metadata" not in st.session_state:
        st.session_state["author_metadata"] = build_author_metadata(
            st.session_state["author_graph"]
        )
    return st.session_state["author_graph"]

def refresh_author_samples(pool: list[str]) -> None:
    sample_size = min(20, len(pool))
    st.session_state["author_samples"] = (
        random.sample(pool, k=sample_size) if sample_size else []
    )


def pick_random_author(pool: list[str], exclude: str | None = None) -> str:
    if not pool:
        return ""
    choice = random.choice(pool)
    if exclude and len(pool) > 1:
        attempts = 0
        while choice == exclude and attempts < 10:
            choice = random.choice(pool)
            attempts += 1
    return choice


def format_author_label(auid: int, auid_to_names: dict[int, list[str]]) -> str:
    names = auid_to_names.get(auid, [])
    primary = names[0] if names else f"AUID {auid}"
    return f"{primary} ({auid})"


def render_overview_plots(insights: dict[str, pd.Series], auid_to_names: dict[int, list[str]]) -> None:
    degree_values = insights["degree_values"]
    component_sizes = insights["component_sizes"]
    edge_weights = insights["edge_weights"]

    fig, axes = plt.subplots(1, 2, figsize=(14, 5))
    axes[0].hist(degree_values, bins=60, color="#5B8FF9", edgecolor="white")
    axes[0].set_yscale("log")
    axes[0].set_title("Degree distribution (log scale)")
    axes[0].set_xlabel("Unique co-authors")
    axes[0].set_ylabel("Author count")

    top_components = component_sizes.sort_values(ascending=False).head(8)
    axes[1].bar(range(len(top_components)), top_components.values, color="#F6BD16")
    axes[1].set_xticks(range(len(top_components)))
    axes[1].set_xticklabels(
        [f"Comp {idx + 1}" for idx in range(len(top_components))], rotation=45
    )
    axes[1].set_title("Largest connected components")
    axes[1].set_ylabel("Author count")
    axes[1].grid(axis="y", linestyle="--", alpha=0.4)
    plt.tight_layout()
    st.pyplot(fig)

    if edge_weights.empty:
        st.info("Edge weights unavailable—run the notebook again to capture paper counts.")
        return

    top_edges = edge_weights.sort_values(ascending=False).head(10)
    edge_labels = [
        f"{format_author_label(a, auid_to_names)} ↔ {format_author_label(b, auid_to_names)}"
        for a, b in top_edges.index
    ]
    fig2, ax2 = plt.subplots(figsize=(10, 6))
    ax2.barh(edge_labels[::-1], top_edges.values[::-1], color="#61DDAA")
    ax2.set_title("Heaviest collaboration pairs")
    ax2.set_xlabel("Shared papers")
    ax2.grid(axis="x", linestyle="--", alpha=0.4)
    plt.tight_layout()
    st.pyplot(fig2)


def similarity_dataframe(
    idx: int,
    bundle: dict,
    auid_to_names: dict[int, list[str]],
    top_k: int = 5,
) -> pd.DataFrame:
    normalized = bundle["normalized"]
    scores = normalized @ normalized[idx]
    scores[idx] = -1
    candidate_count = min(top_k + 5, len(scores))
    top_indices = np.argpartition(scores, -candidate_count)[-candidate_count:]
    sorted_indices = top_indices[np.argsort(scores[top_indices])[::-1]]
    rows = []
    for candidate_idx in sorted_indices:
        candidate_auid = int(bundle["auids"][candidate_idx])
        if candidate_auid == int(bundle["auids"][idx]) or len(rows) >= top_k:
            continue
        rows.append(
            {
                "author": format_author_label(candidate_auid, auid_to_names),
                "similarity": float(scores[candidate_idx]),
                "cluster": (
                    int(bundle["cluster_labels"][candidate_idx])
                    if bundle.get("cluster_labels") is not None
                    else None
                ),
            }
        )
        if len(rows) >= top_k:
            break
    return pd.DataFrame(rows)


st.set_page_config(page_title="Scopus Six Degrees", page_icon="🕸️")

author_graph_state = st.session_state.get("author_graph")
metadata_state = st.session_state.get("author_metadata")
graph_loaded = author_graph_state is not None

author_pool = derive_author_pool(graph_loaded, metadata_state)

if "start_author_input" not in st.session_state:
    st.session_state.start_author_input = author_pool[0] if author_pool else ""
if "end_author_input" not in st.session_state:
    st.session_state.end_author_input = author_pool[1] if len(author_pool) > 1 else ""
if "author_samples" not in st.session_state:
    st.session_state.author_samples = []
if not author_pool:
    st.session_state.author_samples = []
elif not st.session_state.author_samples:
    refresh_author_samples(author_pool)

st.title("Scopus \"Six Degrees\" Explorer")
st.caption("Shortest unweighted paths across the co-authorship network.")

with st.expander("Network snapshots", expanded=graph_loaded):
    if graph_loaded:
        metadata_for_visuals = metadata_state or st.session_state.get("author_metadata")
        if metadata_for_visuals:
            insights = compute_graph_insights(author_graph_state)
            render_overview_plots(insights, metadata_for_visuals["auid_to_names"])
        else:
            st.info("Metadata not available yet—reload the graph to view charts.")
    elif GRAPH_PATH.exists():
        st.info("Load the author graph to unlock the overview charts.")
    else:
        st.info("Graph artifact missing. Re-run the notebook to regenerate it.")

graph_exists = GRAPH_PATH.exists()

with st.sidebar:
    st.subheader("Graph artifact")
    if graph_size_mb is not None:
        st.write(f"Artifact size: {graph_size_mb:,.2f} MB")
    st.write(f"Location: {GRAPH_PATH.resolve()}")
    if graph_loaded:
        st.write(
            f"Nodes: {author_graph_state.number_of_nodes():,} | Edges: {author_graph_state.number_of_edges():,}"
        )
        st.write(f"Source file: {author_graph_state.graph.get('source_file', 'unknown')}")
    elif graph_exists:
        st.info("Graph not loaded yet—use the button below to pull it into memory.")
    else:
        st.error("Graph artifact missing. Re-run the notebook to regenerate it.")

    with st.expander("Author suggestions", expanded=False):
        if st.session_state.get("author_samples"):
            st.write(", ".join(st.session_state["author_samples"]))
        else:
            st.write("No cached names yet. Rebuild the artifact to refresh the list.")
        if st.button(
            "🔄 Refresh samples",
            key="refresh_samples",
            disabled=not author_pool,
        ):
            refresh_author_samples(author_pool)

load_button = st.button(
    "Load author graph",
    disabled=graph_loaded or not graph_exists,
    help="Loads the serialized NetworkX graph into memory (one-time per session).",
)
if load_button and graph_exists:
    ensure_graph_loaded(graph_size_mb)
    st.success("Graph loaded and cached in this session.")
    st.rerun()

col_start, col_end = st.columns(2)
with col_start:
    st.text_input(
        "Start author (name or AUID)",
        key="start_author_input",
        placeholder="e.g. Alice Smith or 7006605664",
    )
    if st.button(
        "🎲 Random start",
        key="random_start",
        disabled=not author_pool,
    ):
        st.session_state.start_author_input = pick_random_author(
            author_pool, exclude=st.session_state.get("end_author_input")
        )
        st.rerun()
with col_end:
    st.text_input(
        "Target author (name or AUID)",
        key="end_author_input",
        placeholder="e.g. Bob Lee or 15071700400",
    )
    if st.button(
        "🎲 Random target",
        key="random_target",
        disabled=not author_pool,
    ):
        st.session_state.end_author_input = pick_random_author(
            author_pool, exclude=st.session_state.get("start_author_input")
        )
        st.rerun()

start_author = st.session_state.get("start_author_input", "")
end_author = st.session_state.get("end_author_input", "")

find_button = st.button("Find shortest path", disabled=not graph_exists)
if find_button:
    if not start_author or not end_author:
        st.warning("Please provide both author identifiers.")
    else:
        author_graph = ensure_graph_loaded(graph_size_mb)
        metadata = st.session_state["author_metadata"]
        name_to_auids = metadata["name_to_auids"]
        auid_to_names = metadata["auid_to_names"]

        source_auid, normalized_source, source_matches = resolve_author_input(
            start_author, name_to_auids
        )
        target_auid, normalized_target, target_matches = resolve_author_input(
            end_author, name_to_auids
        )

        if source_auid is None:
            st.error(f"Could not map '{start_author}' to a known author.")
        elif target_auid is None:
            st.error(f"Could not map '{end_author}' to a known author.")
        else:
            if source_matches and len(source_matches) > 1:
                st.info(
                    f"Input '{normalized_source}' matched multiple AUIDs {source_matches}; using {source_auid}."
                )
            if target_matches and len(target_matches) > 1:
                st.info(
                    f"Input '{normalized_target}' matched multiple AUIDs {target_matches}; using {target_auid}."
                )

            try:
                path = nx.shortest_path(
                    author_graph, source=source_auid, target=target_auid
                )
            except nx.NetworkXNoPath:
                st.error("These authors live in different components, so no path exists.")
            else:
                st.success(f"Found a path with {len(path) - 1} jumps.")
                chain = [format_author_label(node, auid_to_names) for node in path]
                st.write(" → ".join(chain))
                st.dataframe(
                    format_path(author_graph, path, auid_to_names),
                    use_container_width=True,
                )

st.divider()
with st.expander("AI collaborator insights (BERT + ML)", expanded=False):
    if not graph_exists:
        st.info("Graph artifact missing—run the notebook to rebuild everything.")
    else:
        embeddings_bundle = load_embeddings_bundle()
        if embeddings_bundle is None:
            st.warning(
                "Embeddings not found. Re-run the notebook's AI module cells to create "
                "`author_embeddings.npz`."
            )
        else:
            if "ai_author_input" not in st.session_state:
                st.session_state.ai_author_input = st.session_state.get(
                    "start_author_input", ""
                )
            st.text_input(
                "Author for AI insights (name or AUID)",
                key="ai_author_input",
                placeholder="e.g. 7006605664 or Alice Smith",
            )
            if st.button("Compute AI suggestions", key="ai_insights_button"):
                author_graph = ensure_graph_loaded(graph_size_mb)
                metadata = st.session_state["author_metadata"]
                name_to_auids = metadata["name_to_auids"]
                auid_to_names = metadata["auid_to_names"]

                source_auid, normalized_source, _ = resolve_author_input(
                    st.session_state.ai_author_input,
                    name_to_auids,
                )
                if source_auid is None:
                    st.error(
                        f"Could not map '{st.session_state.ai_author_input}' to an author."
                    )
                else:
                    index = embeddings_bundle["index"].get(source_auid)
                    if index is None:
                        st.warning(
                            "This author lacks an embedding (likely due to missing titles)."
                        )
                    else:
                        cluster_label = None
                        if embeddings_bundle.get("cluster_labels") is not None:
                            cluster_label = int(
                                embeddings_bundle["cluster_labels"][index]
                            )
                        cluster_counts = embeddings_bundle.get("cluster_counts") or {}
                        cluster_size = (
                            cluster_counts.get(cluster_label)
                            if cluster_label is not None
                            else None
                        )

                        st.markdown(
                            f"**Author:** {format_author_label(source_auid, auid_to_names)}"
                        )
                        col_info, col_prob = st.columns(2)
                        with col_info:
                            if cluster_label is not None and cluster_size:
                                st.metric(
                                    "Embedding cluster",
                                    f"Cluster {cluster_label}",
                                    help=f"Contains {cluster_size:,} authors",
                                )
                            else:
                                st.metric("Embedding cluster", "N/A")

                        model_bundle = load_super_connector_model()
                        if model_bundle:
                            probability = model_bundle["model"].predict_proba(
                                embeddings_bundle["embeddings"][index].reshape(1, -1)
                            )[0][1]
                            degree_value = author_graph.degree[source_auid]
                            threshold = model_bundle.get("threshold") or 0
                            verdict = (
                                "Above threshold"
                                if degree_value >= threshold
                                else "Below threshold"
                            )
                            with col_prob:
                                st.metric(
                                    "Super-connector probability",
                                    f"{probability:.1%}",
                                    help=(
                                        f"Actual degree {degree_value:,}; "
                                        f"threshold ≈ {int(threshold):,}"
                                    ),
                                )
                            st.caption(
                                f"Logistic regression flag: **{verdict}** compared to the "
                                "top-decile degree threshold."
                            )
                        else:
                            with col_prob:
                                st.metric("Super-connector probability", "Model missing")

                        similar_df = similarity_dataframe(
                            index, embeddings_bundle, auid_to_names, top_k=5
                        )
                        st.subheader("Closest semantic collaborators")
                        st.dataframe(similar_df, use_container_width=True)
