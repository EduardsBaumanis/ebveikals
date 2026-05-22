# Supabase iestatīšana

Šis dokuments paskaidro, kā sagatavot Supabase šim veikalam.

## 1. Izveido Supabase projektu

1. Reģistrējies vietnē <https://supabase.com>.
2. Izveido jaunu projektu (izvēlies reģionu Eiropā, piemēram, Frankfurt).
3. Saglabā **datubāzes paroli** drošā vietā.

## 2. Atrodi savas atslēgas

Supabase: **Project Settings → API**.

- **Project URL** — vietnes adrese (drīkst būt pārlūkā).
- **anon public** atslēga — publiskā atslēga (drīkst būt pārlūkā).
- **service_role** atslēga — ⚠️ **SLEPENA**! Nekad neliec pārlūkā. To
  izmanto tikai Cloudflare servera funkcijas.

## 3. Palaidiet SQL failus (šādā secībā)

Atver **SQL Editor** un palaid pa vienam:

1. `sql/schema.sql` — izveido tabulas, ierobežojumus un indeksus.
2. `sql/functions.sql` — izveido trigerus un krājuma samazināšanas funkciju.
3. `sql/rls-policies.sql` — ieslēdz Row Level Security un noteikumus.
4. `sql/seed-demo-data.sql` — pievieno demonstrācijas datus.

> Padoms: ja kāds fails dod kļūdu, izlasi to — parasti jāpalaiž iepriekšējais
> fails vispirms.

## 4. Izveido produktu attēlu glabātuvi

1. **Storage → New bucket**.
2. Nosaukums: `product-images`.
3. Atzīmē kā **Public bucket** (publiska lasīšana).
4. Saglabā.

Glabātuves noteikumi (public read, admin-only write) jau ir iekļauti
`rls-policies.sql` faila beigās.

## 5. Izveido administratora lietotāju

1. **Authentication → Users → Add user**.
2. Ievadi e-pastu un paroli (tā būs administratora pieslēgšanās).
3. Nokopē izveidotā lietotāja **User UID**.

## 6. Pievieno lietotāju admin_users tabulā

SQL Editor (aizvieto UID un e-pastu ar saviem):

```sql
insert into admin_users (user_id, email)
values ('IELĪMĒ-USER-UID-ŠEIT', 'tavs@epasts.lv');
```

Tikai šajā tabulā esošie lietotāji var pārvaldīt veikalu.

## 7. Konfigurē pārlūka anon atslēgu

1. Nokopē `js/config.example.js` uz `js/config.js`.
2. Ievadi savu **Project URL** un **anon public** atslēgu.
3. `config.js` ir `.gitignore` sarakstā, tāpēc tas netiks augšupielādēts
   GitHub. Cloudflare izvietošanai skat. `CLOUDFLARE_SETUP.md`.

> ⚠️ Nekad neievadi `config.js` failā service role atslēgu vai citas
> slepenās atslēgas.

## 8. Pakomātu saraksta uzturēšana

Pakomāti glabājas tabulā `parcel_machines`. Demonstrācijas dati ir tikai
**paraugs**, nevis pilns saraksts.

Lai pievienotu vai labotu pakomātus:

- **Vienkārši:** izmanto administrācijas lapu (`admin.html`) → sadaļa
  "Kategorijas un saraksti" → "Pakomāti".
- **Daudz ierakstu uzreiz:** izmanto Supabase **Table Editor** vai SQL:

```sql
insert into parcel_machines (provider, name_lv, address_lv, city_lv, postal_code, active)
values ('Latvijas Pasts', 'Pakomāta nosaukums', 'Adrese', 'Pilsēta', 'LV-XXXX', true);
```

Lai pakomātu paslēptu, iestati `active = false`.

> Reālo Latvijas Pasta pakomātu sarakstu iegūstiet no oficiālā Latvijas
> Pasta avota. Šajā projektā tas nav iekļauts.
