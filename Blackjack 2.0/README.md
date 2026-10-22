# Blackjack 2.0

A desktop blackjack game built with JavaFX. Play against a dealer, hit or stand, and use collectible power-ups to change the round.

## Features

- JavaFX desktop interface with card artwork and animated card reveals.
- Blackjack game engine with player and dealer hands.
- Hit, stand, and new-round controls.
- Power-ups including Peek, Second Chance, and Safe Draw.

## Built with

- Java 17
- JavaFX 21
- Maven

## Run

Install a Java 17 (or newer) JDK and Maven, then run from this directory:

```bash
mvn javafx:run
```

Maven downloads the JavaFX dependencies declared in `pom.xml` on the first build.

## Project structure

- `src/main/java/com/blackjack/` — game model, engine, power-ups, and JavaFX interface.
- `src/main/resources/cards/` — playing-card images used by the interface.
- `pom.xml` — Maven build and JavaFX configuration.
