from fastapi import APIRouter, BackgroundTasks, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid
import subprocess
import re
from datetime import datetime
import os
import threading
import platform

from database.db import get_db
from database.models import Experiment
from config import DOCKER_DBMS, SQLANCER_ORACLES, SQLANCER_JAR

router = APIRouter()

class ExperimentConfig(BaseModel):
    dbms: str
    oracle: str
    duration_seconds: int = 300

class ExperimentValidation(BaseModel):
    dbms: str
    available_oracles: list[str]

@router.get("/available-oracles/{dbms}")
async def get_available_oracles(dbms: str):
    oracles = SQLANCER_ORACLES.get(dbms, {})
    return {
        "dbms": dbms,
        "oracles": list(oracles.keys()),
    }

@router.get("/available-dbms")
async def get_available_dbms():
    return {
        "dbms_list": list(SQLANCER_ORACLES.keys()),
        "dbms_details": {
            k: {"oracles": list(v.keys())} for k, v in SQLANCER_ORACLES.items()
        },
    }

@router.post("/")
async def create_experiment(
    config: ExperimentConfig,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    # Validare: oracle disponibil pentru DBMS
    available = SQLANCER_ORACLES.get(config.dbms, {})
    if config.oracle not in available:
        return {
            "error": f"Oracle '{config.oracle}' not available for '{config.dbms}'",
            "available_oracles": list(available.keys()),
        }

    exp_id = str(uuid.uuid4())[:8]

    experiment = Experiment(
        id=exp_id,
        status="running",
        dbms=config.dbms,
        oracle=config.oracle,
        duration_seconds=config.duration_seconds,
        created_at=datetime.utcnow(),
    )

    db.add(experiment)
    await db.commit()

    background_tasks.add_task(run_sqlancer, exp_id, config)

    return {
        "id": exp_id,
        "status": "running",
        "config": config.model_dump(),
        "command": build_sqlancer_command(config),
    }

@router.get("/")
async def list_experiments(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Experiment).order_by(Experiment.created_at.desc())
    )
    rows = result.scalars().all()
    return [
        {
            "id": r.id,
            "status": r.status,
            "dbms": r.dbms,
            "oracle": r.oracle,
            "duration_seconds": r.duration_seconds,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "completed_at": (
                r.completed_at.isoformat() if r.completed_at else None
            ),
            "total_queries_executed": r.total_queries_executed,
            "throughput_qps": r.throughput_qps,
            "success_rate": r.success_rate,
            "bugs_found": r.bugs_found,
            "bug_type": r.bug_type,
            "error_message": r.error_message,
        }
        for r in rows
    ]

@router.get("/{exp_id}")
async def get_experiment(exp_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Experiment).where(Experiment.id == exp_id)
    )
    exp = result.scalar_one_or_none()
    if not exp:
        return {"error": "Experiment not found"}
    return {
        "id": exp.id,
        "status": exp.status,
        "dbms": exp.dbms,
        "oracle": exp.oracle,
        "duration_seconds": exp.duration_seconds,
        "created_at": exp.created_at.isoformat() if exp.created_at else None,
        "completed_at": (
            exp.completed_at.isoformat() if exp.completed_at else None
        ),
        "total_queries_executed": exp.total_queries_executed,
        "throughput_qps": exp.throughput_qps,
        "success_rate": exp.success_rate,
        "bugs_found": exp.bugs_found,
        "bug_type": exp.bug_type,
        "raw_output": exp.raw_output,
        "error_message": exp.error_message,
    }


def build_sqlancer_command(config: ExperimentConfig) -> list[str]:
    dbms_config = DOCKER_DBMS.get(config.dbms, {})
    oracle_name = SQLANCER_ORACLES.get(config.dbms, {}).get(
        config.oracle, config.oracle
    )

    cmd = ["java", "-jar", SQLANCER_JAR]

    if dbms_config.get("host"):
        cmd.extend(["--host", dbms_config["host"]])
    if dbms_config.get("port"):
        cmd.extend(["--port", str(dbms_config["port"])])
    if dbms_config.get("user"):
        cmd.extend(["--username", dbms_config["user"]])
    if dbms_config.get("password") is not None and dbms_config["password"] != "":
        cmd.extend(["--password", dbms_config["password"]])

    cmd.append(config.dbms)
    cmd.extend(["--oracle", oracle_name])

    return cmd

async def run_sqlancer(exp_id: str, config: ExperimentConfig):
    from database.db import async_session
    import time

    stdout_lines = []
    stderr_lines = []
    returncode = 0
    final_status = "completed"
    error_msg = ""

    try:
        cmd = build_sqlancer_command(config)
        cmd_str = " ".join(cmd)
        print(f"\n{'='*60}")
        print(f"[{exp_id}] Running: {cmd_str}")
        print(f"[{exp_id}] Will stop automatically after {config.duration_seconds} seconds.")
        print(f"{'='*60}")

        if not os.path.exists(SQLANCER_JAR):
            raise FileNotFoundError(f"SQLancer JAR not found at: {SQLANCER_JAR}")

        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1, 
            universal_newlines=True
        )

        start_time = time.time()

        def read_output(pipe, lines_list, is_err=False):
            for line in iter(pipe.readline, ''):
                if line:
                    if not is_err:
                        print(f"[SQLancer] {line.strip()}")
                    lines_list.append(line)
            pipe.close()

        t_out = threading.Thread(target=read_output, args=(process.stdout, stdout_lines, False))
        t_err = threading.Thread(target=read_output, args=(process.stderr, stderr_lines, True))
        t_out.start()
        t_err.start()

        while True:
            if process.poll() is not None:
                break

            elapsed_time = time.time() - start_time
            if elapsed_time > config.duration_seconds:
                print(f"\n[{exp_id}] TIMEOUT REACHED ({config.duration_seconds}s). Stopping fuzzer forcefully...")
                
                if platform.system() == "Windows":
                    subprocess.run(
                        ["taskkill", "/F", "/T", "/PID", str(process.pid)], 
                        stdout=subprocess.DEVNULL, 
                        stderr=subprocess.DEVNULL
                    )
                else:
                    process.terminate()
                    try:
                        process.wait(timeout=5)
                    except subprocess.TimeoutExpired:
                        process.kill()
                break
            
            time.sleep(1)

        t_out.join()
        t_err.join()

        returncode = process.returncode
        
        if returncode != 0 and (time.time() - start_time) < config.duration_seconds:
             final_status = "error"
             error_msg = f"Process exited early with code {returncode} (Bug found or crash)"

        stdout_data = "".join(stdout_lines)
        stderr_data = "".join(stderr_lines)

    except FileNotFoundError as e:
        print(f"[{exp_id}] FILE NOT FOUND: {e}")
        final_status = "error"
        error_msg = str(e)
        stdout_data = ""
        stderr_data = ""
    except Exception as e:
        print(f"[{exp_id}] ERROR: {e}")
        final_status = "error"
        error_msg = str(e)
        stdout_data = ""
        stderr_data = ""

    print(f"\n[{exp_id}] Execution finished. Parsing results...")

    parsed = parse_sqlancer_output(stdout_data, stderr_data)

    async with async_session() as session:
        exp_result = await session.execute(
            select(Experiment).where(Experiment.id == exp_id)
        )
        exp = exp_result.scalar_one()
        exp.status = final_status
        exp.completed_at = datetime.utcnow()
        
        if final_status != "error" or parsed.get("bugs_found", 0) > 0:
            exp.total_queries_executed = parsed.get("total_queries", 0)
            exp.throughput_qps = parsed.get("throughput_qps", 0)
            exp.success_rate = parsed.get("success_rate", 0)
            exp.bugs_found = parsed.get("bugs_found", 0)
            if parsed.get("bug_type"):
                exp.bug_type = parsed.get("bug_type")

        exp.raw_output = (stdout_data[-5000:] if stdout_data else "") + (
            "\n---STDERR---\n" + stderr_data[:2000] if stderr_data else ""
        )
        
        if error_msg or stderr_data:
            exp.error_message = error_msg if error_msg else stderr_data[:2000]
            
        await session.commit()

    print(f"[{exp_id}] Parsed results saved to DB: {parsed}")


def parse_sqlancer_output(stdout: str, stderr: str) -> dict:
    result = {
        "total_queries": 0,
        "throughput_qps": 0.0,
        "success_rate": 0.0,
        "bugs_found": 0,
        "bug_type": None
    }

    full_output = (stdout or "") + "\n" + (stderr or "")

    queries_match = re.findall(r"Executed\s+(\d+)\s+queries", full_output, re.IGNORECASE)
    if queries_match:
        result["total_queries"] = int(queries_match[-1])

    qps_match = re.findall(r"\((\d+\.?\d*)\s*queries/s", full_output, re.IGNORECASE)
    if qps_match:
        result["throughput_qps"] = float(qps_match[-1])

    success_match = re.findall(r"successful statements:\s*(\d+)%", full_output, re.IGNORECASE)
    if success_match:
        result["success_rate"] = float(success_match[-1]) / 100.0

    if "java.lang.AssertionError" in full_output:
        result["bugs_found"] = 1
        result["bug_type"] = "Logic Bug (AssertionError)"
        
    elif "NullPointerException" in full_output:
        result["bug_type"] = "Instrumentation Error (NPE)"

    return result