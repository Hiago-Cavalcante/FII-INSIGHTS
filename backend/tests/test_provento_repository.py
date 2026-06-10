from datetime import date
from decimal import Decimal

from app.models.fundo import Fundo
from app.repositories.provento_repository import ProventoRepository


def _fundo(db) -> int:
    f = Fundo(ticker="HGLG11", nome="CSHG Log", classe="FII")
    db.add(f)
    db.flush()
    return f.id


def test_upsert_cria_e_atualiza_sem_duplicar(db_session):
    repo = ProventoRepository(db_session)
    fid = _fundo(db_session)
    repo.upsert(fundo_id=fid, data_com=date(2026, 5, 29), tipo="rendimento",
                data_pagamento=date(2026, 6, 15), valor_por_cota=Decimal("1.10"))
    # mesma chave (fundo, data_com, tipo) → atualiza, não duplica
    repo.upsert(fundo_id=fid, data_com=date(2026, 5, 29), tipo="rendimento",
                data_pagamento=date(2026, 6, 16), valor_por_cota=Decimal("1.20"))
    proventos = repo.listar_por_fundo(fid)
    assert len(proventos) == 1
    assert proventos[0].valor_por_cota == Decimal("1.20")
    assert proventos[0].data_pagamento == date(2026, 6, 16)


def test_listar_por_fundo_ordena_por_data_com_desc(db_session):
    repo = ProventoRepository(db_session)
    fid = _fundo(db_session)
    repo.upsert(fundo_id=fid, data_com=date(2026, 4, 30), tipo="rendimento",
                data_pagamento=date(2026, 5, 15), valor_por_cota=Decimal("1.00"))
    repo.upsert(fundo_id=fid, data_com=date(2026, 5, 29), tipo="rendimento",
                data_pagamento=date(2026, 6, 15), valor_por_cota=Decimal("1.10"))
    datas = [p.data_com for p in repo.listar_por_fundo(fid)]
    assert datas == [date(2026, 5, 29), date(2026, 4, 30)]
