declare module 'swagger-jsdoc' {
  export interface OAS3Definition {
    openapi?: string;
    info?: Record<string, unknown>;
    servers?: Array<Record<string, unknown>>;
    paths?: Record<string, unknown>;
    components?: Record<string, unknown>;
  }

  function swaggerJSDoc(options: Record<string, unknown>): OAS3Definition;
  export default swaggerJSDoc;
}