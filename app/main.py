import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.database.connection import Base, engine
from app.routes import itens, auth

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Sistema de Controle de Estoque",
    description="API para gerenciamento de estoque da filial",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir rotas
app.include_router(auth.router)
app.include_router(itens.router)

@app.get("/health")
def health_check():
    return {"status": "ok"}

# Servir frontend — deve ser o último mount para não interceptar as rotas da API
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")