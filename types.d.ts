export = Console2.main;

declare namespace Console2 {
	type Opt = Options | string | number
	type Color = 'cyan' | 'green' | 'yellow' | 'red' | 'magenta' | 'blue' | 'white' | 'grey' | 'black' | 'rainbow' | 'zebra' | 'code'
	type Background = 'bgCyan' | 'bgGreen' | 'bgYellow' | 'bgRed' | 'bgMagenta' | 'bgBlue' | 'bgWhite' | 'bgGrey' | 'bgBlack'

	interface Options {
		disableWelcome?: boolean
		console?: any;
		border?: number;
		color?: Color;
		colorText?: string;
		isWorker?: boolean;
		map?: [string, string][];
		enableAutoOut?: boolean;
		override?: boolean;
		animate?: boolean;
		over?: boolean;
	}

	interface console {
		opt: Options;
		col: (str: string | number, color: Color | Background) => string;
		pad: (padSymbol: string, length: number, string?: string, useLeftSide?: boolean) => string;
		overrideConsole: () => this;
		options: (opt: Opt) => this;
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
		out: (...lines: any[]) => this;
		build: (stripLevels: boolean, useParent: boolean) => Promise<string>;
		getParent: (generations: number) => this;
	}

	function main(opt?: Options): console;
}
