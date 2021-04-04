

const { schema, moment, faker, now, expiration } = require( '../index' );

module.exports = [].concat(
    faker.generate( schema(
        'foo',
        4,
        {
            'date.between': [
                moment( expiration ).subtract( 7, 'd' ).toISOString(),
                expiration.toISOString()
            ]
        },
        {
            'random.arrayElement': [
                ['qux']
            ]
        }
    ) ),
    faker.generate( schema(
        'foo',
        2,
        {
            'date.between': [
                moment( expiration ).subtract( 7, 'd' ).toISOString(),
                expiration.toISOString()
            ]
        },
        {
            'random.arrayElement': [
                ['foo', 'bar', 'baz']
            ]
        }
    ) ),
    faker.generate( schema(
        'foo',
        1,
        {
            'date.between': [
                expiration.toISOString(),
                expiration.toISOString()
            ]
        },
        {
            'random.arrayElement': [
                ['foo', 'bar', 'baz']
            ]
        }
    ) ),
    faker.generate( schema(
        'foo',
        1,
        {
            'date.between': [
                expiration.toISOString(),
                expiration.toISOString()
            ]
        },
        {
            'random.arrayElement': [
                ['qux']
            ]
        }
    ) ),
    faker.generate( schema(
        'foo',
        2,
        {
            'date.between': [
                moment( expiration ).add( 1, 'd' ).toISOString(),
                now.toISOString()
            ]
        },
        {
            'random.arrayElement': [
                ['qux']
            ]
        }
    ) )
);