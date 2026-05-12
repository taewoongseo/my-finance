import os
import json
import psycopg2
from psycopg2.extras import RealDictCursor

ALLOWED_TABLES = {"accounts", "income", "savings_accounts"}


def _connect():
    return psycopg2.connect(os.getenv("NEON_DATABASE_URL"), cursor_factory=RealDictCursor)


def get_user_data(user_id: str, table: str):
    if table not in ALLOWED_TABLES:
        raise ValueError(f"Invalid table: {table}")
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(f"SELECT data FROM {table} WHERE user_id = %s", (user_id,))
            row = cur.fetchone()
            return row["data"] if row else None


def set_user_data(user_id: str, table: str, data) -> None:
    if table not in ALLOWED_TABLES:
        raise ValueError(f"Invalid table: {table}")
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"INSERT INTO {table} (user_id, data) VALUES (%s, %s) "
                f"ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()",
                (user_id, json.dumps(data)),
            )


def get_all_months(user_id: str) -> dict:
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT month_key, data FROM months WHERE user_id = %s", (user_id,))
            return {row["month_key"]: row["data"] for row in cur.fetchall()}


def get_month_data(user_id: str, month_key: str):
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT data FROM months WHERE user_id = %s AND month_key = %s",
                (user_id, month_key),
            )
            row = cur.fetchone()
            return row["data"] if row else None


def set_month_data(user_id: str, month_key: str, data: dict) -> None:
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO months (user_id, month_key, data) VALUES (%s, %s, %s) "
                "ON CONFLICT (user_id, month_key) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()",
                (user_id, month_key, json.dumps(data)),
            )


def delete_month_data(user_id: str, month_key: str) -> None:
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM months WHERE user_id = %s AND month_key = %s",
                (user_id, month_key),
            )


def get_plaid_token(user_id: str, account_id: str) -> str | None:
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT access_token FROM plaid_connections WHERE user_id = %s AND account_id = %s",
                (user_id, account_id),
            )
            row = cur.fetchone()
            return row["access_token"] if row else None


def set_plaid_token(user_id: str, account_id: str, access_token: str) -> None:
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO plaid_connections (user_id, account_id, access_token) VALUES (%s, %s, %s) "
                "ON CONFLICT (user_id, account_id) DO UPDATE SET access_token = EXCLUDED.access_token",
                (user_id, account_id, access_token),
            )
