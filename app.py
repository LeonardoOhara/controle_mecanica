from pathlib import Path
import json
import sqlite3

from flask import Flask, jsonify, request, send_from_directory, session


BASE_DIR = Path(__file__).resolve().parent
DATABASE = BASE_DIR / "data" / "oficina.db"

app = Flask(__name__, static_folder=".", static_url_path="")
app.config["SECRET_KEY"] = "troque-esta-chave-em-producao"


def get_connection():
    DATABASE.parent.mkdir(exist_ok=True)
    connection = sqlite3.connect(DATABASE)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database():
    with get_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS app_data (
                data_key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )


@app.before_request
def ensure_database():
    initialize_database()


@app.get("/")
def index():
    return send_from_directory(BASE_DIR, "index.html")


@app.get("/api/health")
def health():
    return jsonify({"status": "ok"})


@app.post("/api/login")
def login():
    payload = request.get_json(silent=True) or {}
    if payload.get("user") != "admin" or payload.get("password") != "admin123":
        return jsonify({"error": "Usuário ou senha inválidos."}), 401

    session["authenticated"] = True
    return jsonify({"authenticated": True, "user": "admin"})


@app.post("/api/logout")
def logout():
    session.clear()
    return jsonify({"authenticated": False})


@app.get("/api/data/<data_key>")
def read_data(data_key):
    with get_connection() as connection:
        row = connection.execute(
            "SELECT value FROM app_data WHERE data_key = ?", (data_key,)
        ).fetchone()

    return jsonify(json.loads(row["value"]) if row else [])


@app.put("/api/data/<data_key>")
def write_data(data_key):
    value = request.get_json(silent=True)
    if not isinstance(value, list):
        return jsonify({"error": "O valor precisa ser uma lista JSON."}), 400

    serialized = json.dumps(value, ensure_ascii=False)
    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO app_data (data_key, value, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(data_key) DO UPDATE SET
                value = excluded.value,
                updated_at = CURRENT_TIMESTAMP
            """,
            (data_key, serialized),
        )

    return jsonify(value)


if __name__ == "__main__":
    app.run(debug=True)