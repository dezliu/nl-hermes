from __future__ import annotations

import io
import os
from typing import Any

import matplotlib

matplotlib.use('Agg')
import matplotlib.pyplot as plt
from docx import Document
from docx.shared import Inches
from fastapi import FastAPI
from fastapi.responses import Response
from pydantic import BaseModel

app = FastAPI(title='hermes-render-worker', version='0.1.0')


class RenderWordRequest(BaseModel):
    spec: dict[str, Any]
    echartsOptions: list[dict[str, Any]] | None = None


class RenderChartRequest(BaseModel):
    chartType: str
    chartConfig: dict[str, Any]
    rows: list[dict[str, Any]]


def render_chart_png(req: RenderChartRequest) -> bytes:
    rows = req.rows
    cfg = req.chartConfig
    x_field = cfg.get('xField', 'x')
    y_field = cfg.get('yField', 'y')
    xs = [str(row.get(x_field, '')) for row in rows]
    ys = [float(row.get(y_field, 0) or 0) for row in rows]

    fig, ax = plt.subplots(figsize=(8, 4.5))
    title = cfg.get('title') or '报表图表'
    ax.set_title(title)
    if req.chartType == 'bar':
        ax.bar(xs, ys, color='#f97316')
    elif req.chartType == 'pie':
        ax.pie(ys, labels=xs, autopct='%1.1f%%')
    else:
        ax.plot(xs, ys, marker='o', color='#f97316')
    ax.tick_params(axis='x', rotation=30)
    fig.tight_layout()
    buf = io.BytesIO()
    fig.savefig(buf, format='png', dpi=150)
    plt.close(fig)
    return buf.getvalue()


@app.get('/health')
def health() -> dict[str, str]:
    return {'status': 'ok'}


@app.post('/render/chart')
def render_chart(req: RenderChartRequest) -> Response:
    png = render_chart_png(req)
    return Response(content=png, media_type='image/png')


@app.post('/render/word')
def render_word(req: RenderWordRequest) -> Response:
    spec = req.spec
    narrative = spec.get('narrative', {})
    data = spec.get('data', {})
    rows = data.get('rows', [])
    charts = spec.get('charts', [])

    doc = Document()
    doc.add_heading(str(spec.get('title', '数据报表')), level=0)
    doc.add_paragraph(str(narrative.get('summary', '')))

    for insight in narrative.get('insights', []) or []:
        doc.add_paragraph(str(insight), style='List Bullet')

    for section in narrative.get('sections', []) or []:
        doc.add_heading(str(section.get('title', '章节')), level=2)
        doc.add_paragraph(str(section.get('body', '')))

    if charts and rows:
        chart = charts[0]
        chart_req = RenderChartRequest(
            chartType=str(chart.get('chartType', 'line')),
            chartConfig=chart.get('chartConfig', {}),
            rows=rows,
        )
        png = render_chart_png(chart_req)
        stream = io.BytesIO(png)
        doc.add_picture(stream, width=Inches(6))

    if rows:
        doc.add_heading('数据明细', level=2)
        headers = list(rows[0].keys()) if rows else []
        table = doc.add_table(rows=1, cols=len(headers) or 1)
        if headers:
            hdr_cells = table.rows[0].cells
            for idx, header in enumerate(headers):
                hdr_cells[idx].text = str(header)
            for row in rows[:30]:
                cells = table.add_row().cells
                for idx, header in enumerate(headers):
                    cells[idx].text = str(row.get(header, ''))

    buf = io.BytesIO()
    doc.save(buf)
    return Response(
        content=buf.getvalue(),
        media_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    )


if __name__ == '__main__':
    import uvicorn

    port = int(os.environ.get('PORT', '4060'))
    uvicorn.run(app, host='0.0.0.0', port=port)
