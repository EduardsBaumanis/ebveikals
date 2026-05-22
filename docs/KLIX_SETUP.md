# Klix (Citadele) maksājumu iestatīšana

> ⚠️ **Svarīgi par godīgumu:** Šajā projektā Klix integrācijas **struktūra**
> ir izveidota, bet konkrētie API lauki, autentifikācijas veids un paraksta
> pārbaude ir **vietturi (TODO)**. Tos JĀaizpilda saskaņā ar tavu oficiālo
> Klix tirgotāja dokumentāciju. **Bez reālām Klix atslēgām un paraksta
> pārbaudes maksājumi nav gatavi ražošanai.**

## Kam Klix tiek izmantots?

Klix ir Citadeles maksājumu pakalpojums. Šajā veikalā tas ļauj klientam
samaksāt ar maksājumu karti drošā Klix vidē. Klients tiek novirzīts uz Klix,
samaksā, un Klix paziņo mūsu serverim par rezultātu.

## Kāpēc nedrīkst saukt Klix tieši no pārlūka?

Klix izmanto **slepenās tirgotāja atslēgas**. Ja tās būtu pārlūka kodā,
ikviens varētu tās redzēt un ļaunprātīgi izmantot. Tāpēc:

- Maksājuma **izveide** notiek serverī:
  `functions/api/create-klix-purchase.js`
- Maksājuma **apstiprinājums** (webhook) notiek serverī:
  `functions/api/klix-webhook.js`

## Nepieciešamie tirgotāja dati

No Klix/Citadeles tirgotāja konta tev būs nepieciešams:

- **Merchant ID** (tirgotāja identifikators)
- **API atslēga** (slepena)
- **Webhook secret / paraksta atslēga** (slepena)
- **API bāzes adrese** (sandbox un ražošanas)

## Vides mainīgie (Cloudflare)

Pievieno šos Cloudflare Pages projektā (skat. `CLOUDFLARE_SETUP.md`):

| Mainīgais | Apraksts |
|---|---|
| `SUPABASE_URL` | Supabase projekta URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role atslēga (slepena!) |
| `KLIX_API_BASE_URL` | Klix API adrese (sandbox vai prod) |
| `KLIX_MERCHANT_ID` | Tirgotāja ID |
| `KLIX_API_KEY` | Klix API atslēga (slepena!) |
| `KLIX_WEBHOOK_SECRET` | Webhook paraksta noslēpums (slepens!) |
| `SITE_BASE_URL` | Vietnes adrese, piem. `https://veikals.pages.dev` |
| `OWNER_EMAIL` | `eduards.baumanis0@gmail.com` |
| `EMAIL_PROVIDER_API_KEY` | E-pasta pakalpojuma atslēga (skat. e-pasta sadaļu) |

> ⚠️ Visas šīs atslēgas ir **tikai serverim**. Nekad neliec tās `config.js`
> vai citā pārlūka failā.

## Veiksmes / atcelšanas / kļūdas adreses

Servera funkcija `create-klix-purchase.js` izveido šādas adreses:

- **success**: `SITE_BASE_URL/checkout-success.html?order=<numurs>`
- **cancel**: `SITE_BASE_URL/cart.html`
- **failure**: `SITE_BASE_URL/cart.html`

> TODO: pārbaudi Klix dokumentācijā precīzos lauku nosaukumus šīm adresēm
> un pielāgo kodā (sk. komentārus `create-klix-purchase.js`).

## Webhook konfigurācija

Klix tirgotāja panelī norādi webhook adresi:

```
https://TAVA-VIETNE/api/klix-webhook
```

Failā `klix-webhook.js` funkcija `verifyKlixSignature` **jāaizpilda** ar
oficiālo Klix paraksta pārbaudes metodi (parasti HMAC-SHA256 ar
`KLIX_WEBHOOK_SECRET`). Pašlaik tur ir tikai izstrādes vietturis, kas
salīdzina koplietošanas noslēpumu — **tas nav drošs ražošanai**.

## Testēšana sandbox vidē

1. Iestati `KLIX_API_BASE_URL` uz Klix sandbox adresi.
2. Izmanto Klix testa kartes (skat. Klix dokumentāciju).
3. Veic testa pasūtījumu un pārbaudi, vai:
   - tiek izveidots pasūtījums ar statusu `pending_payment`,
   - pēc apmaksas webhook samazina krājumu un iestata `paid`,
   - atkārtots webhook **nesamazina** krājumu vēlreiz.

## Pāreja no sandbox uz ražošanu

1. Nomaini `KLIX_API_BASE_URL` uz ražošanas adresi.
2. Ievadi ražošanas `KLIX_MERCHANT_ID`, `KLIX_API_KEY`, `KLIX_WEBHOOK_SECRET`.
3. Atjaunini webhook adresi Klix panelī.
4. Vēlreiz pārbaudi paraksta pārbaudi.

## Atlikušie TODO koda failos

Meklē komentārus `TODO (KLIX)`:

- `create-klix-purchase.js`:
  - precīzs endpoint ceļš,
  - request lauku nosaukumi (summa centos? valūta?),
  - autentifikācijas shēma (Bearer/Basic?),
  - atbildes lauku nosaukumi (`checkout_url`, `purchase_id`).
- `klix-webhook.js`:
  - webhook lauku nosaukumi (`status`, `reference`, `id`),
  - statusu vērtības ("paid"/"completed"/...),
  - **paraksta pārbaude** (`verifyKlixSignature`).
