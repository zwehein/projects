package com.blackjack;

public class Card {
    private final Suit suit;
    private final Rank rank;
    private final int value;

    public enum Suit {
        HEARTS("H"), DIAMONDS("D"), CLUBS("C"), SPADES("S");

        private final String symbol;

        Suit(String symbol) {
            this.symbol = symbol;
        }

        public String getSymbol() {
            return symbol;
        }
    }

    public enum Rank {
        ACE(1, "A"), TWO(2, "2"), THREE(3, "3"), FOUR(4, "4"), FIVE(5, "5"),
        SIX(6, "6"), SEVEN(7, "7"), EIGHT(8, "8"), NINE(9, "9"), TEN(10, "10"),
        JACK(10, "J"), QUEEN(10, "Q"), KING(10, "K");

        private final int value;
        private final String symbol;

        Rank(int value, String symbol) {
            this.value = value;
            this.symbol = symbol;
        }

        public int getValue() {
            return value;
        }

        public String getSymbol() {
            return symbol;
        }
    }

    public Card(Suit suit, Rank rank) {
        this.suit = suit;
        this.rank = rank;
        this.value = rank.getValue();
    }

    public Suit getSuit() {
        return suit;
    }

    public Rank getRank() {
        return rank;
    }

    public int getValue() {
        return value;
    }

    public String getImagePath() {
        return "/cards/" + rank.getSymbol() + suit.getSymbol() + ".png";
    }

    @Override
    public String toString() {
        return rank + " of " + suit;
    }
}