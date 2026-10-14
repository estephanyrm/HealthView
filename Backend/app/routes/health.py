from flask import Blueprint, jsonify
from sqlalchemy import text

from app.extensions import db

bp = Blueprint("health", __name__)


@bp.get("/health")
def health():
    """Verifica que la API responde y que la base de datos es alcanzable."""
    db.session.execute(text("SELECT 1"))
    return jsonify({"estado": "ok", "base_de_datos": "conectada"}), 200
