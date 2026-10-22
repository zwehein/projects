package com.blackjack;

public class PeekPowerUp implements PowerUp {
    private boolean used = false;
    private Card revealedCard;

    @Override
    public String apply(GameEngine engine) {
        if (used) {
            return "This power-up has already been used!";
        }

        // Get the dealer's hidden card (first card)
        revealedCard = engine.getDealer().getHand().getCards().get(0);
        used = true;
        return "Revealed dealer's hidden card: " + revealedCard.toString();
    }

    @Override
    public String getName() {
        return "Peek";
    }

    public Card getRevealedCard() {
        return revealedCard;
    }

    public boolean isUsed() {
        return used;
    }
}