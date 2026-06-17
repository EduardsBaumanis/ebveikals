# Keramikas darbnīca — Latvijas keramikas interneta veikals

Mākslinieciska, ierobežota skaita keramikas darbu interneta veikals, kas
veidots kā **mācību projekts**. Kods ir apzināti vienkāršs, lai informātikas
skolotājs to varētu izskaidrot skolēniem, kuri zina HTML, CSS, JavaScript un
nedaudz Python.

Publiskā vietne un administrācija ir **latviešu valodā**. Koda komentāri ir
angļu valodā.

---

## Projekta apraksts

Veikals pārdod unikālus keramikas darbus, kas izgatavoti ierobežotā skaitā.
Katram darbam ir stāsts trijās dimensijās:

1. **Māla izcelsmes karte** — Latvijas karte ar vietām, kur vākts māls.
2. **Glazēšanas un apdedzināšanas stili** — produktu grupēšana pēc stila.
3. **Darbu tēmas** — produktu grupēšana pēc mākslinieciskās tēmas.

Produkta lapā redzams, cik darbu atlicis no sākotnēji izgatavotā skaita
(piem., "Atlikuši 2 no 5").

---

## Tehnoloģijas

- **Frontend:** tīrs HTML, CSS un JavaScript (bez ietvariem, bez React,
  bez build rīkiem)
- **Datubāze / Auth / Failu glabātuve:** Supabase
- **Mitināšana:** Cloudflare Pages
- **Servera kods:** Cloudflare Pages Functions (tikai kur tiešām vajag)
- **Maksājumi:** Klix (Citadele) — droša integrācijas struktūra
- **Kods:** GitHub

Vienīgā ārējā JavaScript bibliotēka ir Supabase klients, kas tiek ielādēts
no CDN (ES modulis) — **nav npm, nav build soļa**.

---

## Mapju struktūra

```
/index.html              Sākumlapa
/shop.html               Produktu saraksts ar filtriem
/product.html            Produkta detaļu lapa (?id=...)
/cart.html               Grozs un apmaksas forma
/checkout-success.html   Paldies lapa pēc apmaksas
/admin.html              Administrācija (CMS)
/legal.html              Noteikumi, privātums, kontakti

/css/
  style.css              Galvenais (tumšais, mākslinieciskais) stils
  admin.css              Administrācijas stils

/js/
  config.example.js      Konfigurācijas paraugs (kopē uz config.js)
  supabaseClient.js      Supabase klients (anon atslēga)
  utils.js               Palīgfunkcijas (cena, alt teksts, u.c.)
  products.js            Produktu datu pieprasījumi
  shop.js                Veikala lapas loģika
  product.js             Produkta lapas loģika
  cart.js                Grozs (localStorage)
  checkout.js            Apmaksas forma + pakomāti
  admin.js               Administrācijas CMS
  map.js                 Mākslinieciskā SVG māla karte

/functions/api/
  create-klix-purchase.js  Servera: izveido pasūtījumu + Klix maksājumu
  klix-webhook.js          Servera: apstiprina apmaksu, samazina krājumu
  send-order-email.js      Servera: e-pastu sūtīšana (provider-neutral)

/sql/
  schema.sql             Tabulas, ierobežojumi, indeksi
  functions.sql          Trigeri + reduce_stock_after_payment
  rls-policies.sql       Row Level Security + Storage noteikumi
  seed-demo-data.sql     Demonstrācijas dati

/docs/
  WORKFLOW.md                  Vispārīga mācību darba plūsma (atkārtoti izmantojama)
  KLIX_SETUP.md                Klix iestatīšana
  SUPABASE_SETUP.md            Supabase iestatīšana
  CLOUDFLARE_SETUP.md          Cloudflare izvietošana
  ADMIN_GUIDE.md               Administrācijas rokasgrāmata
  STUDENT_PROJECT_CHECKLIST.md Pilns kontrolsaraksts
```

---

## Iestatīšanas soļi (secībā)

1. **Supabase** — izveido projektu, palaid SQL failus, izveido glabātuvi un
   administratoru. Skat. [`docs/SUPABASE_SETUP.md`](docs/SUPABASE_SETUP.md).
2. **Konfigurācija** — `cp js/config.example.js js/config.js` un ievadi
   Supabase URL + anon atslēgu.
3. **Klix** — sagatavo tirgotāja datus un aizpildi TODO. Skat.
   [`docs/KLIX_SETUP.md`](docs/KLIX_SETUP.md).
4. **Cloudflare** — savieno GitHub, pievieno vides mainīgos, deploy. Skat.
   [`docs/CLOUDFLARE_SETUP.md`](docs/CLOUDFLARE_SETUP.md).

---

## Lokālā izstrāde

Tā kā tas ir tīrs statisks projekts, pietiek ar jebkuru lokālu serveri.
ES moduļi neielādējas no `file://`, tāpēc izmanto vienkāršu serveri:

```
# Python (vairums skolēnu to jau zina)
python3 -m http.server 8000
# Atver http://localhost:8000
```

> Servera funkcijas (`/api/...`) lokāli pārbauda ar Cloudflare rīku
> `wrangler pages dev .` (neobligāti). Bez tā frontend darbojas, bet
> apmaksas pieprasījumi neizdosies, kamēr nav servera vides.

## Māla kartes punkti

Sākumlapas karte izmanto Google Maps pamatkarti un vietnes stilā veidotu
punktu pārklājumu. Punkti tiek lasīti no CSV faila
[`data/latvijas_malu_testesanas_lokacijas_50.csv`](data/latvijas_malu_testesanas_lokacijas_50.csv).

Lai pievienotu vai labotu punktus, atjauno CSV rindas ar kolonnām `Lat`,
`Lng`, `Lokācija / pins`, `Novads/reģions`, `Prioritātes klase`,
`Ģeoloģiskais pamatojums`, `Testēšanas mērķis`, `Piekļuves piezīme`,
`Avota URL`, `Google Maps URL` un `Statuss`.

---

## Izvietošanas pārskats

- Statiskās lapas un `functions/` mapi automātiski apkalpo Cloudflare Pages.
- Servera funkcijas izmanto **vides mainīgos** noslēpumiem.
- Maksājuma plūsma: pārlūks → `/api/create-klix-purchase` → Klix →
  `/api/klix-webhook` (apstiprina, samazina krājumu, sūta e-pastus).

---

## ⚠️ Drošības brīdinājums

**Service role atslēga, Klix noslēpumi un e-pasta atslēgas NEKAD nedrīkst
atrasties pārlūka (frontend) JavaScript failos.**

- Pārlūkā drīkst būt tikai: Supabase **URL** un **anon** atslēga.
- Visi noslēpumi glabājas tikai **Cloudflare vides mainīgajos** (serverī).
- `config.js` un `.env` ir `.gitignore` sarakstā.

---

## Kas ir pabeigts

- Visas publiskās lapas (sākums, veikals, produkts, grozs, paldies, legal)
- Filtri, meklēšana, kārtošana
- Grozs ar localStorage un krājuma ierobežojumiem
- Mākslinieciskā SVG māla karte
- Pilna administrācija (produkti, attēli, kategorijas, pasūtījumi)
- Datubāzes shēma, RLS, krājuma samazināšanas funkcija (idempotenta)
- Servera funkciju struktūra (Klix izveide, webhook, e-pasti)
- Pilna dokumentācija latviešu valodā

## Kas prasa reālus datus / atslēgas

- **Supabase**: tavs projekta URL un atslēgas
- **Klix**: tirgotāja ID, API atslēga, webhook noslēpums un **paraksta
  pārbaude** (`TODO (KLIX)` komentāri kodā)
- **E-pasts**: izvēlēts e-pasta pakalpojums un atslēga (`TODO` komentāri)
- **Pakomāti**: reālais Latvijas Pasta saraksts (demo dati ir tikai paraugs)
- **Legal lapa**: juridiskais teksts jāpārskata īpašniekam/juristam

## Zināmie ierobežojumi

- Klix integrācija ir **struktūra ar vietturiem** — bez reālām atslēgām un
  paraksta pārbaudes tā **nav gatava ražošanai** (apzināti, godīgi atzīts).
- Pakomātu saraksts ir demonstrācijas paraugs, nevis pilns.
- E-pasti izstrādes režīmā tiek **reģistrēti žurnālā**, nevis sūtīti, kamēr
  nav iestatīts `EMAIL_PROVIDER_API_KEY`.
- SVG karte ir mākslinieciska un izmanto **aptuvenu** koordinātu projekciju.

---

## Manuālā testēšana

Pilns testēšanas saraksts:
[`docs/STUDENT_PROJECT_CHECKLIST.md`](docs/STUDENT_PROJECT_CHECKLIST.md).
