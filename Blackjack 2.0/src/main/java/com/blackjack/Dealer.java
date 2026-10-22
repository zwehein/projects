package com.blackjack;

public class Dealer extends Participant {
    public Dealer() {
        super();
    }

    public void play(Deck deck) {
        // Dealer must hit on 16 or less, stand on 17 or more
        while (getHandTotal() < 17) {
            addCard(deck.draw());
        }
    }
}