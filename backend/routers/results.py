from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from database.db import get_db
from database.models import StaticResult, Experiment

router = APIRouter()

DBMS_NAME_MAPPING = {
    "sqlite3": "SQLite",
    "sqlite": "SQLite",
    "mysql": "MySQL",
    "mariadb": "MariaDB",
    "tidb": "TiDB",
    "postgres": "PostgreSQL",
    "postgresql": "PostgreSQL",
    "cockroachdb": "CockroachDB",
    "duckdb": "DuckDB"
}

def normalize_dbms_name(raw_name: str) -> str:
    if not raw_name:
        return "Unknown"
    return DBMS_NAME_MAPPING.get(raw_name.lower(), raw_name)


@router.get("/static")
async def get_static_results(db: AsyncSession = Depends(get_db)):
    res_static = await db.execute(select(StaticResult))
    rows_static = res_static.scalars().all()
    
    res_dynamic = await db.execute(select(Experiment).where(Experiment.status != 'running'))
    rows_dynamic = res_dynamic.scalars().all()

    combined_results = []
    
    for r in rows_static:
        combined_results.append({
            "id": r.id,
            "experiment": r.experiment,
            "dbms": normalize_dbms_name(r.dbms), # Normalizare
            "version": r.version,
            "oracle": r.oracle,
            "total_queries": r.total_queries,
            "throughput_qps": r.throughput_qps,
            "success_rate": r.success_rate,
            "bugs_found": r.bugs_found,
            "bug_type": r.bug_type,
            "observations": r.observations,
        })
        
    for r in rows_dynamic:
        combined_results.append({
            "id": r.id,
            "experiment": "Live UI Run",
            "dbms": normalize_dbms_name(r.dbms), # Normalizare
            "version": "Docker",
            "oracle": r.oracle,
            "total_queries": r.total_queries_executed or 0,
            "throughput_qps": r.throughput_qps or 0.0,
            "success_rate": r.success_rate or 0.0,
            "bugs_found": r.bugs_found or 0,
            "bug_type": r.bug_type or ("" if r.bugs_found == 0 else "Logic Bug"),
            "observations": r.error_message or "Experiment rulat din interfața web.",
        })

    return combined_results


@router.get("/summary")
async def get_summary(db: AsyncSession = Depends(get_db)):
    res_static = await db.execute(select(StaticResult))
    rows_static = res_static.scalars().all()

    res_dynamic = await db.execute(select(Experiment).where(Experiment.status != 'running'))
    rows_dynamic = res_dynamic.scalars().all()

    summary = {}

    def add_to_summary(raw_dbms, bugs, queries, oracle, exp_name):
        dbms = normalize_dbms_name(raw_dbms) # Aplicăm normalizarea înainte de a grupa!
        if dbms not in summary:
            summary[dbms] = {
                "dbms": dbms,
                "total_bugs": 0,
                "total_queries": 0,
                "oracles_tested": [],
                "experiments": [],
            }
        summary[dbms]["total_bugs"] += (bugs or 0)
        summary[dbms]["total_queries"] += (queries or 0)
        if oracle and oracle not in summary[dbms]["oracles_tested"]:
            summary[dbms]["oracles_tested"].append(oracle)
        if exp_name and exp_name not in summary[dbms]["experiments"]:
            summary[dbms]["experiments"].append(exp_name)

    for r in rows_static:
        add_to_summary(r.dbms, r.bugs_found, r.total_queries, r.oracle, r.experiment)

    for r in rows_dynamic:
        add_to_summary(r.dbms, r.bugs_found, r.total_queries_executed, r.oracle, "Live UI Run")

    return list(summary.values())


@router.get("/by-experiment/{exp_name}")
async def get_by_experiment(exp_name: str, db: AsyncSession = Depends(get_db)):
    if exp_name == "Live UI Run":
        res = await db.execute(select(Experiment).where(Experiment.status != 'running'))
        rows = res.scalars().all()
        return [
            {
                "id": r.id,
                "experiment": "Live UI Run",
                "dbms": normalize_dbms_name(r.dbms), # Normalizare
                "version": "Docker",
                "oracle": r.oracle,
                "total_queries": r.total_queries_executed or 0,
                "throughput_qps": r.throughput_qps or 0.0,
                "success_rate": r.success_rate or 0.0,
                "bugs_found": r.bugs_found or 0,
                "bug_type": r.bug_type,
                "observations": r.error_message or "Live run",
            }
            for r in rows
        ]
    else:
        res = await db.execute(select(StaticResult).where(StaticResult.experiment == exp_name))
        rows = res.scalars().all()
        return [
            {
                "id": r.id,
                "experiment": r.experiment,
                "dbms": normalize_dbms_name(r.dbms), # Normalizare
                "version": r.version,
                "oracle": r.oracle,
                "total_queries": r.total_queries,
                "throughput_qps": r.throughput_qps,
                "success_rate": r.success_rate,
                "bugs_found": r.bugs_found,
                "bug_type": r.bug_type,
                "observations": r.observations,
            }
            for r in rows
        ]


@router.get("/bugs")
async def get_bugs_only(db: AsyncSession = Depends(get_db)):
    res_static = await db.execute(select(StaticResult).where(StaticResult.bugs_found > 0))
    rows_static = res_static.scalars().all()
    
    res_dynamic = await db.execute(select(Experiment).where(Experiment.bugs_found > 0))
    rows_dynamic = res_dynamic.scalars().all()

    bugs_list = []
    
    for r in rows_static:
        bugs_list.append({
            "experiment": r.experiment,
            "dbms": normalize_dbms_name(r.dbms),
            "oracle": r.oracle,
            "bugs_found": r.bugs_found,
            "bug_type": r.bug_type,
            "observations": r.observations,
        })
        
    for r in rows_dynamic:
        bugs_list.append({
            "experiment": "Live UI Run",
            "dbms": normalize_dbms_name(r.dbms),
            "oracle": r.oracle,
            "bugs_found": r.bugs_found,
            "bug_type": r.bug_type or "Logic Bug",
            "observations": r.error_message or "Descoperit în timpul rulării din interfață.",
        })

    return bugs_list