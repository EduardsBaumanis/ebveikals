# Administrācijas rokasgrāmata

Šī rokasgrāmata paredzēta veikala īpašniekam/administratoram.
Administrācijas lapa ir `admin.html`.

## Kā pieslēgties

1. Atver `https://tava-vietne/admin.html`.
2. Ievadi savu administratora e-pastu un paroli (izveidotu Supabase).
3. Ja redzi "nav administratora tiesību", tavs lietotājs nav pievienots
   `admin_users` tabulā (skat. `SUPABASE_SETUP.md`, 6. solis).

Lai izietu, nospied **Iziet** augšējā labajā stūrī.

## Informācijas panelis

Pēc pieslēgšanās augšā redzami kopskaiti:
- **Darbi** — kopējais produktu skaits.
- **Pārdoti** — pārdoto darbu skaits.
- **Gaida apmaksu** — pasūtījumi, kas vēl nav apmaksāti.
- **Apmaksāti** — veiksmīgi apmaksāti pasūtījumi.

## Kā pievienot darbu

1. Sadaļā "Darbi" nospied **+ Jauns darbs**.
2. Aizpildi nosaukumu, cenu, izgatavoto un atlikušo daudzumu.
3. Izvēlies statusu:
   - **visible** — redzams veikalā,
   - **hidden** — paslēpts no veikala,
   - **sold_out** — pārdots,
   - **archived** — arhivēts.
4. Izvēlies veidu, tēmu, apdedzināšanas stilu un māla vietu.
5. Nospied **Saglabāt**.

## Kā augšupielādēt attēlus

1. Saglabā darbu (attēlus var pievienot tikai pēc saglabāšanas).
2. Atver darbu rediģēšanai → sadaļa **Attēli**.
3. Nospied "Augšupielādēt attēlus" un izvēlies vienu vai vairākus failus.
4. Pirmais attēls automātiski kļūst par **galveno**.
5. Lai mainītu galveno attēlu, nospied **Padarīt galveno** pie cita attēla.

> **Alt teksts** tiek izveidots automātiski no faila nosaukuma. Tāpēc
> nosauc failus aprakstoši, piemēram: `melna-bloda-latgales-mals.jpg`
> → alt teksts kļūs "melna bloda latgales mals". Tev nav jāievada alt teksts.

## Kā iestatīt daudzumu

- **Izgatavots** — cik vienību tika izgatavots kopā (oriģinālais skaits).
- **Atlikuši** — cik pieejams pārdošanai.
- Atlikušais nedrīkst pārsniegt izgatavoto.
- Kad pēc apmaksas atlikums sasniedz 0, darbs automātiski kļūst "sold_out".

## Kā atzīmēt kā pārdotu / paslēptu

Rediģējot darbu, maini lauku **Statuss**:
- "sold_out" — darbs redzams, bet atzīmēts kā pārdots.
- "hidden" — darbs nav redzams veikalā.

## Kā dzēst darbu

- Ja darbam **nav** saistītu pasūtījumu, to var pilnībā dzēst.
- Ja darbam **ir** pasūtījumi, sistēma to **arhivē** (nevis dzēš), lai
  saglabātu pasūtījumu vēsturi.

## Kā pārvaldīt māla vietas

Sadaļā "Kategorijas un saraksti" → **Māla vietas**:
- Pievieno nosaukumu, slug, reģionu, koordinātes (latitude/longitude),
  aprakstu un stāstu.
- Koordinātes izmanto mākslinieciskā karte sākumlapā (tās ir aptuvenas).

## Kā pārvaldīt tēmas / stilus / veidus

Tajā pašā sadaļā atrodi atsevišķus blokus:
- **Produktu veidi** (Bļoda, Krūze, ...)
- **Tēmas** (Mežs, Upe, ...)
- **Apdedzināšanas stili**

Katrā blokā vari pievienot vai dzēst ierakstus.

## Kā pārvaldīt pakomātu sarakstu

Sadaļā "Kategorijas un saraksti" → **Pakomāti**:
- Pievieno pakomāta nosaukumu, pilsētu, adresi, pasta indeksu.
- Lai pakomātu paslēptu no klientiem, neaktivizē to (`active = false`)
  caur Supabase Table Editor.

> Demonstrācijas pakomāti ir tikai paraugs. Reālo sarakstu iegūsti no
> oficiālā Latvijas Pasta avota un pievieno šeit vai caur Supabase.

## Kā apskatīt pasūtījumus

Sadaļā "Pasūtījumi":
- Filtrē pēc statusa.
- Nospied **Detaļas**, lai redzētu klienta vārdu, e-pastu, telefonu,
  izvēlēto pakomātu, darbus un komentāru.
- Vajadzības gadījumā vari **atcelt** pasūtījumu, kas gaida apmaksu.

> ⚠️ Pasūtījumu **nedrīkst** manuāli atzīmēt kā apmaksātu. Apmaksu
> apstiprina Klix maksājumu sistēma automātiski. Manuāla atzīmēšana ir
> tikai dokumentēts ārkārtas administratora gadījums.
