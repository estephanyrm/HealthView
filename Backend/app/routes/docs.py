from pathlib import Path

from flask import Blueprint, render_template_string, send_file

bp = Blueprint("api_docs", __name__)
OPENAPI_SPEC = Path(__file__).resolve().parents[3] / "docs" / "openapi.yaml"

SWAGGER_UI = """<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>HealthView API | Swagger UI</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui.css">
    <style>
      body { margin: 0; background: #f5f6f0; }
      .swagger-ui .topbar { background: #285c4d; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui-bundle.js"></script>
    <script>
      window.addEventListener("load", function () {
        window.ui = SwaggerUIBundle({
          url: "/api/openapi.yaml",
          dom_id: "#swagger-ui",
          deepLinking: true,
          presets: [SwaggerUIBundle.presets.apis],
          layout: "BaseLayout"
        });
      });
    </script>
  </body>
</html>"""


@bp.get("/api/docs")
@bp.get("/swagger")
def swagger_ui():
    return render_template_string(SWAGGER_UI)


@bp.get("/api/openapi.yaml")
def openapi_spec():
    return send_file(OPENAPI_SPEC, mimetype="application/yaml")
