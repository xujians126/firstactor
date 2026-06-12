import { actor, event, setup, UserError } from "rivetkit";

type Player = "X" | "O";
type Cell = Player | null;
type Board = Cell[][];

interface GameState {
	board: Board;
	currentTurn: Player;
	players: Record<Player, string | null>;
	winner: Player | "draw" | null;
}

interface ConnState {
	playerId: string;
	assignedMark: Player | null;
}

export const game = actor({
	state: {
		board: [
			[null, null, null],
			[null, null, null],
			[null, null, null],
		],
		currentTurn: "X",
		players: { X: null, O: null },
		winner: null,
	} as GameState,
	events: {
		stateChanged: event<GameState>(),
		playerJoined: event<{ mark: Player; playerId: string }>(),
		gameOver: event<{ winner: Player | "draw" }>(),
	},
	createConnState: (c, params: { playerId: string }): ConnState => ({
		playerId: params.playerId,
		assignedMark: null,
	}),
	onConnect: (c, conn) => {
		const state = c.state;
		if (!state.players.X) {
			state.players.X = conn.state.playerId;
			conn.state.assignedMark = "X";
			c.broadcast("playerJoined", { mark: "X", playerId: conn.state.playerId });
		} else if (!state.players.O) {
			state.players.O = conn.state.playerId;
			conn.state.assignedMark = "O";
			c.broadcast("playerJoined", { mark: "O", playerId: conn.state.playerId });
		}
		c.broadcast("stateChanged", state);
	},
	actions: {
		getState: (c) => c.state,
		getMyMark: (c) => c.conn.state.assignedMark,
		makeMove: (c, row: number, col: number) => {
			const { board, currentTurn, winner, players } = c.state;
			if (winner) throw new UserError("Game is already over");
			if (c.conn.state.assignedMark !== currentTurn) throw new UserError("Not your turn");
			if (row < 0 || row > 2 || col < 0 || col > 2) throw new UserError("Invalid position");
			if (board[row][col]) throw new UserError("Cell already taken");

			board[row][col] = currentTurn;

			const result = checkWinner(board);
			if (result) {
				c.state.winner = result;
				c.broadcast("gameOver", { winner: result });
			} else {
				c.state.currentTurn = currentTurn === "X" ? "O" : "X";
			}
			c.broadcast("stateChanged", c.state);
			return c.state;
		},
		reset: (c) => {
			c.state.board = [
				[null, null, null],
				[null, null, null],
				[null, null, null],
			];
			c.state.currentTurn = "X";
			c.state.winner = null;
			c.broadcast("stateChanged", c.state);
		},
	},
});

function checkWinner(board: Board): Player | "draw" | null {
	const lines = [
		[[0, 0], [0, 1], [0, 2]],
		[[1, 0], [1, 1], [1, 2]],
		[[2, 0], [2, 1], [2, 2]],
		[[0, 0], [1, 0], [2, 0]],
		[[0, 1], [1, 1], [2, 1]],
		[[0, 2], [1, 2], [2, 2]],
		[[0, 0], [1, 1], [2, 2]],
		[[0, 2], [1, 1], [2, 0]],
	];
	for (const line of lines) {
		const [a, b, c] = line;
		if (board[a[0]][a[1]] && board[a[0]][a[1]] === board[b[0]][b[1]] && board[a[0]][a[1]] === board[c[0]][c[1]]) {
			return board[a[0]][a[1]];
		}
	}
	const flat = board.flat();
	if (flat.every((cell) => cell !== null)) return "draw";
	return null;
}

export const registry = setup({
	use: { game },
});
