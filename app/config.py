import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "mysql+pymysql://root:0905Pedro!@localhost:3306/estoquefilial"
)

SQLALCHEMY_ECHO = True
SECRET_KEY = os.getenv("SECRET_KEY", "3stoqu3FILI4L")
