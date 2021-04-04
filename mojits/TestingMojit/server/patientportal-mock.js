/**
 * User: pi
 * Date: 05.12.17  12:42
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

function mockPatientPortalApi( Y ) {
    const
        originalPatientPortalApi = Y.doccirrus.api.patientportal,
        mongoose = require( 'mongoose' ),
        originalMetaPracApi = Y.doccirrus.api.metaprac,
        originalDcprcKnowsEmailOrPhone = Y.doccirrus.utils.dcprcKnowsEmailOrPhone,
        originalDcprcSetPatientAsContact = Y.doccirrus.utils.dcprcSetPatientAsContact,
        EventEmitter = require( 'events' ).EventEmitter;
    Y.doccirrus.api.patientportal = {
        mocked: true,
        event: new EventEmitter(),
        checkApiAccess: originalPatientPortalApi.checkApiAccess,
        register: originalPatientPortalApi.register,
        getApiUser: originalPatientPortalApi.getApiUser,
        getPatientInfo: originalPatientPortalApi.getPatientInfo,
        registerPatientKey: originalPatientPortalApi.registerPatientKey,
        postMedia: originalPatientPortalApi.postMedia,
        listMedia: originalPatientPortalApi.listMedia,
        getMedia: originalPatientPortalApi.getMedia,
        getFullPracticeInfo( args ) {
            this.event.emit( 'onGetFullPracticeInfo', args );
            setImmediate( args.callback );
        },
        getPracticeAppointmentTypes: originalPatientPortalApi.getPracticeAppointmentTypes,
        getFreeAppointments: originalPatientPortalApi.getFreeAppointments,
        makeAppointment: originalPatientPortalApi.makeAppointment,
        getPatientSchedule( args ) {
            setImmediate( args.callback );
        },
        someOtherApi( args ) {
            setImmediate( args.callback );
        }
    };

    Y.doccirrus.api.metaprac = {
        mocked: true,
        checkApiAccess: originalMetaPracApi.checkApiAccess,
        getPublicData: originalMetaPracApi.getPublicData,
        blindproxy( args ) {
            setImmediate( args.callback );
        },
        someOtherApi( args ) {
            setImmediate( args.callback );
        },
        registerTenant( args ) {
            setImmediate( args.callback );
        }
    };
    Y.doccirrus.utils.event = new EventEmitter();
    Y.doccirrus.utils.dcprcKnowsEmailOrPhone = function( email, phone, callback ) {
        callback( null, [] );
    };

    Y.doccirrus.utils.dcprcSetPatientAsContact = function( data, callback ) {
        Y.doccirrus.utils.event.emit( 'onDcprcSetPatientAsContact', data );
        callback( null, {data: [new mongoose.Types.ObjectId().toString()]} );
    };

    return {
        originalPatientPortalApi,
        originalMetaPracApi,
        originalDcprcKnowsEmailOrPhone,
        originalDcprcSetPatientAsContact
    };
}

module.exports = mockPatientPortalApi;