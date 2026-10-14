"""Formato de error único para toda la API:
{"error": {"codigo": 400, "mensaje": "...", "detalles": {...}}}
"""
from flask import jsonify
from sqlalchemy.exc import IntegrityError
from werkzeug.exceptions import HTTPException


class ApiError(Exception):
    def __init__(self, mensaje, status=400, detalles=None):
        super().__init__(mensaje)
        self.mensaje = mensaje
        self.status = status
        self.detalles = detalles


def _respuesta(status, mensaje, detalles=None):
    cuerpo = {"error": {"codigo": status, "mensaje": mensaje}}
    if detalles:
        cuerpo["error"]["detalles"] = detalles
    return jsonify(cuerpo), status


def register_error_handlers(app):
    @app.errorhandler(ApiError)
    def api_error(e):
        return _respuesta(e.status, e.mensaje, e.detalles)

    @app.errorhandler(IntegrityError)
    def integrity_error(e):
        from app.extensions import db

        db.session.rollback()
        # No exponemos el SQL ni el detalle interno al cliente
        return _respuesta(409, "La operación viola una restricción de integridad "
                               "(referencia inexistente, valor duplicado o dato inválido).")

    @app.errorhandler(HTTPException)
    def http_error(e):
        return _respuesta(e.code, e.description)

    @app.errorhandler(Exception)
    def unexpected_error(e):
        app.logger.exception(e)
        return _respuesta(500, "Error interno del servidor.")
