package com.blackjack;

import java.util.ArrayList;
import java.util.List;

public class Player extends Participant {
    private final List<PowerUp> powerUps;

    public Player() {
        super();
        this.powerUps = new ArrayList<>();
    }

    public void hit(Deck deck) {
        addCard(deck.draw());
    }

    public void stand() {
        // In the console version, this is just a signal to end the player's turn
        // The actual logic is handled in GameEngine
    }

    public void addPowerUp(PowerUp powerUp) {
        powerUps.add(powerUp);
    }

    public List<PowerUp> getPowerUps() {
        return new ArrayList<>(powerUps);
    }

    public void removePowerUp(PowerUp powerUp) {
        powerUps.remove(powerUp);
    }

    public boolean hasPowerUps() {
        return !powerUps.isEmpty();
    }
}