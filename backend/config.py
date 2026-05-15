import os

SQLANCER_JAR = r"C:\\Users\\adi\\Desktop\\disertatie\\replication\\sqlancer\\target\\sqlancer-2.0.0.jar"

DOCKER_DBMS = {
    "sqlite3": {
        "host": None,
        "port": None,
        "user": None,
        "password": None,
        "container": None,
    },
    "mysql": {
        "host": "127.0.0.1",
        "port": 3306,
        "user": "root",
        "password": "sqlancer",
        "container": "mysql-test",
    },
    "mariadb": {
        "host": "127.0.0.1",
        "port": 3307,
        "user": "root",
        "password": "sqlancer",
        "container": "mariadb-test",
    },
    "tidb": {
        "host": "127.0.0.1",
        "port": 4000,
        "user": "root",
        "password": "",
        "container": "tidb-test",
    },
    "postgres": {
        "host": "127.0.0.1",
        "port": 5432,
        "user": "postgres",
        "password": "sqlancer",
        "container": "postgres-latest",
    },
    "cockroachdb": {
        "host": "127.0.0.1",
        "port": 26257,
        "user": "root",
        "password": "",
        "container": "crdb-test",
    },
    "duckdb": {
        "host": None,
        "port": None,
        "user": None,
        "password": None,
        "container": None,
    },
}

SQLANCER_ORACLES = {
    "sqlite3": {
        "NoREC": "NoREC",
        "WHERE": "WHERE",
        "GROUP_BY": "GROUP_BY",
        "HAVING": "HAVING",
        "AGGREGATE": "AGGREGATE",
        "DISTINCT": "DISTINCT",
        "PQS": "PQS",
    },
    "mysql": {
        "TLP_WHERE": "TLP_WHERE",
        "DQP": "DQP",
        "PQS": "PQS",
        "CERT": "CERT",
    },
    "mariadb": {
        "NoREC": "NOREC",
        "DQP": "DQP",
    },
    "tidb": {
        "TLP_WHERE": "WHERE",
        "TLP_HAVING": "HAVING",
        "QUERY_PARTITIONING": "QUERY_PARTITIONING",
        "CERT": "CERT",
        "DQP": "DQP",
    },
    "postgres": {
        "NoREC": "NOREC",
        "PQS": "PQS",
        "WHERE": "WHERE",
        "HAVING": "HAVING",
        "QUERY_PARTITIONING": "QUERY_PARTITIONING",
        "CERT": "CERT",
        "FUZZER": "FUZZER",
    },
    "cockroachdb": {
        "TLP_WHERE": "TLP_WHERE",
        "TLP_HAVING": "TLP_HAVING",
        "TLP_AGGREGATE": "TLP_AGGREGATE",
        "TLP_DISTINCT": "TLP_DISTINCT",
        "TLP_GROUP_BY": "TLP_GROUP_BY",
        "NoREC": "NoREC",
    },
    "duckdb": {
        "TLP_WHERE": "WHERE",
        "TLP_GROUP_BY": "GROUP_BY",
        "TLP_HAVING": "HAVING",
        "TLP_AGGREGATE": "AGGREGATE",
        "TLP_DISTINCT": "DISTINCT",
        "NoREC": "NOREC",
    },
}