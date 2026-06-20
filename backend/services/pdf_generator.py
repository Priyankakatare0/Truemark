# backend/services/pdf_generator.py

import os
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Image as RLImage, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from core.logging import logger
from models.schemas import CheckResponse, FingerprintDetail


class PDFGenerationError(Exception):
    """Raised when PDF generation fails."""

    def __init__(self, message: str, originality_score: float | None = None):
        super().__init__(message)
        self.originality_score = originality_score


def _find_thumbnail(fingerprint_id: str) -> str | None:
    uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
    for ext in (".jpg", ".jpeg", ".png", ".webp"):
        path = os.path.join(uploads_dir, f"{fingerprint_id}{ext}")
        if os.path.exists(path):
            return path
    return None


def generate_proof_report(
    fingerprint: FingerprintDetail,
    check_result: CheckResponse,
    output_path: str,
) -> None:
    """Generate a downloadable PDF proof report."""
    try:
        doc = SimpleDocTemplate(
            output_path,
            pagesize=letter,
            rightMargin=0.75 * inch,
            leftMargin=0.75 * inch,
            topMargin=0.75 * inch,
            bottomMargin=0.75 * inch,
        )

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            "Title",
            parent=styles["Heading1"],
            fontSize=22,
            textColor=colors.HexColor("#6366f1"),
            spaceAfter=12,
        )
        heading_style = ParagraphStyle(
            "Section",
            parent=styles["Heading2"],
            fontSize=14,
            textColor=colors.HexColor("#1e1b4b"),
            spaceBefore=16,
            spaceAfter=8,
        )
        body_style = styles["Normal"]

        story = []
        story.append(Paragraph("TrueMark Proof of Ownership Report", title_style))
        story.append(
            Paragraph(
                f"Generated {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}",
                body_style,
            )
        )
        story.append(Spacer(1, 0.25 * inch))

        thumb = _find_thumbnail(str(fingerprint.id))
        if thumb:
            try:
                story.append(RLImage(thumb, width=3 * inch, height=3 * inch))
                story.append(Spacer(1, 0.2 * inch))
            except Exception as e:
                logger.warning("Could not embed thumbnail in PDF: %s", e)

        meta_data = [
            ["Fingerprint ID", str(fingerprint.id)],
            ["File Name", fingerprint.file_name],
            ["SHA-256 Hash", fingerprint.file_hash],
            ["Perceptual Hash", fingerprint.phash],
            ["Owner Label", fingerprint.owner_label or "—"],
            ["Registered At", fingerprint.created_at.strftime("%Y-%m-%d %H:%M:%S UTC")],
            ["Originality Score", f"{check_result.originality_score}%"],
            ["Report ID", str(check_result.report_id)],
        ]
        meta_table = Table(meta_data, colWidths=[2 * inch, 4.5 * inch])
        meta_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f1f5f9")),
                    ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 10),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("WORDWRAP", (1, 0), (1, -1), True),
                ]
            )
        )
        story.append(Paragraph("Ownership Record", heading_style))
        story.append(meta_table)

        story.append(Paragraph("Similarity Findings", heading_style))
        if check_result.top_matches:
            match_rows = [["File", "Source", "Similarity"]]
            for m in check_result.top_matches[:5]:
                source = "Reference Library" if m.is_sample else "User Registry"
                match_rows.append(
                    [m.file_name, source, f"{round(m.similarity_score * 100, 1)}%"]
                )
            match_table = Table(match_rows, colWidths=[2.5 * inch, 2 * inch, 1.5 * inch])
            match_table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#6366f1")),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                        ("FONTSIZE", (0, 0), (-1, -1), 10),
                    ]
                )
            )
            story.append(match_table)
        else:
            story.append(
                Paragraph(
                    "No significant similarity matches were detected. This image appears original.",
                    body_style,
                )
            )

        story.append(Spacer(1, 0.3 * inch))
        story.append(
            Paragraph(
                "<i>This report was generated by TrueMark — an AI-powered digital ownership platform. "
                "The fingerprint combines SHA-256, perceptual hashing, and CLIP embeddings for tamper-evident proof.</i>",
                body_style,
            )
        )

        doc.build(story)
        logger.info("PDF report generated at %s", output_path)
    except Exception as e:
        logger.error("PDF generation failed: %s", e, exc_info=True)
        raise PDFGenerationError(
            str(e), originality_score=check_result.originality_score
        ) from e
