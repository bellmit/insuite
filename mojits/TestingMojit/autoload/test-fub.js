
var
    generator = {
        preprocess: function( Y, user, callback ) {
            var mongoose = require( 'mongoose' );

            // we use mongoose only as a wrapper for the mongodb native driver.

            mongoose.connect( 'mongodb://localhost:27019/1111111111', function( err ) {
                if( !err ) {
                    console.log( "Successfully connected to DB" );

                    doData();

                } else {
                    console.log( "Could not connect to DB" );
                    throw err;
                }
            } );

            function doneCb( err, result ) {
                var
                    collection;
                if( err ) {
                    callback( err );
                } else {
                    collection = mongoose.connections[0].collection('aggregate');
                    console.log('DOINGDATA');
                    collection.insert(JSON.parse(JSON.stringify(result)),callback);
                }

            }

            function doData() {
                Y.doccirrus.api.patient.patientsPopulated(
                    user,
                    {}, // do all
                    {show:'activities'}, // no options
                    doneCb
                );
            }
        }
    };

module.exports = generator;