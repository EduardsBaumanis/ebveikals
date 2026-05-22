# Cloudflare Pages izvietošana

Šis dokuments paskaidro, kā publicēt veikalu ar Cloudflare Pages.
Cloudflare Pages ir bezmaksas statisko vietņu mitināšana, kas atbalsta arī
**Pages Functions** (servera kods mapē `functions/`).

## 1. Izveido GitHub repozitoriju

1. Izveido repozitoriju GitHub.
2. Augšupielādē projektu:
   ```
   git add .
   git commit -m "Sākotnējais veikals"
   git push -u origin main
   ```

> ⚠️ Pārliecinies, ka `js/config.js` un `.env` faili **nav** repozitorijā
> (tie ir `.gitignore` sarakstā).

## 2. Savieno repozitoriju ar Cloudflare Pages

1. Ej uz <https://dash.cloudflare.com> → **Workers & Pages → Create →
   Pages → Connect to Git**.
2. Izvēlies savu repozitoriju.

## 3. Iestati kā statisku vietni

Build iestatījumi:

- **Framework preset**: None
- **Build command**: (atstāj tukšu)
- **Build output directory**: `/` (saknes mape)

Tā kā projekts ir tīrs HTML/CSS/JS, **build solis nav vajadzīgs**.
Mape `functions/` automātiski kļūst par API galapunktiem:

- `functions/api/create-klix-purchase.js` → `/api/create-klix-purchase`
- `functions/api/klix-webhook.js` → `/api/klix-webhook`
- `functions/api/send-order-email.js` → `/api/send-order-email`

## 4. Pievieno vides mainīgos

Cloudflare Pages projekts → **Settings → Environment variables**.
Pievieno (skat. arī `KLIX_SETUP.md`):

```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
KLIX_API_BASE_URL
KLIX_MERCHANT_ID
KLIX_API_KEY
KLIX_WEBHOOK_SECRET
SITE_BASE_URL
OWNER_EMAIL = eduards.baumanis0@gmail.com
EMAIL_PROVIDER_API_KEY   (neobligāts izstrādes laikā)
```

> ⚠️ Šie ir **servera** noslēpumi. Tie nekad neparādās pārlūkā.
> Pārlūkam vajadzīgie dati (Supabase URL + anon atslēga) atrodas
> `js/config.js`, ko izveido atsevišķi.

### Par config.js izvietošanu

Tā kā `js/config.js` ir `.gitignore` sarakstā, tas nenonāk Cloudflare.
Divas iespējas:

- **Vienkārši (mācībām):** izveido `js/config.js` lokāli un noņem to no
  `.gitignore`, lai tas tiktu augšupielādēts. Tas ir droši, jo satur
  **tikai publisko anon atslēgu**.
- **Tīrāk:** izmanto build soli, kas ģenerē `config.js` no vides
  mainīgajiem. (Šim projektam tas nav nepieciešams.)

## 5. Deploy

Nospied **Save and Deploy**. Cloudflare izveidos vietni adresē, piemēram,
`https://tavs-projekts.pages.dev`.

## 6. Pārbaudi Pages Functions

- Atver pārlūkā: `https://tava-vietne/api/send-order-email` (ar POST) vai
  veic testa pasūtījumu, lai pārbaudītu `create-klix-purchase`.
- Skaties **Cloudflare → Functions → Logs**, lai redzētu kļūdas un
  izstrādes režīma e-pasta ierakstus.

## 7. Pielāgots domēns (neobligāts)

Cloudflare Pages → **Custom domains → Set up a domain**. Seko norādēm, lai
pievienotu savu domēnu un iestatītu DNS.

## Pēc izvietošanas

- Atjaunini `SITE_BASE_URL` uz reālo adresi.
- Norādi Klix webhook adresi: `https://tava-vietne/api/klix-webhook`.
- Pārbaudi visu testēšanas kontrolsarakstu (`STUDENT_PROJECT_CHECKLIST.md`).
