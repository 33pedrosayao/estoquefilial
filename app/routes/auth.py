from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta
from app.database.connection import get_db
from app.models.models import Usuario, Perfil
from app.services.auth import AuthService, ACCESS_TOKEN_EXPIRE_MINUTES
from app.schemas.auth import LoginRequest, TokenResponse, UsuarioCreate, UsuarioResponse, UsuarioUpdate
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/api/auth", tags=["autenticação"])

# ===== LOGIN =====
@router.post("/login", response_model=TokenResponse)
def login(credenciais: LoginRequest, db: Session = Depends(get_db)):
    """Autentica usuário e retorna JWT token"""
    usuario = AuthService.authenticate_user(db, credenciais.email, credenciais.senha)

    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos",
        )

    if not usuario.ativo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuário inativo",
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = AuthService.create_access_token(
        data={"sub": usuario.email, "perfil": usuario.perfil.nome},
        expires_delta=access_token_expires
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "usuario": {
            "id": usuario.id,
            "nome": usuario.nome,
            "email": usuario.email,
            "perfil_id": usuario.perfil_id,
            "ativo": usuario.ativo,
            "perfil": {
                "id": usuario.perfil.id,
                "nome": usuario.perfil.nome
            }
        }
    }

# ===== REGISTRAR NOVO USUÁRIO =====
@router.post("/registrar", response_model=UsuarioResponse)
def registrar_usuario(
    usuario_data: UsuarioCreate,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(get_current_user)
):
    """Cria novo usuário (apenas admin)"""
    # Verificar se usuário atual é admin
    if usuario_atual.perfil.nome != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas administradores podem criar usuários",
        )
    
    # Verificar se email já existe
    usuario_existente = db.query(Usuario).filter(
        Usuario.email == usuario_data.email
    ).first()
    
    if usuario_existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email já cadastrado",
        )
    
    # Criar novo usuário
    novo_usuario = Usuario(
        nome=usuario_data.nome,
        email=usuario_data.email,
        senha_hash=AuthService.hash_password(usuario_data.senha),
        perfil_id=usuario_data.perfil_id,
        ativo=True
    )
    
    db.add(novo_usuario)
    db.commit()
    db.refresh(novo_usuario)
    
    return novo_usuario

# ===== LISTAR USUÁRIOS =====
@router.get("/usuarios", response_model=list[UsuarioResponse])
def listar_usuarios(
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(get_current_user)
):
    """Lista todos os usuários (apenas admin)"""
    if usuario_atual.perfil.nome != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas administradores podem listar usuários",
        )
    
    usuarios = db.query(Usuario).all()
    return usuarios

# ===== OBTER USUÁRIO ATUAL =====
@router.get("/me", response_model=UsuarioResponse)
def obter_usuario_atual(usuario: Usuario = Depends(get_current_user)):
    """Obtém dados do usuário autenticado"""
    return usuario

# ===== ATUALIZAR USUÁRIO =====
@router.put("/usuarios/{usuario_id}", response_model=UsuarioResponse)
def atualizar_usuario(
    usuario_id: int,
    usuario_update: UsuarioUpdate,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(get_current_user)
):
    """Atualiza dados do usuário (admin ou próprio usuário)"""
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado",
        )
    
    # Verificar permissões
    if usuario_atual.perfil.nome != "admin" and usuario_atual.id != usuario_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não tem permissão para atualizar este usuário",
        )
    
    # Atualizar campos
    if usuario_update.nome:
        usuario.nome = usuario_update.nome
    if usuario_update.email:
        usuario.email = usuario_update.email
    if usuario_update.perfil_id:
        usuario.perfil_id = usuario_update.perfil_id
    if usuario_update.ativo is not None:
        usuario.ativo = usuario_update.ativo
    
    db.commit()
    db.refresh(usuario)
    
    return usuario

# ===== DELETAR USUÁRIO =====
@router.delete("/usuarios/{usuario_id}")
def deletar_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(get_current_user)
):
    """Deleta usuário (apenas admin)"""
    if usuario_atual.perfil.nome != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas administradores podem deletar usuários",
        )
    
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado",
        )
    
    db.delete(usuario)
    db.commit()
    
    return {"mensagem": "Usuário deletado com sucesso"}