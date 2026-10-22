package com.blackjack;

public class PowerUpTest {
    public static void main(String[] args) {
        // Create game engine and power-ups
        GameEngine engine = new GameEngine();
        PeekPowerUp peek = new PeekPowerUp();
        SecondChancePowerUp secondChance = new SecondChancePowerUp();
        SafeDrawPowerUp safeDraw = new SafeDrawPowerUp();

        // Add power-ups to player
        engine.getPlayer().addPowerUp(peek);
        engine.getPlayer().addPowerUp(secondChance);
        engine.getPlayer().addPowerUp(safeDraw);

        // Start a new round
        System.out.println("Starting a new round...");
        engine.startNewRound();

        // Test Peek power-up
        System.out.println("\nTesting Peek power-up:");
        System.out.println("Dealer's visible card: " + engine.getDealer().getHand().getCards().get(1));
        System.out.println("Using Peek power-up...");
        System.out.println(peek.apply(engine));
        System.out.println("Revealed card: " + peek.getRevealedCard());

        // Test Safe Draw power-up
        System.out.println("\nTesting Safe Draw power-up:");
        System.out.println("Player's current hand: " + engine.getPlayer().getHand());
        System.out.println("Using Safe Draw power-up...");
        System.out.println(safeDraw.apply(engine));
        System.out.println("Player's new hand: " + engine.getPlayer().getHand());

        // Test Second Chance power-up
        System.out.println("\nTesting Second Chance power-up:");
        // Force a bust by drawing cards
        while (!engine.getPlayer().isBust()) {
            engine.playerHit();
            System.out.println("Drew a card. New hand: " + engine.getPlayer().getHand());
        }
        System.out.println("Player busted! Using Second Chance power-up...");
        System.out.println(secondChance.apply(engine));
        System.out.println("Player's hand after second chance: " + engine.getPlayer().getHand());

        // Try to use used power-ups
        System.out.println("\nTrying to use used power-ups:");
        System.out.println("Trying to use Peek again: " + peek.apply(engine));
        System.out.println("Trying to use Safe Draw again: " + safeDraw.apply(engine));
        System.out.println("Trying to use Second Chance again: " + secondChance.apply(engine));
    }
}