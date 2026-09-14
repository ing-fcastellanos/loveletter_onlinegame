## Why

El motor tiene vocabulario (issue #7) pero no tiene mazo: nada construye las 16 cartas ni las baraja. Todo lo que viene —preparar una ronda, robar, los efectos— necesita un mazo, y el [ADR 0004](../../../docs/decisions/0004-estado-autoritativo-proyecciones-y-determinismo.md) exige que su orden salga de un PRNG sembrado cuya semilla vive en el estado, para que cualquier partida se reproduzca carta por carta.

La exploración midió que las opciones obvias fallan en silencio: un generador de 32 bits solo alcanza el **39,4 %** de los 10 897 286 400 mazos distinguibles y trunca los bits altos de la semilla (`s` y `s + 2³²` daban el mismo mazo), y el intercambio clásico de Fisher-Yates no compila con `noUncheckedIndexedAccess`.

## What Changes

- **La composición del mazo** —Guardia ×5, Sacerdote ×2, Barón ×2, Sirvienta ×2, Príncipe ×2, Rey, Condesa y Princesa— como dato público, disponible también en la superficie de cliente.
- **La semilla como tipo marcado `Seed`**: un entero seguro no negativo que solo se obtiene validándolo con `toSeed`, que devuelve un `Result`. Usar un número sin validar como semilla no compila. `GameState.seed` pasa a ser `Seed`.
- **Un generador `sfc32` de 128 bits de estado**, sin dependencias. La semilla de 53 bits entra en dos palabras y el número de ronda en otra, sin plegar nada.
- **El mazo de cada ronda se deriva de (semilla de partida, número de ronda).** No hay estado de generador que arrastrar entre comandos: en la edición clásica lo único aleatorio es el barajado.
- **Barajado Fisher-Yates en su forma original** —sacar cada carta al azar del montón restante—, con enteros uniformes por rechazo, sin sesgo de módulo. La aleatoriedad entra por parámetro.
- **Una operación que entrega el mazo de la ronda junto con el generador ya consumido por el barajado**, de modo que cualquier otro sorteo de la ronda (el #9 puede necesitar uno) salga después del mazo y no pueda alterarlo.
- **El algoritmo queda congelado por una prueba dorada**: una semilla y una ronda de referencia producen un mazo registrado. Cambiar el generador, el barajado o el orden canónico de entrada rompe las partidas que el #29 guarde como semilla más comandos.
- **La semilla es información oculta**: con ella se calcula el mazo de cualquier ronda. Todo lo relativo a semillas y barajado queda solo en `./server`, y ninguna vista de jugador la contiene.
- **ADR 0008** registra el generador, la derivación por ronda y la congelación del algoritmo.
- **BREAKING**: `GameState.seed` cambia de `number` a `Seed`. Lo construyen solo las pruebas del motor y el esqueleto de `services/api`; se actualizan en este change.

## Non-goals

- **Preparar una ronda** (issue #9): repartir, apartar la carta, descubrir las tres de la partida a dos y decidir quién empieza. Aquí se entrega el mazo barajado y el generador; el reparto es del #9.
- **Generar la semilla**: la genera quien aloja el motor (navegador o servidor, con `crypto.getRandomValues`). El motor solo la valida.
- **Un campo de versión del algoritmo** en el estado: se decide en el #29, cuando existan partidas guardadas que versionar.
- **Robar del mazo** (issue #12) y **comprobar la conservación de las 16 cartas a lo largo de una partida** (issue #22).

## Capabilities

### New Capabilities

- `deck`: la composición del mazo, la semilla y su validación, y el barajado determinista por ronda — reproducible, uniforme, sensible a toda la semilla, congelado, y sin que ningún sorteo posterior pueda alterar el mazo.

### Modified Capabilities

(ninguna — `engine-package` ya exige que la aleatoriedad entre por parámetro y que la superficie de cliente no dé acceso a información oculta; este change los cumple ampliando sus pruebas, sin cambiar los requisitos. `game-state` no menciona la semilla, así que el cambio de su tipo no altera ningún requisito)

## Impact

- **`packages/engine/src/`**: `cards.ts` gana la composición y el mazo canónico; nuevo `random.ts` (semilla, generador, barajado y derivación por ronda); `state.ts` tipa la semilla; barriles actualizados.
- **`packages/engine/tests/`**: pruebas de runtime del mazo y del barajado, contratos de tipo de la semilla, fixture de frontera ampliado y fixtures existentes adaptados a `Seed`.
- **`services/api/`**: el esqueleto obtiene su semilla con `toSeed`.
- **Documentación**: ADR 0008, `docs/decisions/_index.md`, `CLAUDE.md` y `openspec/config.yaml`.
