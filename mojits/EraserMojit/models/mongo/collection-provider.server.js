

const moment = require( 'moment' );
const mongodb = require( 'mongodb' );

/**
 * Provide MongoDB collection erasing
 */
class CollectionProvider {

    /**
     * Provider type
     *
     * @type {string}
     */
    static get type() {
        return 'mongo/collection';
    }

    /**
     * Create the provider
     *
     * @param {Date} now Current time
     * @param {Object} database Database access layer
     * @param {Object[]} users Users being affected
     * @param {Object} logger Logger to log
     */
    constructor(now, database, users, logger) {
        this.now = now;
        this.users = users;
        this.logger = logger;
        this.database = database;
    }

    /**
     * Execute the given task
     *
     * @param {{collection: string, expiration: {field: string, time: string}, selection: Object}}      task        Task to execute
     *
     * @return {Error|undefined}
     */
    async execute(task) {
        const validation = this.validate( task );

        if (validation instanceof Error) {
            return validation;
        }

        const duration = moment.duration( task.expiration.time );
        const expiration = moment( this.now ).subtract( duration );

        const selection = task.expiration.field ? {
            [task.expiration.field]: { $lt: expiration.toDate() }
        } : {
            _id: { $lt: new mongodb.ObjectId(
                Math.floor( expiration.toDate()/1000 ).toString(16) + '0000000000000000'
            ) }
        };

        for (const user of this.users) {
            await this.database.run( {
                action: 'delete',
                user: user,
                model: task.model,
                options: {
                    override: true
                },
                query: {
                    ...selection,
                    ...task.selection
                }
            } );
        }
    }

    /**
     * Validate the given task
     *
     * @param {Object} task
     * @return {Error|undefined}
     */
    validate(task) {
        const duration = moment.duration( task.expiration.time );
        const expiration = moment( this.now ).subtract( duration );

        if (expiration >= this.now) {
            return new Error( 'Expiration time must be less than now' );
        }
    }
}

module.exports = CollectionProvider;