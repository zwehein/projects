package com.blackjack;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class Deck {
    private final List<Card> cards;
    private int currentIndex;

    public Deck() {
        this.cards = new ArrayList<>();
        initializeDeck();
        shuffle();
    }

    private void initializeDeck() {
        for (Card.Suit suit : Card.Suit.values()) {
            for (Card.Rank rank : Card.Rank.values()) {
                cards.add(new Card(suit, rank));
            }
        }
    }

    public void shuffle() {
        Collections.shuffle(cards);
        currentIndex = 0;
    }

    public Card draw() {
        if (currentIndex >= cards.size()) {
            shuffle(); // Reshuffle if we run out of cards
        }
        return cards.get(currentIndex++);
    }

    public boolean hasMoreCards() {
        return currentIndex < cards.size();
    }

    public boolean isEmpty() {
        return currentIndex >= cards.size();
    }
}