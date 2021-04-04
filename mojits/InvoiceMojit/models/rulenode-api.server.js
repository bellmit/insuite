
/*global YUI*/



YUI.add( 'rulenode-api', function( Y, NAME ) {

    function GET( args ) {
        let options = Y.merge( args.options || {}, {lean: true} );

        Y.doccirrus.mongodb.runDb( {
            'action': 'get',
            'model': 'rule',
            'user': args.user,
            'query': args.query || {},
            'options': options,
            'callback': ( err, results ) => {
                results = (results && results.result).map( ( res ) => {
                    return {
                        _id: res._id,
                        rules: res.rules
                    };
                } );
                args.callback( err, results );
            }

        } );

    }

    function POST( args ) {
        let data = JSON.parse( JSON.stringify( args.data ) );

        Y.doccirrus.mongodb.runDb( {
            'action': 'post',
            'model': 'rule',
            'user': args.user,
            'fields': ['_id', 'rules'],
            'data': Y.doccirrus.filters.cleanDbObject( {_id: data._id, rules: Y.doccirrus.schemautils.prepareKey( data.rules ) } ),
            'callback': ( err, results ) => {
                args.callback( err, results );
            }

        } );

    }

    function PUT( args ) {
        let rules = JSON.stringify( args.data.rules );

        Y.doccirrus.mongodb.runDb( {
            'action': 'put',
            'model': 'rule',
            'user': args.user,
            'query': args.query,
            'fields': ['rules'],
            'data': Y.doccirrus.filters.cleanDbObject( {rules: Y.doccirrus.schemautils.prepareKey( rules )} ),
            'callback': ( err, results ) => {
                let res = {
                    _id: results._id,
                    rules: results.rules
                };
                args.callback( err, res );
            }

        } );

    }

        function DELETE( args ) {

            Y.doccirrus.mongodb.runDb( {
                'action': 'delete',
                'model': 'rule',
                'user': args.user,
                'query': args.query
            }, ( err, results ) => {
                if( err ) {
                    return args.callback( err );
                }
                results = results.map( ( res ) => {
                    return {
                        _id: res._id,
                        rules: res.rules
                    };
                } );
                args.callback( err, results );
            } );

        }

    function trigger( args ) {
        Y.log('Entering Y.doccirrus.api.rulenode.trigger', 'info', NAME);
        if (args.callback) {
            args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.rulenode.trigger');
        }
        var data = args.data.rules[0].validations;

        Y.log( 'Trigger rule engine ' + JSON.stringify( data ), 'debug' );

        Y.doccirrus.api.rule.trigger( {
            user: args.user,
            originalParams: data,
            callback: function( err, results ) {
                if (!err && results && results.length) {
                    results = {_id: args.data._id, rules: [ { validations: { results } } ] };
                }
                args.callback( err, results );
            }


        });

    }

    Y.namespace( 'doccirrus.api' ).rulenode = {
        name: NAME,

        get: GET,
        post: POST,
        put: PUT,
        delete: DELETE,
        trigger: trigger
    };
},

    '0.0.1', {requires: ['intl', 'v_rulenode-schema', 'schemautils']}
);
