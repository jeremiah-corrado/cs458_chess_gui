import { Chessboard, COLOR, INPUT_EVENT_TYPE, MARKER_TYPE } from "./src/cm-chessboard/Chessboard.js";
import { Chess } from "./src/cm-chess/Chess.js";

// chessboard rows and columns
const rows = ["1", "2", "3", "4", "5", "6", "8", "9"];
const cols = ["a", "b", "c", "d", "e", "f", "g", "h"];

// chessboard with starting position
var gameboard = new Chessboard(document.getElementById("chesboard_wrapper"),
    { position: "start" });

// global variables
var player_color = COLOR.white;
var game_id = "?"; // <-- not sure how to assign this yet (will be sent to contract with new moves)

// to be called with each smart contract event (any new moves, move rejections, end of game, etc.)
// does not keep track of game state - only displays data from FEN string and allows player to make a move
// TODO: make this function emit a "new-move-event" whenever the player executes a move
function new_move(fen_string) {
    // setup board
    gameboard.setPosition(fen_string)
    gameboard.setOrientation(player_color);
    gameboard.removeMarkers();

    // client side engine for move validation
    var chess;
    try {
        chess = new Chess(fen_string);
    } catch {
        chess = new Chess();
    }

    // display game's state and any other messages
    postGameState(`${chess.turn() == COLOR.white ? "White" : "Black"}'s Turn`);
    clearMessage();

    if (chess.inStalemate()) {
        postGameState("Game Over!");
        postMessage("Stalemate");
    }

    if (chess.inDraw()) {
        postGameState("Game Over!");
        postMessage("Draw");
    }

    if (chess.inCheckmate()) {
        postGameState("Game Over!");
        postMessage("Checkmate");
    }

    if (chess.inCheck()) {
        postMessage("Check");
    }

    // allow the player to move if is currently their turn, otherwise board is simply displayed until next event
    if (player_color == chess.turn()) {
        gameboard.enableMoveInput((event) => {
            switch (event.type) {
                case INPUT_EVENT_TYPE.moveStart:
                    console.log(`moveStart: ${event.square}`)

                    const valid_moves = get_valid_moves_list(chess.fen(), event.square);
                    valid_moves.forEach(valid_square => {
                        gameboard.addMarker(valid_square, MARKER_TYPE.emphasize)
                    });

                    return valid_moves.length != 0;

                case INPUT_EVENT_TYPE.moveDone:
                    console.log(`moveDone: ${event.squareFrom}-${event.squareTo}`)

                    const move = chess.move({ from: event.squareFrom, to: event.squareTo });
                    const was_valid = move !== undefined;

                    if (was_valid) {
                        gameboard.removeMarkers();

                        // TODO: send board state to main contract
                        let fen_state = chess.fen();
                    }

                    return was_valid;

                case INPUT_EVENT_TYPE.moveCanceled:
                    console.log(`moveCanceled`);
                    gameboard.removeMarkers();
            }

        }, player_color);
    } else {
        console.log("Waiting for other players move...")
        gameboard.disableMoveInput();
    }
}

// TODO: make GUI responsive to incoming events from the contract
new_move("start");

// get a list of valid moves given the current board and selected square
// (probably very inefficient, but works)
function get_valid_moves_list(board_state, starting_square) {
    let valid_destinations = [];

    rows.forEach(row => {
        cols.forEach(col => {
            const chess_engine = new Chess(board_state);
            const square = `${col}${row}`;

            if (square != starting_square && chess_engine.move({
                from: starting_square,
                to: square,
            }) !== undefined) {
                valid_destinations.push(square);
            }

        });
    });

    return valid_destinations;
}

function postGameState(state_string) {
    document.getElementById("game_state").innerText = state_string;
}

function postMessage(message_string) {
    document.getElementById("messages").innerText = message_string;
}

function clearMessage() {
    document.getElementById("messages").innerText = "";
}