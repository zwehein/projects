package com.blackjack;

public class SafeDrawPowerUp implements PowerUp {
    private boolean used = false;

    @Override
    public String apply(GameEngine engine) {
        if (used) {
            return "This power-up has already been used!";
        }

        int currentTotal = engine.getPlayer().getHandTotal();
        int remainingPoints = 21 - currentTotal;

        if (remainingPoints <= 0) {
            return "You can't use this power-up when you're already at or over 21!";
        }

        // Draw cards until we find one that won't bust
        Deck deck = engine.getDeck();
        Card drawnCard = null;
        Card savedCard = null;

        while (deck.hasMoreCards()) {
            Card card = deck.draw();
            if (card.getValue() <= remainingPoints) {
                drawnCard = card;
                break;
            }
            if (savedCard == null) {
                savedCard = card; // Save first drawn card in case we can't find a safe one
            }
        }

        // If we couldn't find a safe card, use the first one we drew
        if (drawnCard == null) {
            drawnCard = savedCard;
        }

        if (drawnCard != null) {
            engine.getPlayer().addCard(drawnCard);
            used = true;
            return "Drew a safe card: " + drawnCard.toString();
        }

        return "No cards left in the deck!";
    }

    @Override
    public String getName() {
        return "Safe Draw";
    }

    public boolean isUsed() {
        return used;
    }
}