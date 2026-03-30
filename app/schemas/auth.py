from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional

# ===== PERFIL =====
class PerfilResponse(BaseModel):
    id: int
    nome: str
    
    class Config:
        from_attributes = True

# ===== USUÁRIO =====
class UsuarioBase(BaseModel):
    nome: str = Field(..., min_length=1, max_length=150)
    email: EmailStr

class UsuarioCreate(UsuarioBase):
    senha: str = Field(..., min_length=8, max_length=100)
    perfil_id: int

class UsuarioUpdate(BaseModel):
    nome: Optional[str] = None
    email: Optional[EmailStr] = None
    perfil_id: Optional[int] = None
    ativo: Optional[bool] = None

class UsuarioResponse(UsuarioBase):
    id: int
    perfil_id: int
    ativo: bool
    criado_em: datetime
    atualizado_em: Optional[datetime] = None
    perfil: PerfilResponse
    
    class Config:
        from_attributes = True

# ===== AUTENTICAÇÃO =====
class LoginRequest(BaseModel):
    email: EmailStr
    senha: str = Field(..., min_length=1)

class TokenUsuarioResponse(BaseModel):
    id: int
    nome: str
    email: EmailStr
    perfil_id: int
    ativo: bool
    perfil: PerfilResponse

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    usuario: TokenUsuarioResponse