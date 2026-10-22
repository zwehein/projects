package com.blackjack;

import java.util.Scanner;

public class ConsoleGame {
    public static void main(String[] args) {
        GameEngine game = new GameEngine();
        Scanner scanner = new Scanner(System.in);

        System.out.println("Welcome to Blackjack!");
        System.out.println("Press Enter to start a new round...");
        scanner.nextLine();

        while (true) {
            game.startNewRound();

            // Show initial hands
            System.out.println("\nDealer's visible card: " + game.getDealer().getHand().getCards().get(0));
            System.out.println("Your hand: " + game.getPlayer().getHand());

            // Player's turn
            while (game.getGameState() == GameEngine.GameState.PLAYER_TURN) {
                System.out.println("\nDo you want to (H)it or (S)tand?");
                String input = scanner.nextLine().toUpperCase();

                if (input.equals("H")) {
                    game.playerHit();
                    System.out.println("Your hand: " + game.getPlayer().getHand());

                    if (game.getPlayer().isBust()) {
                        System.out.println("Bust! You went over 21.");
                    }
                } else if (input.equals("S")) {
                    game.playerStand();
                }
            }

            // Show final hands and result
            System.out.println("\nFinal hands:");
            System.out.println("Dealer's hand: " + game.getDealer().getHand());
            System.out.println("Your hand: " + game.getPlayer().getHand());

            GameEngine.GameResult result = game.getGameResult();
            switch (result) {
                case PLAYER_WIN -> System.out.println("You win!");
                case DEALER_WIN -> System.out.println("Dealer wins!");
                case PUSH -> System.out.println("Push! It's a tie.");
            }

            System.out.println("\nPress Enter to play again or 'Q' to quit...");
            String input = scanner.nextLine();
            if (input.equalsIgnoreCase("Q")) {
                break;
            }
        }

        scanner.close();
        System.out.println("Thanks for playing!");
    }
}