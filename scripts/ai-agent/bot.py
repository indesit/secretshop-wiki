import os
import re
import json
import shlex
import subprocess
from datetime import datetime, timezone
from dotenv import load_dotenv
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes

# Load .env variables
load_dotenv()
TELEGRAM_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
OLLAMA_MODEL = "phi3:mini"
WIKI_DIR = "/root/company-wiki"

# Synced with scripts/new-doc.mjs ALLOWED_TYPES + ALLOWED_DOMAINS.
ALLOWED_TYPES = {
    "policy", "regulation", "sop", "instruction", "checklist",
    "template", "incident", "decision-log", "brand",
}
ALLOWED_DOMAINS = {
    "company", "stores", "product", "returns-and-warranty",
    "sales", "cash", "hr",
}
SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9-]*$")
SUBDOMAIN_RE = re.compile(r"^[a-z0-9][a-z0-9-]*$")


def run(cmd_list, **kw):
    """Run a command as a list (no shell=True). Returns CompletedProcess."""
    return subprocess.run(cmd_list, cwd=WIKI_DIR, capture_output=True, text=True, **kw)

def query_ollama(prompt, system_prompt):
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "system": system_prompt,
        "stream": False
    }
    curl_cmd = [
        "curl", "-s", "-X", "POST", "http://localhost:11434/api/generate",
        "-H", "Content-Type: application/json",
        "-d", json.dumps(payload)
    ]
    try:
        result = subprocess.run(curl_cmd, capture_output=True, text=True, check=True)
        response_data = json.loads(result.stdout)
        return response_data.get("response", "Помилка генерації.")
    except Exception as e:
        return f"Помилка з'єднання з Ollama: {e}"

def get_system_prompt():
    try:
        with open(os.path.join(WIKI_DIR, "AGENT_INSTRUCTIONS.md"), "r", encoding="utf-8") as f:
            return f.read()
    except Exception:
        return "Ти — корисний помічник-редактор Wiki."

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    context.user_data['history'] = []
    await update.message.reply_text(
        f"Привіт! Я AI-редактор Wiki (модель: {OLLAMA_MODEL}).\n"
        "Команди:\n"
        "  /create — створити чернетку документа з нашої розмови;\n"
        "  /pr — провалідувати, закомітити в feature-гілку і відкрити PR;\n"
        "  /reset — очистити контекст розмови."
    )

async def reset(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    context.user_data['history'] = []
    await update.message.reply_text("Контекст очищено. Починаємо з чистого аркуша.")

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user_text = update.message.text
    
    if 'history' not in context.user_data:
        context.user_data['history'] = []
        
    history = context.user_data['history']
    history.append(f"Користувач: {user_text}")
    
    # Keep history manageable (last 10 turns)
    if len(history) > 20:
        history = history[-20:]
        
    full_prompt = "\n".join(history) + "\nАсистент:"
    system_prompt = get_system_prompt()
    
    await update.message.reply_text("⏳ Думаю...")
    
    response = query_ollama(full_prompt, system_prompt)
    
    history.append(f"Асистент: {response}")
    await update.message.reply_text(response)

def parse_new_doc_args(cmd_response: str):
    """Parse `node scripts/new-doc.mjs --type X --domain Y ...` and validate each arg.

    Returns (args_list, error_str). args_list is the safe list-form for subprocess.
    """
    text = cmd_response.strip()
    if not text.startswith("node scripts/new-doc.mjs"):
        return None, f"Очікувано команду 'node scripts/new-doc.mjs ...', отримано:\n{text[:200]}"

    try:
        tokens = shlex.split(text)
    except ValueError as e:
        return None, f"Не вдалось розпарсити команду: {e}"

    flags = {}
    i = 2  # skip "node" and "scripts/new-doc.mjs"
    while i < len(tokens):
        if not tokens[i].startswith("--"):
            return None, f"Очікувано флаг, отримано: {tokens[i]}"
        if i + 1 >= len(tokens):
            return None, f"Флаг {tokens[i]} без значення"
        flags[tokens[i][2:]] = tokens[i + 1]
        i += 2

    required = ("type", "domain", "slug", "title")
    for k in required:
        if k not in flags or not flags[k]:
            return None, f"Відсутній обов'язковий флаг: --{k}"

    if flags["type"] not in ALLOWED_TYPES:
        return None, f"Невалідний type='{flags['type']}'. Дозволено: {sorted(ALLOWED_TYPES)}"
    if flags["domain"] not in ALLOWED_DOMAINS:
        return None, f"Невалідний domain='{flags['domain']}'. Дозволено: {sorted(ALLOWED_DOMAINS)}"
    if not SLUG_RE.match(flags["slug"]):
        return None, f"Невалідний slug='{flags['slug']}'. Має бути lowercase + kebab-case."
    if "subdomain" in flags and flags["subdomain"] and not SUBDOMAIN_RE.match(flags["subdomain"]):
        return None, f"Невалідний subdomain='{flags['subdomain']}'."

    args = ["node", "scripts/new-doc.mjs"]
    for k, v in flags.items():
        args.extend([f"--{k}", v])
    return args, None


async def create_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Generate new-doc args via LLM, validate, then run via list-form (no shell=True)."""
    if 'history' not in context.user_data or not context.user_data['history']:
        await update.message.reply_text("Спочатку обговоріть документ у чаті, а потім викличте /create")
        return

    await update.message.reply_text("⌛ Формую команду створення документа...")

    prompt = """
    На основі нашої історії сформуй команду для створення markdown-файлу.
    Формат повинен бути строго таким, без жодних інших слів:
    node scripts/new-doc.mjs --type [тип] --domain [домен] --subdomain [піддомен] --slug [slug] --title "[назва]"
    Використовуй правильні папки згідно зі структурою.
    Історія:
    """ + "\n".join(context.user_data['history'])

    cmd_response = query_ollama(prompt, "Ти повертаєш лише bash команду, без пояснень.").strip()

    args, err = parse_new_doc_args(cmd_response)
    if err:
        await update.message.reply_text(f"❌ {err}")
        return

    safe_repr = " ".join(shlex.quote(a) for a in args)
    await update.message.reply_text(f"Виконую (validated):\n`{safe_repr}`", parse_mode="Markdown")
    result = run(args)
    if result.returncode != 0:
        await update.message.reply_text(f"❌ new-doc.mjs впав:\n{result.stderr or result.stdout}")
        return

    context.user_data['last_create_stdout'] = result.stdout
    await update.message.reply_text(
        f"✅ Готово:\n{result.stdout}\n\nЩоб відкрити PR — виконай /pr"
    )


async def push_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Deprecated alias for /pr — kept for backward compat. Never pushes to main."""
    await update.message.reply_text(
        "ℹ️ /push більше не пушить у main. Використовуй /pr — створить feature-гілку, "
        "запустить валідацію і відкриє PR."
    )
    await pr_cmd(update, context)


async def pr_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Validate → create feature branch → commit → push → open PR. Never pushes to main."""

    # 1. Check there is something to commit in docs/.
    status = run(["git", "status", "--porcelain", "docs/"])
    if status.returncode != 0:
        await update.message.reply_text(f"❌ git status впав:\n{status.stderr}")
        return
    if not status.stdout.strip():
        await update.message.reply_text("ℹ️ Немає змін у docs/ — нема чого пушити.")
        return

    # 2. Block accidental run on main: refuse if HEAD == main and there are unrelated changes.
    branch = run(["git", "rev-parse", "--abbrev-ref", "HEAD"]).stdout.strip()
    if branch == "main":
        await update.message.reply_text("⚠️ Поточна гілка — main. Створюю feature-гілку.")

    # 3. Validate frontmatter BEFORE committing.
    await update.message.reply_text("⌛ Валідую frontmatter...")
    val = run(["node", "scripts/validate-frontmatter.mjs"])
    if val.returncode != 0:
        await update.message.reply_text(
            f"❌ validate-frontmatter впав. Виправ помилки і повтори /pr:\n{val.stdout or val.stderr}"
        )
        return

    # 4. Regenerate sidebar + indexes (so committed sidebar matches docs).
    sb = run(["node", "scripts/generate-sidebar.mjs"])
    if sb.returncode != 0:
        await update.message.reply_text(f"❌ generate-sidebar впав:\n{sb.stderr or sb.stdout}")
        return
    idx = run(["node", "scripts/generate-indexes.mjs"])
    if idx.returncode != 0:
        await update.message.reply_text(f"❌ generate-indexes впав:\n{idx.stderr or idx.stdout}")
        return

    # 5. Create feature branch.
    ts = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    branch_name = f"docs/ai-bot/{ts}"
    co = run(["git", "checkout", "-b", branch_name])
    if co.returncode != 0:
        await update.message.reply_text(f"❌ Не вдалось створити гілку {branch_name}:\n{co.stderr}")
        return

    # 6. Stage only docs/ + generated sidebar/meta. Never `git add .`.
    add = run([
        "git", "add",
        "docs/",
        "docs/.vitepress/generated-sidebar.json",
        "docs/.vitepress/generated-docs-meta.json",
    ])
    if add.returncode != 0:
        await update.message.reply_text(f"❌ git add впав:\n{add.stderr}")
        return

    # 7. Commit (only if there are staged changes).
    diff = run(["git", "diff", "--cached", "--name-only"])
    if not diff.stdout.strip():
        await update.message.reply_text("ℹ️ Після нормалізації стейджу нема що комітити.")
        return

    commit_msg = "docs(ai-bot): draft from telegram session\n\n" + (
        "Auto-generated draft from Telegram chat with the wiki editor bot.\n"
        "Status: draft. Requires human review before merge.\n"
    )
    cm = run(["git", "commit", "-m", commit_msg])
    if cm.returncode != 0:
        await update.message.reply_text(f"❌ git commit впав:\n{cm.stderr or cm.stdout}")
        return

    # 8. Push the feature branch (never main).
    push = run(["git", "push", "-u", "origin", branch_name])
    if push.returncode != 0:
        await update.message.reply_text(f"❌ git push впав:\n{push.stderr or push.stdout}")
        return

    # 9. Try to open PR via gh CLI (optional — degrade gracefully if gh not installed).
    pr_body = "Draft documents from Telegram bot session. Status: draft. Requires editorial review."
    pr = run(["gh", "pr", "create", "--title", f"docs(ai-bot): draft from {ts}",
              "--body", pr_body, "--base", "main", "--head", branch_name])
    if pr.returncode == 0:
        await update.message.reply_text(f"✅ PR створено:\n{pr.stdout.strip()}")
    else:
        await update.message.reply_text(
            f"✅ Гілку {branch_name} запушено. Відкрий PR вручну на GitHub.\n"
            f"(gh pr create не доступний: {pr.stderr.strip()[:200]})"
        )

def main() -> None:
    if not TELEGRAM_TOKEN or TELEGRAM_TOKEN == "YOUR_TELEGRAM_BOT_TOKEN":
        print("Set TELEGRAM_BOT_TOKEN in .env")
        return

    application = Application.builder().token(TELEGRAM_TOKEN).build()

    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("reset", reset))
    application.add_handler(CommandHandler("create", create_cmd))
    application.add_handler(CommandHandler("pr", pr_cmd))
    application.add_handler(CommandHandler("push", push_cmd))  # legacy alias → forwards to /pr
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    print("Bot is running...")
    application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == "__main__":
    main()
