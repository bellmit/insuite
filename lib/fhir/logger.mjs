
/**
 * Wrap a logger function
 */
export class Factory {

    /**
     * Create an instance
     *
     * @param {Function} logger
     */
    constructor( logger ) {
        this.logger = logger;
    }

    /**
     * Get a log handler
     *
     * @param {Object} bindings
     * @returns {function(string, array): void}
     */
    create( bindings ) {
        return ( type, args ) => this.logger(
            `${ args.shift() }${ args.length ? ` (${ JSON.stringify( args ) })` : ''}`,
            type,
            bindings.mod
        );
    }
}
