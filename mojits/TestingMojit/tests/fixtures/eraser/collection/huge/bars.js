

const { schema, moment, faker, now, expiration } = require( '../index' );

module.exports = [].concat(
    faker.generate( schema(
        'bar',
        5000,
        {
            'date.between': [
                moment( expiration ).subtract( 7, 'd' ).toISOString(),
                expiration.toISOString()
            ]
        }
    ) ),
    faker.generate( schema(
        'bar',
        1000,
        {
            'date.between': [
                expiration.toISOString(),
                expiration.toISOString()
            ]
        }
    ) ),
    faker.generate( schema(
        'bar',
        4000,
        {
            'date.between': [
                moment( expiration ).add( 1, 'd' ).toISOString(),
                now.toISOString()
            ]
        }
    ) )
);