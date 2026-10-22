package com.blackjack;

import java.util.Random;
import java.util.List;
import java.util.ArrayList;

public class GameEngine {
    private final Deck deck;
    private final Player player;
    private final Dealer dealer;
    private GameState gameState;
    private int winStreak;
    private static final int WIN_STREAK_REWARD = 3;
    private static final Random random = new Random();

    public enum GameState {
        PLAYER_TURN, DEALER_TURN, GAME_OVER
    }

    public enum GameResult {
        PLAYER_WIN, DEALER_WIN, PUSH
    }

    public GameEngine() {
        this.deck = new Deck();
        this.player = new Player();
        this.dealer = new Dealer();
        this.gameState = GameState.PLAYER_TURN;
        this.winStreak = 0;
    }

    public void startNewRound() {
        player.clearHand();
        dealer.clearHand();
        gameState = GameState.PLAYER_TURN;

        // Deal initial cards
        player.addCard(deck.draw());
        dealer.addCard(deck.draw());
        player.addCard(deck.draw());
        dealer.addCard(deck.draw());
    }

    public void playerHit() {
        if (gameState == GameState.PLAYER_TURN) {
            player.hit(deck);
            if (player.isBust()) {
                gameState = GameState.GAME_OVER;
                winStreak = 0; // Reset win streak on loss
            }
        }
    }

    public void playerStand() {
        if (gameState == GameState.PLAYER_TURN) {
            gameState = GameState.DEALER_TURN;
            dealer.play(deck);
            gameState = GameState.GAME_OVER;
        }
    }

    public GameResult getGameResult() {
        if (gameState != GameState.GAME_OVER) {
            return null;
        }

        if (player.isBust()) {
            winStreak = 0;
            return GameResult.DEALER_WIN;
        }

        if (dealer.isBust()) {
            winStreak++;
            return GameResult.PLAYER_WIN;
        }

        int playerTotal = player.getHandTotal();
        int dealerTotal = dealer.getHandTotal();

        if (playerTotal > dealerTotal) {
            winStreak++;
            return GameResult.PLAYER_WIN;
        } else if (dealerTotal > playerTotal) {
            winStreak = 0;
            return GameResult.DEALER_WIN;
        } else {
            winStreak = 0;
            return GameResult.PUSH;
        }
    }

    public PowerUp rewardPowerUp() {
        if (winStreak >= WIN_STREAK_REWARD) {
            List<PowerUp> availablePowerUps = new ArrayList<>();
            availablePowerUps.add(new PeekPowerUp());
            availablePowerUps.add(new SecondChancePowerUp());
            availablePowerUps.add(new SafeDrawPowerUp());

            PowerUp reward = availablePowerUps.get(random.nextInt(availablePowerUps.size()));
            player.addPowerUp(reward);
            winStreak = 0; // Reset win streak after reward
            return reward;
        }
        return null;
    }

    public int getWinStreak() {
        return winStreak;
    }

    public GameState getGameState() {
        return gameState;
    }

    public Player getPlayer() {
        return player;
    }

    public Dealer getDealer() {
        return dealer;
    }

    public Deck getDeck() {
        return deck;
    }
}