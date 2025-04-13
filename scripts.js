const answerInput = document.getElementById("answer-input");
const appHeadlineElement = document.getElementById("app-headline");
const checkAnswerButton = document.getElementById("check-answer");
const definitionElement = document.getElementById("definition");
const etymologyElement = document.getElementById("etymology");
const examplesElement = document.getElementById("examples");
const fileNameElement = document.getElementById("file-name");
const fileUploadInput = document.getElementById("file-upload-input");
const flashcardContentsElement = document.getElementById("flashcard-contents");
const listEndMessageElement = document.getElementById("list-end-message");
const nextCardButton = document.getElementById("next-card");
const playAudioButton = document.getElementById("play-audio");
const pronunciationElement = document.getElementById("pronunciation");
const resultElement = document.getElementById("result");
const showInfoElement = document.querySelector(".show-info");
const showInfoElementButton = document.getElementById("show-info-button");
const wordHeadlineElement = document.getElementById("word-headline");
let currentWord = null;

// Parse CSV file of words
async function parseCSV(file) {
	const text = await file.text();
	return text
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line);
}

// Fetch data from Merriam-Webster API
async function fetchWordData(word) {
	const apiKey = "fb0aaf50-3f37-4615-832a-60aec96b42f9"; // Updated with provided API key
	const url = `https://www.dictionaryapi.com/api/v3/references/collegiate/json/${word}?key=${apiKey}`;
	const response = await fetch(url);
	const data = await response.json();
	if (data.length > 0 && data[0].hwi) {
		return {
			definition:
				data[0].shortdef[0]?.charAt(0).toUpperCase() +
				data[0].shortdef[0]?.slice(1),
			examples: data[0].def?.[0]?.sseq?.[0]?.[0]?.[1]?.dt
				?.find((item) => item[0] === "vis")?.[1]
				?.map((ex) => ex.t) || ["Not available"],
			pronunciation: data[0].hwi.hw || "Not available",
			etymology: data[0].et?.[0]?.[1] || "Not available",
			audio: data[0].hwi.prs[0]?.sound?.audio, // Not in use
		};
	}
	return null;
}

// Apply formatting to text data from Merriam-Webster API
function applyFormatting(text) {
	return text
		.replace(/{it}/g, "<i>") // Replace opening italics
		.replace(/{\/it}/g, "</i>") // Replace closing italics
		.replace(/{b}/g, "<b>") // Replace opening bold
		.replace(/{\/b}/g, "</b>") // Replace closing bold
		.replace(/{sc}/g, '<span class="small-caps">') // Replace opening small caps
		.replace(/{\/sc}/g, "</span>") // Replace closing small caps
		.replace(/{[^}]+}/g, ""); // Remove any other unknown markers
}

// Update elements with formatted text
function updateElementsWithFormattedText(dataMap) {
	for (const [id, text] of Object.entries(dataMap)) {
		const element = document.getElementById(id);
		if (element) {
			element.innerHTML = applyFormatting(text); // Use innerHTML to apply formatting
		}
	}
}

// Play audio for the word using Google Translate TTS
function playWordAudio(word) {
    fetchWordData(word).then((wordData) => {
        if (wordData && wordData.audio) {
            // Construct the Merriam-Webster audio URL
            const subdirectory = wordData.audio.startsWith("bix")
                ? "bix"
                : wordData.audio.startsWith("gg")
                ? "gg"
                : /^[0-9]/.test(wordData.audio.charAt(0))
                ? "number"
                : wordData.audio.charAt(0);
            const audioUrl = `https://media.merriam-webster.com/audio/prons/en/us/mp3/${subdirectory}/${wordData.audio}.mp3`;

            // Play the audio
            const audio = new Audio(audioUrl);
            audio.volume = 0.4; // Set volume to 40%
            audio.onerror = () => {
                console.log("Failed to play audio. Merriam-Webster audio may be unavailable.");
            };
            audio.play();
        } else {
            alert("Audio not available for this word.");
        }
    });
}

// Initialize app
fileUploadInput.addEventListener("change", async (event) => {
	// Reset application state (for selecting another file)
    resetAppState(); 

	// Display the flashcard contents
	flashcardContentsElement.style.display = "flex";
    appHeadlineElement.style.display = "none";

	// Update the file name
	const fileName = event.target.files[0]?.name || "No file selected";
	fileNameElement.textContent = fileName;

	// Parse the CSV file and shuffle the words
	const file = event.target.files[0];
	if (!file) return;
	const words = await parseCSV(file);

	for (let i = words.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[words[i], words[j]] = [words[j], words[i]];
	}
	let currentIndex = 0;

	// Define the function to load the next card
	const loadNextCard = () => {
		if (currentIndex < words.length) {
			loadFlashcard(words[currentIndex]);
			currentIndex++;
		} else {
            listEndMessageElement.style.display = "flex";
		}
	};

	// Attach the "Next Card" button event listener
	nextCardButton.onclick = loadNextCard;

	// Load the first card
	loadNextCard();
});

// Reset application state
function resetAppState() {
    listEndMessageElement.style.display = "none";
	nextCardButton.onclick = null;
	playAudioButton.onclick = null;
	currentWord = null;
}

// Load flashcard
async function loadFlashcard(word) {
	answerInput.value = "";
	resultElement.innerHTML = "";
	showInfoElement.style.display = "none";
	wordHeadlineElement.innerHTML = "?";

	// Fetch word data and update elements
	const wordData = await fetchWordData(word);
	if (!wordData) {
		updateElementsWithFormattedText({
			definition: `Word data not found for "${word}".`,
		});
		return;
	}
	updateElementsWithFormattedText({
		definition: wordData.definition,
		etymology: wordData.etymology,
		pronunciation: wordData.pronunciation,
		examples: wordData.examples.join("<br>"),
	});

	// Play word audio when the card is loaded
	playWordAudio(word);

	// Update `currentWord` for the Play Audio button
	currentWord = word;

	// Attach the "Play Audio" button event listener
	playAudioButton.onclick = () => playWordAudio(currentWord);

	// Check answer and highlight correct letters
	function checkAnswer() {
		const userAnswer = answerInput.value.trim().toLowerCase();
		const correctWord = word.toLowerCase();
		let feedback = "Correct letters: ";
		let answerCorrect = true;

		for (let i = 0; i < correctWord.length; i++) {
			if (userAnswer[i] === correctWord[i]) {
				feedback += `<span id='correct'>${correctWord[i]}</span>`;
			} else {
				feedback += `_`;
				answerCorrect = false; // Mark as incorrect if any letter doesn't match
			}
		}

		resultElement.innerHTML = feedback; // Update the result

		// Reveal word information if the answer is correct
		if (answerCorrect) {
			showInfoElement.style.display = "flex";
			wordHeadlineElement.innerHTML = word;
		}
	}

	// Attach the "Check Answer" button event listener
	checkAnswerButton.onclick = checkAnswer;

	// Attach the "Enter" key event listener for checking the answer
	document.onkeydown = (event) => {
		if (event.key === "Enter") {
			checkAnswer();
		}
	};

	// Attach the "Show Info" button event listener
	showInfoElementButton.onclick = () => {
		showInfoElement.style.display = "flex";
	};
}