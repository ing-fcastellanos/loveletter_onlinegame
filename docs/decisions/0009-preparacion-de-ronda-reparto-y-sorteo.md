# ADR 0009 — Preparación de ronda: reparto canónico, sorteo tras el barajado y validación en el constructor

**Status**: Accepted
**Fecha**: 2026-09-14
**Relacionado**: ADR 0007 (modelo de estado; asignó a este issue la custodia de tres invariantes), ADR 0008 (barajado por ronda y algoritmo congelado) · **Resuelve**: #9

## Contexto

El motor tiene el modelo de dos capas (ADR 0007) y un barajado por ronda reproducible (ADR 0008), pero nada construye una partida. El ADR 0007 dejó tres invariantes que el tipo no garantiza y asignó su custodia a este issue: identificadores únicos, jugadores de ronda alineados con los de la partida, y tres cartas descubiertas si y solo si hay dos jugadores.

Hacía falta decidir quién empieza la primera ronda —la regla clásica, "quien tuvo una cita más recientemente", no es computable—, en qué orden se reparten las cartas, y dónde se garantizan esas invariantes. Todo ello entra en lo que hace falta para reproducir una partida guardada.

Se midió con el compilador y el runtime del repositorio:

| Medición                                                                        | Resultado                                                                                                     |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Número de jugadores y descubiertas codificados en el tipo (tuplas por cantidad) | atrapa los estados inválidos, pero `.map` sobre los jugadores devuelve un arreglo y rompe la tupla (`TS2322`) |
| Repartir indexando un mazo `readonly CardName[]`                                | no compila: cada carta es `CardName \| undefined`                                                             |
| Repartir desestructurando un mazo con tipo de tupla de dieciséis                | compila sin guardas, aserciones ni `throw`                                                                    |
| Prototipo del setup (2 / 3 / 4 jugadores)                                       | mazo restante 10 / 12 / 11; conserva las 16 cartas; el sorteo no altera el mazo                               |
| χ² de quién empieza, 30 000 semillas                                            | 0,53 / 0,36 / 6,57, bajo los críticos al 0,1 %                                                                |

## Decisión

1. **Una ronda solo nace en un módulo de preparación.** `startMatch(seed, asientos)` construye la partida y reparte la ronda 1; `dealRound(seed, número, jugadores, quienEmpieza)` reparte cualquier ronda con quien empieza dado. Ambas devuelven `Result<…, SetupViolation>`.
2. **El número de jugadores y la correlación con las descubiertas se validan en ese constructor, no en el tipo.** El ADR 0007 queda como está.
3. **Orden canónico del reparto**: la primera carta del mazo de la ronda se aparta; en la partida a dos, las tres siguientes se descubren; después, una carta por asiento en orden de asiento; el resto es el mazo. El reparto no depende de quién empieza.
4. **Quién empieza la ronda 1 se sortea con el generador de esa ronda, después del barajado**, con probabilidad uniforme. Desde la ronda 2 empieza el ganador de la anterior (issue #20), así que `dealRound` lo recibe.
5. **Los jugadores de ronda se construyen recorriendo los de la partida en orden**: la alineación de identificadores queda garantizada por construcción.
6. **`dealRound` valida todo lo que recibe**, incluido que el número de ronda sea un entero entre 1 y 2^32 − 1: fuera de ese rango el barajado lo reduciría y repartiría en silencio el mazo de otra ronda.
7. **`SetupViolation` es entrada del anfitrión**, separada de `RuleViolation`, con el mismo criterio que `InvalidSeed`.
8. **`shuffleRound` devuelve su mazo con tipo de tupla de dieciséis cartas (`FullDeck`)**, afinado con una sola aserción respaldada por el requisito de `deck` _el barajado conserva las cartas_. No cambia nada en runtime.
9. **El setup queda congelado** por una prueba dorada, igual que el algoritmo del ADR 0008: cambiar el orden del reparto o el sorteo rompe las partidas guardadas.

## Razones

- Ninguna regla del juego cambia el número de jugadores ni las descubiertas: validar en el único punto donde nace una ronda cubre lo mismo que el tipo, sin cobrar en cada actualización de las reglas de la Fase 2.
- Sortear después del barajado mantiene la semilla como única fuente de azar de la partida y cumple por construcción que ningún sorteo posterior altere el mazo.
- Repartir por asiento, y no a partir de quien empieza, desacopla el reparto del sorteo: el sorteo solo fija el turno.
- Validar el número de ronda cierra una coerción silenciosa de la misma familia que el tipo `Seed` cerró en el ADR 0008.
- El tipo de tupla del mazo es la única forma de repartir sin índices sin comprobar; hacerlo en `shuffleRound` concentra la aserción en un punto respaldado por una garantía ya probada, sin tocar `shuffle`.

## Alternativas descartadas

- **Codificar el número de jugadores en el modelo** — imposible por compilación, pero con un costo permanente en cada regla y un ADR que enmendara el 0007.
- **Empieza siempre el primer asiento** — saca el azar del motor y deja que el orden de asientos decida.
- **Quien empieza lo decide el anfitrión** — ese dato quedaría fuera de la semilla y habría que guardarlo aparte para reproducir la partida.
- **Repartir empezando por quien empieza** — acopla el reparto al sorteo, de modo que el sorteo desplazaría cartas.
- **Que `shuffle` conserve la longitud de forma genérica** — exige `as unknown as` dentro del módulo que el ADR 0008 dejó sin aserciones.
- **Indexar con guardas, valores por defecto o `throw`** — ramas imposibles, fallos silenciosos o una excepción contra la convención de errores como valores.

## Consecuencias

**Positivas:** una partida arranca en un estado que cumple por construcción las invariantes que el ADR 0007 dejó a este issue; el reparto no tiene índices sin comprobar; el #20 encadena rondas propagando un `Result` en lugar de reimplementar el reparto.

**Negativas / trade-offs:** tres ramas de reparto casi iguales, una por número de jugadores. El setup ya no se puede cambiar sin romper las partidas guardadas. Y el anfitrión local de la Fase 3 necesitará llegar a `startMatch`, que es de autoridad, desde el navegador.

## Re-evaluación

- **Antes del issue #22**: decidir dónde vive el anfitrión local que llama a `startMatch` en el navegador, dado que el lint prohíbe importar `./server` en `apps/web`.
- **Issue #29**: al persistir partidas, el orden del reparto y el sorteo entran en la versión del algoritmo junto con lo del ADR 0008.
- Si alguna regla futura llegara a cambiar el número de jugadores de una ronda, la validación en el constructor dejaría de bastar.
