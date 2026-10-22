package com.blackjack;

public abstract class Participant {
    protected final Hand hand;

    public Participant() {
        this.hand = new Hand();
    }

    public void addCard(Card card) {
        hand.addCard(card);
    }

    public Hand getHand() {
        return hand;
    }

    public int getHandTotal() {
        return hand.calculateTotal();
    }

    public boolean isBust() {
        return hand.isBust();
    }

    public boolean hasBlackjack() {
        return hand.isBlackjack();
    }

    public void clearHand() {
        hand.clear();
    }
}