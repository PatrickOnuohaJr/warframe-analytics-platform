from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DB_SERVER: str = "THEBLACKPRIME"
    DB_NAME: str = "Warframe"
    DB_USER: str = ""
    DB_PASSWORD: str = ""
    DB_DRIVER: str = "ODBC Driver 17 for SQL Server"

    class Config:
        env_file = ".env"

settings = Settings()
