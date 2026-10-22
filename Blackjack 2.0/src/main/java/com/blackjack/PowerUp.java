package com.blackjack;

public interface PowerUp {
    /**
     * Apply the power-up effect to the game engine
     * 
     * @param engine The current game engine instance
     * @return A message describing what happened when the power-up was used
     */
    String apply(GameEngine engine);

    /**
     * Get the name of the power-up
     * 
     * @return The power-up's display name
     */
    String getName();
}