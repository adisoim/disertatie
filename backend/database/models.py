from sqlalchemy import Column, String, Integer, Float, DateTime, JSON
from datetime import datetime

from database.db import Base


class Experiment(Base):
    __tablename__ = "experiments"

    id = Column(String, primary_key=True)
    status = Column(String, default="pending")
    dbms = Column(String, nullable=False)
    oracle = Column(String, nullable=False)
    num_queries = Column(Integer, default=100000)
    num_threads = Column(Integer, default=4)
    duration_seconds = Column(Integer, default=300)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    # Results
    total_queries_executed = Column(Integer, nullable=True)
    throughput_qps = Column(Float, nullable=True)
    success_rate = Column(Float, nullable=True)
    bugs_found = Column(Integer, nullable=True)
    bug_type = Column(String, nullable=True)
    raw_output = Column(String, nullable=True)
    error_message = Column(String, nullable=True)


class StaticResult(Base):
    __tablename__ = "static_results"

    id = Column(Integer, primary_key=True, autoincrement=True)
    experiment = Column(String, nullable=False)
    dbms = Column(String, nullable=False)
    version = Column(String, nullable=True)
    oracle = Column(String, nullable=False)
    total_queries = Column(Integer, nullable=False)
    throughput_qps = Column(Float, nullable=False)
    success_rate = Column(Float, nullable=False)
    bugs_found = Column(Integer, default=0)
    bug_type = Column(String, nullable=True)
    observations = Column(String, nullable=True)