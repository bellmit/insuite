/*

function generateReportingDataFromActivities() {
    if( !cluster.isMaster ) {return;}

    console.warn( "running generic mapping test")
    var user = Y.doccirrus.auth.getSUForTenant( "1111111111" );
    myLayer.runDb({
        user,
        model: "activity",
        migrate: true,
        query: {}/!*,
         options: {limit:10}*!/
    }, function a( err, result ) {

        var resultStr = '';

        if(err) {
            Y.log('ERR doing generic mapping of activities' + err, 'error', NAME );
            throw new Error( err );
        }

        console.warn( "\n\n\nTEST DATA INCASE\n\n\n")

        require( 'async' ).eachSeries( result, function ( activity, _cb ){
            if( !activity || ["10000000000000000000000d", "10000000000000000000000b", "56dd322ac50d1dca0123a02f"].indexOf(activity.patientId) === -1 ) { return _cb(); }

            Y.doccirrus.forms.renderOnServer.expandActivity( user, activity._id.toString(), contCb );

            function contCb( err, result ) {
                var context = {};
                context.activity = result;
                context.patient = context.activity._currentPatient;
                Y.dcforms.mapper.genericUtils.getFormDataIncase( context, function( err, done ) {
                    resultStr += JSON.stringify( done ) + '\n\n';
                    _cb();
                } );
            }

        }, function(){

            require('fs').writeFile( '','insertScript.json', resultStr, function(){ process.exit( 0 ); } );

        });

    } );


}


requires:
    'dcformmap-ko-util',
        'dcformmap-util',
        'dcgenericformmappers',
        'dccommonutils'

*/
