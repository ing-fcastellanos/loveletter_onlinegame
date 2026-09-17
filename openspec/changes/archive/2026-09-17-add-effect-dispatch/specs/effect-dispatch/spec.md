## Purpose

Define cómo se declara y se despacha el efecto de cada carta, para que agregar un personaje sin su efecto sea un error de compilación y no un olvido que se descubre jugando.

## ADDED Requirements

### Requirement: Cada personaje tiene una entrada de efecto declarada

La tabla de despacho SHALL tener una entrada de efecto por cada uno de los ocho personajes de la edición clásica. Un personaje sin su entrada declarada NO SHALL ser representable.

#### Scenario: Los ocho personajes tienen efecto declarado

- **WHEN** se consulta la tabla de despacho
- **THEN** cada uno de los ocho personajes tiene una entrada de efecto

#### Scenario: Un personaje sin entrada declarada no compila

- **WHEN** se intenta representar la tabla de despacho sin la entrada de alguno de los ocho personajes
- **THEN** la verificación de tipos la rechaza

### Requirement: Un efecto no implementado es un resultado explícito

Resolver el efecto de una carta sin comportamiento implementado todavía SHALL producir el mismo estado, sin ningún cambio, y ningún evento además de los que ya produce el descarte — como resultado válido, no como caso sin manejar.

#### Scenario: Resolver un efecto no implementado no cambia el estado

- **WHEN** se resuelve el efecto de una carta cuyo comportamiento todavía no está implementado
- **THEN** el estado resultante es idéntico al que había antes de resolver el efecto

#### Scenario: Resolver un efecto no implementado no agrega eventos

- **WHEN** se resuelve el efecto de una carta cuyo comportamiento todavía no está implementado
- **THEN** no se produce ningún evento adicional
