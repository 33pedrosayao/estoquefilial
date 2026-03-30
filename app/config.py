import os
from dotenv import load_dotenv

load_dotenv()

def _get_database_url() -> str:
    # Railway pode fornecer a URL com nomes diferentes
    url = (
        os.getenv("DATABASE_URL") or
        os.getenv("MYSQL_URL") or
        os.getenv("MYSQL_PRIVATE_URL") or
        "mysql+pymysql://root:0905Pedro!@localhost:3306/estoquefilial"
    )
    # PyMySQL exige o prefixo mysql+pymysql://
    if url.startswith("mysql://"):
        url = url.replace("mysql://", "mysql+pymysql://", 1)
    return url

DATABASE_URL = _get_database_url()

SQLALCHEMY_ECHO = True
SECRET_KEY = os.getenv("SECRET_KEY", "3stoqu3FILI4L")
