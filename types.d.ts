export = Console2.main;

declare namespace Console2 {
	type ConsoleOpt = ConsoleOptions | string | number;
	type ConsoleColor = 'cyan' | 'green' | 'yellow' | 'red' | 'magenta' | 'blue' | 'white' | 'grey'
		| 'black' | 'rainbow' | 'zebra' | 'code';

	interface ConsoleOptions {
		disableWelcome?: boolean
		console?: any;
		border?: number;
		color?: ConsoleColor;
		colorText?: string;
		isWorker?: boolean;
		map?: [string, string][];
		enableAutoOut?: boolean;
		override?: boolean;
		animate?: boolean;
		over?: boolean;
	}

	interface console {
		opt: ConsoleOptions;
		col: (str: string, color: ConsoleColor) => string;
		pad: (padSymbol: string, length: number, string?: string, useLeftSide?: boolean) => string;
		overrideConsole: () => this;
		options: (opt: ConsoleOpt) => this;
		box: (...lines: any[]) => this;
		help: () => void;
		line: (...lines: any[]) => this;
		_: (...lines: any[]) => this;
		log: (...lines: any[]) => this;
		debug: (...lines: any[]) => this;
		info: (...lines: any[]) => this;
		ok: (...lines: any[]) => this;
		dir: (...lines: any[]) => this;
		error: (...lines: any[]) => this;
		warn: (...lines: any[]) => this;
		time: (label?: string, reset?: boolean) => this;
		timeEnd: (label?: string, reset?: boolean) => this;
		trace: (message?: string) => this;
		title: (...any: any[]) => this;
		spacer: () => this;
		beep: (label?: string) => this;
		over: () => this;
		out: (method?: string, ...lines: any[]) => this;
		build: (stripLevels: boolean, useParent: boolean) => Promise<string>;
		getParent: (generations: number) => this;
	}

	function main(opt?: ConsoleOptions): console;
}
