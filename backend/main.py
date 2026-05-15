from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database.db import init_db
from routers import experiments, results


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="SQLancer Dashboard API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    experiments.router, prefix="/api/experiments", tags=["experiments"]
)
app.include_router(results.router, prefix="/api/results", tags=["results"])


@app.get("/api/health")
async def health():
    return {"status": "ok"}