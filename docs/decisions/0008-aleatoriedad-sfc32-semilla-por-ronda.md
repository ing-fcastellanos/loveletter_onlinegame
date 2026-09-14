# ADR 0008 — Aleatoriedad: sfc32, semilla por partida y barajado derivado por ronda

**Status**: Accepted
**Fecha**: 2026-09-14
**Relacionado**: ADR 0004 (determinismo), ADR 0005 (frontera del paquete), ADR 0007 (dejó la semilla como provisional) · **Resuelve**: #8

## Contexto

El ADR 0004 prohíbe `Math.random()` y exige que el barajado consuma un PRNG sembrado cuya semilla vive en el estado, para que misma semilla y mismos comandos reproduzcan la partida carta por carta. No decidió qué generador, cómo pasa la semilla de una ronda a otra, ni cómo se protege el algoritmo. El ADR 0007 dejó `GameState.seed` como un `number` provisional hasta este issue.

La exploración midió con el compilador y el runtime del repositorio:

| Medición                                                           | Resultado                                                   |
| ------------------------------------------------------------------ | ----------------------------------------------------------- |
| Órdenes distinguibles del mazo (16! entre las repeticiones)        | 10 897 286 400 ≈ 2^33,34                                    |
| Cobertura de un generador de 32 bits de estado                     | ≤ 39,4 % de esos mazos                                      |
| Semillas `s` y `s + 2^32` con un generador de 32 bits              | el mismo mazo: los bits altos se truncan en silencio        |
| Lo mismo con sfc32 y la semilla en palabras separadas              | mazos distintos                                             |
| Intercambio en sitio de Durstenfeld con `noUncheckedIndexedAccess` | no compila (`TS2322`)                                       |
| Fisher-Yates original, sacando del montón                          | compila sin guarda; χ² de la posición de la Princesa = 18,0 |
| χ² con un barajado ingenuo                                         | 5801 (crítico al 0,1 % con 15 g. l.: 37,7)                  |
| Carta superior repetida entre rondas consecutivas                  | 0,1711 medido · 0,1719 esperado                             |

Dato del dominio que simplifica todo: **en la edición clásica lo único aleatorio de una ronda es el barajado**. El Príncipe, la carta apartada y el turno son deterministas.

## Decisión

1. **Generador sfc32** de 128 bits de estado, implementado en el motor sin dependencias, con 15 salidas descartadas tras sembrar.
2. **La semilla es un tipo marcado `Seed`**: entero seguro no negativo que solo se obtiene con `toSeed(value): Result<Seed, InvalidSeed>`. `GameState.seed` es `Seed`. Usar un número sin validar no compila. La semilla la genera quien aloja el motor; el motor solo la valida.
3. **El azar de cada ronda se deriva de (semilla de partida, número de ronda)**: los 32 bits bajos de la semilla, sus 21 bits altos, la ronda y una constante ocupan cuatro palabras de estado separadas, sin plegar nada. El estado no guarda ningún generador.
4. **Enteros uniformes por rechazo**, sin sesgo de módulo.
5. **Fisher-Yates en su forma original**: sacar cada carta al azar del montón restante.
6. **El mazo es lo primero que sale del azar de la ronda**: la operación que baraja una ronda devuelve el mazo junto con el generador ya consumido, y cualquier otro sorteo de la ronda sale después.
7. **El algoritmo está congelado**: una prueba dorada fija el mazo exacto de la ronda 1 con la semilla 20260911. Generador, calentamiento, rechazo, barajado y orden canónico del mazo forman parte del formato con que el #29 guardará las partidas. El campo de versión del algoritmo se decide en el #29.
8. **La semilla es información oculta**: con ella se calcula el mazo de cualquier ronda. Ella y todo lo que baraja viven solo en la superficie `./server`; la composición del mazo, que es pública, sí está en la de cliente.

## Razones

- 128 bits de estado alcanzan todos los mazos distinguibles; 32 bits no llegan ni a la mitad y además truncan la semilla sin avisar.
- El tipo marcado convierte el truncado y las semillas inválidas en errores de compilación, y valida con un `Result`, como exige la convención de errores como valores; una excepción la contradiría.
- Derivar por ronda aprovecha que el barajado es el único azar: ningún comando arrastra estado de generador, cada ronda se reproduce por separado y `seed` basta.
- El Fisher-Yates original es tan uniforme como el de Durstenfeld y es el único de los dos que compila limpio con la configuración estricta del motor.
- Fijar el orden de consumo en la forma de la API impide, por construcción, que un sorteo futuro desplace el mazo de las partidas guardadas.
- Las pruebas estadísticas usan semillas fijas: son deterministas, nunca intermitentes, y una autoprueba con un barajado sesgado demuestra que discriminan.

## Alternativas descartadas

- **mulberry32 u otro generador de 32 bits** — cobertura ≤ 39,4 % y truncado silencioso de la semilla.
- **Guardar el estado del generador en la partida** — sería necesario si alguna regla usara azar a mitad de ronda; en la edición clásica ninguna lo hace, y obligaría a reproducir las rondas en orden.
- **`number` con `Result` en cada barajado** — quien ya validó la semilla al crear la partida tendría que manejar un error imposible.
- **`number` con excepción** — contradice la convención de errores como valores.
- **Durstenfeld con guarda** — exige un `throw` para un índice que no puede ocurrir.
- **`x % n` o `Math.floor(x / 2^32 * n)`** — sesgo pequeño pero real.
- **Un campo de versión del algoritmo desde ya** — no hay nada guardado que versionar hasta el #29.

## Consecuencias

**Positivas:** cualquier ronda de cualquier partida se reproduce desde dos números; el truncado, el sesgo y la pérdida de cartas son errores de compilación o pruebas rojas; el #9 recibe mazo y generador en el orden correcto sin tener que recordarlo.

**Negativas / trade-offs:** el algoritmo no se puede mejorar sin romper la reproducción de lo guardado, así que cualquier cambio futuro exige versión y migración. `GameState.seed` cambió de tipo y quienes construyen estados a mano necesitan una `Seed` validada. Y sfc32 no es criptográfico.

## Re-evaluación

- **Fase 4, juego en línea con rivales reales**: con sfc32 y 53 bits de semilla, un rival que observa cartas podría intentar recuperar la semilla por fuerza bruta y predecir el resto del mazo y las rondas siguientes. Costoso pero no inalcanzable con hardware dedicado. Antes de exponer partidas competitivas, revisar si la semilla debe ampliarse o derivarse por ronda de un generador criptográfico del servidor; el tipo marcado permite hacerlo sin cambiar las firmas.
- **Issue #29**: al persistir partidas, añadir la versión del algoritmo.
- Si una regla futura necesitara azar a mitad de ronda, la derivación por ronda deja de bastar y hay que revisar el punto 3.
- Si apareciera una debilidad publicada de sfc32 relevante para permutaciones pequeñas.
