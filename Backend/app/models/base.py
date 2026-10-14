class SerializableMixin:
    """to_dict() genérico: convierte las columnas de la tabla en un diccionario JSON-friendly."""

    def to_dict(self):
        resultado = {}
        for col in self.__table__.columns:
            valor = getattr(self, col.name)
            if hasattr(valor, "isoformat"):  # date, time, datetime
                valor = valor.isoformat()
            resultado[col.name] = valor
        return resultado
