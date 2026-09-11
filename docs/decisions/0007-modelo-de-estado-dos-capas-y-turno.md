# ADR 0007 — Modelo de estado: dos capas, carta única y turno como máquina de estados

**Status**: Accepted
**Fecha**: 2026-09-11
**Relacionado**: ADR 0004 (estado autoritativo e invariantes), ADR 0005 (frontera del paquete) · **Resuelve**: #7

## Contexto

El issue #7 fija el vocabulario del motor con un criterio explícito: _un estado imposible no se puede construir sin que el compilador se queje_. Todo lo que viene en las Fases 1 y 2 —barajado, setup, turno, los ocho efectos— se escribe sobre este modelo.

La decisión con más consecuencias es cómo se representa la mano: fuera del turno un jugador tiene una carta, y durante su turno, entre robar y descartar, tiene dos. La exploración midió tres candidatos con el compilador del repositorio (TypeScript 7, `noUncheckedIndexedAccess` activo):

| Modelo                            | Mano de 0 o 3 cartas | Primera carta (`h[0]`)  | Dos cartas **fuera de turno**       |
| --------------------------------- | -------------------- | ----------------------- | ----------------------------------- |
| Arreglo `readonly CardName[]`     | aceptada             | `CardName \| undefined` | aceptadas                           |
| Tupla por jugador `[C] \| [C, C]` | rechazada            | `CardName`              | **aceptadas**                       |
| Carta única + turno               | rechazada            | —                       | **rechazadas** (`TS2322`, `TS2353`) |

La tupla por jugador fue la primera conclusión de la exploración, y es buena: rechaza en compilación los tamaños imposibles. Pero deja representable que un jugador que **no** tiene el turno sostenga dos cartas, porque nada en su tipo lo relaciona con el turno.

Una segunda cuestión es el ciclo de vida: las fichas de afecto duran toda la partida; la carta, los descartes, la eliminación y la protección duran una ronda.

## Decisión

1. **Cada jugador activo sostiene exactamente una carta** (`held: CardName`). La carta robada **no pertenece al jugador**: vive en el turno.
2. **El turno es una máquina de estados** con dos fases: `draw` (aún no ha robado) y `play` (ya robó y debe descartar, con `drawn: CardName`). La carta robada solo existe en `play`.
3. **La mano de dos cartas es una vista derivada**, `Hand = readonly [C] | readonly [C, C]`, calculada por un accesor puro a partir del jugador y del turno. El estado nunca la almacena.
4. **El jugador de ronda es una unión discriminada**: `active` sostiene carta, descartes y protección de Sirvienta; `eliminated` no tiene carta —el campo no existe— y conserva sus descartes, que son información pública.
5. **Dos capas de estado**: `Player { id, name, tokens }` a nivel partida y `Round` —mazo, carta apartada, cartas descubiertas, jugadores de ronda y turno— a nivel ronda. Iniciar una ronda es construir un `Round` nuevo.
6. **Las cartas descubiertas** son una tupla de cero o de tres, no un arreglo de cualquier longitud.
7. **El turno referencia al jugador por identificador**, no por índice, y el orden de turno es el orden del arreglo de jugadores de ronda.
8. **Las violaciones de reglas son uniones discriminadas por código**, con los datos del caso y sin texto libre.

## Razones

- Con la carta robada dentro del turno, "solo el jugador en turno puede tener dos cartas" deja de ser una regla que alguien comprueba y pasa a ser una propiedad del tipo. Es la misma jugada que el ADR 0005 hizo con la frontera del `exports`: mover una disciplina al compilador.
- El PDD pide arquitectura "basada en máquinas de estado". Aquí la máquina del turno es un tipo, y sus fases no se pueden confundir. `stage` no es una bandera redundante: es el único lugar donde existe la carta robada.
- Separar partida y ronda convierte "resetear bien entre rondas" de disciplina en estructura: no hay nada que resetear, y las fichas no se pueden tocar por accidente.
- Un identificador sobrevive tal cual a la serialización, al log de eventos y al transporte de la Fase 4; un índice con `noUncheckedIndexedAccess` devuelve `T | undefined` en cada acceso.
- Una violación sin texto obliga a traducir en la capa de presentación, que es donde vive el español (`CLAUDE.md`), y el compilador exige que la presentación cubra cada código nuevo.

## Alternativas descartadas

- **Arreglo de cartas por jugador** — acepta manos de 0 y de 3, y obliga a comprobar `h[0]` en cada acceso.
- **Tupla `[C] | [C, C]` por jugador** — rechaza los tamaños imposibles pero no relaciona las dos cartas con el turno; la regla quedaría en runtime.
- **Un campo `phase` además de una mano de dos cartas** — la fase podría contradecir a la mano. En el modelo elegido la fase _es_ donde vive la carta, así que no hay dos fuentes que puedan divergir.
- **Un solo `Player` con fichas y estado de ronda juntos** — más plano, pero cada inicio de ronda tendría que recordar qué resetear y qué conservar.
- **Excepciones o texto libre en las violaciones** — contradicen el ADR 0004 y ponen idioma de presentación en el motor.

## Consecuencias

**Positivas:** cinco invariantes del juego las garantiza el compilador y se verifican en `npm run typecheck`; las reglas de la Fase 2 se escriben sin comprobaciones defensivas contra estados que el juego no admite; iniciar una ronda no puede arrastrar basura de la anterior.

**Negativas / trade-offs:** la mano que un jugador ve no es un campo sino un cálculo, lo que añade una indirección en cada lectura. Los identificadores aparecen en dos capas y pueden desalinearse. Y hay invariantes que el tipo no puede expresar sin volver el modelo ilegible; quedan como comprobaciones de runtime, con custodio asignado:

| Invariante                                                    | ¿Lo garantiza el tipo? | Custodio                    |
| ------------------------------------------------------------- | ---------------------- | --------------------------- |
| Un jugador activo sostiene exactamente una carta              | Sí                     | —                           |
| Dos cartas solo en el turno, en fase `play`                   | Sí                     | —                           |
| Un eliminado no tiene carta                                   | Sí                     | —                           |
| Cero o tres cartas descubiertas                               | Sí                     | —                           |
| Las fichas no viven en la ronda                               | Sí                     | —                           |
| El jugador del turno es un activo de la ronda                 | No                     | #12 valida; #22 comprueba   |
| Los ids de la ronda coinciden con los de la partida, en orden | No                     | #9 construye; #22 comprueba |
| Identificadores únicos                                        | No                     | #9                          |
| Tres descubiertas si y solo si hay dos jugadores              | No                     | #9                          |
| Conservación de las 16 cartas, ninguna en dos lugares         | No                     | #8; #22                     |

## Re-evaluación

- Si aparece un efecto que necesite que un jugador fuera de turno sostenga dos cartas, este modelo deja de servir tal cual. En la edición clásica no existe ninguno; la edición 2019 está fuera de alcance.
- Si la indirección de la mano derivada estorba de forma recurrente en las reglas de la Fase 2, revisar si conviene exponer un accesor más rico antes que almacenar la mano.
- Cuando lleguen los estados terminales (#20, #21), `Round` pasa a ser una unión por estado; si en cambio se le añaden campos opcionales sueltos, es señal de que este ADR se está erosionando.
