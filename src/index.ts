#!/usr/bin/env node
import { svg2ts } from './svg2ts';
import { banner } from './utils/banner';
import { CommandLineTools } from './utils/cmd';
import { SVG2TSCmd } from './types';

const packageJson = require('../package.json');

function main() {
    const args = process.argv.slice(2);

    const commandLineToolsOptions = {
        aliases: {
            output: 'o',
            input: 'i',
            blueprint: 'b',
            module: 'm'
        },
        help: {
            input: 'svg source dir|./svg',
            output: 'ts output dir|./svg-ts-out',
            blueprint:
                "blueprint to use 'typescript'[default] 'angular' |typescript",
            module: 'Module name for angular blueprint |svg-to-ts'
        },
        // prettier-ignore
        banner: banner,
        version: packageJson.version
    };
    const cmd = new CommandLineTools<SVG2TSCmd>(
        'svg2ts',
        args,
        commandLineToolsOptions
    );
    if (!cmd.args.input || !cmd.args.output) {
        return cmd.help();
    } else {
        cmd.args.blueprint = cmd.args.blueprint || 'typescript';
        cmd.args.module = cmd.args.module || 'svg-to-ts';
        svg2ts(cmd.args);
    }
}
main();
