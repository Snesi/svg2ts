export interface SVG2TSContext {
    [key: string]: string | number;
}
export interface SVG2TSDimensions {
    minx?: number | undefined;
    miny?: number | undefined;
    width?: number | undefined;
    height?: number | undefined;
}
export interface SVG2TSSourceFile {
    name: string;
    file: string;
    path: string;
}
export interface SVG2TSOutputFile extends SVG2TSDimensions, SVG2TSSourceFile {
    viewBox?: SVG2TSDimensions | undefined;
    contextInterface?: string | undefined;
    contextDefaults?: { [key: string]: string | number } | undefined;
}
export interface SVG2TSSvgMetadata {
    width?: number | undefined;
    height?: number | undefined;
    viewBox?: SVG2TSDimensions | undefined;
}