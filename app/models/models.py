from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Enum, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from app.database.connection import Base

# ===== ENUMS =====
class TipoMovimentacao(str, enum.Enum):
    entrada = "entrada"
    saida = "saida"

class TipoAlerta(str, enum.Enum):
    estoque_baixo = "estoque_baixo"
    fora_de_estoque = "fora_de_estoque"

# ===== TABELAS =====
class Categoria(Base):
    __tablename__ = "categoria"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100), unique=True, nullable=False)
    descricao = Column(Text, nullable=True)
    criado_em = Column(DateTime, default=datetime.utcnow)

    itens = relationship("Item", back_populates="categoria")

class Item(Base):
    __tablename__ = "itens"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(150), nullable=False)
    categoria_id = Column(Integer, ForeignKey("categoria.id"), nullable=False)
    quantidade_atual = Column(Integer, default=0)
    quantidade_minima = Column(Integer, default=5)
    unidade = Column(String(20), default="unidade")
    ativo = Column(Boolean, default=True, index=True)
    criado_em = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    categoria = relationship("Categoria", back_populates="itens")
    movimentacoes = relationship("Movimentacao", back_populates="item")
    alertas = relationship("Alerta", back_populates="item")

class Movimentacao(Base):
    __tablename__ = "movimentacoes"
    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("itens.id"), nullable=False)
    tipo = Column(Enum(TipoMovimentacao), nullable=False)
    quantidade = Column(Integer, nullable=False)
    motivo = Column(String(200), nullable=True)
    usuario = Column(String(100), nullable=True)
    data_movimentacao = Column(DateTime, default=datetime.utcnow)
    observacoes = Column(Text, nullable=True)

    item = relationship("Item", back_populates="movimentacoes")

class Alerta(Base):
    __tablename__ = "alertas"
    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("itens.id"), nullable=False)
    tipo_alerta = Column(Enum(TipoAlerta), nullable=False)
    ativo = Column(Boolean, default=True)
    criado_em = Column(DateTime, default=datetime.utcnow)

    item = relationship("Item", back_populates="alertas")

class Perfil(Base):
    __tablename__ = "perfis"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(50), unique=True, nullable=False)
    descricao = Column(Text, nullable=True)
    criado_em = Column(DateTime, default=datetime.utcnow)

    usuarios = relationship("Usuario", back_populates="perfil")

class Usuario(Base):
    __tablename__ = "usuarios"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(150), nullable=False)
    email = Column(String(150), unique=True, nullable=False, index=True)
    senha_hash = Column(String(255), nullable=False)
    perfil_id = Column(Integer, ForeignKey("perfis.id"), nullable=False)
    ativo = Column(Boolean, default=True, index=True)
    criado_em = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    ultimo_acesso = Column(DateTime, nullable=True)

    perfil = relationship("Perfil", back_populates="usuarios")

class Auditoria(Base):
    __tablename__ = "auditoria"
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    acao = Column(String(100), nullable=False)
    tabela = Column(String(50), nullable=True)
    registro_id = Column(Integer, nullable=True)
    detalhes = Column(JSON, nullable=True)
    ip_address = Column(String(45), nullable=True)
    criado_em = Column(DateTime, default=datetime.utcnow, index=True)

    usuario = relationship("Usuario")