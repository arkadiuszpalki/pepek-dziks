# Instrukcje bezpieczeństwa

## Co zrobić po wykryciu wycieku tokenu JSON Web

1. **Natychmiast zregeneruj skompromitowany token**

   - Zaloguj się do [panelu Supabase](https://app.supabase.com)
   - Przejdź do ustawień projektu > API
   - Zregeneruj klucz `anon public`
   - Zanotuj nowy klucz, aby zaktualizować go w aplikacji

2. **Aktualizacja aplikacji**

   - Zaktualizuj klucz w Webflow zgodnie z instrukcjami w README.md
   - Upewnij się, że nowy klucz jest poprawnie skonfigurowany

3. **Oczyszczanie historii Git**

   - Jeśli token został wykryty w historii commitów, użyj narzędzia BFG lub git-filter-branch
   - Przykład użycia BFG (https://rtyley.github.io/bfg-repo-cleaner/):
     ```
     bfg --replace-text secrets.txt my-repo.git
     ```
   - gdzie secrets.txt zawiera token w formacie:
     ```
     eyJhbGciOiJIUzI1NiIsInR5cCI --> SECRETKEY
     ```

4. **Dodatkowe środki bezpieczeństwa**
   - Rozważ użycie funkcji pośredniczących (serverless functions) do obsługi zapytań API
   - Implementuj mechanizm rotacji kluczy
   - Monitoruj logi dostępu do API i szukaj podejrzanych wzorców

## Zapobieganie wyciekom w przyszłości

1. **Używaj zmiennych środowiskowych**

   - Nigdy nie umieszczaj kluczy bezpośrednio w kodzie
   - Korzystaj z systemu zmiennych środowiskowych Webflow lub Custom Attributes

2. **Używaj pre-commit hooks**

   - Dodaj git hook, który sprawdza kod przed zatwierdzeniem
   - Możesz użyć narzędzi takich jak:
     - [git-secrets](https://github.com/awslabs/git-secrets)
     - [detect-secrets](https://github.com/Yelp/detect-secrets)

3. **Skanuj kod regularnie**
   - Kontynuuj korzystanie z GitGuardian lub podobnych narzędzi
   - Ustaw automatyczne skanowanie co najmniej raz w tygodniu
