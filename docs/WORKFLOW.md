# Kā uzbūvēt vienkāršu interneta veikalu (mācību darba plūsma)

> Šis dokuments ir **vispārīga, atkārtoti izmantojama** darba plūsma jebkuram
> mazam interneta veikalam, ko skolēns veido savam produktu projektam.
> Tas apzināti **neatsaucas** uz konkrēto biznesu — to var izmantot jebkura
> roku darba vai produktu ideja (piemēram, somas, sveces, grāmatzīmes,
> rotaslietas, druka u.c.).

Mērķis: iemācīties **algoritmu / domāšanas soļus**, nevis tikai komandas.

---

## 1. Ko vajag interneta veikalam?

Katram veikalam vajag atbildēt uz dažiem jautājumiem:

- **Ko es pārdodu?** (produkti)
- **Kā cilvēks tos atrod?** (saraksts, filtri, meklēšana)
- **Kā cilvēks tos nopērk?** (grozs, apmaksa)
- **Kā es pārvaldu produktus?** (administrācijas lapa)
- **Kā nauda nonāk pie manis?** (maksājumu pakalpojums)
- **Kā klients saņem apstiprinājumu?** (e-pasts)

Pieraksti šīs atbildes, pirms raksti kodu.

---

## 2. Produktu datu plānošana

Padomā, **kāda informācija ir katram produktam**. Piemēram:

- nosaukums
- apraksts
- cena
- attēli
- pieejamais daudzums
- kategorija / tips

Uzzīmē tabulu uz papīra. Šī tabula vēlāk kļūs par **datubāzes tabulu**.

> Padoms: katram laukam izlem **datu tipu** (teksts, skaitlis, datums,
> patiess/aplams). Tas palīdz vēlāk veidot datubāzi.

---

## 3. Lapu plānošana

Tipiskam veikalam vajag šādas lapas:

1. **Sākumlapa** — iepazīstina ar veikalu, rāda dažus produktus.
2. **Veikals** — visu produktu saraksts ar filtriem un meklēšanu.
3. **Produkta lapa** — viens produkts detalizēti.
4. **Grozs / apmaksa** — izvēlētie produkti un pasūtījuma forma.
5. **Paldies lapa** — pēc apmaksas.
6. **Administrācija** — produktu pārvaldība (tikai īpašniekam).
7. **Informācija** — noteikumi, kontakti, privātums.

Uzzīmē katru lapu kā vienkāršu skici (wireframe).

---

## 4. GitHub repozitorija izveide

1. Izveido GitHub kontu (ja vēl nav).
2. Izveido jaunu **repozitoriju** (piemēram, `mans-veikals`).
3. Lokāli izveido mapi un savieno ar repozitoriju:
   ```
   git init
   git remote add origin <repozitorija-adrese>
   ```
4. Bieži saglabā darbu:
   ```
   git add .
   git commit -m "Apraksts par izmaiņām"
   git push
   ```

> Algoritms: **maza izmaiņa → commit → push**. Tā tu nekad nezaudē darbu.

---

## 5. HTML/CSS/JS failu struktūras izveide

Vienkāršam veikalam pietiek ar:

```
/index.html
/shop.html
/product.html
/cart.html
/admin.html
/css/style.css
/js/...
```

Sāc ar **tukšām HTML lapām** un pārliecinies, ka tās atveras pārlūkā.
Tikai pēc tam pievieno CSS un JavaScript.

---

## 6. Supabase iestatīšana

[Supabase](https://supabase.com) ir bezmaksas pakalpojums, kas dod:

- **datubāzi** (kur glabāt produktus un pasūtījumus),
- **autentifikāciju** (pieslēgšanās administrācijai),
- **failu glabātuvi** (produktu attēli).

Soļi:
1. Izveido kontu.
2. Izveido jaunu projektu.
3. Pieraksti **Project URL** un **anon public key** — tos drīkst lietot
   pārlūkā.

---

## 7. Datubāzes tabulu izveide

Atver Supabase **SQL editor** un izveido tabulas, kas atbilst tavam
produktu plānam (no 2. soļa).

> Algoritms: katra "lieta" (produkts, pasūtījums) = viena tabula.
> Katrs šīs lietas īpašums = viena kolonna.

Piemērs vienkāršai produktu tabulai:
```sql
create table products (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  price numeric(10,2) not null,
  quantity_left int not null default 0,
  status text default 'visible'
);
```

---

## 8. Row Level Security (RLS) ieslēgšana

**Svarīgi drošībai!** Pēc noklusējuma datubāze var ļaut jebkuram lasīt vai
mainīt datus. RLS ļauj noteikt **kurš ko drīkst**.

Princips:
- **Visi drīkst lasīt** redzamos produktus.
- **Tikai administrators drīkst mainīt** produktus.
- **Pasūtījumus parastie lietotāji nedrīkst lasīt** (tur ir personas dati).

Ieslēdz RLS katrai tabulai un pievieno "policy" (noteikumus).

---

## 9. Produktu attēlu glabātuves izveide

Supabase **Storage** sadaļā izveido **bucket** (piemēram, `product-images`).
Iestati to kā **public read** (visi var skatīt attēlus), bet
**tikai administrators drīkst augšupielādēt**.

---

## 10. JavaScript savienošana ar Supabase

Pārlūkā ielādē Supabase bibliotēku un izveido klientu, izmantojot
**tikai publisko anon atslēgu**:

```js
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const supabase = createClient(URL, ANON_KEY);
```

> ⚠️ Pārlūkā drīkst lietot **tikai** URL un anon atslēgu. Slepenās
> atslēgas (service role) nekad nedrīkst nonākt pārlūka kodā!

---

## 11. Produktu rādīšana lapā

Algoritms:
1. Palūdz datubāzei produktu sarakstu.
2. Saņem datus (masīvu).
3. Katram produktam izveido HTML "kartiņu".
4. Ievieto kartiņas lapā.

```js
const { data } = await supabase.from("products").select("*");
data.forEach(p => { /* izveido HTML */ });
```

---

## 12. Produkta detaļu lapas izveide

Adresē izmanto **id**, piemēram `product.html?id=123`.
Lapa nolasa id no adreses, palūdz datubāzei tieši šo produktu un parāda
visu informāciju.

---

## 13. Groza izveide ar localStorage

Grozam **nevajag** datubāzi. Pietiek ar pārlūka atmiņu (`localStorage`).

Algoritms:
- "Pievienot grozam" → saglabā produktu sarakstā `localStorage`.
- Groza lapa → nolasa sarakstu un parāda.
- Daudzumu nedrīkst palielināt virs pieejamā daudzuma.

```js
localStorage.setItem("cart", JSON.stringify(items));
const items = JSON.parse(localStorage.getItem("cart") || "[]");
```

---

## 14. Apmaksas formas izveide

Forma savāc klienta datus: vārds, e-pasts, piegādes vieta.
Pārbaudi obligātos laukus, pirms turpini.

> Pārlūka pārbaude ir tikai ērtībai. **Īsto pārbaudi vienmēr veic serveris.**

---

## 15. Kāpēc maksājumiem vajag servera kodu?

Maksājumu pakalpojumiem ir **slepenās atslēgas**. Ja tās ievietotu pārlūka
kodā, **jebkurš varētu tās nozagt** un veikt maksājumus tavā vārdā.

Tāpēc maksājumu izveide notiek uz **servera** (piemēram, Cloudflare Pages
Function), kur atslēgas paliek drošībā.

---

## 16. Kāpēc slepenās atslēgas nedrīkst likt pārlūka JavaScript?

Viss, kas atrodas pārlūka kodā, ir **redzams ikvienam** (var atvērt
izstrādātāja rīkus un izlasīt). Tāpēc:

- ✅ pārlūkā: publiskā anon atslēga, vietnes URL;
- ❌ pārlūkā: service role atslēga, maksājumu atslēgas, e-pasta atslēgas.

Slepenās atslēgas glabā **vides mainīgajos** uz servera.

---

## 17. Neliela servera maksājumu galapunkta izveide

Servera funkcija (Cloudflare Pages Function) saņem groza datus un:
1. pārrēķina cenu **no datubāzes** (netic pārlūkam),
2. izveido pasūtījumu ar statusu "gaida apmaksu",
3. palūdz maksājumu pakalpojumam izveidot maksājumu,
4. atgriež maksājuma saiti, uz kuru pārlūks novirza klientu.

Krājumu samazina **tikai pēc apstiprinātas apmaksas** (caur webhook).

---

## 18. Administrācijas lapas izveide

Administrācijas lapa:
- prasa pieslēgties (Supabase Auth),
- pārbauda, vai lietotājs ir administrators,
- ļauj pievienot/labot/dzēst produktus un augšupielādēt attēlus.

> Drošību nodrošina **RLS datubāzē**, nevis tikai lapas pārbaudes.

---

## 19. Izvietošana ar Cloudflare Pages

1. Augšupielādē kodu GitHub.
2. Cloudflare Pages → "Connect to Git" → izvēlies repozitoriju.
3. Iestati kā **statisku vietni** (bez build komandas).
4. Pievieno **vides mainīgos** (slepenās atslēgas).
5. Deploy.

---

## 20. Testēšana pirms publiskošanas

Pārbaudi:
- vai produkti ielādējas,
- vai filtri darbojas,
- vai grozs strādā,
- vai pārdotu produktu nevar nopirkt,
- vai forma prasa obligātos laukus,
- vai lapa darbojas telefonā.

---

## 21. Biežākās kļūdas

- Slepenās atslēgas ievietotas pārlūka kodā. ⚠️
- Aizmirsts ieslēgt RLS → jebkurš var mainīt datus.
- Cenas ņemtas no pārlūka, nevis pārrēķinātas serverī.
- Krājums samazināts pirms apmaksas apstiprinājuma.
- Nav pārbaudīta lapa telefonā.
- Aizmirsts kopēt `config.example.js` uz `config.js`.

---

## 22. Ieteicamie uzdevumi skolēniem

1. Pievieno jaunu filtru (piemēram, pēc krāsas).
2. Pievieno "izlases" funkciju ar localStorage.
3. Izveido produktu meklēšanu pēc vairākiem vārdiem.
4. Pievieno produktu skaita rādītāju grozā.
5. Uzlabo pieejamību (alt teksti, fokusa stāvokļi).
6. Izveido vienkāršu administratora statistiku.

---

## 23. Gala projekta kontrolsaraksts

- [ ] Saplānoti produkti un lapas
- [ ] Izveidots GitHub repozitorijs
- [ ] Izveidota Supabase datubāze
- [ ] Ieslēgta RLS
- [ ] Izveidota attēlu glabātuve
- [ ] Produkti redzami lapā
- [ ] Darbojas produkta lapa
- [ ] Darbojas grozs
- [ ] Darbojas apmaksas forma
- [ ] Maksājumi notiek caur serveri
- [ ] Slepenās atslēgas nav pārlūkā
- [ ] Darbojas administrācija
- [ ] Vietne izvietota Cloudflare Pages
- [ ] Viss notestēts telefonā un datorā
