/**
 * User: pi
 * Date: 13/07/15  12:33
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */
/*global Y, should, it, describe, after, before, expect */

const
    // mockCommunication = require( '../../server/communication-mock' ),
    // mockEmail = require( '../../server/email-mock' ),
    moment = require( 'moment' ),
    mongoose = require( 'mongoose' ),
    patientId = new mongoose.Types.ObjectId().toString(),
    calendarId = new mongoose.Types.ObjectId().toString(),
    appointmentTypeConferenceId = new mongoose.Types.ObjectId().toString(),
    appointmentTypeOnlineConsultationId = new mongoose.Types.ObjectId().toString(),
    conferenceId = new mongoose.Types.ObjectId().toString(),
    conference2Id = new mongoose.Types.ObjectId().toString(),
    identityId = new mongoose.Types.ObjectId().toString(),
    identity2Id = new mongoose.Types.ObjectId().toString(),
    employeeId = new mongoose.Types.ObjectId().toString(),
    employee2Id = new mongoose.Types.ObjectId().toString(),
    participantEmail = 'mocha-test@doc-cirrus.com',
    patientEmail = 'mocha-test-patient@doc-cirrus.com',
    //depending on this ID
    mainLocationId = new mongoose.Types.ObjectId( '000000000000000000000001' ).toString(),
    {formatPromiseResult, promisifyArgsCallback} = require( 'dc-core' ).utils,
    user = Y.doccirrus.auth.getSUForLocal();

/**
 * Tests workflow steps of (online) conferences (create-intialize-cancel).
 * Tests that correct notifications (emails/tasks) are sent/created on every conference workflow stage.
 */
describe( 'Conference test', function() {
    const
        mochaUtils = require( '../../server/mochaUtils' )( Y );
    let
        startTime = moment();
    // mockCommunication( Y );
    // mockEmail( Y );
    describe( '0. Setup.', function() {
        let
            onCallPUCActionData;

        before( function() {
            Y.doccirrus.communication.event.on( 'onCallPUCAction', ( params ) => {
                onCallPUCActionData = params;
            } );
        } );

        after( function() {
            Y.doccirrus.communication.event.removeAllListeners( 'onCallPUCAction' );
        } );

        it( 'Cleans db', function( done ) {
            this.timeout( 20000 );
            mochaUtils.cleanDB( {user}, function( err ) {
                should.not.exist( err );
                done();
            } );
        } );
        it( 'Inserts location', function() {
            let
                locationData = mochaUtils.getLocationData( {
                    _id: mainLocationId
                } );
            return Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'location',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( locationData )
            } ).should.be.fulfilled.then( ( result ) => {
                should.exist( result );
                result.should.contain( mainLocationId );
            } );
        } );
        it( 'Inserts patient', function() {
            let
                patientData = mochaUtils.getPatientData( {
                    firstname: 'test',
                    lastname: 'patient',
                    'insuranceStatus': [
                        {
                            'insuranceId': '109519005',
                            'insuranceName': 'AOK Nordost - Die Gesundheitskasse',
                            'insurancePrintName': 'AOK Nordost',
                            'insuranceGrpId': '72101',
                            'type': 'PUBLIC',
                            'kv': '72',
                            'locationId': mainLocationId,
                            'address2': '10957 Berlin',
                            'address1': 'Wilhelmstraße 1',
                            'bgNumber': '',
                            'unzkv': [],
                            'fused': false,
                            'feeSchedule': '1',
                            'costCarrierBillingGroup': '01',
                            'costCarrierBillingSection': '00',
                            'dmp': '',
                            'persGroup': '',
                            'insuranceKind': '1',
                            'fk4110': null,
                            'fk4133': null
                        }],
                    _id: patientId
                } );
            return Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'patient',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( patientData )
            } ).should.be.fulfilled.then( ( result ) => {
                should.exist( result );
                result.should.contain( patientId );
            } );
        } );
        it( 'Inserts employee', function() {
            let
                employeeData = mochaUtils.getEmployeeData( {
                    _id: employeeId
                } );
            return Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'employee',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( employeeData )
            } ).should.be.fulfilled.then( ( result ) => {
                should.exist( result );
                result.should.contain( employeeId );
            } );
        } );
        it( 'Inserts employee', function() {
            let
                employeeData = mochaUtils.getEmployeeData( {
                    _id: employee2Id,
                    username: 'employee2',
                    lastname: 'employee2Lastname',
                    firstname: 'employee2Firstname'
                } );
            return Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'employee',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( employeeData )
            } ).should.be.fulfilled.then( ( result ) => {
                should.exist( result );
                result.should.contain( employee2Id );
            } );
        } );
        it( 'Inserts identity', function() {
            let
                identityData = mochaUtils.getIdentityData( {
                    _id: identityId,
                    specifiedBy: employeeId
                } );
            return Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'identity',
                action: 'post',
                data: Object.assign( {skipcheck_: true}, identityData )
            } ).should.be.fulfilled.then( ( result ) => {
                should.exist( result );
            } );
        } );
        it( 'Inserts identity', function() {
            let
                identityData = mochaUtils.getIdentityData( {
                    _id: identity2Id,
                    specifiedBy: employee2Id,
                    username: 'employee2',
                    lastname: 'employee2Lastname',
                    firstname: 'employee2Firstname'
                } );
            return Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'identity',
                action: 'post',
                data: Object.assign( {skipcheck_: true}, identityData )
            } ).should.be.fulfilled.then( ( result ) => {
                should.exist( result );
            } );
        } );
        it( 'Inserts calendar', function() {
            return Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'calendar',
                action: 'post',
                data: {
                    _id: calendarId,
                    color: "#441122",
                    name: "Arztkalender",
                    type: "PATIENTS",
                    isPublic: true,
                    employee: employeeId,
                    locationId: mainLocationId,
                    consultTimes: [
                        {
                            publicInsurance: true,
                            privateInsurance: true,
                            end: [17, 0],
                            start: [9, 0],
                            colorOfConsults: " ",
                            days: [1, 2, 3, 4, 5]
                        }
                    ],
                    isShared: false,
                    skipcheck_: true
                }
            } ).should.be.fulfilled.then( ( result ) => {
                should.exist( result );
                result.should.contain( calendarId );
            } );
        } );
        it( 'Inserts conference scheduletype (appointment type)', function() {
            return Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'scheduletype',
                action: 'post',
                data: {
                    _id: appointmentTypeConferenceId,
                    color: "#254061",
                    capacity: 0,
                    numberOfSuggestedAppointments: 10,
                    isPreconfigured: false,
                    info: "",
                    isPublic: true,
                    calendarRefs: [
                        {
                            calendarId: calendarId
                        }
                    ],
                    type: "CONFERENCE",
                    durationUnit: "MINUTES",
                    duration: 15,
                    name: "Conference",
                    skipcheck_: true
                }
            } ).should.be.fulfilled.then( ( result ) => {
                should.exist( result );
                result.should.contain( appointmentTypeConferenceId );
            } );
        } );
        it( 'Inserts online consultation scheduletype (appointment type)', function() {
            return Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'scheduletype',
                action: 'post',
                data: {
                    _id: appointmentTypeOnlineConsultationId,
                    color: "#254061",
                    capacity: 0,
                    numberOfSuggestedAppointments: 10,
                    isPreconfigured: false,
                    info: "",
                    isPublic: true,
                    calendarRefs: [
                        {
                            calendarId: calendarId
                        }
                    ],
                    type: "ONLINE_CONSULTATION",
                    durationUnit: "MINUTES",
                    duration: 15,
                    name: "Online consultation",
                    skipcheck_: true
                }
            } ).should.be.fulfilled.then( ( result ) => {
                should.exist( result );
                result.should.contain( appointmentTypeOnlineConsultationId );
            } );
        } );
        it( 'Inserts practice', function() {
            return Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'practice',
                action: 'post',
                data: Object.assign( {
                    skipcheck_: true
                }, mochaUtils.getPracticeData() )
            } ).should.be.fulfilled.then( ( result ) => {
                should.exist( result );
                should.exist( onCallPUCActionData );
            } );
        } );
        it( 'Checks mocked communication module', function() {
            should.exist( Y.doccirrus.communication.mocked );
        } );
        it( 'Checks mocked email module', function() {
            should.exist( Y.doccirrus.email.mocked );
        } );

    } );

    describe( '1. Test conference.', function() {
        describe( '1.1. Test conference creation.', function() {
            let
                mailOptions,
                sendEmailCounter = 0;
            before( function() {
                Y.doccirrus.email.event.on( 'onSendEmail', ( _mailOptions ) => {
                    mailOptions = _mailOptions;
                    sendEmailCounter++;
                } );
            } );
            after( function() {
                Y.doccirrus.email.event.removeAllListeners( 'onSendEmail' );
            } );
            it( ' Makes conference post', function( done ) {
                this.timeout( 20000 );
                Y.doccirrus.api.conference.createOnlineConference( {
                    user,
                    data: {
                        conference: {
                            _id: conferenceId,
                            callerId: employeeId,
                            participants: [{email: participantEmail}],
                            employees: [employeeId, employee2Id],
                            patients: [patientId],
                            startDate: startTime.toISOString(),
                            status: "NEW"
                        },
                        schedule: {
                            start: startTime.toISOString(),
                            end: moment().add( 5, 'm' ).toISOString(),
                            title: "",
                            userDescr: "",
                            urgency: 0,
                            severity: "NONE",
                            calendar: calendarId,
                            scheduletype: appointmentTypeConferenceId,
                            allDay: false,
                            duration: 5,
                            repetition: "NONE",
                            dtstart: startTime.toISOString(),
                            interval: 1,
                            until: null,
                            byweekday: [],
                            arrivalTime: startTime.toISOString()
                        }
                    },
                    callback( err ) {
                        should.not.exist( err );
                        setTimeout( () => {
                            should.exist( mailOptions );
                            mailOptions.should.be.an( 'object' );
                            done();
                        }, 300 );
                    }
                } );
            } );
            it( 'Checks email "to"', function() {
                mailOptions.to.should.equal( participantEmail );
            } );
            it( 'Checks email "html"/text', function() {
                const
                    regex = new RegExp( '<p>(.*?)</p>' ),
                    matches = mailOptions.html.match( regex );
                should.exist( matches );
                should.exist( matches[1] );
                matches[1].should.equal( `Guten Tag, <br/><br/>hiermit laden wir Sie herzlich zur Teilnahme an unserer Online-Konferenz am ${startTime.format( 'DD.MM.YYYY' )} um ${startTime.format( 'HH:mm' )} Uhr ein.<br/><br/>Sie erhalten 30 Minuten vor dem Termin eine weitere E-Mail mit den Zugangsdaten.<br/><br/>Für die Teilnahme öffnen Sie den Zugangs-Link in einem WebRTC-fähigen Browser wie Safari 11+ oder einem aktuellen Chrome, Firefox oder Edge. Des Weiteren benötigen Sie an Ihrem Rechner ein Mikrophon, Lautsprecher und eine WebCam, um teilnehmen zu können.<br/><br/>Mit freundlichen Grüßen,` );
            } );
            it( 'Checks sent email count', function() {
                sendEmailCounter.should.equal( 1 );
            } );
        } );
        describe( '1.2. Test conference initialization', function() {
            let
                mailOptions,
                callAudit,
                participantIdentityId,

                upsertCallAuditEvent,
                sendEmailCounter = 0,
                emitPUCCounter = 0,
                emitNamespaceEventData = [],
                emitEventForUserData = [],
                tasks;
            after( function() {
                Y.doccirrus.email.event.removeAllListeners( 'onSendEmail' );
                Y.doccirrus.communication.event.removeAllListeners( 'onEmitPUC' );
                Y.doccirrus.communication.event.removeAllListeners( 'onEmitEventForUser' );
                Y.doccirrus.communication.event.removeAllListeners( 'onEmitNamespaceEvent' );
            } );
            before( function() {
                Y.doccirrus.email.event.on( 'onSendEmail', ( _mailOptions ) => {
                    mailOptions = _mailOptions;
                    sendEmailCounter++;
                } );
                Y.doccirrus.communication.event.on( 'onEmitPUC', ( params ) => {
                    upsertCallAuditEvent = params;
                    emitPUCCounter++;
                } );
                Y.doccirrus.communication.event.on( 'onEmitEventForUser', ( params ) => {
                    emitEventForUserData.push( params );
                } );
                Y.doccirrus.communication.event.on( 'onEmitNamespaceEvent', ( params ) => {
                    emitNamespaceEventData.push( params );
                } );
            } );

            it( 'Initializes all "hot" conferences', function( done ) {
                this.timeout( 5000 );
                Y.doccirrus.api.conference.initializeConferences( {
                    user,
                    callback: function( err ) {
                        should.not.exist( err );
                        done();
                    }
                } );
            } );
            it( 'Gets callaudit', function() {
                return Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'callaudit',
                    action: 'get',
                    query: {
                        status: {$ne: 'CANCELED'}
                    }
                } ).should.be.fulfilled.then( ( result ) => {
                    should.exist( result );
                    result.should.be.an( 'array' ).which.has.lengthOf( 1 );
                    callAudit = result[0];
                } );
            } );
            it( 'Checks callaudit caller', function() {
                callAudit.caller.should.be.an( 'array' ).which.has.lengthOf( 1 );
                callAudit.caller[0].identityId.should.equal( identityId );
                callAudit.caller[0].lastname.should.equal( 'Last name' );
                callAudit.caller[0].prcId.should.equal( 'mochaTest!' );
            } );
            it( 'Checks callaudit callee', function() {
                callAudit.callee.should.be.an( 'array' ).which.has.lengthOf( 2 );
                callAudit.callee[0].identityId.should.equal( identity2Id );
                callAudit.callee[0].lastname.should.equal( 'employee2Lastname' );
                callAudit.callee[0].prcId.should.equal( 'mochaTest!' );
                callAudit.callee[1].email.should.equal( participantEmail );
                should.exist( callAudit.callee[1].identityId );
                participantIdentityId = callAudit.callee[1].identityId;
            } );
            it( 'Checks email "to"', function() {
                should.exist( mailOptions );
                mailOptions.to.should.equal( participantEmail );
            } );
            it( 'Checks email "html"/text', function() {
                const
                    regex = new RegExp( '<p>(.*?)</p>' ),
                    matches = mailOptions.html.match( regex ),
                    url = Y.doccirrus.auth.getPUCUrl( `/intouch/conference/${conferenceId}?identityId=${participantIdentityId}&firstName=&lastName=${participantEmail}` );
                should.exist( matches );
                should.exist( matches[1] );
                matches[1].should.equal( `Guten Tag, <br/><br/>Sie erhalten hiermit den Zugangslink zu unserer Online-Konferenz um ${startTime.format( 'HH:mm' )} Uhr.<br/><br/>Öffnen Sie bitte nachfolgenden Link in Ihrem Browser (einem aktuellen Chrome, Firefox oder Edge):<br/><br/><a href="${url}" target="_blank">${url}</a> <br/><br/>Bitte beachten Sie, dass Sie mit dem Beitritt von Ihrem Browser zur Freigabe des Zugriffs auf Ihr Mikrofon und Ihre Kamera aufgefordert werden und dass eine Konferenzteilnahme ohne Zustimmung nicht möglich ist. Der Konferenzraum ist ab sofort für Sie geöffnet.<br/><br/>Mit freundlichen Grüßen,` );
            } );
            it( 'Checks UPSERT_CALL_AUDIT', function() {
                should.exist( upsertCallAuditEvent );
                upsertCallAuditEvent.event.should.equal( 'UPSERT_CALL_AUDIT' );
                should.exist( upsertCallAuditEvent.message.callAudit );
                upsertCallAuditEvent.message.callAudit.callId.should.equal( conferenceId );
            } );
            it( 'Checks emitEventForUser', function() { // task creation notification
                should.exist( emitEventForUserData );
                emitEventForUserData.should.be.an( 'array' ).which.has.lengthOf( 2 );
                emitEventForUserData[0].event.should.equal( 'message' );
                emitEventForUserData[1].event.should.equal( 'message' );
            } );
            it( 'Checks emitNamespaceEvent', function() {
                should.exist( emitNamespaceEventData );
                emitNamespaceEventData.should.be.an( 'array' ).which.has.lengthOf( 4 ); // 3 tasks table refresh + 1 calendar refresh
                emitNamespaceEventData[0].event.should.equal( 'system.REFRESH_TASK_TABLE' );
                emitNamespaceEventData[1].event.should.equal( 'system.REFRESH_TASK_TABLE' );
                emitNamespaceEventData[2].event.should.equal( 'system.REFRESH_TASK_TABLE' );
                emitNamespaceEventData[3].event.should.equal( 'calendar.refresh' );
                emitNamespaceEventData[3].msg.data.should.be.an( 'array' ).which.has.lengthOf( 1 );
                emitNamespaceEventData[3].msg.data[0].should.equal( calendarId );
            } );
            it( 'Checks sent email count', function() {
                sendEmailCounter.should.equal( 1 );
            } );
            it( 'Checks UPSERT_CALL_AUDIT count', function() {
                emitPUCCounter.should.equal( 1 );
            } );
            it( 'Checks tasks', function() {
                return Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'task',
                    action: 'get',
                    query: {}
                } ).should.be.fulfilled.then( ( result ) => {
                    should.exist( result );
                    result.should.be.an( 'array' ).which.has.lengthOf( 3 );
                    tasks = result;
                } );
            } );
            it( 'Checks tasks objects', function() {
                tasks[0].status.should.equal( 'ASSIGNED' );
                tasks[0].roles.should.be.an( 'array' ).which.has.lengthOf( 0 );
                tasks[0].candidates.should.be.an( 'array' ).which.has.lengthOf( 1 );
                tasks[0].candidates[0].should.equal( employeeId );
                tasks[1].status.should.equal( 'ASSIGNED' );
                tasks[1].roles.should.be.an( 'array' ).which.has.lengthOf( 0 );
                tasks[1].candidates.should.be.an( 'array' ).which.has.lengthOf( 1 );
                tasks[1].candidates[0].should.equal( employee2Id );
                tasks[2].status.should.equal( 'NEW' );
                tasks[2].roles.should.be.an( 'array' ).which.has.lengthOf( 1 );
                tasks[2].roles[0].should.equal( 'Empfang' );
                tasks[2].candidates.should.be.an( 'array' ).which.has.lengthOf( 0 );
            } );
        } );
        describe( '1.3. Test conference cancellation', function() {
            let
                mailOptions,
                callAudit,
                upsertCallAuditEvent,
                emitNamespaceEventCounter = 0,
                emitPUCCounter = 0,
                emitNamespaceEventData,
                emitEventForUserData = [];
            after( function() {
                Y.doccirrus.email.event.removeAllListeners( 'onSendEmail' );
                Y.doccirrus.communication.event.removeAllListeners( 'onEmitPUC' );
                Y.doccirrus.communication.event.removeAllListeners( 'onEmitEventForUser' );
                Y.doccirrus.communication.event.removeAllListeners( 'onEmitNamespaceEvent' );
            } );
            before( function() {
                Y.doccirrus.email.event.on( 'onSendEmail', ( _mailOptions ) => {
                    mailOptions = _mailOptions;
                } );
                Y.doccirrus.communication.event.on( 'onEmitPUC', ( params ) => {
                    upsertCallAuditEvent = params;
                    emitPUCCounter++;
                } );
                Y.doccirrus.communication.event.on( 'onEmitEventForUser', ( params ) => {
                    emitEventForUserData.push( params );
                } );
                Y.doccirrus.communication.event.on( 'onEmitNamespaceEvent', ( params ) => {
                    emitNamespaceEventData = params;
                    emitNamespaceEventCounter++;
                } );
            } );

            it( 'deletes the conference', function( done ) {
                Y.doccirrus.api.conference.delete( {
                    user,
                    query: {
                        _id: conferenceId
                    },
                    callback: function( err ) {
                        should.not.exist( err );
                        done();
                    }
                } );
            } );
            it( 'timeout', function( done ) {
                this.timeout( 1050 );
                setTimeout( done, 1000 );
            } );
            it( 'Gets callaudit', function() {
                return Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'callaudit',
                    action: 'get',
                    query: {
                        callId: conferenceId
                    }
                } ).should.be.fulfilled.then( ( result ) => {
                    should.exist( result );
                    result.should.be.an( 'array' ).which.has.lengthOf( 1 );
                    callAudit = result[0];
                } );
            } );
            it( 'Checks callaudit caller', function() {
                callAudit.caller.should.be.an( 'array' ).which.has.lengthOf( 1 );
                callAudit.caller[0].identityId.should.equal( identityId );
                callAudit.caller[0].lastname.should.equal( 'Last name' );
                callAudit.caller[0].prcId.should.equal( 'mochaTest!' );
            } );
            it( 'Checks callaudit callee', function() {
                callAudit.callee.should.be.an( 'array' ).which.has.lengthOf( 0 );
            } );
            it( 'Checks email "to"', function() {
                should.exist( mailOptions );
                mailOptions.to.should.equal( participantEmail );
            } );
            it( 'Checks email "html"/text', function() {
                const
                    regex = new RegExp( '<p>(.*?)</p>' ),
                    matches = mailOptions.html.match( regex );
                should.exist( matches );
                should.exist( matches[1] );
                matches[1].should.equal( `Guten Tag, <br/><br/>Die geplante Online-Konferenz um ${startTime.format( 'HH:mm' )} Uhr wurde leider abgesagt. Für weitere Informationen werden wir in Kürze auf Sie zukommen.<br/><br/>Mit freundlichen Grüßen,` );
            } );

            it( 'Checks emitEventForUser', function() { // tasks were deleted notification
                should.exist( emitEventForUserData );
                emitEventForUserData.should.be.an( 'array' ).which.has.lengthOf( 2 );
                emitEventForUserData[0].event.should.equal( 'message' );
                emitEventForUserData[1].event.should.equal( 'message' );
            } );
            it( 'Checks emitNamespaceEvent counter', function() {
                emitNamespaceEventCounter.should.equal( 1 );

            } );
            it( 'Checks emitNamespaceEvent', function() {
                should.exist( emitNamespaceEventData );
                emitNamespaceEventData.event.should.equal( 'calendar.refresh' );
                emitNamespaceEventData.msg.data.should.equal( calendarId );
            } );
            it( 'Checks UPSERT_CALL_AUDIT count', function() {
                emitPUCCounter.should.equal( 1 );
            } );
            it( 'Checks UPSERT_CALL_AUDIT', function() {
                should.exist( upsertCallAuditEvent );
                upsertCallAuditEvent.event.should.equal( 'UPSERT_CALL_AUDIT' );
                should.exist( upsertCallAuditEvent.message.callAudit );
                upsertCallAuditEvent.message.callAudit.callId.should.equal( conferenceId );
            } );
            it( 'Checks tasks', function() {
                return Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'task',
                    action: 'get',
                    query: {}
                } ).should.be.fulfilled.then( ( result ) => {
                    should.exist( result );
                    result.should.be.an( 'array' ).which.has.lengthOf( 0 );
                } );
            } );
        } );
    } );

    describe( '2. Test online consultation.', function() {
        const
            patientData = mochaUtils.getPatientData();
        describe( '2.1. Test online consultation creation.', function() {
            let
                mailOptions,
                sendEmailCounter = 0;
            before( function() {
                Y.doccirrus.email.event.on( 'onSendEmail', ( _mailOptions ) => {
                    mailOptions = _mailOptions;
                    sendEmailCounter++;
                } );
            } );
            after( function() {
                Y.doccirrus.email.event.removeAllListeners( 'onSendEmail' );
            } );
            it( ' Makes conference post', function( done ) {
                this.timeout( 20000 );
                Y.doccirrus.api.conference.createOnlineConference( {
                    user,
                    data: {
                        conference: {
                            _id: conference2Id,
                            callerId: employeeId,
                            participants: [
                                {
                                    email: patientData.communications[1].value,
                                    lastname: patientData.lastname,
                                    firstname: patientData.firstname,
                                    talk: patientData.talk
                                }],
                            employees: [employeeId, employee2Id],
                            patients: [patientId],
                            startDate: startTime.toISOString(),
                            status: "NEW",
                            conferenceType: Y.doccirrus.schemas.conference.conferenceTypes.ONLINE_CONSULTATION
                        },
                        schedule: {
                            start: startTime.toISOString(),
                            end: moment().add( 5, 'm' ).toISOString(),
                            title: "",
                            userDescr: "",
                            urgency: 0,
                            severity: "NONE",
                            calendar: calendarId,
                            scheduletype: appointmentTypeOnlineConsultationId,
                            allDay: false,
                            duration: 5,
                            repetition: "NONE",
                            dtstart: startTime.toISOString(),
                            interval: 1,
                            until: null,
                            byweekday: [],
                            arrivalTime: startTime.toISOString()
                        }
                    },
                    callback( err ) {
                        should.not.exist( err );
                        setTimeout( () => {
                            should.exist( mailOptions );
                            mailOptions.should.be.an( 'object' );
                            done();
                        }, 300 );
                    }
                } );
            } );
            it( 'Checks email "to"', function() {
                mailOptions.to.should.equal( patientEmail );
            } );
            it( 'Checks email "html"/text', function() {
                const
                    regex = new RegExp( '<p>(.*?)</p>' ),
                    matches = mailOptions.html.match( regex );
                should.exist( matches );
                should.exist( matches[1] );
                matches[1].should.equal( `Sehr geehrter Herr Test Patient, <br/><br/>hiermit laden wir Sie herzlich zur Teilnahme an unserer Online-Sprechstunde am ${startTime.format( 'DD.MM.YYYY' )} um ${startTime.format( 'HH:mm' )} Uhr ein.<br/><br/>Sie erhalten 30 Minuten vor dem Termin eine weitere E-Mail mit den Zugangsdaten.<br/><br/>Für die Teilnahme öffnen Sie den Zugangs-Link in einem WebRTC-fähigen Browser wie Safari 11+ oder einem aktuellen Chrome, Firefox oder Edge. Des Weiteren benötigen Sie an Ihrem Rechner ein Mikrophon, Lautsprecher und eine WebCam, um teilnehmen zu können.<br/><br/>Mit freundlichen Grüßen,` );
            } );
            it( 'Checks sent email count', function() {
                sendEmailCounter.should.equal( 1 );
            } );
        } );
        describe( '2.2. Test online consultation initialization', function() {
            let
                mailOptions,
                callAudit,
                participantIdentityId,

                upsertCallAuditEvent,
                sendEmailCounter = 0,
                emitPUCCounter = 0,
                emitNamespaceEventData = [],
                emitEventForUserData = [],
                tasks;
            after( function() {
                Y.doccirrus.email.event.removeAllListeners( 'onSendEmail' );
                Y.doccirrus.communication.event.removeAllListeners( 'onEmitPUC' );
                Y.doccirrus.communication.event.removeAllListeners( 'onEmitEventForUser' );
                Y.doccirrus.communication.event.removeAllListeners( 'onEmitNamespaceEvent' );
            } );
            before( function() {
                Y.doccirrus.email.event.on( 'onSendEmail', ( _mailOptions ) => {
                    mailOptions = _mailOptions;
                    sendEmailCounter++;
                } );
                Y.doccirrus.communication.event.on( 'onEmitPUC', ( params ) => {
                    upsertCallAuditEvent = params;
                    emitPUCCounter++;
                } );
                Y.doccirrus.communication.event.on( 'onEmitEventForUser', ( params ) => {
                    emitEventForUserData.push( params );
                } );
                Y.doccirrus.communication.event.on( 'onEmitNamespaceEvent', ( params ) => {
                    emitNamespaceEventData.push( params );
                } );
            } );

            it( 'Initializes all "hot" conferences', function( done ) {
                Y.doccirrus.api.conference.initializeConferences( {
                    user,
                    callback: function( err ) {
                        should.not.exist( err );
                        done();
                    }
                } );
            } );
            it( 'Gets callaudit', function() {
                return Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'callaudit',
                    action: 'get',
                    query: {
                        status: {$ne: 'CANCELED'}
                    }
                } ).should.be.fulfilled.then( ( result ) => {
                    should.exist( result );
                    result.should.be.an( 'array' ).which.has.lengthOf( 1 );
                    callAudit = result[0];
                } );
            } );
            it( 'Checks callaudit caller', function() {
                callAudit.caller.should.be.an( 'array' ).which.has.lengthOf( 1 );
                callAudit.caller[0].identityId.should.equal( identityId );
                callAudit.caller[0].lastname.should.equal( 'Last name' );
                callAudit.caller[0].prcId.should.equal( 'mochaTest!' );
            } );
            it( 'Checks callaudit callee', function() {
                callAudit.callee.should.be.an( 'array' ).which.has.lengthOf( 1 );
                callAudit.callee[0].email.should.equal( 'mocha-test-patient@doc-cirrus.com' );
                callAudit.callee[0].lastname.should.equal( 'Patient' );
                callAudit.callee[0].firstname.should.equal( 'Test' );
                should.exist( callAudit.callee[0].identityId );
                participantIdentityId = callAudit.callee[0].identityId;
            } );
            it( 'Checks email "to"', function() {
                should.exist( mailOptions );
                mailOptions.to.should.equal( patientEmail );
            } );
            it( 'Checks email "html"/text', function() {
                const
                    regex = new RegExp( '<p>(.*?)</p>' ),
                    matches = mailOptions.html.match( regex ),
                    url = Y.doccirrus.auth.getPUCUrl( `/intouch/conference/${conference2Id}?identityId=${participantIdentityId}&firstName=${patientData.firstname}&lastName=${patientData.lastname}` );
                should.exist( matches );
                should.exist( matches[1] );
                matches[1].should.equal( `Sehr geehrter Herr Test Patient, <br/><br/>Sie erhalten hiermit den Zugangslink zu unserer Online-Sprechstunde um ${startTime.format( 'HH:mm' )} Uhr.<br/><br/>Öffnen Sie bitte nachfolgenden Link in Ihrem Browser (einem aktuellen Chrome, Firefox oder Edge):<br/><br/><a href="${url}" target="_blank">${url}</a> <br/><br/>Bitte beachten Sie, dass Sie mit dem Beitritt von Ihrem Browser zur Freigabe des Zugriffs auf Ihr Mikrofon und Ihre Kamera aufgefordert werden und dass eine Konferenzteilnahme ohne Zustimmung nicht möglich ist. Der Konferenzraum ist ab sofort für Sie geöffnet.<br/><br/>Mit freundlichen Grüßen,` );
            } );
            it( 'Checks UPSERT_CALL_AUDIT', function() {
                should.exist( upsertCallAuditEvent );
                upsertCallAuditEvent.event.should.equal( 'UPSERT_CALL_AUDIT' );
                should.exist( upsertCallAuditEvent.message.callAudit );
                upsertCallAuditEvent.message.callAudit.callId.should.equal( conference2Id );
            } );
            it( 'Checks emitEventForUser', function() { // task creation notification
                should.exist( emitEventForUserData );
                emitEventForUserData.should.be.an( 'array' ).which.has.lengthOf( 2 );
                emitEventForUserData[0].event.should.equal( 'message' );
                emitEventForUserData[1].event.should.equal( 'message' );
            } );
            it( 'Checks emitNamespaceEvent', function() {
                should.exist( emitNamespaceEventData );
                emitNamespaceEventData.should.be.an( 'array' ).which.has.lengthOf( 4 ); // 3 tasks table refresh + 1 calendar refresh
                emitNamespaceEventData[0].event.should.equal( 'system.REFRESH_TASK_TABLE' );
                emitNamespaceEventData[1].event.should.equal( 'system.REFRESH_TASK_TABLE' );
                emitNamespaceEventData[2].event.should.equal( 'system.REFRESH_TASK_TABLE' );
                emitNamespaceEventData[3].event.should.equal( 'calendar.refresh' );
                emitNamespaceEventData[3].msg.data.should.be.an( 'array' ).which.has.lengthOf( 1 );
                emitNamespaceEventData[3].msg.data[0].should.equal( calendarId );
            } );
            it( 'Checks sent email count', function() {
                sendEmailCounter.should.equal( 1 );
            } );
            it( 'Checks UPSERT_CALL_AUDIT count', function() {
                emitPUCCounter.should.equal( 1 );
            } );
            it( 'Checks tasks', function() {
                return Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'task',
                    action: 'get',
                    query: {}
                } ).should.be.fulfilled.then( ( result ) => {
                    should.exist( result );
                    result.should.be.an( 'array' ).which.has.lengthOf( 3 );
                    tasks = result;
                } );
            } );
            it( 'Checks tasks objects', function() {
                tasks[0].status.should.equal( 'ASSIGNED' );
                tasks[0].roles.should.be.an( 'array' ).which.has.lengthOf( 0 );
                tasks[0].candidates.should.be.an( 'array' ).which.has.lengthOf( 1 );
                tasks[0].candidates[0].should.equal( employeeId );
                tasks[1].status.should.equal( 'ASSIGNED' );
                tasks[1].roles.should.be.an( 'array' ).which.has.lengthOf( 0 );
                tasks[1].candidates.should.be.an( 'array' ).which.has.lengthOf( 1 );
                tasks[1].candidates[0].should.equal( employee2Id );
                tasks[2].status.should.equal( 'NEW' );
                tasks[2].roles.should.be.an( 'array' ).which.has.lengthOf( 1 );
                tasks[2].roles[0].should.equal( 'Empfang' );
                tasks[2].candidates.should.be.an( 'array' ).which.has.lengthOf( 0 );
            } );
        } );
        describe( '2.3. Test online consultation cancellation', function() {
            let
                mailOptions,
                callAudit,
                upsertCallAuditEvent,
                emitNamespaceEventCounter = 0,
                emitPUCCounter = 0,
                emitNamespaceEventData,
                emitEventForUserData = [];
            after( function() {
                Y.doccirrus.email.event.removeAllListeners( 'onSendEmail' );
                Y.doccirrus.communication.event.removeAllListeners( 'onEmitPUC' );
                Y.doccirrus.communication.event.removeAllListeners( 'onEmitEventForUser' );
                Y.doccirrus.communication.event.removeAllListeners( 'onEmitNamespaceEvent' );
            } );
            before( function() {
                Y.doccirrus.email.event.on( 'onSendEmail', ( _mailOptions ) => {
                    mailOptions = _mailOptions;
                } );
                Y.doccirrus.communication.event.on( 'onEmitPUC', ( params ) => {
                    upsertCallAuditEvent = params;
                    emitPUCCounter++;
                } );
                Y.doccirrus.communication.event.on( 'onEmitEventForUser', ( params ) => {
                    emitEventForUserData.push( params );
                } );
                Y.doccirrus.communication.event.on( 'onEmitNamespaceEvent', ( params ) => {
                    emitNamespaceEventData = params;
                    emitNamespaceEventCounter++;
                } );
            } );

            it( 'Initializes all "hot" conferences', function( done ) {
                Y.doccirrus.api.conference.delete( {
                    user,
                    query: {
                        _id: conference2Id
                    },
                    callback: function( err ) {
                        should.not.exist( err );
                        done();
                    }
                } );
            } );
            it( 'timeout', function( done ) {
                this.timeout( 1050 );
                setTimeout( done, 1000 );
            } );
            it( 'Gets callaudit', function() {
                return Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'callaudit',
                    action: 'get',
                    query: {
                        callId: conference2Id
                    }
                } ).should.be.fulfilled.then( ( result ) => {
                    should.exist( result );
                    result.should.be.an( 'array' ).which.has.lengthOf( 1 );
                    callAudit = result[0];
                } );
            } );
            it( 'Checks callaudit caller', function() {
                callAudit.caller.should.be.an( 'array' ).which.has.lengthOf( 1 );
                callAudit.caller[0].identityId.should.equal( identityId );
                callAudit.caller[0].lastname.should.equal( 'Last name' );
                callAudit.caller[0].prcId.should.equal( 'mochaTest!' );
            } );
            it( 'Checks callaudit callee', function() {
                callAudit.callee.should.be.an( 'array' ).which.has.lengthOf( 0 );
            } );
            it( 'Checks email "to"', function() {
                should.exist( mailOptions );
                mailOptions.to.should.equal( patientEmail );
            } );
            it( 'Checks email "html"/text', function() {
                const
                    regex = new RegExp( '<p>(.*?)</p>' ),
                    matches = mailOptions.html.match( regex );
                should.exist( matches );
                should.exist( matches[1] );
                matches[1].should.equal( `Sehr geehrter Herr Test Patient, <br/><br/>Die geplante Online-Sprechstunde um ${startTime.format( 'HH:mm' )} Uhr wurde leider abgesagt. Für weitere Informationen werden wir in Kürze auf Sie zukommen.<br/><br/>Mit freundlichen Grüßen,` );
            } );

            it( 'Checks emitEventForUser', function() { // tasks were deleted notification
                should.exist( emitEventForUserData );
                emitEventForUserData.should.be.an( 'array' ).which.has.lengthOf( 2 );
                emitEventForUserData[0].event.should.equal( 'message' );
                emitEventForUserData[1].event.should.equal( 'message' );
            } );
            it( 'Checks emitNamespaceEvent counter', function() {
                emitNamespaceEventCounter.should.equal( 1 );

            } );
            it( 'Checks emitNamespaceEvent', function() {
                should.exist( emitNamespaceEventData );
                emitNamespaceEventData.event.should.equal( 'calendar.refresh' );
                emitNamespaceEventData.msg.data.should.equal( calendarId );
            } );
            it( 'Checks UPSERT_CALL_AUDIT count', function() {
                emitPUCCounter.should.equal( 1 );
            } );
            it( 'Checks UPSERT_CALL_AUDIT', function() {
                should.exist( upsertCallAuditEvent );
                upsertCallAuditEvent.event.should.equal( 'UPSERT_CALL_AUDIT' );
                should.exist( upsertCallAuditEvent.message.callAudit );
                upsertCallAuditEvent.message.callAudit.callId.should.equal( conference2Id );
            } );
            it( 'Checks tasks', function() {
                return Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'task',
                    action: 'get',
                    query: {}
                } ).should.be.fulfilled.then( ( result ) => {
                    should.exist( result );
                    result.should.be.an( 'array' ).which.has.lengthOf( 0 );
                } );
            } );
        } );
    } );

    describe( '3. Test online consultation add email copy if configured.', function() {
        const
            createOnlineConference = promisifyArgsCallback( Y.doccirrus.api.conference.createOnlineConference ),
            updateOnlineConference = promisifyArgsCallback( Y.doccirrus.api.conference.updateOnlineConference ),
            patientData = mochaUtils.getPatientData(),
            locationData = mochaUtils.getLocationData(),
            conference3Id = new mongoose.Types.ObjectId().toString(),
            conference4Id = new mongoose.Types.ObjectId().toString(),
            newParticipantEmail = 'someRandomEmail@email.test';

        const
            getPracticeDate = ( key, copyToLocation ) => {
                return {
                    [key]: [
                        {
                            type: 'email',
                            receiver: 'patient',
                            active: true
                        },
                        {
                            type: 'sms',
                            receiver: 'patient',
                            active: false
                        },
                        {
                            type: 'email',
                            receiver: 'location',
                            active: copyToLocation
                        }
                    ]
                };
            },
            getConferenceData = ( _id ) => {
                //not actually fixture due to lots substituted data
                return {
                    conference: {
                        _id,
                        callerId: employeeId,
                        participants: [
                            {
                                email: patientData.communications[1].value,
                                lastname: patientData.lastname,
                                firstname: patientData.firstname,
                                talk: patientData.talk
                            }],
                        employees: [employeeId],
                        patients: [patientId],
                        startDate: startTime.toISOString(),
                        status: "NEW",
                        conferenceType: Y.doccirrus.schemas.conference.conferenceTypes.ONLINE_CONSULTATION
                    },
                    schedule: {
                        start: startTime.toISOString(),
                        end: moment().add( 5, 'm' ).toISOString(),
                        title: "",
                        userDescr: "",
                        urgency: 0,
                        severity: "NONE",
                        calendar: calendarId,
                        scheduletype: appointmentTypeOnlineConsultationId,
                        allDay: false,
                        duration: 5,
                        repetition: "NONE",
                        dtstart: startTime.toISOString(),
                        interval: 1,
                        until: null,
                        byweekday: [],
                        arrivalTime: startTime.toISOString()
                    }
                };
            };

        let
            sendEmails = [],
            practiceId;

        before( function() {
            Y.doccirrus.email.event.on( 'onSendEmail', ( _mailOptions ) => {
                sendEmails.push( _mailOptions );
            } );
        } );
        after( function() {
            Y.doccirrus.email.event.removeAllListeners( 'onSendEmail' );
        } );
        it( ' Get Practice _id', async function() {
            let [err, practices] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'practice',
                    action: 'get',
                    query: {},
                    options: {select: {_id: 1}}
                } )
            );
            should.not.exist( err );
            expect( practices ).to.be.an( 'array' ).which.has.lengthOf( 1 );
            practiceId = practices[0]._id;
        } );
        describe( '3.1. Create conference with copy to location OFF', function() {
            it( ' Set inactive copying to location', async function() {
                let [err] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'practice',
                        action: 'put',
                        query: {_id: practiceId},
                        data: {
                            ...getPracticeDate( 'createAlert', false ),
                            skipcheck_: true
                        },
                        fields: ['createAlert']
                    } )
                );
                should.not.exist( err );
            } );
            it( ' Makes conference post', async function() {
                this.timeout( 20000 );
                sendEmails = [];

                let [err] = await formatPromiseResult(
                    createOnlineConference( {
                        user,
                        data: getConferenceData( conference3Id )
                    } )
                );
                should.not.exist( err );
                await formatPromiseResult( new Promise( ( resolve ) => {
                    setTimeout( resolve, 300 );
                } ) );

                expect( sendEmails.length ).to.be.equal( 1 );
                sendEmails[0].should.be.an( 'object' );
            } );
            it( 'Checks sent email data', function() {
                sendEmails[0].to.should.equal( patientEmail );
                should.not.exist( sendEmails[0].cc );
            } );
        } );
        describe( '3.2. Create conference with copy to location ON', function() {
            it( ' Set active copying to location', async function() {
                let [err] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'practice',
                        action: 'put',
                        query: {_id: practiceId},
                        data: {
                            ...getPracticeDate( 'createAlert', true ),
                            ...getPracticeDate( 'deleteAlert', true ),
                            skipcheck_: true
                        },
                        fields: ['createAlert', 'deleteAlert']
                    } )
                );
                should.not.exist( err );
            } );
            it( ' Makes conference post', async function() {
                this.timeout( 20000 );
                sendEmails = [];

                let [err] = await formatPromiseResult(
                    createOnlineConference( {
                        user,
                        data: getConferenceData( conference4Id )
                    } )
                );
                should.not.exist( err );
                await formatPromiseResult( new Promise( ( resolve ) => {
                    setTimeout( resolve, 300 );
                } ) );

                expect( sendEmails.length ).to.be.equal( 1 );
                sendEmails[0].should.be.an( 'object' );
            } );
            it( 'Checks sent email data', function() {
                (sendEmails[0].to).should.be.equal( patientEmail );
                (sendEmails[0].cc).should.be.equal( locationData.email );
            } );
        } );
        describe( '3.3. Update conference participants with copy to location ON', function() {
            let schedule4Id,
                newParticipantData = {
                    email: newParticipantEmail,
                    lastname: 'nl',
                    firstname: 'nf',
                    talk: 'nt'
                };

            //NOTE conference should be already crated with configured deleteAlert, otherwise cc will be not populated in cancel email
            it( ' Get schedule created with conference', async function() {
                let [err, schedules] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'schedule',
                        action: 'get',
                        query: {conferenceId: conference4Id},
                        options: {select: {_id: 1}}
                    } )
                );
                should.not.exist( err );
                expect( schedules ).to.be.an( 'array' ).which.has.lengthOf( 1 );
                schedule4Id = schedules[0]._id;
            } );
            it( ' Change participants', async function() {
                this.timeout( 20000 );
                let conferenceData = getConferenceData( conference4Id );
                sendEmails = [];

                //set _id of schedule
                conferenceData.schedule._id = schedule4Id;
                //set new participant, old one should be processed as canceled
                conferenceData.conference.participants = [newParticipantData];

                let [err] = await formatPromiseResult(
                    updateOnlineConference( {
                        user,
                        data: conferenceData
                    } )
                );
                should.not.exist( err );

                await formatPromiseResult( new Promise( ( resolve ) => {
                    setTimeout( resolve, 500 );
                } ) );
                expect( sendEmails.length ).to.be.equal( 2 );
            } );
            it( 'Checks sent emails data', function() {
                sendEmails.map( el => el.to ).should.be.deep.equalInAnyOrder( [newParticipantData.email, patientEmail] );
                sendEmails.every( el => el.cc === locationData.email ).should.be.equal( true );
            } );
        } );
        describe( '3.4. Update conference participants with copy to location ON', function() {

            //NOTE conference should be already crated with configured deleteAlert, otherwise cc will be not populated in cancel email
            it( ' Remove conference', async function() {
                sendEmails = [];

                let [err] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'conference',
                        action: 'delete',
                        query: {_id: conference4Id}
                    } )
                );
                should.not.exist( err );

                await formatPromiseResult( new Promise( ( resolve ) => {
                    setTimeout( resolve, 300 );
                } ) );
                expect( sendEmails.length ).to.be.equal( 1 );
            } );
            it( 'Checks sent email data', function() {
                (sendEmails[0].to).should.be.equal( newParticipantEmail );
                (sendEmails[0].cc).should.be.equal( locationData.email );
            } );
        } );
    } );

} );
