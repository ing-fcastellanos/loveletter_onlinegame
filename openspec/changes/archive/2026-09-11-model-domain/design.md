## Context

Ver [proposal.md](proposal.md) — Why. El estado actual del motor son los marcadores de la Fase 0 (`state.ts`, `cards.ts`), consumidos por `project`, por el esqueleto de `services/api` y por las pruebas de contrato. Las restricciones heredadas: sintaxis borrable (sin `enum`), `noUncheckedIndexedAccess` y `exactOptionalPropertyTypes` activos, cero dependencias, y la frontera del `exports` que mantiene todo tipo con información oculta del lado `./server` (ADR 0004, ADR 0005).

La exploración midió tres modelos de mano con el compilador del repositorio:

| Modelo                            | Mano de 0 o 3 | `h[0]`                  | Dos cartas **fuera de turno**       |
| --------------------------------- | ------------- | ----------------------- | ----------------------------------- |
| Arreglo `readonly CardName[]`     | aceptada      | `CardName \| undefined` | aceptadas                           |
| Tupla por jugador `[C] \| [C, C]` | rechazada     | `CardName`              | **aceptadas**                       |
| Carta única + turno (este diseño) | rechazada     | —                       | **rechazadas** (`TS2322`, `TS2353`) |

## Goals / Non-Goals

**Goals:**

- Que cada estado imposible del juego sea un error de compilación, y que eso quede escrito y verificado en `npm run typecheck`.
- Que las reglas de la Fase 2 se escriban sobre tipos que no necesiten comprobaciones defensivas contra estados que el juego no admite.
- Dejar escrito qué garantiza el tipo y qué no, para que ninguna regla asuma una garantía que no existe.

**Non-Goals:**

- Ninguna operación que transforme el estado. Este change es vocabulario; las transiciones empiezan en el #12.

## Decisions

### El turno es una máquina de estados y la carta robada vive en él

```ts
type ActivePlayer = {
  readonly status: 'active';
  readonly id: PlayerId;
  readonly held: CardName; // exactamente una
  readonly discards: readonly CardName[];
  readonly protected: boolean; // Sirvienta
};

type Turn =
  | { readonly stage: 'draw'; readonly player: PlayerId }
  | { readonly stage: 'play'; readonly player: PlayerId; readonly drawn: CardName };
```

Dos cartas solo existen como `held` del jugador en turno más `drawn` del turno en fase `play`. Ningún otro jugador puede tener dos, porque la segunda carta no es un campo del jugador.

El PDD pide arquitectura "basada en máquinas de estado"; aquí la máquina es un tipo, y sus fases no se pueden confundir. El campo `stage` no duplica información —no es una bandera derivable de otra cosa—: es el único lugar donde existe la carta robada.

**Alternativa descartada — mano `[C] | [C, C]` por jugador**: fue la conclusión de la exploración y rechaza bien 0 y 3 cartas, pero deja representable que un jugador fuera de turno sostenga dos. La regla "solo el jugador en turno puede tener dos cartas" tendría que comprobarse en runtime — justo la clase de garantía que el issue pide mover al compilador.

**La tupla no se pierde**: `Hand = readonly [CardName] | readonly [CardName, CardName]` pasa a ser el tipo de la mano **derivada**, la que ve el jugador en turno. Un accesor puro, `handOf(round, playerId)`, la calcula: dos cartas para el jugador en turno en fase `play`, una para el resto de los activos, `null` para un eliminado o un identificador desconocido.

### Dos capas: partida y ronda

```ts
type Player = { readonly id: PlayerId; readonly name: string; readonly tokens: number };

type Round = {
  readonly number: number; // desde 1
  readonly deck: readonly CardName[]; // tope en el índice 0
  readonly setAside: CardName;
  readonly faceUp: readonly [] | readonly [CardName, CardName, CardName];
  readonly players: readonly RoundPlayer[]; // orden de turno
  readonly turn: Turn;
};

type GameState = {
  readonly seed: number;
  readonly players: readonly Player[]; // orden de asiento
  readonly round: Round;
};
```

Las fichas duran toda la partida; carta, descartes, eliminación y protección duran una ronda. Mezcladas, iniciar una ronda exige recordar qué resetear y qué conservar. Separadas, iniciar una ronda es **construir un `Round` nuevo**: no hay nada que resetear, y las fichas no se pueden tocar por accidente porque no están ahí.

**Alternativa descartada — un solo `Player` con fichas y estado de ronda juntos**: es lo que sugería el texto del issue. Más plano, pero convierte "resetear bien entre rondas" en disciplina en lugar de estructura.

### El eliminado conserva sus descartes

```ts
type EliminatedPlayer = {
  readonly status: 'eliminated';
  readonly id: PlayerId;
  readonly discards: readonly CardName[];
};
type RoundPlayer = ActivePlayer | EliminatedPlayer;
```

Un eliminado no tiene carta —el campo no existe en su variante—, pero lo que descartó sigue sobre la mesa. Es información pública que alimenta la deducción: si ya salieron cuatro Guardias, el quinto está en algún lado. Y el desempate por suma de descartes (#20) tiene que poder leerlos sin preguntar si el jugador sigue vivo.

### Las cartas descubiertas son una tupla de cero o tres

`readonly [] | readonly [CardName, CardName, CardName]`. Un arreglo aceptaría dos o cinco. Qué cantidad corresponde a qué número de jugadores es regla del setup (#9); aquí solo se impide que exista cualquier otra.

### Identificadores, no índices

`turn.player` es un `PlayerId`, no una posición. Con `noUncheckedIndexedAccess`, cada acceso por índice devuelve `T | undefined`; y un identificador sobrevive tal cual a la serialización, al log de eventos y al transporte de la Fase 4. El orden de turno es el orden del arreglo `round.players`, que nunca pierde elementos: un eliminado cambia de variante, no desaparece.

### `RuleViolation` es estructurada y no lleva texto

```ts
type RuleViolation =
  | { readonly code: 'NotYourTurn'; readonly player: PlayerId; readonly current: PlayerId }
  | { readonly code: 'CardNotInHand'; readonly player: PlayerId; readonly card: CardName };
```

Unión discriminada por código, con los datos de cada caso. No hay campo `message`: el motor está en inglés y la interfaz en español, y la traducción vive solo en la capa de presentación (`CLAUDE.md`). Un mensaje en el motor invitaría a mostrarlo tal cual.

Los dos códigos son los fundamentales del ciclo de turno, nombrados en el objetivo del #12. Este change define el vocabulario; detectarlos es trabajo del #12, y cada regla de la Fase 2 añade su variante. Como es una unión, el compilador obliga a que la presentación cubra cada código nuevo.

### `Result` son datos, no una clase

`{ ok: true; value } | { ok: false; error }`, con los constructores `ok()` y `err()`. Sin métodos, para que viaje serializado por el WebSocket de la Fase 4 sin reconstrucción, y para que usar `value` exija estrechar por `ok` antes.

### Contratos de tipo con `@ts-expect-error`, dentro de `npm run typecheck`

Cada estado imposible se escribe en `packages/engine/tests/game-state.types.ts` como una construcción precedida de `// @ts-expect-error`. Si algún día el modelo se afloja y la construcción compila, la directiva queda sin uso y el typecheck falla con `TS2578`. El archivo lo cubre `tsconfig.test.json`, así que corre en local y en el check `typecheck` del CI.

**Alternativa descartada — un fixture y un `tsconfig` por caso, con el compilador lanzado desde Vitest** (el mecanismo de `boundary.test.ts`): fija el código de error exacto, pero son ocho casos, ocho `tsconfig` y ocho arranques del compilador. Se reserva para lo que de verdad lo necesita: la frontera del paquete, que depende de cómo se resuelve el `exports`, no de la forma de un tipo.

**Qué se pierde**: `@ts-expect-error` acepta _cualquier_ error, no el esperado. Se mitiga dejando una sola construcción por directiva, de modo que el único error posible sea el buscado, y con una verificación por mutación en las tareas: aflojar el modelo y confirmar que el typecheck se rompe.

### Qué garantiza el tipo y qué no

| Invariante                                                          | ¿Lo garantiza el tipo? | Dónde se comprueba                                |
| ------------------------------------------------------------------- | ---------------------- | ------------------------------------------------- |
| Un jugador activo sostiene exactamente una carta                    | Sí                     | Este change                                       |
| Dos cartas solo en el turno, en fase `play`                         | Sí                     | Este change                                       |
| Un eliminado no tiene carta                                         | Sí                     | Este change                                       |
| Cero o tres cartas descubiertas                                     | Sí                     | Este change                                       |
| Las fichas no viven en la ronda                                     | Sí                     | Este change                                       |
| `turn.player` es un jugador activo de la ronda                      | **No**                 | Validación del #12; prueba de invariantes del #22 |
| Los ids de `round.players` coinciden con los de `players`, en orden | **No**                 | Setup del #9; #22                                 |
| Identificadores únicos                                              | **No**                 | Setup del #9                                      |
| Tres descubiertas si y solo si hay dos jugadores                    | **No**                 | Setup del #9                                      |
| Conservación de las 16 cartas, ninguna en dos lugares               | **No**                 | Mazo del #8; #22                                  |

Las garantías de integridad referencial no se pueden expresar en el sistema de tipos de TypeScript sin volver el modelo ilegible. Se aceptan como invariantes de runtime y se nombra aquí quién las custodia.

### Módulos y superficies

| Módulo         | Contenido                                                                                 | Superficie                               |
| -------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------- |
| `cards.ts`     | `CARD`, `CardName`, `CardValue`                                                           | cliente y servidor                       |
| `result.ts`    | `Result`, `ok`, `err`                                                                     | tipo en ambas; constructores en servidor |
| `violation.ts` | `RuleViolation`                                                                           | cliente y servidor                       |
| `state.ts`     | `PlayerId`, `Player`, `Hand`                                                              | cliente y servidor                       |
| `state.ts`     | `ActivePlayer`, `EliminatedPlayer`, `RoundPlayer`, `Turn`, `Round`, `GameState`, `handOf` | **solo servidor**                        |
| `view.ts`      | `PlayerView`, `project` (marcador del #10)                                                | vista en ambas; `project` en servidor    |
| `command.ts`   | `Command` (marcador del #12)                                                              | cliente y servidor                       |

`Player` es seguro para el cliente: identidad, nombre y fichas son públicos. `Hand` también: es un tipo, no revela nada por existir. Todo lo que contiene la carta de un rival, la robada o el mazo queda en `./server`, y el fixture de frontera se amplía para exigir `TS2305` al intentar alcanzar `Round`, `RoundPlayer` y `Turn` desde la superficie por defecto.

### Información oculta y `PlayerView`

El modelo nuevo añade información que ningún jugador puede ver: la carta sostenida por cada rival, la carta robada del turno y el orden del mazo, además de la carta apartada que ya existía. **Ninguna llega a `PlayerView`**, que en este change sigue exponiendo solo `deckCount`; `project` se adapta a la nueva ruta (`state.round.deck`) sin ganar campos. Qué ve cada jugador de su propia mano y de la mesa es el #10.

### Punto de extensión: estados terminales

La ronda no modela todavía "terminada" ni la partida "ganada". Cuando lleguen el #20 y el #21, `Round` pasará a ser una unión por estado (`playing` con `turn`, `over` con ganador) en vez de acumular campos opcionales. Se deja dicho aquí para que nadie añada un `winner?:` suelto.

## Risks / Trade-offs

- **`@ts-expect-error` puede tapar un error distinto del buscado** → una construcción por directiva y verificación por mutación en las tareas.
- **Nada impide que `turn.player` apunte a un eliminado o a un id inexistente** → aceptado y documentado en la tabla de garantías; lo custodian el #12 y el #22.
- **Los ids aparecen en dos capas** (`Player` y `RoundPlayer`) y pueden desalinearse → es el precio de separar ciclos de vida; lo custodia el setup del #9 y lo verifica el #22.
- **`seed` puede no bastar para el PRNG** → el #8 decide si hace falta un estado de generador más rico; el nombre actual es provisional, no un compromiso.
- **La forma de `GameState` cambia (BREAKING)** → solo la consumen el esqueleto de `services/api` y las pruebas del motor; se actualizan en este mismo change.
- **`protected` es palabra reservada en clases** → como nombre de propiedad en un tipo es válido y es el término del dominio; se comprueba al compilar, y si estorbara se renombra.
