"""
Flask application for the Japanese 履歴書 (Rirekisho) CV Maker.

Provides API endpoints for generating rirekisho PDFs, previewing them,
querying era data, and downloading the required Japanese font.
"""

import traceback

from flask import Flask, jsonify, render_template, request, send_file

import era_converter
import pdf_generator

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024  # 16 MB


@app.after_request
def _add_cors_headers(response):
    """Add permissive CORS headers to every response."""
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return response


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@app.route("/")
def index():
    """Serve the main application page."""
    return render_template("index.html")


@app.route("/api/generate", methods=["POST"])
def generate_pdf():
    """
    Generate a rirekisho PDF and return it as a downloadable attachment.

    Expects a JSON body matching the rirekisho data schema.
    Returns the PDF with ``Content-Disposition: attachment``.
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Invalid or missing JSON body"}), 400

    try:
        pdf_bytes = pdf_generator.generate_rirekisho_pdf(data)
    except Exception as exc:
        traceback.print_exc()
        return jsonify({"error": f"PDF generation failed: {exc}"}), 500

    import io

    return send_file(
        io.BytesIO(pdf_bytes),
        mimetype="application/pdf",
        as_attachment=True,
        download_name="rirekisho.pdf",
    )


@app.route("/api/preview", methods=["POST"])
def preview_pdf():
    """
    Generate a rirekisho PDF and return it for inline viewing (iframe preview).

    Same as ``/api/generate`` but uses ``Content-Disposition: inline``.
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Invalid or missing JSON body"}), 400

    try:
        pdf_bytes = pdf_generator.generate_rirekisho_pdf(data)
    except Exception as exc:
        traceback.print_exc()
        return jsonify({"error": f"PDF generation failed: {exc}"}), 500

    return send_file(
        io.BytesIO(pdf_bytes),
        mimetype="application/pdf",
        as_attachment=False,
        download_name="rirekisho.pdf",
    )


def pdf_to_preview_png(pdf_bytes: bytes) -> bytes:
    """Convert PDF bytes to high-resolution PNG image bytes using pdftoppm."""
    import subprocess
    proc = subprocess.run(
        ["pdftoppm", "-png", "-r", "150", "-singlefile"],
        input=pdf_bytes,
        capture_output=True,
        check=True,
    )
    return proc.stdout


@app.route("/api/preview-image", methods=["POST"])
def preview_image():
    """
    Generate rirekisho PDF and return high-resolution rendered PNG
    for instant browser preview without PDF plugin dependencies.
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Invalid or missing JSON body"}), 400

    try:
        pdf_bytes = pdf_generator.generate_rirekisho_pdf(data)
        png_bytes = pdf_to_preview_png(pdf_bytes)
    except Exception as exc:
        traceback.print_exc()
        return jsonify({"error": f"Preview image generation failed: {exc}"}), 500

    import io

    return send_file(
        io.BytesIO(png_bytes),
        mimetype="image/png",
        as_attachment=False,
    )



@app.route("/api/eras", methods=["GET"])
def get_eras():
    """
    Return a JSON list of Japanese era choices.

    Each item contains ``name``, ``romaji``, ``start_year``,
    and ``end_year`` (null for the current era).
    """
    return jsonify(era_converter.get_era_choices())


@app.route("/api/download-font", methods=["POST"])
def download_font():
    """
    Download the IPAex Mincho font to the server's ``fonts/`` directory.

    Returns JSON with a ``status`` key on success, or an ``error`` key
    on failure.
    """
    try:
        pdf_generator.download_font()
        return jsonify({"status": "ok", "message": "Font downloaded successfully"})
    except Exception as exc:
        traceback.print_exc()
        return jsonify({"error": f"Font download failed: {exc}"}), 500


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
