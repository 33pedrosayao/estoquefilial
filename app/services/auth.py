from datetime import datetime, timedelta
from typing import Optional

import bcrypt
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.models.models import Usuario
from app.config import SECRET_KEY

# Configuração de segurança
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8 horas

class AuthService:
    @staticmethod
    def hash_password(password: str) -> str:
        """Gera hash da senha usando bcrypt."""
        try:
            hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
            return hashed_password.decode('utf-8')
        except Exception as e:
            print(f"Erro ao gerar hash da senha: {e}")
            raise

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verifica se a senha em texto plano corresponde ao hash bcrypt."""
        try:
            return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
        except ValueError as e:
            print(f"Erro ao verificar senha (hash malformado ou inválido): {e}")
            return False
        except Exception as e:
            print(f"Erro inesperado ao verificar senha: {e}")
            return False

    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """Cria um token JWT de acesso."""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt

    @staticmethod
    def verify_token(token: str) -> Optional[dict]:
        """Verifica e decodifica um token JWT."""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            email: str = payload.get("sub")
            if email is None:
                return None
            return payload
        except JWTError:
            return None
        except Exception as e:
            print(f"Erro inesperado ao verificar token: {e}")
            return None

    @staticmethod
    def authenticate_user(db: Session, email: str, password: str) -> Optional[Usuario]:
        """Autentica um usuário com email e senha."""
        usuario = db.query(Usuario).filter(Usuario.email == email).first()
        
        if not usuario:
            return None
        
        if not AuthService.verify_password(password, usuario.senha_hash):
            return None
        
        # Atualiza o último acesso do usuário
        usuario.ultimo_acesso = datetime.utcnow()
        db.commit()
        db.refresh(usuario)
        
        return usuario