# Pepek Dziks - Konfiguracja bezpieczeństwa

## Bezpieczne zarządzanie kluczem API Supabase

Aby aplikacja działała poprawnie bez narażania klucza API na wycieki, należy skonfigurować go w Webflow w jeden z poniższych sposobów:

### Metoda 1: Custom Attribute w Webflow

1. Przejdź do panelu Webflow dla tej strony
2. Dodaj ukryty element (np. div) gdzieś w strukturze strony
3. Dodaj Custom Attribute: `data-supabase-key` z wartością klucza API
4. Opcjonalnie ustaw ten element jako `display: none` w stylach

```html
<!-- Przykład -->
<div data-supabase-key="twój-klucz-api" style="display: none;"></div>
```

### Metoda 2: Zmienna środowiskowa przez window.**env**

1. Dodaj skrypt inicjalizujący przed głównym skryptem:

```html
<script>
  window.__env__ = {
    SUPABASE_KEY: "twój-klucz-api",
  };
</script>
```

### Uwagi dotyczące bezpieczeństwa:

- **NIGDY** nie commituj kluczy API bezpośrednio do repozytorium
- W przypadku wykrycia wycieku, natychmiast zregeneruj klucz w panelu Supabase
- Rozważ użycie [Custom Code w Webflow](https://university.webflow.com/lesson/custom-code-in-the-head-and-body-tags) do umieszczenia skryptu
- W środowisku produkcyjnym najlepiej używać serwera pośredniczącego (proxy) do zapytań API
