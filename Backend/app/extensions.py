"""Extensiones instanciadas sin app; se inicializan en create_app()."""
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
cors = CORS()
