export declare class Pdf2Docx {
    private assetPath?;
    private pyodidePromise?;
    constructor(assetPath?: string | undefined);
    convert(pdf: Blob, pages?: number[]): Promise<Blob>;
    private load;
    private getAssetPath;
}
