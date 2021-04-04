

const CollectionProvider = require( './mongo/collection-provider.server' );

class EraserService {

    /**
     * Create a service
     *
     * @param {Object<string,Object>} providers Task providers
     * @param {Object} logger Logger
     */
    constructor(providers, logger) {
        this.providers = providers;
        this.logger = logger;
    }

    /**
     * Process given tasks
     *
     * @param {{name: String, [description]: String, [type]: String}[]} tasks Tasks to process
     * @return Error|undefined
     */
    async run(tasks) {
        this.logger.log( 'Run eraser', 'info', this.constructor.name );

        for (const task of tasks) {
            this.logger.log( `Validating eraser task ${JSON.stringify( task )}`, 'debug', this.constructor.name );

            const type = task.type || CollectionProvider.type;
            const result = this.providers[type].validate( task );

            if ( result instanceof Error ) {
                return result;
            }
        }

        for (const task of tasks) {
            this.logger.log( `Executing eraser task ${task.name}`, 'info', this.constructor.name );

            const type = task.type || CollectionProvider.type;

            try {
                await this.providers[type].execute( task );
            } catch ( error ) {
                return error;
            }
        }
    }
}

module.exports = EraserService;