# Create base URL for Kenney's card images
$baseUrl = "https://kenney.nl/assets/playing-cards-pack/PNG/"

# Define card ranks and suits
$ranks = @("A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K")
$suits = @("H", "D", "C", "S")

# Create output directory
$outputDir = "src/main/resources/cards"
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir
}

# Download card images
foreach ($suit in $suits) {
    foreach ($rank in $ranks) {
        $filename = "$rank$suit.png"
        $url = "$baseUrl$filename"
        $outputPath = "$outputDir/$filename"
        
        Write-Host "Downloading $filename..."
        Invoke-WebRequest -Uri $url -OutFile $outputPath
    }
}

# Download card back
$backUrl = "$baseUrl/back.png"
$backOutputPath = "$outputDir/back.png"
Write-Host "Downloading card back..."
Invoke-WebRequest -Uri $backUrl -OutFile $backOutputPath

Write-Host "Download complete!" 