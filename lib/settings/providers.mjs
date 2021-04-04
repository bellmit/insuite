import { Provider } from '@dc/settings';

export class Filesystem {

    #path;
    #environment;
    #variables;

    constructor( path, environment, variables ) {
        this.#path = path;
        this.#environment = environment;
        this.#variables = variables;
    }

    /**
     * @todo Provide schema of all available namespaces
     */
    get schema() {
        throw new Error( 'not implemented' );
    }

    /**
     * Load a settings dictionary
     *
     * @param {string} namespace
     * @param {object} context
     * @returns {Dictionary}
     *
     * @todo Prevent memory leaks caused by caching
     * @todo Prevent race conditions caused by caching
     */
    async load( namespace, context ) {
        return Provider(
            this.#path,
            this.#environment,
            this.#variables,
            context
        );
    }
}
