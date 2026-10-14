from .catalogos import (CausaExterna, Departamento, Diagnostico, Eps, Municipio,
                        Prestador, TipoUsuario, ViaIngreso)
from .hospitalizacion import Hospitalizacion, HospitalizacionDiagnostico

__all__ = [
    "Departamento", "Municipio", "Eps", "Prestador", "Diagnostico",
    "ViaIngreso", "CausaExterna", "TipoUsuario",
    "Hospitalizacion", "HospitalizacionDiagnostico",
]
