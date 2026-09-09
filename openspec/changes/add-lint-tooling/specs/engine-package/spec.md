## ADDED Requirements

### Requirement: El motor no consume aleatoriedad ambiental

El motor NO SHALL obtener valores aleatorios del entorno de ejecución. Toda fuente de valores no deterministas SHALL serle inyectada por quien lo invoca, de modo que una misma secuencia de operaciones sobre la misma entrada produzca siempre el mismo resultado.

Es la base del determinismo del que dependen las pruebas reproducibles, la capacidad de reproducir una partida a partir de su registro, y la re-verificación de una partida por parte de un servidor.

#### Scenario: Una llamada a la aleatoriedad del entorno se rechaza antes de ejecutarse

- **WHEN** se introduce en el código del motor una llamada a la fuente de aleatoriedad del entorno de ejecución
- **THEN** la verificación estática del repositorio falla señalando la llamada y el motivo

#### Scenario: La aleatoriedad entra por parámetro

- **WHEN** una operación del motor necesita un valor no determinista
- **THEN** lo toma de una fuente que recibió de quien la invocó, y esa fuente forma parte de la entrada de la operación

#### Scenario: La prohibición aplica al motor, no al resto del repositorio

- **WHEN** un workspace que no es el motor usa la fuente de aleatoriedad del entorno
- **THEN** la verificación estática no lo rechaza, porque la restricción es del motor y no del repositorio entero
