# Nastavení sdílení mezi zařízeními (server + Redis)

Aplikace umí fungovat čistě lokálně (účty a sdílené otázky se ukládají jen do `localStorage`
prohlížeče). Aby ale fungovalo **sdílení otázek mezi různými lidmi a zařízeními** — a aby
admin panel viděl opravdu všechny uživatele — je potřeba nasadit malý server.

To je vyřešené pomocí **Vercel serverless funkcí** (složka `/api`) a databáze
**Upstash Redis**, kterou Vercel nabízí přímo ve svém Marketplace. Vše je zdarma pro malé
projekty (typicky desítky/stovky uživatelů a tisíce otázek).

## 1) Nasazení na Vercel

Stačí propojit repozitář s Vercelem (Import Project) — složka `/api` se automaticky
rozpozná a nasadí jako serverless funkce vedle statické aplikace. Žádná zvláštní
konfigurace není potřeba.

## 2) Vytvoření Redis databáze

1. V projektu na Vercelu otevřete záložku **Storage**.
2. Klikněte na **Create Database** → vyberte **Upstash** → **Redis** (typ „Serverless DB“).
   - Stačí bezplatný „Free“ tarif.
3. Po vytvoření databázi **propojte (Connect) s vaším projektem** — Vercel sám doplní
   potřebné proměnné prostředí (`KV_REST_API_URL` a `KV_REST_API_TOKEN`, případně
   `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` — kód v `/api/_lib/db.ts`
   akceptuje obě varianty pojmenování).
4. Znovu nasaďte projekt (Redeploy), aby se nové proměnné prostředí projevily.

Žádné další kroky nejsou potřeba — server si sám při prvním požadavku založí účet
**admin** (uživatelské jméno `admin`, heslo zadané vlastníkem aplikace), který uvidí
všechny uživatele a jejich otázky a bude moci spravovat sdílení.

## 3) Jak to pozná aplikace

- Pokud proměnné prostředí nejsou nastavené (např. lokální vývoj přes `npm run dev`,
  nebo Redis ještě není propojený), `/api` endpointy vrací chybu 503 a **aplikace
  automaticky přepne na čistě lokální chování** — účty a sdílení fungují jen v rámci
  jednoho prohlížeče, přesně jako dřív.
- Jakmile je Redis propojený a proměnné prostředí dostupné, přihlášení/registrace,
  sdílení otázek i admin panel automaticky začnou používat server — funguje to pak
  napříč všemi zařízeními a prohlížeči.

## 4) Bezpečnostní poznámka

Jde o **lehké** řešení — hesla jsou jen jednoduše zahashovaná (ne kryptograficky bezpečně)
a přihlašovací tokeny jsou neprůhledné řetězce uložené v Redis, nikoli podepsané JWT.
Cílem je umožnit pohodlné sdílení mezi kamarády, ne poskytnout produkční úroveň
zabezpečení účtů — nepoužívejte zde citlivá hesla, která používáte i jinde.
