/**
 * User: Nazar Krania
 * Date: 4/12/19  11:29 AM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */



YUI.add( 'mediportDeliverySettings', function( Y, NAME ) {
        const {formatPromiseResult} = require( 'dc-core' ).utils,
            FLOW_SEND_TITLE = 'Mediport Send',
            FLOW_RECEIVE_TITLE = 'Mediport Receive',
            flowSchema = Y.doccirrus.schemas.flow.schema,
            setObject = Y.doccirrus.commonutils.setObject,
            sendFlowComparator = Y.doccirrus.compareutils.getComparator( {
                schema: flowSchema,
                whiteList: [
                    'sinks.0.deviceServers',
                    'sinks.0.incomingFileDirPath',
                    'sinks.0.outgoingFileDirPath'
                ]
            } ),
            receiveFlowComparator = Y.doccirrus.compareutils.getComparator( {
                schema: flowSchema,
                whiteList: [
                    'sources.0.deviceServers',
                    'sources.0.filePath'
                ]
            } );

        /**
         *  Gets flow data from mediportDeliverySettings or creates new flows
         *
         *  @param  {Object}    args
         *  @param  {Object}    args.user
         *  @param  {Object}    args.kvgData     mediportDeliverySettings
         *  @return {Array}
         */
        async function getFlowsData( {user, kvgData} ) {
            let sendFlowData, receiveFlowData, err, res;
            if( !kvgData.sendFlowId ) {
                sendFlowData = await getSendFlowData( kvgData );
            } else {
                [err, res] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'get',
                    model: 'flow',
                    query: {_id: kvgData.sendFlowId}
                } ) );
                if( err ) {
                    Y.log( `Failed to get flow ${kvgData.sendFlowId} from mediport delivery settings ${kvgData._id};\nError: ${err.message || err}`, 'error', NAME );
                    throw err;
                }
                sendFlowData = res[0];
                if( !sendFlowData ) {
                    sendFlowData = await getSendFlowData( kvgData );
                }
            }
            if( !kvgData.receiveFlowId ) {
                receiveFlowData = await getReceiveFlowData( kvgData );
            } else {
                [err, res] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'get',
                    model: 'flow',
                    query: {_id: kvgData.receiveFlowId}
                } ) );
                if( err ) {
                    Y.log( `Failed to get flow ${kvgData.receiveFlowId} from mediport delivery settings ${kvgData._id};\nError: ${err.message || err}`, 'error', NAME );
                    throw err;
                }
                receiveFlowData = res[0];
                if( !receiveFlowData ) {
                    receiveFlowData = await getReceiveFlowData( kvgData );
                }
            }
            return [sendFlowData, receiveFlowData];
        }

        /**
         *  Updates or creates flows with data from mediportDeliverySettings
         *
         *  @param  {Object}    args
         *  @param  {Object}    args.user
         *  @param  {Object}    args.data     mediportDeliverySettings
         *  @return {Array}
         */
        async function saveDeliveryFlows( {user, data} ) {
            Y.log( "Entering Y.doccirrus.mediportDeliverySettings.saveDeliveryFlows", 'info', NAME );
            const _ = require( 'lodash' );
            const flowpromises = [], deliveryFlows = {};
            let err;

            let flows, savedFlows;
            [err, flows] = await formatPromiseResult( getFlowsData( {user, kvgData: data} ) );

            if( err ) {
                Y.log( `Failed to get flows from mediport delivery settings ${data._id};\nError: ${err.message || err}`, 'error', NAME );
                throw err;
            }

            flows.forEach( flowData => {
                if( flowData._id && [data.sendFlowId, data.receiveFlowId].includes( flowData._id.toString() ) ) {
                    compareAndApplyChange( flowData, data );
                    flowpromises.push( Y.doccirrus.api.flow.update( {
                        user,
                        query: {
                            _id: flowData._id
                        },
                        data: flowData,
                        fields: Object.keys( flowData ),
                        options: {
                            pureLog: true
                        }
                    } ) );
                } else {
                    flowpromises.push( Y.doccirrus.api.flow.create( {
                        user,
                        data: _.omit( flowData, ['receiveFlowId', 'sendFlowId'] ),
                        options: {
                            pureLog: true
                        }
                    } ) );
                }
            } );
            [err, savedFlows] = await formatPromiseResult( Promise.all( flowpromises ) );
            if( err ) {
                Y.log( `Failed to get save flows for from mediport delivery settings ${data._id};\nError: ${err.message || err}`, 'error', NAME );
                throw err;
            }

            const sendFlow = savedFlows.find( flow => flow && flow.title === FLOW_SEND_TITLE ) || {},
                receiveFlow = savedFlows.find( flow => flow && flow.title === FLOW_RECEIVE_TITLE ) || {};

            if( !data.sendFlowId || (sendFlow._id && sendFlow._id !== data.sendFlowId) ) {
                deliveryFlows.sendFlowId = sendFlow._id;
            }
            if( !data.receiveFlowId || (receiveFlow._id && receiveFlow._id !== data.receiveFlowId) ) {
                deliveryFlows.receiveFlowId = receiveFlow._id;
            }

            return deliveryFlows;
        }

        /**
         *  Creates new send flow
         *
         *  @param  {Object}    kvgData     mediportDeliverySettings
         *  @return {Object}
         */
        function getSendFlowData( kvgData ) {
            const flowData = {
                flowType: 'KVG',
                title: FLOW_SEND_TITLE,
                sources: getDatabaseResourceType( {collectionName: 'gridFS', apiMethod: 'getMediportXML'} )
            };
            if( kvgData.sendFlowId ) {
                flowData.sendFlowId = kvgData.sendFlowId;
            }

            flowData.sinks = [
                {
                    ...getFileResourceType( kvgData.deviceServer ),
                    "resourceType": "MEDIPORT",
                    "name": "Mediport",
                    "__polytype": "mediport",
                    "incomingFileDirPath": `${kvgData.mediportBasePath}\\send\\`,
                    "outgoingFileDirPath": `${kvgData.mediportBasePath}\\log\\mpcommunicator.log`
                }];
            return flowData;
        }
        /**
         *  Creates new receive flow
         *
         *  @param  {Object}    kvgData     mediportDeliverySettings
         *  @return {Object}
         */
        function getReceiveFlowData( kvgData ) {
            const flowData = {
                flowType: 'MEDIA_IMPORT',
                title: FLOW_RECEIVE_TITLE
            };
            flowData.sources = [
                {
                    ...getFileResourceType( kvgData.deviceServer ),
                    filePath: `${kvgData.mediportBasePath}\\receive`,
                    fileType: 'DEVICE_SERVER',
                    name: 'Dateisystem',
                    resourceType: 'FILE',
                    __polytype: 'file'
                }];

            flowData.transformers = [
                {
                    transformerType: "MEDIPORT_RES",
                    name: "Mediport Antwort",
                    hours: 4
                }];

            if( kvgData.receiveFlowId ) {
                flowData.receiveFlowId = kvgData.receiveFlowId;
            }

            flowData.sinks = [
                getDatabaseResourceType( {collectionName: 'activity', apiMethod: 'createCommunicationFromMediport'} )
            ];
            return flowData;
        }
        /**
         *  Creates database resource type for flow
         *
         *  @param  {Object}    args
         *  @param  {String}    args.collectionName
         *  @param  {String}    args.apiMethod
         *  @return {Object}
         */
        function getDatabaseResourceType( {collectionName, apiMethod} ) {
            return {
                resourceType: "DATABASE",
                name: "Datenbank",
                "__polytype": "database",
                collectionName,
                apiMethod
            };
        }
        /**
         *  Creates file resource type for flow
         *
         *  @param  {Stream}    deviceServer
         *  @return {Object}
         */
        function getFileResourceType( deviceServer ) {
            return {
                "overwriteFile": true,
                "noFile": false,
                "executeApp": false,
                "deviceServers": [deviceServer],
                "triggerManually": false,
                "keepFiles": false
            };
        }

        /**
         *  Compares flow data with delivery settings
         *
         *  @param  {Object}    flowData
         *  @param  {Object}    settingsData
         */
        function compareAndApplyChange( flowData, settingsData ) {
            let flowChanges;
            if( flowData.title === FLOW_SEND_TITLE ) {
                flowChanges = sendFlowComparator.compare( flowData, getSendFlowData( settingsData ) );
            } else if( flowData.title === FLOW_RECEIVE_TITLE ) {
                flowChanges = receiveFlowComparator.compare( flowData, getReceiveFlowData( settingsData ) );
            }
            flowChanges.values.forEach( value => {
                setObject( value.path, value.bVal, flowData );
            } );
        }

        Y.namespace( 'doccirrus' ).mediportDeliverySettings = {
            saveDeliveryFlows
        };
    }, '0.0.1',
    {requires: ['location-api', 'dccommonutils']}
);
