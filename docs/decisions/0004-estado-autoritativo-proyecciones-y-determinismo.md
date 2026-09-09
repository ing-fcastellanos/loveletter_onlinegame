# ADR 0004 — Estado autoritativo, proyecciones por jugador y determinismo

**Status**: Accepted
**Fecha**: 2026-09-08
**Relacionado**: ADR 0002 (monorepo), ADR 0003 (stack)

## Contexto

Love Letter es un juego de **información oculta e imperfecta**. El estado completo de una partida contiene cosas que ningún jugador puede ver: el mazo restante, la carta apartada al inicio, y la mano de cada rival. Un jugador solo conoce su propia mano, los descartes públicos, y lo que haya deducido con efectos como el Sacerdote.

Esto crea tres decisiones de arquitectura que hay que tomar **en la Fase 1**, porque las tres condicionan la forma del modelo de datos. Tomarlas tarde no es refactor: es rediseño.

1. **¿Quién filtra la información oculta?** Si la UI recibe el estado completo y decide qué dibujar, entonces el estado completo viaja por la red en la Fase 4 y cualquiera lo lee en el DevTools. Un juego de deducción con el mazo visible en la consola no es un juego.
2. **¿De dónde sale la aleatoriedad?** Un `Math.random()` dentro del barajado hace la partida irreproducible: no hay test determinista, no hay replay, y el servidor no puede re-verificar lo que pasó.
3. **¿Cuál es la unidad de cambio?** El PDD pide flujo unidireccional donde cada acción produce un estado nuevo validado. Falta decidir qué viaja, qué se guarda y qué escucha la UI.

## Decisión

### 1. El motor filtra, la UI nunca

Se separan dos tipos:

- **`GameState`** — el estado autoritativo. Lo sabe todo: mazo ordenado, carta apartada, manos de todos, semilla del PRNG.
- **`PlayerView`** — lo que un jugador concreto puede ver. Se produce con `project(state, playerId): PlayerView` dentro de `packages/engine`.

**La capa de presentación consume exclusivamente `PlayerView`. Nunca `GameState`.** En las Fases 1–3 la proyección corre en memoria en el navegador; en la Fase 4 corre en el servidor antes de serializar. La regla no cambia — cambia dónde se ejecuta.

En `PlayerView` la información oculta no aparece como dato censurado sino como **su forma verdadera**: el mazo es un `deckCount: number`, no un arreglo de cartas ocultas; la mano ajena es `hasCard: boolean` o el valor que el jugador haya llegado a conocer, nunca la carta real. Si un dato oculto no está en el tipo, no puede filtrarse por descuido.

### 2. Aleatoriedad determinista e inyectada

Queda **prohibido `Math.random()`** en `packages/engine`. El barajado consume un PRNG sembrado; la semilla vive dentro del `GameState`. Dada la misma semilla y la misma secuencia de comandos, la partida se reproduce carta por carta.

Es lo que hace posible: tests de reglas sin mocks ni dobles, reproducir un bug reportado con solo la semilla y el log, replays, y que el servidor de la Fase 4 pueda re-verificar una partida completa.

### 3. Comando → `Result<{ state, events }>`

La unidad de cambio es el comando:

```ts
applyCommand(state: GameState, cmd: Command): Result<{ state: GameState; events: GameEvent[] }, RuleViolation>
```

- **Los comandos** son la intención del jugador (`PlayDiscard` con carta, objetivo y — para el Guardia — la carta adivinada). Son exactamente lo que viajará por el WebSocket en la Fase 4.
- **Los eventos** son lo que ocurrió. Alimentan las animaciones y el log de la UI, que reacciona a eventos en vez de difear estados.
- **`Result`, no excepciones.** Una jugada ilegal es un valor de retorno (`RuleViolation`), no un `throw`: es un resultado esperado del dominio, y obliga a que quien llama la maneje.
- **`GameState` es inmutable.** Cada comando produce un estado nuevo; nunca se muta en sitio.

### 4. Los eventos llevan audiencia

Cada `GameEvent` declara quién puede verlo: público, o restringido a una lista de jugadores. El Sacerdote produce un evento visible solo para quien lo jugó; el Barón, uno de comparación visible solo para los dos implicados, más uno público de eliminación.

Así el **conocimiento privado se deriva del log filtrado**, en vez de mantener una estructura aparte de "quién sabe qué" que habría que sincronizar a mano. `project(state, playerId)` filtra el estado y el log con el mismo criterio.

## Razones

- Es la única forma de que la Fase 4 sea un cambio de transporte y no una reescritura: si `PlayerView` y `Command` ya son el contrato en local, ponerles un socket en medio no cambia el motor.
- Modelar lo oculto por _ausencia en el tipo_ convierte una clase entera de fugas de información en errores de compilación, en vez de en revisiones de código.
- La audiencia en los eventos resuelve el Sacerdote sin inventar un sistema paralelo de conocimiento, y de paso da el log de partida y la base de las animaciones.
- El determinismo hace que las pruebas de reglas sean afirmaciones sobre secuencias reales de juego, no sobre estados fabricados a mano.

## Alternativas descartadas

- **La UI recibe `GameState` y dibuja solo lo suyo** — funciona en local y es indefendible en línea. Además normaliza que la lógica de ocultamiento viva en la capa de presentación, que es donde menos debe estar.
- **Censurar `GameState` reemplazando cartas ocultas por `null`** — el tipo sigue diciendo "aquí hay un arreglo de cartas" y cada consumidor tiene que acordarse de tratar el `null`. `deckCount: number` no admite ese error.
- **Estructura explícita de conocimiento** (`knowledge: Map<PlayerId, Map<PlayerId, Card>>`) — hay que actualizarla en cada efecto y se desincroniza. Derivarla del log con audiencia es una sola regla en lugar de N.
- **Event sourcing puro** (solo el log, el estado siempre derivado) — elegante y reproducible, pero obliga a replay completo en cada lectura y complica el guardado del Hito 3 sin resolver ningún problema que este juego tenga.
- **Excepciones para jugadas ilegales** — hace invisible en la firma que una jugada puede rechazarse, y en la Fase 4 obliga a traducir excepciones a respuestas de protocolo.

## Consecuencias

**Positivas:** el juego en línea no puede filtrar información oculta por un descuido de UI; toda partida es reproducible desde su semilla; la UI y el servidor comparten un contrato que ya existe desde la Fase 1.

**Negativas / trade-offs:** hay dos tipos que mantener (`GameState` y `PlayerView`) y la proyección debe actualizarse cuando el estado crece — el costo se paga en cada cambio del modelo. La disciplina del PRNG inyectado hace el setup un poco más verboso que un barajado directo.

## Re-evaluación

- Si aparecen espectadores o repeticiones públicas, revisar si `PlayerView` necesita una tercera variante (vista de espectador) o basta con un `playerId` nulo.
- Si se agregan bots, revisar si consumen `PlayerView` (justo, mismo contrato que un humano) o `GameState` (haría trampa) — y dejarlo por escrito.
