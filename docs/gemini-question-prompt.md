# Návod: jak nechat Gemini vygenerovat otázky pro Maturita Trenažér

Tento soubor obsahuje univerzální prompt (zadání pro AI), který můžete zkopírovat do Gemini
(nebo jiného LLM) a nechat si vygenerovat hotový JSON soubor s otázkami pro **jedno
maturitní téma**. Prompt je záměrně rozsáhlý a podrobný — popisuje úplně všechny typy
otázek, které aplikace umí zobrazit, formát souboru i validační pravidla, takže výstup by
měl projít importem (stránka *Import obsahu* → drag & drop JSON) bez úprav.

> 💡 Tip: Prompt je navržený na **jedno maturitní téma/okruh** (např. "Síťové modely a
> protokoly" nebo "Operační paměť počítače"). Pro každé téma spusťte generování zvlášť —
> dostanete tak menší, přehlednější soubory, které lze snadno zkontrolovat a importovat
> jednotlivě (a případně je sloučit ručně, pokud chcete jeden velký soubor na předmět).

---

## Jak prompt použít

1. Zkopírujte celý text v sekci **„PROMPT PRO GEMINI"** níže.
2. Na místo `[NÁZEV MATURITNÍHO TÉMATU]` doplňte konkrétní téma (např. "TCP/IP model a
   vrstvy síťové komunikace") a na místo `[ID_PŘEDMĚTU]` krátké anglické id bez diakritiky
   a mezer (např. `site` nebo `tvy`, podle toho, do které složky otázky patří — nebo si
   vymyslete vlastní `subject` id pro nový samostatný soubor).
3. Vložte prompt do Gemini a nechte si vygenerovat odpověď.
4. Zkopírujte vygenerovaný JSON do nového souboru `nazev.json`.
5. V aplikaci přejděte na **Import** a soubor tam nahrajte (přetažením nebo výběrem) —
   aplikace ho ověří podle stejných pravidel, jaká jsou popsaná v promptu, a zobrazí
   případné chyby. Pokud něco nesedí, vraťte chybové hlášky zpátky do Gemini se žádostí
   o opravu.
6. Alternativně můžete jednotlivé otázky ručně vytvořit přímo v aplikaci v sekci
   **Moje otázky** — tam ale prompt nepotřebujete, formulář vás provede jen
   nejběžnějšími typy otázek (jedna/více správných odpovědí, pravda/nepravda, číselná
   odpověď).

---

## PROMPT PRO GEMINI

Zkopírujte vše mezi značkami ` ```text ` a vložte do Gemini i s vyplněnými hranatými
závorkami:

```text
Jsi odborník na tvorbu studijních materiálů a generuješ cvičné otázky pro webovou
aplikaci "Maturita Trenažér". Tvým úkolem je vytvořit KOMPLETNÍ sadu otázek pro JEDNO
maturitní téma:

TÉMA: [NÁZEV MATURITNÍHO TÉMATU]
ID PŘEDMĚTU (pole "subject" v JSON): [ID_PŘEDMĚTU]
NÁZEV PŘEDMĚTU PRO ZOBRAZENÍ (pole "name"): [ČITELNÝ NÁZEV PŘEDMĚTU/OKRUHU]

Výstupem MUSÍ být jeden validní JSON objekt přesně podle níže popsaného schématu —
žádný úvodní ani závěrečný komentář, žádné markdown bloky s vysvětlením, JEN samotný
JSON. Dodrž formát do posledního detailu, protože soubor se bude automaticky validovat
a importovat do aplikace.

============================================================
1) STRUKTURA CELÉHO SOUBORU (SubjectConfig)
============================================================

{
  "subject": "ID_PŘEDMĚTU",       // musí přesně odpovídat zadanému ID, malá písmena,
                                   // pomlčky místo mezer, bez diakritiky, např. "tcp-ip"
  "name": "Čitelný název předmětu/okruhu",
  "topics": [
    { "id": "kratke-id-tematu", "name": "Čitelný název podtématu" },
    ...
  ],
  "questions": [ /* pole otázek, viz níže */ ]
}

- "topics" rozděl téma na 3–8 logických podtémat (např. u síťových modelů to mohou
  být "Vrstvy modelu OSI", "Adresace", "Protokoly transportní vrstvy" apod.).
  Každé "id" musí být jedinečné, krátké, bez diakritiky a mezer (use-kebab-case).
- KAŽDÁ otázka musí mít pole "topic" odkazující na existující "id" z pole "topics".

============================================================
2) SPOLEČNÁ POLE KAŽDÉ OTÁZKY (QuestionBase)
============================================================

Všechny typy otázek mají tato pole:
  "id"          - POVINNÉ, globálně jedinečný řetězec, doporučený formát
                  "ID_PŘEDMĚTU-001", "ID_PŘEDMĚTU-002", ... (postupně číslované,
                  3místné číslo s nulami na začátku)
  "type"        - POVINNÉ, jeden z 9 typů popsaných v sekci 3
  "topic"       - POVINNÉ, musí odpovídat "id" z pole "topics"
  "difficulty"  - NEPOVINNÉ, číslo 1, 2 nebo 3 (1 = lehká, 3 = těžká); pokud chybí,
                  bere se jako 1. Snaž se mít rozumný mix obtížností.
  "tags"        - NEPOVINNÉ, pole krátkých řetězců/klíčových slov (např. ["osi", "vrstvy"])
  "explanation" - DOPORUČENO U KAŽDÉ OTÁZKY, text vysvětlení zobrazený PO odpovědi —
                  napiš srozumitelné vysvětlení, proč je správná odpověď správná
                  (2–5 vět, vhodné pro maturitní přípravu)
  "source"      - NEPOVINNÉ, odkaz na zdroj/literaturu
  "code"        - NEPOVINNÉ, krátká ukázka kódu zobrazená nad otázkou (string)
  "language"    - NEPOVINNÉ, jazyk pro zvýraznění kódu (např. "python", "sql", "bash")
  "image"       - NEPOVINNÉ, URL obrázku zobrazeného nad otázkou — NEPOUŽÍVEJ, pokud
                  nemáš platnou URL (raději pole vynech)

============================================================
3) VŠECH 9 TYPŮ OTÁZEK — PŘESNÝ FORMÁT A PRAVIDLA
============================================================

--- 3.1 "single" — právě JEDNA správná odpověď z nabídky ---
{
  "id": "tema-001",
  "type": "single",
  "topic": "id-podtematu",
  "difficulty": 1,
  "explanation": "Vysvětlení, proč je tato možnost správná a ostatní ne.",
  "question": "Znění otázky?",
  "options": [
    { "text": "Možnost A", "correct": false },
    { "text": "Možnost B", "correct": true },
    { "text": "Možnost C", "correct": false },
    { "text": "Možnost D", "correct": false }
  ]
}
PRAVIDLA: alespoň 2 možnosti (ideálně 3–5), PRÁVĚ JEDNA s "correct": true.

--- 3.2 "multiple" — JEDNA NEBO VÍCE správných odpovědí ---
Stejná struktura jako "single", ale "type": "multiple" a "correct": true může mít
2 nebo více možností (alespoň jedna). Do otázky napiš jasně, že jde o více odpovědí
(např. "Vyberte všechny pravdivé možnosti:").
PRAVIDLA: alespoň 2 možnosti, alespoň jedna "correct": true (typicky 2–3 správné).

--- 3.3 "truefalse" — Pravda / Nepravda ---
{
  "id": "tema-003",
  "type": "truefalse",
  "topic": "id-podtematu",
  "explanation": "Vysvětlení, proč je tvrzení pravdivé/nepravdivé.",
  "statement": "Tvrzení, o kterém se rozhoduje, zda je pravdivé.",
  "answer": true
}
PRAVIDLA: "statement" (NE "question"!), "answer" je boolean (true/false).

--- 3.4 "matching" — spojování dvojic ---
{
  "id": "tema-004",
  "type": "matching",
  "topic": "id-podtematu",
  "explanation": "Vysvětlení vazeb mezi pojmy.",
  "question": "Přiřaďte pojmy z levého sloupce k odpovídajícím pojmům vpravo.",
  "pairs": [
    { "left": "Pojem 1", "right": "Odpovídající popis/pojem 1" },
    { "left": "Pojem 2", "right": "Odpovídající popis/pojem 2" },
    { "left": "Pojem 3", "right": "Odpovídající popis/pojem 3" }
  ]
}
PRAVIDLA: alespoň 2 páry (ideálně 3–6), žádné prázdné "left"/"right".

--- 3.5 "ordering" — seřazení položek ve správném pořadí ---
{
  "id": "tema-005",
  "type": "ordering",
  "topic": "id-podtematu",
  "explanation": "Vysvětlení správného pořadí kroků/vrstev/událostí.",
  "question": "Seřaďte následující kroky/vrstvy/události od první do poslední.",
  "items": [
    "První položka (správné pořadí)",
    "Druhá položka",
    "Třetí položka",
    "Čtvrtá položka"
  ]
}
PRAVIDLA: pole "items" MUSÍ být zapsáno PŘÍMO VE SPRÁVNÉM POŘADÍ (aplikace si ho
před zobrazením sama zamíchá) — alespoň 2 položky, ideálně 4–6.

--- 3.6 "numeric" — číselná odpověď ---
{
  "id": "tema-006",
  "type": "numeric",
  "topic": "id-podtematu",
  "explanation": "Vysvětlení výpočtu/postupu k získání správné hodnoty.",
  "question": "Zadání úlohy vyžadující číselný výsledek (uveď i jednotku do textu otázky).",
  "answer": 42,
  "tolerance": 0,
  "unit": "Mb/s"
}
PRAVIDLA: "answer" je číslo. "tolerance" (nepovinné, výchozí 0) určuje povolenou
odchylku (např. při zaokrouhlování). "unit" (nepovinné) je jen popisek jednotky.

--- 3.7 "categorize" — zařazování položek do kategorií ---
{
  "id": "tema-007",
  "type": "categorize",
  "topic": "id-podtematu",
  "explanation": "Vysvětlení, proč položky patří do daných kategorií.",
  "question": "Zařaďte následující položky do správných kategorií.",
  "categories": ["Kategorie A", "Kategorie B", "Kategorie C"],
  "items": [
    { "text": "Položka 1", "category": "Kategorie A" },
    { "text": "Položka 2", "category": "Kategorie B" },
    { "text": "Položka 3", "category": "Kategorie A" },
    { "text": "Položka 4", "category": "Kategorie C" }
  ]
}
PRAVIDLA: alespoň 2 kategorie, alespoň 1 položka, KAŽDÁ položka musí mít "category"
přesně odpovídající jednomu z řetězců v poli "categories" (musí se shodovat doslovně).

--- 3.8 "gap" — doplňování slov do textu (cloze) ---
{
  "id": "tema-008",
  "type": "gap",
  "topic": "id-podtematu",
  "explanation": "Vysvětlení správných doplněných pojmů.",
  "text": "Model {{0}} má sedm vrstev, zatímco model {{1}} má vrstvy čtyři.",
  "blanks": [
    { "accept": ["OSI", "ISO/OSI"] },
    { "accept": ["TCP/IP", "TCP-IP"] }
  ]
}
PRAVIDLA: počet zástupných symbolů "{{0}}", "{{1}}", "{{2}}", ... v "text" (číslováno
OD NULY, postupně) musí PŘESNĚ odpovídat počtu a pořadí prvků v poli "blanks".
Každý prvek "blanks" má pole "accept" — neprázdné pole řetězců s akceptovanými
variantami odpovědi (porovnává se bez ohledu na velikost písmen). Uveď víc variant
(např. s diakritikou i bez, zkratky i celé názvy), aby uživatele nepotrestala
formální odchylka.

--- 3.9 "passage" — text/scénář s několika podotázkami ---
{
  "id": "tema-009",
  "type": "passage",
  "topic": "id-podtematu",
  "passage": "Delší text, scénář, ukázka konfigurace nebo zadání případové studie,
ke kterému se vztahuje několik dílčích otázek níže.",
  "questions": [
    {
      "type": "single",
      "question": "Dílčí otázka 1 vztahující se k textu výše?",
      "options": [
        { "text": "Možnost A", "correct": true },
        { "text": "Možnost B", "correct": false },
        { "text": "Možnost C", "correct": false }
      ],
      "explanation": "Vysvětlení."
    },
    {
      "type": "truefalse",
      "statement": "Tvrzení vztahující se k textu výše.",
      "answer": false,
      "explanation": "Vysvětlení."
    }
  ]
}
PRAVIDLA: "passage" je text scénáře/ukázky. Pole "questions" obsahuje 2–4 podotázky
JAKÉHOKOLIV typu KROMĚ "passage" (nelze vnořovat pasáže do sebe) — ale podotázky
NEMAJÍ vlastní "id" ani "topic" (ty se odvozují automaticky od rodičovské otázky),
takže je VYNECHEJ. Jinak each podotázka dodržuje formát svého typu popsaný výše.

============================================================
4) DALŠÍ DŮLEŽITÁ PRAVIDLA
============================================================

- Vygeneruj CELKEM 18–30 otázek pro dané téma, rozumně rozdělených mezi podtémata.
- POUŽIJ ROZMANITOST TYPŮ — nevytvářej jen "single"/"multiple". Zahrň v rámci sady
  ideálně aspoň jednu otázku každého typu (single, multiple, truefalse, matching,
  ordering, numeric, categorize, gap, passage), pokud to dává pro dané téma smysl.
  U čistě teoretických témat lze "numeric" případně vynechat, ale zkus ho zahrnout
  všude, kde je to přirozené (výpočty kapacity, rychlosti přenosu, počtu adres apod.).
- KAŽDÉ "id" musí být v rámci souboru JEDINEČNÉ.
- Texty piš ČESKY, věcně správně a na úrovni odpovídající střední odborné škole /
  maturitní zkoušce z daného oboru.
- "explanation" pole vyplň téměř vždy — je to klíčová součást učení (uživatel ho
  uvidí ihned po zodpovězení otázky).
- Otázky typu "single"/"multiple"/"matching"/"categorize" piš tak, aby distraktory
  (špatné možnosti) byly věrohodné, ne triviálně vyřaditelné.
- Nepoužívej formátování markdown (hvězdičky, zpětná lomítka apod.) uvnitř textových
  polí — jen čistý text (v "code" polích samozřejmě může být zdrojový kód).
- Nezapomeň, že výstup musí být JEN samotný JSON objekt — žádný text před ani po něm,
  žádné ```json bloky.

Nyní vygeneruj kompletní JSON soubor pro výše zadané téma.
```

---

## Co dělat s výsledkem

- Pokud Gemini vrátí JSON obalený v ```` ```json ... ``` ````, před importem tyto
  značky odstraňte — soubor musí obsahovat čistě JSON.
- Aplikace při importu zobrazí seznam chyb, pokud něco neodpovídá schématu (např.
  duplicitní id, špatný počet správných odpovědí, neplatná kategorie apod.). Tyto
  chyby můžete rovnou zkopírovat zpět do konverzace s Gemini se žádostí "oprav prosím
  tyto chyby ve vygenerovaném JSON a vrať znovu celý opravený soubor".
- Stejný prompt můžete použít opakovaně pro různá témata — stačí pokaždé změnit
  `[NÁZEV MATURITNÍHO TÉMATU]`, `[ID_PŘEDMĚTU]` a `[ČITELNÝ NÁZEV PŘEDMĚTU/OKRUHU]`.
