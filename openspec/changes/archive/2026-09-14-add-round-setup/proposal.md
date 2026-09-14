## Why

El motor tiene vocabulario (issue #7) y un mazo barajado de forma reproducible (issue #8), pero nada construye una partida: no hay forma de pasar de "estos jugadores y esta semilla" a un `GameState` listo para el primer turno. Todo lo que viene —la vista de jugador (#10), los eventos (#11), el ciclo de turno (#12)— necesita un estado inicial real del que partir.

El [ADR 0007](../../../docs/decisions/0007-modelo-de-estado-dos-capas-y-turno.md) dejó además tres invariantes que el tipo no puede garantizar y asignó a este issue como custodio: identificadores únicos, jugadores de ronda alineados con los de la partida y tres cartas descubiertas si y solo si hay dos jugadores.

## What Changes

- **`startMatch(seed, asientos)`** construye una partida desde la entrada del anfitrión y devuelve un `Result`: valida de 2 a 4 jugadores e identificadores únicos, pone todas las fichas en cero, sortea quién empieza y reparte la ronda 1.
- **`dealRound(seed, número, jugadores, quienEmpieza)`** reparte una ronda con quien empieza dado. Es pura, devuelve un `Result`, y el issue #20 la reutilizará para encadenar rondas con el ganador de la anterior.
- **Orden canónico del reparto**: la carta apartada es el tope del mazo de la ronda; en la partida a dos, las tres siguientes van boca arriba; después, una carta por asiento en orden de asiento. El reparto no depende de quién empieza.
- **Quién empieza la ronda 1 se sortea con el generador de esa ronda, después del barajado**, así que la semilla sigue reproduciendo la partida completa y el mazo no cambia.
- **Los jugadores de ronda se construyen recorriendo los de la partida en orden**: la alineación de identificadores queda garantizada por construcción, no por comprobación.
- **`SetupViolation`**, un error de entrada del anfitrión separado de `RuleViolation`, con el mismo criterio que `InvalidSeed`.
- **`shuffleRound` afina el tipo de su mazo a una tupla de dieciséis cartas.** Sin eso, cada carta repartida sería `CardName | undefined` bajo `noUncheckedIndexedAccess`. No cambia nada en runtime, así que el algoritmo congelado por el #8 queda intacto.
- **Una prueba dorada del setup completo** congela el orden del reparto y el sorteo, que pasan a formar parte de lo que hace falta para reproducir una partida guardada.
- **ADR 0009** registra el orden canónico del reparto y el sorteo tras el barajado.
- **Fe de erratas en el ADR 0007**: citaba los issues #20 y #21 donde son #19 y #20, y #22 donde es #21. La decisión no cambia. Se corrige también el comentario equivalente en `state.ts`.
- **BREAKING**: ninguno. `shuffleRound` solo estrecha su tipo de retorno.

## Non-goals

- **Las vistas de jugador** (issue #10): el criterio del issue #9 sobre qué ve cada jugador —descubiertas visibles para todos, apartada para nadie— se cumple en el #10, que lo tiene como objetivo y está bloqueado por este. Aquí las cartas quedan colocadas en el estado; al cerrar el #9 se anota en el issue.
- **Encadenar rondas y ganar la partida** (issues #19 y #20): `dealRound` queda lista para eso, pero nada llama todavía a una segunda ronda.
- **Robar, descartar y avanzar el turno** (issue #12): la ronda empieza con el turno en la fase de robar y ahí se detiene.
- **Eventos de inicio de partida o de ronda** (issue #11).
- **Codificar el número de jugadores en el tipo**: se midió y se descartó (ver design).
- **Dónde vive el anfitrión local de la Fase 3**, que necesitará llegar a `startMatch` desde el navegador pese a que el lint prohíbe importar `./server` en `apps/web`: se decide antes del issue #22.

## Capabilities

### New Capabilities

- `round-setup`: construir una partida y repartir una ronda — número de jugadores e identificadores válidos, estado inicial, cartas fuera de juego, reparto por asiento, conservación del mazo, sorteo de quién empieza, reparto con quien empieza dado, y un setup determinista y congelado.

### Modified Capabilities

(ninguna — el afinado del tipo de `shuffleRound` no cambia ningún requisito de `deck`; `engine-package` ya exige que la autoridad viva tras `./server`, y las operaciones nuevas se añaden a sus pruebas de frontera)

## Impact

- **`packages/engine/src/`**: nuevo `setup.ts` (`Seat`, `SetupViolation`, `startMatch`, `dealRound`); `cards.ts` gana el tipo `FullDeck`; `random.ts` afina el tipo de `shuffleRound`; `state.ts` corrige un comentario; `server.ts` publica lo nuevo.
- **`packages/engine/tests/`**: pruebas de runtime del setup, prueba dorada y fixture de frontera ampliado.
- **Documentación**: ADR 0009, fe de erratas del ADR 0007, `docs/decisions/_index.md`, `CLAUDE.md` y `openspec/config.yaml`.
