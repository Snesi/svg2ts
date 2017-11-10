import * as path from 'path';
import * as postcss from 'postcss';
import * as prefixer from 'postcss-prefix-selector';

import {
    SVG2TSCmd,
    SVG2TSDimensions,
    SVG2TSSourceFile,
    SVG2TSSVGMetadata
} from '../types';

import { toKebabCase } from './strings';

const extractorRegExps = {
    root: /<svg\s[^>]+>/,
    width: /\bwidth ?= ?(['"])([^%]+?)\1/,
    height: /\bheight ?= ?(['"])([^%]+?)\1/,
    viewBox: /\bviewBox ?= ?(['"])(.+?)\1/
};

export function isSVG(buffer: string) {
    return /<svg[^>]+[^>]*>/.test(buffer);
}

export function parseViewbox(viewBox: string): SVG2TSDimensions {
    const [minx, miny, width, height] = viewBox.split(' ').map(_ => {
        return parseInt(_, 10);
    });
    return { minx, miny, width, height };
}

export function parseAttributes(root: any): SVG2TSSVGMetadata {
    const width = root.match(extractorRegExps.width);
    const height = root.match(extractorRegExps.height);
    const viewBox = root.match(extractorRegExps.viewBox);
    return {
        ...width ? { width: parseInt(width[2], 10) } : {},
        ...height ? { height: parseInt(height[2], 10) } : {},
        ...viewBox ? { viewBox: parseViewbox(viewBox[2]) } : {}
    };
}

export function getMetadata(svgFile: SVG2TSSourceFile) {
    const buffer = svgFile.svg;
    const root = buffer.match(extractorRegExps.root);
    if (root) {
        const attrs = parseAttributes(root[0]);
        if (attrs.width && attrs.height) {
            return getDimensions(attrs);
        }
        if (attrs.viewBox) {
            return getViewBoxDimensions(attrs);
        }
    }
    console.log(
        `[svg2ts] \x1b[31mUnable to determine dimensions of: \x1b[33m${svgFile.path}\x1b[0m`
    );
    return {};
}

export function getDimensions(attrs: any): SVG2TSSVGMetadata {
    const { width, height } = attrs;
    return {
        width,
        height,
        ...attrs.viewBox ? { viewBox: attrs.viewBox } : {}
    };
}

export function getViewBoxDimensions(attrs: any): SVG2TSSVGMetadata {
    const ratio = attrs.viewBox.width / attrs.viewBox.height;
    if (attrs.width) {
        return {
            width: attrs.width,
            height: Math.floor(attrs.width / ratio),
            ...attrs.viewBox ? { viewBox: attrs.viewBox } : {}
        };
    }
    if (attrs.height) {
        return {
            width: Math.floor(attrs.height * ratio),
            height: attrs.height,
            ...attrs.viewBox ? { viewBox: attrs.viewBox } : {}
        };
    }

    return {
        viewBox: {
            width: attrs.viewBox.width,
            height: attrs.viewBox.height
        }
    };
}

export function getInlineStyles(svg: string): string {
    const matches = svg.match(/(<style(.+?)?>)([\s\S]+?)<\/style>/g);
    return matches ? matches.join('').replace(/<[\/]?style>/g, '') : '';
}

export function compactCSS(css: string): string {
    // https://codepen.io/arlinadesign/pen/KVNBKK
    const c = /@(media|-w|-m|-o|keyframes|page)(.*?)\{([\s\S]+?)?\}\}/gi,
        t = css.length;
    css = css
        .replace(/(\n+)?(\/\*[\w\W]*?\*\/)(\n+)?/gm, '\n$2\n')
        .replace(/([\n\r\t\s ]+)?([\,\:\;\{\}]+?)([\n\r\t\s ]+)?/g, '$2')
        .replace(/\}(?!\})/g, '}\n')
        .replace(c, e => {
            return e.replace(/\n+/g, '');
        })
        .replace(/;\}/g, '}')
        .replace(/\:0(px|em|pt)/gi, ':0')
        .replace(/ 0(px|em|pt)/gi, ' 0')
        .replace(/\s+\!important/gi, '!important')
        .replace(/(^\n+|\n+$)/, '')
        .replace(/\t/g, '')
        .replace(/\n/g, '');
    return css;
}

export function compactSVG(source: string): string {
    source = source
        .replace(/<svg.[^>]*>/g, '')
        .replace(/<\/svg>/gi, '')
        .replace(/\<\!--\s*?[^\s?\[][\s\S]*?--\>/g, '')
        .replace(/\>\s*\</g, '><');
    source = source.replace(/<([^>]+)>/g, function(str, tagInner) {
        tagInner = tagInner
            .replace(/^ +| +$/g, '') // Not .trim() that removes \f.
            .replace(/(?: *\/ +| +\/ *)/g, '/') // Remove whitespaces in </ p> or <br />
            .replace(/ *= */g, '=')
            .replace(/( +)/g, ' ');
        return '<' + tagInner + '>';
    });
    return source.trim();
}

export function removeDefaultTemplateValues(source: string): string {
    return source.replace(/\{{(.+?)\|(.+?)}}/g, '{{$2}}');
}

export function extractStyles(svg: string, options: SVG2TSCmd): string {
    const cssmin = compactCSS(
        getInlineStyles(svg)
            .replace(/'/g, "\\'")
            .replace(/ (\S+?)=['"]{{(.+?)}}['"]/g, ` [attr.$1]="context.$2"`)
    )
        .replace(/{{/g, '_oo_')
        .replace(/}}/g, '_OO_');

    return postcss()
        .use(
            prefixer({
                prefix: `.${toKebabCase(options.module)}-_oo_0|uuid_OO_`
            })
        )
        .process(cssmin)
        .css.replace(/_oo_/g, '{{')
        .replace(/_OO_/g, '}}');
}

export function removeStyles(svg: string): string {
    return svg.replace(/(<style(([^>][\s\S])+?)?>)([\s\S]+?)(<\/style>)/g, '');
}
export function removeScripts(svg: string): string {
    return svg.replace(
        /(<script(([^>][\s\S])+?)?>)([\s\S]+?)(<\/script>)/g,
        ''
    );
}
export function generateTSInterface(obj: any) {
    return obj && obj.toString().replace(/:/g, '?:');
}

export function filterSvg(file: string) {
    return file.includes('svg') && path.extname(file) === '.svg';
}

export function filterSvgContent(svgFilePath: SVG2TSSourceFile): boolean {
    return isSVG(svgFilePath.svg);
}

export function filterKnownDimensions(fileObj: SVG2TSSourceFile) {
    const { width, height, viewBox } = getMetadata(fileObj);
    return (width && height) || (viewBox && viewBox.width && viewBox.height);
}
