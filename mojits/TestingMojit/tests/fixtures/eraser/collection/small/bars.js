

const { schema, moment, faker, now, expiration } = require( '../index' );

module.exports = [].concat(
    faker.generate( schema(
        'bar',
        5,
        {
            'date.between': [
                moment( expiration ).subtract( 7, 'd' ).toISOString(),
                expiration.toISOString()
            ]
        }
    ) ),
    faker.generate( schema(
        'bar',
        1,
        {
            'date.between': [
                expiration.toISOString(),
                expiration.toISOString()
            ]
        }
    ) ),
    faker.generate( schema(
        'bar',
        4,
        {
            'date.between': [
                moment( expiration ).add( 1, 'd' ).toISOString(),
                now.toISOString()
            ]
        }
    ) )
);