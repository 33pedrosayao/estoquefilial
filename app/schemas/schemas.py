from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from enum import Enum

class TipoMovimentacaoSchema(str, Enum):
    entrada = "entrada"
    saida = "saida"

class CategoriaBase(BaseModel):
    nome: str = Field(..., min_length=1, max_length=100)
    descricao: Optional[str] = None

class CategoriaResponse(CategoriaBase):
    id: int
    criado_em: datetime
    
    class Config:
        from_attributes = True

class ItemBase(BaseModel):
    nome: str = Field(..., min_length=1, max_length=150)
    categoria_id: int
    quantidade_minima: int = Field(default=5, ge=0)
    unidade: str = Field(default="unidade", max_length=20)

class ItemCreate(ItemBase):
    quantidade_atual: int = Field(default=0, ge=0)

class ItemUpdate(BaseModel):
    nome: Optional[str] = None
    categoria_id: Optional[int] = None
    quantidade_minima: Optional[int] = None
    unidade: Optional[str] = None
    ativo: Optional[bool] = None

class ItemResponse(ItemBase):
    id: int
    quantidade_atual: int
    ativo: bool
    criado_em: datetime
    atualizado_em: datetime
    
    class Config:
        from_attributes = True

class MovimentacaoCreate(BaseModel):
    item_id: int
    tipo: TipoMovimentacaoSchema
    quantidade: int = Field(..., gt=0)
    motivo: Optional[str] = None
    usuario: Optional[str] = None
    observacoes: Optional[str] = None

class MovimentacaoResponse(MovimentacaoCreate):
    id: int
    data_movimentacao: datetime
    
    class Config:
        from_attributes = True