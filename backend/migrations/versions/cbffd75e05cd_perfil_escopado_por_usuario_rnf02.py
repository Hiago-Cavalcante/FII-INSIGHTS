"""perfil escopado por usuario rnf02

Revision ID: cbffd75e05cd
Revises: 2e5d637d57ae
Create Date: 2026-06-20 20:36:18.938088

Torna o perfil do investidor escopado por dono (RNF-02′): adiciona usuario_id
(FK NOT NULL, unique). O perfil era global ("perfil-unico"), sem dono, então
os registros órfãos são descartados — cada usuário recria o seu na primeira
visita com o default 'moderado'. batch_alter_table para portabilidade SQLite+Postgres.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cbffd75e05cd'
down_revision: Union[str, Sequence[str], None] = '2e5d637d57ae'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_FK_NAME = "fk_perfis_investidor_usuario_id_usuarios"


def upgrade() -> None:
    """Upgrade schema."""
    # Perfis sem dono (o antigo perfil global) não podem ganhar usuario_id NOT NULL.
    op.execute("DELETE FROM perfis_investidor")
    with op.batch_alter_table("perfis_investidor", schema=None) as batch_op:
        batch_op.add_column(sa.Column("usuario_id", sa.Integer(), nullable=False))
        batch_op.create_index(
            batch_op.f("ix_perfis_investidor_usuario_id"), ["usuario_id"], unique=True
        )
        batch_op.create_foreign_key(_FK_NAME, "usuarios", ["usuario_id"], ["id"])


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table("perfis_investidor", schema=None) as batch_op:
        batch_op.drop_constraint(_FK_NAME, type_="foreignkey")
        batch_op.drop_index(batch_op.f("ix_perfis_investidor_usuario_id"))
        batch_op.drop_column("usuario_id")
