from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer
from starlette.requests import Request
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.models.models import Usuario
from app.services.auth import AuthService

security = HTTPBearer()

async def get_current_user(
    request: Request,
    db: Session = Depends(get_db)
) -> Usuario:
    """Obtém usuário atual a partir do token JWT"""
    
    # Extrair token do header Authorization
    auth_header = request.headers.get("Authorization")
    
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token não fornecido",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = auth_header.split(" ")[1]
    
    payload = AuthService.verify_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    email: str = payload.get("sub")
    usuario = db.query(Usuario).filter(Usuario.email == email).first()
    
    if usuario is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário não encontrado",
        )
    
    if not usuario.ativo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuário inativo",
        )
    
    return usuario

def require_perfil(perfil_requerido: str):
    """Decorator para verificar perfil do usuário"""
    async def verificar_perfil(usuario: Usuario = Depends(get_current_user)):
        if usuario.perfil.nome != perfil_requerido and usuario.perfil.nome != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acesso restrito. Perfil '{perfil_requerido}' requerido",
            )
        return usuario
    
    return verificar_perfil