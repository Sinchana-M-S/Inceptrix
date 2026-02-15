import os
import numpy as np
from reggenai.embeddings import EmbeddingsProvider


class DummySTModel:
    def __init__(self):
        self.calls = 0

    def encode(self, texts, show_progress_bar=False, convert_to_numpy=True):
        self.calls += 1
        return np.array([[len(t), 1.0, 2.0] for t in texts], dtype='float32')


class DummyOpenAI:
    def __init__(self):
        self.calls = 0

    def Embedding_create(self, input, model):
        # simulate openai response structure
        self.calls += 1
        return {"data": [{"embedding": [float(len(t)), 0.5, 0.25] for t in input}]}


def test_sentence_transformer_fallback_and_cache(tmp_path, monkeypatch):
    cache = tmp_path / "emb.db"
    model = DummySTModel()
    # monkeypatch SentenceTransformer creation
    monkeypatch.setattr('reggenai.embeddings.SentenceTransformer', lambda name: model)

    ep = EmbeddingsProvider(model_name="dummy", cache_path=str(cache))
    ep.clear_cache()  # clear any existing cache
    # first call should invoke model.encode
    a = ep.embed_texts(["hello", "world"])
    assert a.shape == (2, 3)
    assert model.calls == 1
    # second call should hit cache and not call encode
    b = ep.embed_texts(["hello", "world"])
    assert model.calls == 1
    assert np.allclose(a, b)
    # clearing cache should cause the model to be called again
    ep.clear_cache()
    c = ep.embed_texts(["hello", "world"])
    assert model.calls == 2
    assert np.allclose(a, c)


def test_openai_embeddings_called(monkeypatch, tmp_path):
    cache = tmp_path / "emb-openai.db"

    class FakeOpenAI:
        def __init__(self):
            self.calls = 0

        def Embedding_create(self, input, model):
            self.calls += 1
            return {"data": [{"embedding": [float(len(t)), 0.1, 0.2] for t in input}]}

    fake = FakeOpenAI()

    # patch openai.Embedding.create to use our fake
    import reggenai.embeddings as mod

    monkeypatch.setenv('OPENAI_API_KEY', 'testkey')
    monkeypatch.setenv('USE_OPENAI_EMBEDDINGS', 'true')

    monkeypatch.setattr(mod.openai, 'Embedding', type('E', (), {'create': staticmethod(lambda input, model: fake.Embedding_create(input, model))}))

    ep = EmbeddingsProvider(cache_path=str(cache))
    arr = ep.embed_texts(["a", "ab"])
    assert arr.shape == (2, 3)
    assert np.allclose(arr[0], [1.0, 0.1, 0.2])
    assert np.allclose(arr[1], [2.0, 0.1, 0.2])

    # cached now
    arr2 = ep.embed_texts(["a", "ab"])
    assert fake.calls == 1
