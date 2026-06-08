#!/bin/bash
# Переходимо в папку проекту
cd /root/company-wiki || exit

# Отримуємо зміни з GitHub
# Використовуємо --no-rebase щоб уникнути конфліктів у разі випадкових локальних змін
git pull origin main --no-rebase -q

# Оскільки VitePress в режимі dev автоматично підхоплює зміни файлів,
# перезавантажувати сервер не обов'язково.
# Але якщо були змінені залежності (package.json), можна додати npm install.
# npm install -q
