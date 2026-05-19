# Windows EXE keszites

Teljesen feltorhetetlen helyi `.exe` nincs, de a sima forraskodos mappanal erosebb megoldas, ha a Node szervert binarisba csomagolod, az asseteket kulon adod melle, es a kesz konfiguraciot nem a felhasznaloknak szerkesztheto helyre rakod.

## Ajánlott egyszeru ut

Windows gepen:

```powershell
npm install
npm install --save-dev pkg
npx pkg . --targets node20-win-x64 --output dist/rendeles-tv.exe
```

Ezutan a `dist/rendeles-tv.exe` melle keruljon a `.env`, illetve ha a csomagolo nem egette be az asseteket, a `public` mappa is.

## Védelem, ami mar benne van

- a debug API csak `ADMIN_TOKEN` mellett kerheto le;
- az Express nem kuldi az `X-Powered-By` headert;
- alap biztonsagi headerek be vannak kapcsolva;
- az indito nem a forrasfajlok kezi megnyitasat igenyli.

## Tovabbi erosites

- Kod-alairas Windows alatt;
- obfuszkalt/bundolt szerver kod;
- licencellenorzes szerveroldalon, ha van internet;
- adatbazis jogosultsag szukites: csak olvasas a szukseges tablaban.
