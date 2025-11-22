from fastapi import FastAPI
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
)

app = FastAPI(title="Warframe API", version="1.0.0")

from .routers import warframes, weapons, mods, arcanes, builds

app.include_router(warframes.router)
app.include_router(weapons.router)
app.include_router(mods.router)
app.include_router(arcanes.router)
app.include_router(builds.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Warframe API"}
