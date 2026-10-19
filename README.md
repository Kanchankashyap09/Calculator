# Calculator

Ek simple aur saaf calculator jo seedha browser me chalta hai. Koi install ya internet ki zaroorat nahi.

## Kaise chalayein

1. Zip file ko extract (unzip) karein.
2. `index.html` par double-click karein. Ye Chrome, Edge, Firefox ya Safari me khul jayega.

## Features

- Jodna, ghatana, guna, bhaag, percent (%), brackets ( ) aur +/− (sign badalna)
- `200 + 10%` ka jawab `220` aata hai (jaise normal calculator me hota hai)
- Type karte waqt neeche live result ka preview dikhta hai
- History: pichhle 30 calculations save rehte hain, kisi par click karke uska result aage use karein
- Result copy karne ka button
- Keyboard support: `0-9`, `+ - * /`, `( )`, `%`, `Enter` (barabar), `Backspace` (mitana), `Esc` (sab saaf)
- Mobile par bhi sahi dikhta hai, aur dark mode apne aap lag jata hai

## Files

| File | Kaam |
|------|------|
| `index.html` | Calculator ka layout |
| `style.css` | Design aur colors |
| `engine.js` | Hisaab karne ka logic (`eval` use nahi hota, isliye surakshit hai) |
| `app.js` | Buttons, keyboard aur history ka code |

## Badlav kaise karein

- Colors badalne ke liye `style.css` ke sabse upar wale `:root` section me values badlein.
- History ki limit badalni ho to `app.js` me `MAX_HISTORY` badlein.
