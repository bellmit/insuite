

const mongodb = require('mongodb');

const ObjectIdFromDate = ( date ) => new mongodb.ObjectId( Math.floor( ( date ) / 1000 ).toString(16) + '0000000000000000' );

module.exports = [
    {
        _id: ObjectIdFromDate( new Date( '2002-01-24T06:09:42Z' ) )
    },
    {
        _id: ObjectIdFromDate( new Date( '2010-01-21T03:09:32Z' ) )
    },
    {
        _id: new mongodb.ObjectId()
    },
    {
        _id: new mongodb.ObjectId()
    },
    {
        _id: ObjectIdFromDate( new Date( '2010-01-04T06:08:12Z' ) )
    },
    {
        _id: ObjectIdFromDate( new Date( '2011-03-24T02:09:42Z' ) )
    }
];