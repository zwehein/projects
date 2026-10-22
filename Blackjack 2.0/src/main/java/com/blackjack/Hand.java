package com.blackjack;

import java.util.ArrayList;
import java.util.List;

public class Hand {
    private final List<Card> cards;

    public Hand() {
        this.cards = new ArrayList<>();
    }

    public void addCard(Card card) {
        cards.add(card);
    }

    public void removeLastCard() {
        if (!cards.isEmpty()) {
            cards.remove(cards.size() - 1);
        }
    }

    public int calculateTotal() {
        int total = 0;
        int aces = 0;

        // First pass: count all cards except aces
        for (Card card : cards) {
            if (card.getRank() == Card.Rank.ACE) {
                aces++;
            } else {
                total += card.getValue();
            }
        }

        // Second pass: count aces
        for (int i = 0; i < aces; i++) {
            if (total + 11 <= 21) {
                total += 11;
            } else {
                total += 1;
            }
        }

        return total;
    }

    public boolean isBust() {
        return calculateTotal() > 21;
    }

    public boolean isBlackjack() {
        return cards.size() == 2 && calculateTotal() == 21;
    }

    public List<Card> getCards() {
        return new ArrayList<>(cards);
    }

    public void clear() {
        cards.clear();
    }

    @Override
    public String toString() {
        return cards.toString() + " (Total: " + calculateTotal() + ")";
    }
}