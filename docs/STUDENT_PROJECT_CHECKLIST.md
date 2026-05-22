# Skolēna projekta kontrolsaraksts

Izmanto šo sarakstu, lai pārliecinātos, ka projekts ir pilnīgs un drošs.

## Plānošanas kontrolsaraksts

- [ ] Skaidri zinu, ko pārdodu
- [ ] Saplānoti produktu dati (kādi lauki katram produktam)
- [ ] Uzzīmētas lapu skices (wireframes)
- [ ] Izlemts, kā notiks apmaksa un piegāde
- [ ] Saprasts, kuri dati ir publiski un kuri privāti

## Datubāzes kontrolsaraksts

- [ ] Izveidots Supabase projekts
- [ ] Palaists `schema.sql`
- [ ] Palaists `functions.sql`
- [ ] Palaists `rls-policies.sql`
- [ ] Palaists `seed-demo-data.sql`
- [ ] Izveidota `product-images` glabātuve (public)
- [ ] Izveidots administratora lietotājs
- [ ] Lietotājs pievienots `admin_users` tabulā
- [ ] Pārbaudīti datu ierobežojumi (cena ≥ 0, daudzums ≥ 0)

## Frontend kontrolsaraksts

- [ ] `config.js` izveidots no `config.example.js`
- [ ] Sākumlapa rāda izceltos produktus
- [ ] Veikala lapa rāda produktu sarakstu
- [ ] Filtri un meklēšana darbojas
- [ ] Produkta lapa ielādējas pēc `id`
- [ ] Grozs darbojas (localStorage)
- [ ] Daudzumu nevar palielināt virs pieejamā
- [ ] Pārdotu produktu nevar pievienot grozam
- [ ] Māla karte rāda punktus

## Administrācijas kontrolsaraksts

- [ ] Pieslēgšanās darbojas
- [ ] Lietotājs, kas nav administrators, netiek ielaists
- [ ] Var izveidot produktu
- [ ] Var rediģēt produktu
- [ ] Var augšupielādēt attēlus
- [ ] Var izvēlēties galveno attēlu
- [ ] Var pārvaldīt kategorijas un pakomātus
- [ ] Var apskatīt pasūtījumus

## Drošības kontrolsaraksts

- [ ] Service role atslēga **nav** pārlūka kodā
- [ ] Klix atslēgas **nav** pārlūka kodā
- [ ] E-pasta atslēgas **nav** pārlūka kodā
- [ ] Slepenās atslēgas ir tikai Cloudflare vides mainīgajos
- [ ] RLS ieslēgta visām tabulām
- [ ] Pasūtījumus parastie lietotāji nevar lasīt
- [ ] Cenas tiek pārrēķinātas serverī
- [ ] Krājums samazinās tikai pēc apmaksas
- [ ] Webhook ir idempotents (atkārtots nesamazina krājumu divreiz)
- [ ] `.gitignore` satur `config.js` un `.env`

## Izvietošanas kontrolsaraksts

- [ ] Kods augšupielādēts GitHub
- [ ] Repozitorijā nav slepeno atslēgu
- [ ] Repozitorijs savienots ar Cloudflare Pages
- [ ] Projekts iestatīts kā statiska vietne
- [ ] Pievienoti vides mainīgie
- [ ] Vietne veiksmīgi izvietota
- [ ] Pages Functions darbojas

## Testēšanas kontrolsaraksts

- [ ] Produktu saraksts ielādējas
- [ ] Produktu filtri darbojas
- [ ] Produkta lapa ielādējas pēc `id`
- [ ] Pārdotu produktu nevar pievienot grozam
- [ ] Groza daudzums nepārsniedz `quantity_left`
- [ ] Apmaksa prasa vārdu/e-pastu/pakomātu
- [ ] Telefons ir neobligāts
- [ ] Apmaksa izveido pasūtījumu ar statusu `pending_payment`
- [ ] Klix integrācija atgriež/apstrādā `checkout_url`
- [ ] Webhook ar statusu "paid" samazina krājumu vienreiz
- [ ] Atkārtots webhook nesamazina krājumu divreiz
- [ ] Klienta apstiprinājuma e-pasts tiek izsaukts
- [ ] Īpašnieka paziņojuma e-pasts tiek izsaukts
- [ ] Administratora pieslēgšanās darbojas
- [ ] Lietotājs bez tiesībām nevar piekļūt administrācijai
- [ ] Attēlu augšupielāde darbojas
- [ ] RLS neļauj neatļautas izmaiņas
- [ ] Informācijas (legal) lapa parādās
- [ ] Vietne darbojas telefonā
