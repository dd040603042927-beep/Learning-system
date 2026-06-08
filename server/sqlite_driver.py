import json
import sqlite3
import sys
from pathlib import Path


ENTITY_TABLES = {
    "notes": "notes",
    "resources": "resources",
    "resourceChunks": "resource_chunks",
    "searchDocuments": "search_documents",
    "learningPaths": "learning_paths",
    "learningPathSteps": "learning_path_steps",
    "knowledgePoints": "knowledge_points",
    "milestones": "milestones",
    "plans": "plans",
    "reviewReminders": "review_reminders",
    "reflections": "reflections",
    "goals": "goals",
    "projects": "projects",
    "questions": "questions",
    "answerAttempts": "answer_attempts",
    "mistakes": "mistakes",
    "recommendations": "recommendations",
    "studyEvents": "study_events",
    "rubrics": "rubrics",
    "aiGradingResults": "ai_grading_results",
    "knowledgeRelations": "knowledge_relations",
    "reviewPolicies": "review_policies",
    "importJobs": "import_jobs",
}


def connect(db_file):
    Path(db_file).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_file)
    conn.row_factory = sqlite3.Row
    return conn


def init(conn):
    conn.executescript(
        """
        PRAGMA journal_mode = DELETE;
        PRAGMA busy_timeout = 5000;
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT NOT NULL UNIQUE,
            salt TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS sessions (
            token TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS migrations (
            id TEXT PRIMARY KEY,
            applied_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS notes (
            id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            data TEXT NOT NULL,
            updated_at TEXT,
            PRIMARY KEY (id, user_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS resources (
            id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            data TEXT NOT NULL,
            updated_at TEXT,
            PRIMARY KEY (id, user_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS resource_chunks (
            id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            data TEXT NOT NULL,
            updated_at TEXT,
            PRIMARY KEY (id, user_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS search_documents (
            id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            data TEXT NOT NULL,
            updated_at TEXT,
            PRIMARY KEY (id, user_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS learning_paths (
            id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            data TEXT NOT NULL,
            updated_at TEXT,
            PRIMARY KEY (id, user_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS learning_path_steps (
            id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            data TEXT NOT NULL,
            updated_at TEXT,
            PRIMARY KEY (id, user_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS knowledge_points (
            id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            data TEXT NOT NULL,
            updated_at TEXT,
            PRIMARY KEY (id, user_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS milestones (
            id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            data TEXT NOT NULL,
            updated_at TEXT,
            PRIMARY KEY (id, user_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS plans (
            id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            data TEXT NOT NULL,
            updated_at TEXT,
            PRIMARY KEY (id, user_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS review_reminders (
            id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            data TEXT NOT NULL,
            updated_at TEXT,
            PRIMARY KEY (id, user_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS reflections (
            id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            data TEXT NOT NULL,
            updated_at TEXT,
            PRIMARY KEY (id, user_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS goals (
            id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            data TEXT NOT NULL,
            updated_at TEXT,
            PRIMARY KEY (id, user_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS projects (
            id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            data TEXT NOT NULL,
            updated_at TEXT,
            PRIMARY KEY (id, user_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS questions (
            id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            data TEXT NOT NULL,
            updated_at TEXT,
            PRIMARY KEY (id, user_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS answer_attempts (
            id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            data TEXT NOT NULL,
            updated_at TEXT,
            PRIMARY KEY (id, user_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS mistakes (
            id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            data TEXT NOT NULL,
            updated_at TEXT,
            PRIMARY KEY (id, user_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS recommendations (
            id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            data TEXT NOT NULL,
            updated_at TEXT,
            PRIMARY KEY (id, user_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS study_events (
            id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            data TEXT NOT NULL,
            updated_at TEXT,
            PRIMARY KEY (id, user_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS rubrics (
            id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            data TEXT NOT NULL,
            updated_at TEXT,
            PRIMARY KEY (id, user_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS ai_grading_results (
            id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            data TEXT NOT NULL,
            updated_at TEXT,
            PRIMARY KEY (id, user_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS knowledge_relations (
            id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            data TEXT NOT NULL,
            updated_at TEXT,
            PRIMARY KEY (id, user_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS review_policies (
            id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            data TEXT NOT NULL,
            updated_at TEXT,
            PRIMARY KEY (id, user_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS import_jobs (
            id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            data TEXT NOT NULL,
            updated_at TEXT,
            PRIMARY KEY (id, user_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        """
    )
    conn.execute(
        """
        INSERT OR IGNORE INTO migrations (id, applied_at)
        VALUES ('2026-06-08-v4-knowledge-hub', datetime('now'))
        """
    )
    conn.commit()


def read_db(conn):
    db = {
        "users": [],
        "sessions": [],
        "notes": [],
        "resources": [],
        "resourceChunks": [],
        "searchDocuments": [],
        "learningPaths": [],
        "learningPathSteps": [],
        "knowledgePoints": [],
        "milestones": [],
        "plans": [],
        "reviewReminders": [],
        "reflections": [],
        "goals": [],
        "projects": [],
        "questions": [],
        "answerAttempts": [],
        "mistakes": [],
        "recommendations": [],
        "studyEvents": [],
        "rubrics": [],
        "aiGradingResults": [],
        "knowledgeRelations": [],
        "reviewPolicies": [],
        "importJobs": [],
    }

    for row in conn.execute("SELECT * FROM users ORDER BY created_at"):
        db["users"].append(
            {
                "id": row["id"],
                "username": row["username"],
                "salt": row["salt"],
                "passwordHash": row["password_hash"],
                "createdAt": row["created_at"],
            }
        )

    for row in conn.execute("SELECT * FROM sessions ORDER BY created_at"):
        db["sessions"].append(
            {
                "token": row["token"],
                "userId": row["user_id"],
                "createdAt": row["created_at"],
                "expiresAt": row["expires_at"],
            }
        )

    for state_key, table_name in ENTITY_TABLES.items():
        for row in conn.execute(f"SELECT data FROM {table_name} ORDER BY rowid"):
            db[state_key].append(json.loads(row["data"]))

    return db


def write_db(conn, db):
    init(conn)
    with conn:
        for table in [
            "sessions",
            "users",
            "notes",
            "resources",
            "resource_chunks",
            "search_documents",
            "learning_paths",
            "learning_path_steps",
            "knowledge_points",
            "milestones",
            "plans",
            "review_reminders",
            "reflections",
            "goals",
            "projects",
            "questions",
            "answer_attempts",
            "mistakes",
            "recommendations",
            "study_events",
            "rubrics",
            "ai_grading_results",
            "knowledge_relations",
            "review_policies",
            "import_jobs",
        ]:
            conn.execute(f"DELETE FROM {table}")

        for user in db.get("users", []):
            conn.execute(
                """
                INSERT INTO users (id, username, salt, password_hash, created_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    user["id"],
                    user["username"],
                    user["salt"],
                    user["passwordHash"],
                    user["createdAt"],
                ),
            )

        for session in db.get("sessions", []):
            conn.execute(
                """
                INSERT INTO sessions (token, user_id, created_at, expires_at)
                VALUES (?, ?, ?, ?)
                """,
                (
                    session["token"],
                    session["userId"],
                    session["createdAt"],
                    session["expiresAt"],
                ),
            )

        for state_key, table_name in ENTITY_TABLES.items():
            for item in db.get(state_key, []):
                conn.execute(
                    f"""
                    INSERT INTO {table_name} (id, user_id, data, updated_at)
                    VALUES (?, ?, ?, ?)
                    """,
                    (
                        item["id"],
                        item["userId"],
                        json.dumps(item, ensure_ascii=True),
                        item.get("updatedAt") or item.get("createdAt"),
                    ),
                )


def main():
    if len(sys.argv) != 2:
        raise SystemExit("Usage: sqlite_driver.py <db-file>")

    request = json.loads(sys.stdin.read() or "{}")
    conn = connect(sys.argv[1])
    action = request.get("action")

    if action == "init":
        init(conn)
        print(json.dumps({"ok": True}))
        return

    if action == "read":
        init(conn)
        print(json.dumps({"db": read_db(conn)}, ensure_ascii=True))
        return

    if action == "write":
        write_db(conn, request.get("db", {}))
        print(json.dumps({"ok": True}))
        return

    raise SystemExit(f"Unknown action: {action}")


if __name__ == "__main__":
    main()
