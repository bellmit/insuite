

const faker = require( 'json-schema-faker' );
const moment = require( 'moment' );

faker.option( { optionalsProbability: 1, fixedProbabilities: true } );
faker.extend( 'faker', () => require( 'faker' ) );

module.exports = {

    /**
     * Generate dummy JSON schema to fake eraser data
     *
     * @param {string} variant Schema variant
     * @param {int} number Number of entries
     * @param {Object} expiration Faker for the expiration field value
     * @param {Object} [criteria] Faker for the criteria
     * @return {Object}
     */
    schema: ( variant, number, expiration, criteria ) => ( {
        type: 'array',
        minItems: number,
        maxItems: number,
        items: {
            type: 'object',
            properties: {
                // expiration part
                ...( variant === 'foo' && { baz: {
                    type: 'object',
                    properties: {
                        qux: {
                            faker: expiration
                        }
                    }
                } } || { bar: {
                    faker: expiration
                } } ),
                // criteria part
                ...( criteria && {
                    qux: {
                        type: 'string',
                        faker: criteria
                    }
                } )
            }
        }
    } ),
    faker: faker,
    moment: moment,
    now: moment('2012-01-07T00:00:00' ),
    expiration: moment( '2012-01-07T00:00:00' ).subtract( 7, 'd' )
};