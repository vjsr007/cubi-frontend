# 🎮 Cubi Arcade Pack — HANDOFF

**Para Claude Code / el desarrollador.** Este paquete convierte Cubi en un frontend **arcade/retrogaming neón** con splash screen, animaciones, efectos CRT, 40 SVGs personalizados y componentes React listos. Todo es aditivo — no rompe el código existente.

---

## 📦 Qué hay en el pack

```
cubi-arcade-pack/
├── tokens.css                ← (ya existía — copiado de referencia)
├── tokens-arcade.css         ← ✨ NUEVO — overlay neón + CRT + motion
├── assets/
│   ├── cubi-logo.png
│   └── system-logos/         ← 40 SVGs personalizados (reemplazan los actuales)
├── components/
│   ├── SplashScreen.tsx + .css   ← pantalla de arranque
│   ├── ArcadeButton.tsx + .css   ← botón neón con variantes
│   └── GameCard.tsx + .css       ← tarjeta animada con focus, scanlines, badges
├── preview/                  ← referencia visual (no copiar al repo)
│   ├── splash.html
│   ├── system-icons.html
│   ├── effects.html
│   └── themes-arcade.html
└── HANDOFF.md                ← este archivo
```

---

## 🚀 Instrucciones exactas para Claude Code

Pega esto en tu chat con Claude Code:

> Voy a aplicar el **Cubi Arcade Pack**. Sigue estos pasos en orden:
>
> **1. Copia archivos al repo:**
> - `tokens-arcade.css` → `src/styles/tokens-arcade.css`
> - Todos los `assets/system-logos/*.svg` → `src/assets/system-logos/` (sobreescribe los existentes)
> - Carpeta `components/` → `src/components/arcade/` (SplashScreen, ArcadeButton, GameCard)
>
> **2. En `src/index.css` o el entry CSS global, añade al final:**
> ```css
> @import "./styles/tokens-arcade.css";
> ```
>
> **3. Monta el SplashScreen en `App.tsx`:**
> ```tsx
> import SplashScreen from './components/arcade/SplashScreen';
> const [booted, setBooted] = useState(false);
> return (
>   <>
>     {!booted && <SplashScreen onDone={() => setBooted(true)} />}
>     {/* resto de la app */}
>   </>
> );
> ```
>
> **4. Reemplaza los botones primarios** (`<button className="btn-primary">`) por `<ArcadeButton variant="cyan">`. Variantes disponibles: `cyan`, `magenta`, `yellow`, `green`, `violet`, `chrome`.
>
> **5. Reemplaza `<GameCard>` existente** (o equivalente de rejilla de juegos) por el nuevo componente. Pasa `focused` desde tu estado de gamepad.
>
> **6. En cada tema (Default/HyperSpin/Aurora), añade efectos CRT:**
> - **Default:** envuelve el grid principal con `<div className="fx-scanlines-hd">` (overlay sutil).
> - **HyperSpin:** añade `<div className="fx-crt fx-scanline-sweep">` al preview del CRT. Añade una marquee arriba con la clase `marquee-scroll`.
> - **Aurora:** añade 4 `<div className="bokeh">` animados con `bokeh-float`, y scanlines HD encima.
>
> **7. Aplica clases utility en títulos de juegos:**
> - HyperSpin game title → `className="fx-neon-text fx-neon-flicker"` (color amber)
> - Aurora game name → añade `text-shadow` con `var(--text-glow-green)`
>
> **8. Focus rings** — en `index.css`, redefine:
> ```css
> .theme-default :focus-visible { box-shadow: var(--ring-default); }
> .theme-hyperspin :focus-visible { box-shadow: var(--ring-hyperspin); }
> .theme-aurora :focus-visible { box-shadow: var(--ring-aurora); }
> ```
>
> **9. Respeta `prefers-reduced-motion`** — ya está implementado en `tokens-arcade.css`. No añadas `!important` encima.
>
> **10. Verifica:**
> - [ ] La app arranca con splash 3 s → fade out → UI principal
> - [ ] Los 3 temas muestran los SVGs neón nuevos en el system list
> - [ ] Focus con gamepad muestra glow de color del tema
> - [ ] HyperSpin tiene marquee y scanlines en el CRT
> - [ ] Aurora tiene bokeh flotando de fondo
> - [ ] `prefers-reduced-motion` desactiva las animaciones

---

## 🎨 Clases utility disponibles (tokens-arcade.css)

| Clase | Efecto |
|---|---|
| `.fx-crt` | Marco CRT con scanlines + viñeta |
| `.fx-crt-boot` | Animación de power-on de tubo |
| `.fx-scanlines` / `.fx-scanlines-hd` | Overlay de scanlines |
| `.fx-scanline-sweep` | Barrido horizontal brillante |
| `.fx-neon-text` | Text-shadow neón color actual |
| `.fx-neon-pulse` | Pulso de brillo 2s loop |
| `.fx-neon-flicker` | Flicker tipo letrero roto |
| `.fx-rgb-shiver` | Aberración cromática RGB |
| `.fx-glitch` | Corte glitch en slices |
| `.fx-press-start` | Blink de "Press Start" |
| `.fx-rainbow-text` | Gradiente arcoíris animado |
| `.fx-shine` | Brillo que cruza al hover |
| `.fx-tilt-breathe` | Respiración 3D idle |

## 🎨 Tokens nuevos (en `:root`)

- **Neon:** `--neon-cyan/magenta/yellow/green/purple/orange/pink/blue`
- **Glow:** `--glow-cyan-sm/md/lg`, `--glow-magenta-md`, `--glow-yellow-md`, `--glow-green-md`, `--glow-amber-md`, `--glow-violet-md`
- **Text glow:** `--text-glow-cyan/amber/magenta/green`
- **Gradientes:** `--grad-neon-sunset/cyber/aqua/violet`
- **Chrome:** `--chrome-metal`, `--chrome-gold`, `--bezel-thin`, `--bezel-deep`
- **Motion:** `--ease-arcade` (overshoot), `--ease-wheel` (out-quint), `--ease-snap`, `--ease-crt-on`
- **Focus rings:** `--ring-default/hyperspin/aurora/neon`

## 🎞️ Keyframes nuevos

`crt-power-on`, `crt-power-off`, `scanline-drift`, `scanline-sweep`, `rgb-shiver`, `glitch-slice`, `neon-pulse`, `neon-flicker`, `coin-drop`, `press-start`, `wheel-snap`, `marquee-scroll`, `bokeh-float`, `rainbow-sweep`, `shine`, `tilt-breathe`, `box-flip`, `screen-jump`, `spark-float`.

---

## 📥 Descargar

El pack completo está listo para descargar desde el botón de abajo. Súbelo a tu workspace, luego pásale las instrucciones de arriba a Claude Code.

---

## ⚠️ Notas

- Los SVGs son 64×64 con viewBox — escalan bien a 24/32/48/64 sin pérdida.
- Los componentes React son TSX (si usas JS puro, cambia las extensiones y quita los tipos).
- Ningún componente importa fuentes externas — todo es system stack.
- `prefers-reduced-motion` está respetado en los 3 archivos CSS.
