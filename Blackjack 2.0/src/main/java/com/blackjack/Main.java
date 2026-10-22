// mvn exec:java
// mvn javafx:run

package com.blackjack;

import javafx.application.Application;
import javafx.geometry.Pos;
import javafx.scene.Scene;
import javafx.scene.control.Button;
import javafx.scene.layout.VBox;
import javafx.stage.Stage;

public class Main extends Application {
    private Stage primaryStage;
    private GameEngine gameEngine;
    private GameScene gameScene;

    @Override
    public void start(Stage primaryStage) {
        this.primaryStage = primaryStage;
        this.gameEngine = new GameEngine();
        this.gameScene = new GameScene(gameEngine);

        // Create the start button
        Button startButton = new Button("Start Game");
        startButton.setStyle("-fx-font-size: 20px; -fx-padding: 10px 20px;");
        startButton.setOnAction(e -> {
            gameScene.startNewRound();
            primaryStage.setScene(gameScene);
        });

        // Create the main layout
        VBox root = new VBox(20, startButton);
        root.setAlignment(Pos.CENTER);
        root.setStyle("-fx-background-color: #2c3e50; -fx-padding: 20px;");

        // Create the start scene
        Scene startScene = new Scene(root, 400, 300);

        // Set up the stage
        primaryStage.setTitle("Mini Blackjack MVP");
        primaryStage.setScene(startScene);
        primaryStage.show();
    }

    public static void main(String[] args) {
        launch(args);
    }
}