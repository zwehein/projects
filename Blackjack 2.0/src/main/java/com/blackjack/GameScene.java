package com.blackjack;

import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.Scene;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.image.Image;
import javafx.scene.image.ImageView;
import javafx.scene.layout.HBox;
import javafx.scene.layout.VBox;
import javafx.scene.text.Font;
import javafx.animation.FadeTransition;
import javafx.util.Duration;
import java.util.List;
import java.util.Optional;

public class GameScene extends Scene {
    private final GameEngine gameEngine;
    private final Label dealerLabel;
    private final Label playerLabel;
    private final HBox dealerCards;
    private final HBox playerCards;
    private final Button hitButton;
    private final Button standButton;
    private final Button usePowerUpButton;
    private final Button newGameButton;
    private final Button increaseLuckButton;

    public GameScene(GameEngine gameEngine) {
        super(new VBox(20), 800, 600);
        this.gameEngine = gameEngine;

        // Create labels for hands
        dealerLabel = new Label("Dealer's Hand:");
        playerLabel = new Label("Your Hand:");
        dealerLabel.setFont(new Font(20));
        playerLabel.setFont(new Font(20));

        // Create card containers
        dealerCards = new HBox(10);
        playerCards = new HBox(10);
        dealerCards.setAlignment(Pos.CENTER);
        playerCards.setAlignment(Pos.CENTER);

        // Create buttons
        hitButton = new Button("Hit");
        standButton = new Button("Stand");
        usePowerUpButton = new Button("Use Power-Up");
        newGameButton = new Button("New Game");
        increaseLuckButton = new Button("Increase Luck");

        // Style buttons
        String buttonStyle = "-fx-font-size: 16px; -fx-padding: 10px 20px; -fx-background-color: #3498db; -fx-text-fill: white;";
        hitButton.setStyle(buttonStyle);
        standButton.setStyle(buttonStyle);
        usePowerUpButton.setStyle(buttonStyle);
        newGameButton.setStyle(buttonStyle);
        increaseLuckButton.setStyle(buttonStyle);

        // Create button container
        HBox buttonBox = new HBox(20, hitButton, standButton, usePowerUpButton, newGameButton, increaseLuckButton);
        buttonBox.setAlignment(Pos.CENTER);

        // Set up the main layout
        VBox root = (VBox) getRoot();
        root.setPadding(new Insets(20));
        root.setAlignment(Pos.CENTER);
        root.setStyle("-fx-background-color: #2c3e50;");

        // Add all components to the root
        root.getChildren().addAll(
                dealerLabel,
                dealerCards,
                playerLabel,
                playerCards,
                buttonBox);

        // Set up button actions
        setupButtonActions();
    }

    private void setupButtonActions() {
        hitButton.setOnAction(e -> {
            gameEngine.playerHit();
            updateDisplay();
            if (gameEngine.getGameState() == GameEngine.GameState.GAME_OVER) {
                showGameResult();
                disableGameButtons();
            }
        });

        standButton.setOnAction(e -> {
            gameEngine.playerStand();
            updateDisplay();
            showGameResult();
            disableGameButtons();
        });

        increaseLuckButton.setOnAction(e -> {
            gameEngine.getPlayer().addPowerUp(new PeekPowerUp());
            gameEngine.getPlayer().addPowerUp(new SecondChancePowerUp());
            gameEngine.getPlayer().addPowerUp(new SafeDrawPowerUp());

            javafx.scene.control.Alert alert = new javafx.scene.control.Alert(
                    javafx.scene.control.Alert.AlertType.INFORMATION,
                    "Added one of each power-up to your inventory!");
            alert.setHeaderText("Luck Increased!");
            alert.showAndWait();
        });

        usePowerUpButton.setOnAction(e -> {
            List<PowerUp> availablePowerUps = gameEngine.getPlayer().getPowerUps();
            if (availablePowerUps.isEmpty()) {
                javafx.scene.control.Alert alert = new javafx.scene.control.Alert(
                        javafx.scene.control.Alert.AlertType.INFORMATION,
                        "You don't have any power-ups available!");
                alert.setHeaderText("No Power-Ups");
                alert.showAndWait();
                return;
            }

            // Create a choice dialog for power-up selection
            javafx.scene.control.ChoiceDialog<PowerUp> dialog = new javafx.scene.control.ChoiceDialog<>(
                    availablePowerUps.get(0), availablePowerUps);
            dialog.setTitle("Use Power-Up");
            dialog.setHeaderText("Select a power-up to use:");
            dialog.setContentText("Available power-ups:");

            // Show the dialog and get the result
            Optional<PowerUp> result = dialog.showAndWait();
            result.ifPresent(powerUp -> {
                String message = powerUp.apply(gameEngine);
                gameEngine.getPlayer().removePowerUp(powerUp);
                javafx.scene.control.Alert alert = new javafx.scene.control.Alert(
                        javafx.scene.control.Alert.AlertType.INFORMATION,
                        message);
                alert.setHeaderText("Power-Up Used");
                alert.showAndWait();
                updateDisplay();
            });
        });

        newGameButton.setOnAction(e -> {
            startNewRound();
            enableGameButtons();
        });
    }

    public void startNewRound() {
        gameEngine.startNewRound();
        updateDisplay();
    }

    private void updateDisplay() {
        // Clear existing cards
        dealerCards.getChildren().clear();
        playerCards.getChildren().clear();

        // Add dealer's cards with animation
        boolean showAllCards = gameEngine.getGameState() == GameEngine.GameState.GAME_OVER;
        for (int i = 0; i < gameEngine.getDealer().getHand().getCards().size(); i++) {
            Card card = gameEngine.getDealer().getHand().getCards().get(i);
            ImageView cardView;
            if (i == 0 && !showAllCards) {
                cardView = createCardBackImageView();
            } else {
                cardView = createCardImageView(card);
            }

            // Add card with animation
            cardView.setOpacity(0);
            dealerCards.getChildren().add(cardView);

            // Animate card appearance
            FadeTransition fadeIn = new FadeTransition(Duration.millis(300), cardView);
            fadeIn.setFromValue(0);
            fadeIn.setToValue(1);
            fadeIn.play();
        }

        // Add player's cards with animation
        for (Card card : gameEngine.getPlayer().getHand().getCards()) {
            ImageView cardView = createCardImageView(card);

            // Add card with animation
            cardView.setOpacity(0);
            playerCards.getChildren().add(cardView);

            // Animate card appearance
            FadeTransition fadeIn = new FadeTransition(Duration.millis(300), cardView);
            fadeIn.setFromValue(0);
            fadeIn.setToValue(1);
            fadeIn.play();
        }

        // Update labels with totals
        if (showAllCards) {
            dealerLabel.setText("Dealer's Hand: " + gameEngine.getDealer().getHandTotal());
        } else {
            dealerLabel.setText("Dealer's Hand: ?");
        }
        playerLabel.setText("Your Hand: " + gameEngine.getPlayer().getHandTotal());
    }

    private ImageView createCardImageView(Card card) {
        String imagePath = getClass().getResource(card.getImagePath()).toExternalForm();
        ImageView imageView = new ImageView(new Image(imagePath));
        imageView.setFitWidth(100);
        imageView.setPreserveRatio(true);

        // Enhanced card styling
        imageView.setStyle("-fx-effect: dropshadow(gaussian, rgba(0,0,0,0.3), 10, 0, 0, 0);" +
                "-fx-transition: all 0.3s ease;");

        // Add hover effect
        imageView.setOnMouseEntered(e -> {
            imageView.setScaleX(1.1);
            imageView.setScaleY(1.1);
            imageView.setTranslateY(-10);
        });

        imageView.setOnMouseExited(e -> {
            imageView.setScaleX(1.0);
            imageView.setScaleY(1.0);
            imageView.setTranslateY(0);
        });

        return imageView;
    }

    private ImageView createCardBackImageView() {
        String imagePath = getClass().getResource("/cards/back.png").toExternalForm();
        ImageView imageView = new ImageView(new Image(imagePath));
        imageView.setFitWidth(100);
        imageView.setPreserveRatio(true);

        // Enhanced card back styling
        imageView.setStyle("-fx-effect: dropshadow(gaussian, rgba(0,0,0,0.3), 10, 0, 0, 0);" +
                "-fx-transition: all 0.3s ease;");

        // Add hover effect
        imageView.setOnMouseEntered(e -> {
            imageView.setScaleX(1.1);
            imageView.setScaleY(1.1);
            imageView.setTranslateY(-10);
        });

        imageView.setOnMouseExited(e -> {
            imageView.setScaleX(1.0);
            imageView.setScaleY(1.0);
            imageView.setTranslateY(0);
        });

        return imageView;
    }

    private void showGameResult() {
        GameEngine.GameResult result = gameEngine.getGameResult();
        String message = switch (result) {
            case PLAYER_WIN -> "You win!";
            case DEALER_WIN -> "Dealer wins!";
            case PUSH -> "It's a push!";
        };

        javafx.scene.control.Alert alert = new javafx.scene.control.Alert(
                javafx.scene.control.Alert.AlertType.INFORMATION,
                message);
        alert.setHeaderText("Game Over");
        alert.showAndWait();

        // Check for win streak reward
        PowerUp reward = gameEngine.rewardPowerUp();
        if (reward != null) {
            javafx.scene.control.Alert rewardAlert = new javafx.scene.control.Alert(
                    javafx.scene.control.Alert.AlertType.CONFIRMATION,
                    "Congratulations! You've won 3 games in a row!\n" +
                            "You've earned a " + reward.getName() + " power-up!");
            rewardAlert.setHeaderText("Power-Up Reward!");
            rewardAlert.showAndWait();
        }
    }

    private void disableGameButtons() {
        hitButton.setDisable(true);
        standButton.setDisable(true);
        usePowerUpButton.setDisable(true);
    }

    private void enableGameButtons() {
        hitButton.setDisable(false);
        standButton.setDisable(false);
        usePowerUpButton.setDisable(false);
    }
}