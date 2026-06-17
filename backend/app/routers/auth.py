from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.usuario import Usuario
from app.repositories.usuario_repository import UsuarioRepository
from app.utils.security import (
    criar_access_token,
    get_current_user,
    hash_senha,
    verificar_senha,
)

router = APIRouter(prefix="/auth", tags=["auth"])


class RegistroIn(BaseModel):
    nome: str | None = Field(default=None, max_length=120)
    email: EmailStr
    senha: str = Field(min_length=8, max_length=72)


class LoginIn(BaseModel):
    email: EmailStr
    senha: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UsuarioOut(BaseModel):
    id: int
    email: str
    nome: str | None = None

    model_config = {"from_attributes": True}


@router.post("/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
def register(body: RegistroIn, db: Session = Depends(get_db)) -> TokenOut:
    """Cria um usuário e já retorna o token (auto-login)."""
    repo = UsuarioRepository(db)
    if repo.buscar_por_email(body.email) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="E-mail já cadastrado")
    nome = body.nome.strip() if body.nome and body.nome.strip() else None
    usuario = repo.criar(email=body.email, senha_hash=hash_senha(body.senha), nome=nome)
    return TokenOut(access_token=criar_access_token(str(usuario.id)))


@router.post("/login", response_model=TokenOut)
def login(body: LoginIn, db: Session = Depends(get_db)) -> TokenOut:
    """Autentica por e-mail e senha; mensagem genérica em falha."""
    usuario = UsuarioRepository(db).buscar_por_email(body.email)
    if usuario is None or not verificar_senha(body.senha, usuario.senha_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais inválidas")
    return TokenOut(access_token=criar_access_token(str(usuario.id)))


@router.get("/me", response_model=UsuarioOut)
def me(usuario: Usuario = Depends(get_current_user)) -> UsuarioOut:
    """Retorna o usuário autenticado."""
    return UsuarioOut.model_validate(usuario)
