from app.services.glossario import GLOSSARIO, BLURB_PLATAFORMA, texto_glossario


def test_glossario_cobre_termos_principais():
    for chave in ["dy_atual", "p_vp", "vacancia_fisica", "liquidez_diaria", "volatilidade_12m"]:
        assert chave in GLOSSARIO
        assert len(GLOSSARIO[chave]) > 10


def test_texto_glossario_inclui_definicoes():
    txt = texto_glossario()
    assert "Dividend Yield" in txt
    assert "P/VP" in txt


def test_blurb_menciona_a_plataforma():
    assert "scoring" in BLURB_PLATAFORMA.lower()
