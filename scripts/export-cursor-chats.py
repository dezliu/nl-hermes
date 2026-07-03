#!/usr/bin/env python3
"""Export nl-hermes Cursor chats to Markdown under .cursor/agent/chat/.

Reads composer sessions from Cursor's global SQLite store and subagent
transcripts from ~/.cursor/projects/<slug>/agent-transcripts/.

Re-running clears the output directory and re-exports everything.

WARNING: Exported chats may contain sensitive business data. Do not commit
.cursor/agent/chat/ to version control.
"""

from __future__ import annotations

import json
import re
import shutil
import sqlite3
import sys
import tempfile
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any
from urllib.parse import unquote, urlparse


def resolve_repo_root() -> Path:
    return Path(__file__).resolve().parent.parent


def repo_file_uri(repo_root: Path) -> str:
    return repo_root.resolve().as_uri()


def project_slug(repo_root: Path) -> str:
    return str(repo_root.resolve()).lstrip("/").replace("/", "-")


def cursor_global_db() -> Path:
    return Path.home() / "Library/Application Support/Cursor/User/globalStorage/state.vscdb"


def workspace_storage_dir() -> Path:
    return Path.home() / "Library/Application Support/Cursor/User/workspaceStorage"


def agent_transcripts_dir(repo_root: Path) -> Path:
    return Path.home() / ".cursor/projects" / project_slug(repo_root) / "agent-transcripts"


def slugify(text: str, max_len: int = 60) -> str:
    text = (text or "untitled").strip()
    text = re.sub(r"[^\w\u4e00-\u9fff\-]+", "-", text, flags=re.UNICODE)
    text = re.sub(r"-+", "-", text).strip("-")
    return (text[:max_len].strip("-") or "untitled").lower()


def format_timestamp(ms: int | float | None) -> str:
    if not ms:
        return "unknown"
    return datetime.fromtimestamp(ms / 1000).strftime("%Y-%m-%d %H:%M")


def extract_user_query(text: str) -> str:
    match = re.search(r"<user_query>\s*(.*?)\s*</user_query>", text, re.DOTALL)
    if match:
        return match.group(1).strip()
    text = re.sub(r"<timestamp>.*?</timestamp>\s*", "", text, flags=re.DOTALL)
    return text.strip()


def pretty_json(value: Any) -> str:
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except json.JSONDecodeError:
            return value
    return json.dumps(value, ensure_ascii=False, indent=2)


def render_tool_details(name: str, payload: dict[str, Any]) -> str:
    body: dict[str, Any] = {}
    for key in ("rawArgs", "params", "result", "status"):
        if payload.get(key):
            body[key] = payload[key]
    if not body:
        body = payload
    return (
        f"<details>\n<summary>Tool: {name}</summary>\n\n"
        f"```json\n{pretty_json(body)}\n```\n</details>"
    )


def render_thinking(thinking: str) -> str:
    return f"<details>\n<summary>Thinking</summary>\n\n{thinking.strip()}\n</details>"


def is_redacted(text: str) -> bool:
    return text.strip() == "[REDACTED]"


def connect_db(db_path: Path) -> sqlite3.Connection:
    try:
        return sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    except sqlite3.OperationalError:
        tmp = Path(tempfile.gettempdir()) / "cursor-state-copy.vscdb"
        shutil.copy2(db_path, tmp)
        print("Note: copied DB to temp file because primary open failed.", file=sys.stderr)
        return sqlite3.connect(f"file:{tmp}?mode=ro", uri=True)


def resolve_workspace_id(repo_root: Path) -> str | None:
    target = repo_file_uri(repo_root)
    storage = workspace_storage_dir()
    if not storage.is_dir():
        return None
    for entry in storage.iterdir():
        ws_json = entry / "workspace.json"
        if not ws_json.is_file():
            continue
        try:
            data = json.loads(ws_json.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            continue
        folder = data.get("folder", "")
        if folder == target:
            return entry.name
    return None


def is_nl_hermes_composer(composer: dict[str, Any], repo_root: Path, workspace_id: str | None) -> bool:
    wid = composer.get("workspaceIdentifier") or {}
    uri_path = (wid.get("uri") or {}).get("path") or ""
    repo_path = str(repo_root.resolve())
    if workspace_id and wid.get("id") == workspace_id:
        return True
    if repo_path in uri_path:
        return True
    if uri_path and Path(unquote(urlparse(uri_path).path)).resolve() == repo_root.resolve():
        return True
    return False


def load_bubble(conn: sqlite3.Connection, composer_id: str, bubble_id: str) -> dict[str, Any] | None:
    row = conn.execute(
        "SELECT value FROM cursorDiskKV WHERE key = ?",
        (f"bubbleId:{composer_id}:{bubble_id}",),
    ).fetchone()
    if not row or not row[0]:
        return None
    try:
        return json.loads(row[0])
    except json.JSONDecodeError:
        return None


def normalize_thinking(value: Any) -> str:
    if not value:
        return ""
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, dict):
        return str(value.get("text") or "").strip()
    if isinstance(value, list):
        chunks: list[str] = []
        for item in value:
            if isinstance(item, str):
                chunks.append(item.strip())
            elif isinstance(item, dict):
                text = str(item.get("text") or "").strip()
                if text:
                    chunks.append(text)
        return "\n\n".join(chunks)
    return str(value).strip()


def bubble_to_parts(bubble: dict[str, Any]) -> list[str]:
    parts: list[str] = []
    text = (bubble.get("text") or bubble.get("rawText") or "").strip()
    if text and not is_redacted(text):
        if bubble.get("type") == 1:
            parts.append(extract_user_query(text))
        else:
            parts.append(text)

    thinking = normalize_thinking(bubble.get("thinking"))
    if not thinking:
        thinking = normalize_thinking(bubble.get("allThinkingBlocks"))
    if thinking and not is_redacted(thinking):
        parts.append(render_thinking(thinking))

    tool_data = bubble.get("toolFormerData")
    if isinstance(tool_data, dict) and tool_data.get("name"):
        parts.append(render_tool_details(str(tool_data["name"]), tool_data))

    for tool_result in bubble.get("toolResults") or []:
        if not isinstance(tool_result, dict):
            continue
        name = tool_result.get("name") or tool_result.get("toolName") or "tool"
        parts.append(render_tool_details(str(name), tool_result))

    return [p for p in parts if p.strip()]


def load_archived_composer_ids(conn: sqlite3.Connection) -> set[str]:
    """Return composer IDs marked as archived in Cursor sidebar."""
    archived: set[str] = set()

    row = conn.execute(
        "SELECT value FROM ItemTable WHERE key = ?",
        ("composer.composerHeaders",),
    ).fetchone()
    if row and row[0]:
        try:
            payload = json.loads(row[0])
        except json.JSONDecodeError:
            payload = {}
        for entry in payload.get("allComposers") or []:
            if not isinstance(entry, dict):
                continue
            composer_id = entry.get("composerId")
            if composer_id and entry.get("isArchived"):
                archived.add(composer_id)

    # Fallback for Cursor versions that populate the dedicated table.
    try:
        for composer_id, is_archived in conn.execute(
            "SELECT composerId, isArchived FROM composerHeaders WHERE isArchived = 1"
        ):
            if composer_id:
                archived.add(composer_id)
    except sqlite3.OperationalError:
        pass

    return archived


def load_composers(
    conn: sqlite3.Connection,
    repo_root: Path,
    workspace_id: str | None,
    archived_ids: set[str] | None = None,
) -> list[dict[str, Any]]:
    archived_ids = archived_ids or set()
    composers: list[dict[str, Any]] = []
    for _key, val in conn.execute("SELECT key, value FROM cursorDiskKV WHERE key LIKE 'composerData:%'"):
        if not val:
            continue
        try:
            composer = json.loads(val)
        except json.JSONDecodeError:
            continue
        if composer.get("composerId") in archived_ids:
            continue
        if is_nl_hermes_composer(composer, repo_root, workspace_id):
            composers.append(composer)
    composers.sort(key=lambda c: c.get("createdAt") or 0)
    return composers


def composer_to_markdown(conn: sqlite3.Connection, composer: dict[str, Any]) -> str:
    composer_id = composer["composerId"]
    name = composer.get("name") or "Untitled"
    created = format_timestamp(composer.get("createdAt"))
    mode = composer.get("unifiedMode") or "unknown"
    agentic = composer.get("isAgentic")

    lines = [
        f"# {name}",
        "",
        f"- **ID**: `{composer_id}`",
        f"- **创建时间**: {created}",
        f"- **模式**: {mode}",
        f"- **Agentic**: {agentic}",
        "",
        "---",
        "",
    ]

    headers = composer.get("fullConversationHeadersOnly") or []
    current_role: str | None = None

    for header in headers:
        bubble_id = header.get("bubbleId")
        if not bubble_id:
            continue
        bubble = load_bubble(conn, composer_id, bubble_id)
        if not bubble:
            continue

        role = "用户" if bubble.get("type") == 1 else "助手"
        parts = bubble_to_parts(bubble)
        if not parts:
            continue

        if role != current_role:
            lines.append(f"## {role}")
            lines.append("")
            current_role = role

        lines.extend(parts)
        lines.append("")

    return "\n".join(lines).rstrip() + "\n"


def parse_jsonl_line(line: str) -> dict[str, Any] | None:
    line = line.strip()
    if not line:
        return None
    try:
        return json.loads(line)
    except json.JSONDecodeError:
        return None


def jsonl_content_to_parts(entry: dict[str, Any]) -> list[str]:
    parts: list[str] = []
    message = entry.get("message") or {}
    content = message.get("content") or []
    if isinstance(content, str):
        if content.strip() and not is_redacted(content):
            parts.append(content.strip())
        return parts

    for block in content:
        if not isinstance(block, dict):
            continue
        block_type = block.get("type")
        if block_type == "text":
            text = (block.get("text") or "").strip()
            if text and not is_redacted(text):
                role = entry.get("role")
                if role == "user":
                    parts.append(extract_user_query(text))
                else:
                    parts.append(text)
        elif block_type == "tool_use":
            name = block.get("name") or "tool"
            payload = block.get("input") or block
            parts.append(render_tool_details(str(name), payload if isinstance(payload, dict) else {"input": payload}))
    return parts


def jsonl_to_markdown(path: Path, title: str) -> str:
    lines = [
        f"# {title}",
        "",
        f"- **来源**: `{path.name}`",
        "",
        "---",
        "",
    ]
    current_role: str | None = None

    for raw in path.read_text(encoding="utf-8").splitlines():
        entry = parse_jsonl_line(raw)
        if not entry:
            continue
        if entry.get("type") == "turn_ended":
            continue

        role_key = entry.get("role")
        if role_key not in ("user", "assistant"):
            continue
        role = "用户" if role_key == "user" else "助手"
        parts = jsonl_content_to_parts(entry)
        if not parts:
            continue

        if role != current_role:
            lines.append(f"## {role}")
            lines.append("")
            current_role = role
        lines.extend(parts)
        lines.append("")

    return "\n".join(lines).rstrip() + "\n"


def infer_subagent_title(path: Path) -> str:
    for raw in path.read_text(encoding="utf-8").splitlines():
        entry = parse_jsonl_line(raw)
        if not entry or entry.get("role") != "user":
            continue
        parts = jsonl_content_to_parts(entry)
        if parts:
            first = parts[0].splitlines()[0][:80]
            return slugify(first, max_len=40)
    return "subagent"


@dataclass
class ExportedChat:
    index: int
    filename: str
    title: str
    created: str
    composer_id: str


@dataclass
class ExportedSubagent:
    parent_index: int
    parent_id: str
    filename: str
    title: str
    subagent_id: str


def clean_output_dir(out_dir: Path) -> None:
    if out_dir.exists():
        shutil.rmtree(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)


def index_width(count: int) -> int:
    if count <= 0:
        return 2
    return max(2, len(str(count - 1)))


def export_main_chats(
    conn: sqlite3.Connection,
    composers: list[dict[str, Any]],
    out_dir: Path,
) -> list[ExportedChat]:
    exported: list[ExportedChat] = []
    width = index_width(len(composers))

    for i, composer in enumerate(composers):
        title = composer.get("name") or "Untitled"
        filename = f"{i:0{width}d}_{slugify(title)}.md"
        content = composer_to_markdown(conn, composer)
        (out_dir / filename).write_text(content, encoding="utf-8")
        exported.append(
            ExportedChat(
                index=i,
                filename=filename,
                title=title,
                created=format_timestamp(composer.get("createdAt")),
                composer_id=composer["composerId"],
            )
        )
    return exported


def export_subagents(
    repo_root: Path,
    composer_index_by_id: dict[str, int],
    composer_width: int,
    out_dir: Path,
) -> list[ExportedSubagent]:
    transcripts = agent_transcripts_dir(repo_root)
    sub_out = out_dir / "subagents"
    sub_out.mkdir(parents=True, exist_ok=True)
    exported: list[ExportedSubagent] = []

    if not transcripts.is_dir():
        return exported

    for jsonl_path in sorted(transcripts.glob("*/subagents/*.jsonl")):
        parent_id = jsonl_path.parent.parent.name
        subagent_id = jsonl_path.stem
        parent_index = composer_index_by_id.get(parent_id)
        if parent_index is None:
            continue
        title = infer_subagent_title(jsonl_path)
        parent_prefix = f"{parent_index:0{composer_width}d}"
        filename = f"{parent_prefix}_{subagent_id[:8]}_{title}.md"
        content = jsonl_to_markdown(jsonl_path, f"Subagent {subagent_id[:8]}")
        (sub_out / filename).write_text(content, encoding="utf-8")
        exported.append(
            ExportedSubagent(
                parent_index=parent_index,
                parent_id=parent_id,
                filename=f"subagents/{filename}",
                title=title,
                subagent_id=subagent_id,
            )
        )
    return exported


def write_index(
    out_dir: Path,
    main_chats: list[ExportedChat],
    subagents: list[ExportedSubagent],
    archived_count: int = 0,
) -> None:
    lines = [
        "# nl-hermes Cursor 聊天导出",
        "",
        f"- **导出时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        f"- **主会话数**: {len(main_chats)}",
        f"- **子 agent 数**: {len(subagents)}",
    ]
    if archived_count:
        lines.append(f"- **已排除归档会话**: {archived_count}")
    lines.extend([
        "",
        "## 主会话（按时间升序）",
        "",
    ])
    for chat in main_chats:
        lines.append(f"- `{chat.index:02d}` [{chat.title}]({chat.filename}) — {chat.created}")

    if subagents:
        lines.extend(["", "## 子 agent 会话", ""])
        for sub in subagents:
            lines.append(
                f"- 主会话 `{sub.parent_index:02d}` [{sub.title}]({sub.filename}) — `{sub.subagent_id[:8]}`"
            )

    (out_dir / "INDEX.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def count_nl_hermes_archived(
    conn: sqlite3.Connection,
    repo_root: Path,
    workspace_id: str | None,
    archived_ids: set[str],
) -> int:
    if not archived_ids:
        return 0
    count = 0
    for _key, val in conn.execute("SELECT key, value FROM cursorDiskKV WHERE key LIKE 'composerData:%'"):
        if not val:
            continue
        try:
            composer = json.loads(val)
        except json.JSONDecodeError:
            continue
        if composer.get("composerId") in archived_ids and is_nl_hermes_composer(
            composer, repo_root, workspace_id
        ):
            count += 1
    return count


def main() -> int:
    repo_root = resolve_repo_root()
    out_dir = repo_root / ".cursor/agent/chat"
    db_path = cursor_global_db()

    if not db_path.is_file():
        print(f"Error: Cursor database not found at {db_path}", file=sys.stderr)
        return 1

    workspace_id = resolve_workspace_id(repo_root)
    if workspace_id:
        print(f"Workspace ID: {workspace_id}")
    else:
        print("Warning: workspace ID not found; falling back to repo path matching.", file=sys.stderr)

    clean_output_dir(out_dir)

    conn = connect_db(db_path)
    nl_archived_count = 0
    try:
        archived_ids = load_archived_composer_ids(conn)
        nl_archived_count = count_nl_hermes_archived(conn, repo_root, workspace_id, archived_ids)
        composers = load_composers(conn, repo_root, workspace_id, archived_ids)
        if not composers:
            print("No active nl-hermes chats found.", file=sys.stderr)
            return 1

        main_chats = export_main_chats(conn, composers, out_dir)
        composer_index_by_id = {chat.composer_id: chat.index for chat in main_chats}
        width = index_width(len(composers))
        subagents = export_subagents(repo_root, composer_index_by_id, width, out_dir)
        write_index(out_dir, main_chats, subagents, archived_count=nl_archived_count)
    finally:
        conn.close()

    print(f"Exported {len(main_chats)} chats and {len(subagents)} subagents to {out_dir}")
    if nl_archived_count:
        print(f"Skipped {nl_archived_count} archived chat(s).")
    print("If export looks incomplete, close Cursor and run again.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
