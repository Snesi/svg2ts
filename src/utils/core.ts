import * as fs from 'fs';
import * as path from 'path';
import { SVG2TSSourceFile, SVG2TSCmd } from '../types';
import { removeStyles, extractStyles } from './svg';
import { lineBreaksRegExp } from './regexp';

export function loadSvgFile(options: SVG2TSCmd) {
    return (fileName: string): SVG2TSSourceFile => {
        const svg = fs
            .readFileSync(fileName, 'utf8')
            .replace(lineBreaksRegExp, '');

        return {
            path: fileName,
            name: path.basename(fileName).replace('.svg', ''),
            svg: removeStyles(svg),
            css: extractStyles(svg, options)
        };
    };
}

export function printObj(obj: any, tab: string = ''): string {
    const isArray = Array.isArray(obj);
    let str = isArray ? tab + '[' : tab + '{';
    for (const prop in obj) {
        if (obj.hasOwnProperty(prop)) {
            const val1 = obj[prop];
            let val2 = '';
            const type = Object.prototype.toString.call(val1);
            switch (type) {
                case '[object Array]':
                case '[object Object]':
                    val2 = printObj(val1);
                    break;
                case '[object String]':
                    val2 = "'" + val1 + "'";
                    break;
                default:
                    val2 = val1;
            }
            str += tab + prop + ': ' + val2 + ',';
        }
    }
    // remove extra comma for last property
    str = str.substring(0, str.length - 1);
    return isArray ? str + ']' : str + '}';
}

export function walkSync(dir: string, filelist: string[] = []): string[] {
    if (dir[dir.length - 1] !== '/') {
        dir = dir.concat('/');
    }
    const files = fs.readdirSync(dir);
    files.forEach((file: string) => {
        if (fs.statSync(dir + file).isDirectory()) {
            filelist = walkSync(dir + file + '/', filelist);
        } else {
            filelist.push(dir + file);
        }
    });
    return filelist;
}

export function mkdirRecursiveSync(directory: string) {
    var path = directory.replace(/\/$/, '').split('/');

    for (var i = 1; i <= path.length; i++) {
        var segment = path.slice(0, i).join('/');
        !fs.existsSync(segment) ? fs.mkdirSync(segment) : null;
    }
}

export function dotObject(path: string, obj: any = {}, value: any = null) {
    const result = path
        .split('.')
        .slice(1)
        .reduce((parent, key, index, arr) => {
            parent[key] =
                index === arr.length - 1
                    ? typeof value === 'object'
                      ? Object.assign(parent[key], value)
                      : value
                    : parent[key] || {};
            return parent[key];
        }, obj);
    return value ? obj : result;
}

export function tsc<T>(template: string, context: T): (context: T) => string {
    const keys = Object.keys(context),
        replacer = /@{[\s]?([\s\S]*)[\s]?}/;
    while (replacer.test(template)) {
        template = template.replace(replacer, '${$1}');
    }
    const fnTemplate = 'const {' + keys + '}=context; return`' + template + '`';
    return new Function('context', fnTemplate) as (context: T) => string;
}
