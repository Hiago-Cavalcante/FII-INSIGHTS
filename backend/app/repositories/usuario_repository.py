from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.usuario import Usuario


class UsuarioRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def criar(self, email: str, senha_hash: str, nome: str | None = None) -> Usuario:
        """Persiste um novo usuário e retorna a instância atualizada."""
        usuario = Usuario(email=email, senha_hash=senha_hash, nome=nome)
        self.db.add(usuario)
        self.db.commit()
        self.db.refresh(usuario)
        return usuario

    def buscar_por_email(self, email: str) -> Usuario | None:
        """Retorna o usuário com o e-mail informado, ou None se não existir."""
        return self.db.scalar(select(Usuario).where(Usuario.email == email))

    def buscar_por_id(self, id: int) -> Usuario | None:
        """Retorna o usuário pelo ID primário, ou None se não existir."""
        return self.db.get(Usuario, id)
