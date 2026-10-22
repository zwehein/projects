package com.blackjack;

public class SecondChancePowerUp implements PowerUp {
    private boolean used = false;

    @Override
    public String apply(GameEngine engine) {
        if (used) {
            return "This power-up has already been used!";
        }

        if (!engine.getPlayer().isBust()) {
            return "You can only use this power-up when you've busted!";
        }

        // Remove the last card that caused the bust
        Hand playerHand = engine.getPlayer().getHand();
        playerHand.removeLastCard();
        used = true;

        return "Last card removed. You can draw again!";
    }

    @Override
    public String getName() {
        return "Second Chance";
    }

    public boolean isUsed() {
        return used;
    }
}