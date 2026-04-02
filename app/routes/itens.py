from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database.connection import get_db
from app.models.models import Item, Categoria, Movimentacao, Alerta, TipoMovimentacao, TipoAlerta
from app.schemas.schemas import (
    ItemCreate, ItemResponse, ItemUpdate,
    MovimentacaoCreate, MovimentacaoResponse,
    CategoriaResponse
)
from datetime import datetime

router = APIRouter(prefix="/api/itens", tags=["itens"])

@router.get("/", response_model=list[ItemResponse])
def listar_itens(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    categoria_id: int = Query(None),
    ativo: bool = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Item)
    
    if categoria_id:
        query = query.filter(Item.categoria_id == categoria_id)
    if ativo is not None:
        query = query.filter(Item.ativo == ativo)
    
    return query.offset(skip).limit(limit).all()

@router.get("/{item_id}", response_model=ItemResponse)
def obter_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    return item

@router.post("/", response_model=ItemResponse)
def criar_item(item: ItemCreate, db: Session = Depends(get_db)):
    categoria = db.query(Categoria).filter(Categoria.id == item.categoria_id).first()
    if not categoria:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    
    novo_item = Item(**item.dict())
    db.add(novo_item)
    db.commit()
    db.refresh(novo_item)
    return novo_item

@router.put("/{item_id}", response_model=ItemResponse)
def atualizar_item(
    item_id: int,
    item_update: ItemUpdate,
    db: Session = Depends(get_db)
):
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    
    dados_atualizacao = item_update.dict(exclude_unset=True)
    for campo, valor in dados_atualizacao.items():
        setattr(item, campo, valor)
    
    db.commit()
    db.refresh(item)
    return item

@router.delete("/{item_id}")
def deletar_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    
    item.ativo = False
    db.commit()
    return {"mensagem": "Item desativado com sucesso"}

@router.post("/movimentacoes/", response_model=MovimentacaoResponse)
def registrar_movimentacao(
    movimentacao: MovimentacaoCreate,
    db: Session = Depends(get_db)
):
    item = db.query(Item).filter(Item.id == movimentacao.item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    
    if movimentacao.tipo == TipoMovimentacao.entrada:
        item.quantidade_atual += movimentacao.quantidade
    else:
        if item.quantidade_atual < movimentacao.quantidade:
            raise HTTPException(
                status_code=400,
                detail=f"Quantidade insuficiente. Disponível: {item.quantidade_atual}"
            )
        item.quantidade_atual -= movimentacao.quantidade
    
    nova_movimentacao = Movimentacao(**movimentacao.dict())
    db.add(nova_movimentacao)
    
    verificar_alertas(item, db)
    
    db.commit()
    db.refresh(nova_movimentacao)
    return nova_movimentacao

@router.get("/movimentacoes/{item_id}", response_model=list[MovimentacaoResponse])
def listar_movimentacoes(
    item_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    
    return db.query(Movimentacao)\
        .filter(Movimentacao.item_id == item_id)\
        .order_by(Movimentacao.data_movimentacao.desc())\
        .offset(skip)\
        .limit(limit)\
        .all()

@router.get("/alertas/", response_model=list)
def listar_alertas(
    ativo: bool = Query(True),
    db: Session = Depends(get_db)
):
    alertas = db.query(Alerta).filter(Alerta.ativo == ativo).all()
    return [
        {
            "id": a.id,
            "item_id": a.item_id,
            "item_nome": a.item.nome,
            "tipo_alerta": a.tipo_alerta,
            "quantidade_atual": a.item.quantidade_atual,
            "quantidade_minima": a.item.quantidade_minima
        }
        for a in alertas
    ]

def verificar_alertas(item: Item, db: Session):
    db.query(Alerta).filter(Alerta.item_id == item.id).delete()
    
    if item.quantidade_atual == 0:
        novo_alerta = Alerta(
            item_id=item.id,
            tipo_alerta=TipoAlerta.fora_de_estoque
        )
        db.add(novo_alerta)
    elif item.quantidade_atual < item.quantidade_minima:
        novo_alerta = Alerta(
            item_id=item.id,
            tipo_alerta=TipoAlerta.estoque_baixo
        )
        db.add(novo_alerta)

@router.get("/categorias/", response_model=list[CategoriaResponse])
def listar_categorias(db: Session = Depends(get_db)):
    return db.query(Categoria).all()

@router.get("/relatorio/")
def gerar_relatorio(
    data_inicio: str = Query(..., description="Data início (YYYY-MM-DD)"),
    data_fim: str = Query(..., description="Data fim (YYYY-MM-DD)"),
    db: Session = Depends(get_db)
):
    try:
        inicio = datetime.strptime(data_inicio, "%Y-%m-%d")
        fim = datetime.strptime(data_fim, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de data inválido. Use YYYY-MM-DD")

    entradas = db.query(
        Movimentacao.item_id,
        func.sum(Movimentacao.quantidade).label("total")
    ).filter(
        Movimentacao.tipo == TipoMovimentacao.entrada,
        Movimentacao.data_movimentacao >= inicio,
        Movimentacao.data_movimentacao <= fim
    ).group_by(Movimentacao.item_id).all()

    saidas = db.query(
        Movimentacao.item_id,
        func.sum(Movimentacao.quantidade).label("total")
    ).filter(
        Movimentacao.tipo == TipoMovimentacao.saida,
        Movimentacao.data_movimentacao >= inicio,
        Movimentacao.data_movimentacao <= fim
    ).group_by(Movimentacao.item_id).all()

    entradas_map = {r.item_id: r.total for r in entradas}
    saidas_map = {r.item_id: r.total for r in saidas}

    itens_ativos = db.query(Item).filter(Item.ativo == True).all()

    resultado = []
    for item in itens_ativos:
        ent = entradas_map.get(item.id, 0)
        sai = saidas_map.get(item.id, 0)
        resultado.append({
            "item_id": item.id,
            "nome": item.nome,
            "categoria": item.categoria.nome if item.categoria else "-",
            "unidade": item.unidade,
            "entradas": ent,
            "saidas": sai,
            "estoque_atual": item.quantidade_atual,
        })

    resultado.sort(key=lambda x: x["nome"])
    return resultado