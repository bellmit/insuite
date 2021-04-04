/*global YUI */




YUI.add('mirrorpatient-api', function (Y, NAME) {

        function getMirrorPatient( args ) {
            const
                CARE = Y.doccirrus.schemas.casefolder.additionalTypes.INCARE,
                DOQUVIDE = Y.doccirrus.schemas.casefolder.additionalTypes.DOQUVIDE,
                DQS = Y.doccirrus.schemas.casefolder.additionalTypes.DQS;

            let
                user = args.user,
                query = args.query,
                options = args.options,
                data = args.originalParams && args.originalParams.data || {},
                callback = args.callback;

            let queryKeys = Object.keys(query);
            if (queryKeys.includes('partner1') || queryKeys.includes('partner2')){
                let partnersId = [],
                    partner1query = query.partner1,
                    partner2query = query.partner2;
                if(partner1query){
                    partnersId.push( {partnerIds: {$elemMatch: { partnerId: data.isDSCK === true ? DOQUVIDE : CARE, patientId: Object.assign({}, partner1query) } } } );
                    delete query.partner1;
                }
                if(partner2query){
                    partnersId.push( {partnerIds: {$elemMatch: { partnerId: DQS, patientId: Object.assign({}, partner2query) } } } );
                    delete query.partner2;
                }
                if(!query.$and){
                    query.$and = partnersId;
                } else {
                    query.$and = [...query.$and, ...partnersId];
                }
            }

            if( options && options.sort && options.sort.partnerIds ) {
                options.sort[ 'partnerIds.0.patientId' ] = options.sort.partnerIds;
                delete options.sort.partnerIds;
            }
            Y.doccirrus.mongodb.runDb( {
                action: 'get',
                model: 'mirrorpatient',
                user: user,
                query: query,
                options: options,
                callback: callback
            } );
        }

        Y.namespace('doccirrus.api').mirrorpatient = {

            name: NAME,

            put: function PUT(args) {
                Y.log('Entering Y.doccirrus.api.mirrorpatient.put', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.mirrorpatient.put');
                }
                let
                    user = args.user,
                    data = args.data;

                //Y.log("Mirror Patients api data: " + JSON.stringify(data), 'debug', NAME);

                let cleanData = Y.doccirrus.filters.cleanDbObject(data);

                Y.doccirrus.mongodb.runDb({
                    user: user,
                    model: 'mirrorpatient',
                    action: 'put',
                    data: cleanData,
                    fields: Object.keys(cleanData).filter((item) => item !== '__v'),
                    query: {
                        _id: cleanData._id.toString()
                    },
                    'skipcheck_': true,
                    'ignoreReadOnly_': true
                }, (err, result) => {
                    if(err) {
                        Y.log("Mirror Patients update error: " + err.message, 'error', NAME);
                    }
                    //postExternalRequest('http://2222222222.dev.dc/2/dispatch', {payload: JSON.stringify([{type: 'patient', payload: result}])});

                    Y.doccirrus.communication.callExternalApiByCustomerNo({
                        api: 'dispatch.post',
                        user: user,
                        useQueue: true,
                        data: {payload: JSON.stringify([{type: 'patient', payload: result}])},
                        query: {},
                        dcCustomerNo: data.prcCustomerNo,
                        options: {},
                        callback: function(err){ //, result
                            if (err) {
                                Y.log('ISD patient synchronization error: ' + err && err.stack || err, 'error', NAME);
                            }
                        }
                    });

                    args.callback(err ,result);
                });


            },
            get: function( args ){
                Y.log('Entering Y.doccirrus.api.mirrorpatient.get', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.mirrorpatient.get');
                }
                getMirrorPatient( args );
            }
        };

    },
    '0.0.1', {
        requires: ['dccommunication', 'mirrorpatient-schema']
    }
);