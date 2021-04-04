/**
 * User: dcdev
 * Date: 1/11/19  1:46 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/* global Y, should, it, describe, expect,context, before, after */

const
    {formatPromiseResult, promisifyArgsCallback} = require( 'dc-core' ).utils,
    mochaUtils = require( '../../server/mochaUtils' )( Y ),
    util = require( 'util' ),
    moment = require( 'moment' ),
    fs = require( 'fs' ),
    user = Y.doccirrus.auth.getSUForLocal(),
    cleanDb = util.promisify( mochaUtils.cleanDB ),
    ObjectId = require( 'mongoose' ).Types.ObjectId,
    getObjectIds = mochaUtils.getObjectIds,
    filterWhitelisted = mochaUtils.filterWhitelisted,

    ruleLogWhiteListed = [
        'caseFolderId', 'message', 'patientId', 'referenceArea', 'ruleLogType', 'actCodes', 'actTypes', 'activitiesToCreate', 'factId',
        'activitiesToCreate.template', 'activitiesToCreate.template.urgency', 'activitiesToCreate.template.details', 'activitiesToCreate.template.roles',
        'activitiesToCreate.template.candidates', 'activitiesToCreate.template.caseFolder', 'activitiesToCreate.template.actType',
        'activitiesToCreate.caseFolderId', 'activitiesToCreate.ruleSetId', 'activitiesToCreate.triggeredBy',
        'activitiesToCreate.template.caseFolderType', 'activitiesToCreate.template.catalogShort', 'activitiesToCreate.template.code',
        'activitiesToCreate.template.diagnosisCert', 'activitiesToCreate.template.toCreate', 'activitiesToCreate.template.explanations',
        'activitiesToCreate.template.linkActivities', 'activitiesToCreate.template.autoCreate', 'activitiesToCreate.template.tempateID',
        'activitiesToCreate.template.markers', 'activitiesToCreate.template.type', 'activitiesToCreate.ruleSetCaseFolder', 'activitiesToCreate.referenceArea',
        'activitiesToCreate.id', 'activitiesToCreate.ruleId', 'affectedActivities', 'affectedActivities.id', 'affectedActivities.code',
        'affectedActivities.actType', 'affectedActivities.locationId', 'allCodes', 'caseFolderType', 'locationId', 'requiredCodes', 'ruleId', 'ruleSetId'],

    taskWhiteListed = [
        'activities', 'activityId', 'activityType', 'alertTime', 'allDay', 'candidates', 'candidatesNames', 'creatorName', 'dateCreated',
        'details', 'links', 'location', 'patientId', 'patientName', 'roles', 'sessionWide', 'status', 'taskType', 'templateAlertTimeInterval', 'title',
        'type', 'urgency'],

    activityWhiteListed = [
        '__t', 'actType', 'activities', 'actualPrice', 'anaesthesiaText', 'apkState', 'areTreatmentDiagnosesBillable', 'assistanceQuantity', 'assistanceTaxPoints',
        'attachedMedia', 'attachments', 'backupEmployeeIds', 'benefitsText', 'billingRole', 'caseFolderId', 'catalog', 'catalogShort', 'content', 'costType',
        'countryMode', 'deleteEntryHomeCat', 'displayPrice', 'divisionCode', 'divisionText', 'editor', 'employeeId', 'employeeInitials', 'employeeName', 'explanations',
        'fk5002', 'fk5005', 'fk5008', 'fk5012Set', 'fk5013', 'fk5015', 'fk5016', 'fk5017', 'fk5018', 'fk5019', 'fk5020Set', 'fk5023', 'fk5024', 'fk5025', 'fk5026',
        'fk5034', 'fk5035Set', 'fk5036Set', 'fk5037', 'fk5038', 'fk5040', 'fk5042Set', 'fk5044', 'forInsuranceType', 'formGender', 'formId', 'formLang', 'formPdf',
        'formVersion', 'generalCosts', 'gnrAdditionalInfo', 'gnrAdditionalInfoType', 'hasVat', 'icds', 'icdsExtra', 'locationId', 'materialCosts', 'mediaImportError',
        'medicalScalingFactor', 'medicalTaxPoints', 'medicalText', 'modifyHomeCat', 'numberOfCopies', 'omimCodes', 'partnerInfo', 'patientFirstName', 'patientId',
        'patientLastName', 'preparationAndFollowUpTime', 'price', 'referencedBy', 'reportTime', 'roomOccupancyTime', 'rotationTime', 'savedEmails', 'scheinDiagnosis',
        'scheinOrder', 'sideMandatory', 'specialCosts', 'status', 'subType', 'taxPoints', 'technicalScalingFactor', 'technicalTaxPoints', 'technicalText', 'time',
        'treatmentCategory', 'treatmentTime', 'treatmentTypeCh', 'unit', 'unlinkedMirrorIds', 'userContent', 'vat', 'vatAmount'
    ],

    RETRIES_COUNT = 30,
    TIMEOUT_FOR_CACHE = 1000,
    TIMEOUT_FOR_RULE = 200,
    TIMEOUT_BEFORE_AFTER = 10000,

    now = moment().toISOString(),
    startToday = moment().startOf( 'day' ).add( 1, 'minutes' ).toISOString(),
    yesterdayOrStartQuarter = moment.max( [moment().subtract( 1, 'day' ), moment().startOf( 'quarter' )] ).toISOString(),
    startQuarter = moment().startOf( 'quarter' ).toISOString();

const
    [locationId, employeeId, patientId] = getObjectIds();

const waitForDelay = async ( self, timeToWait = TIMEOUT_FOR_RULE ) => {
    self.timeout( self.timeout() + timeToWait );
    await formatPromiseResult(
        new Promise( ( resolve ) => {
            setTimeout( resolve, timeToWait );
        } )
    );
};

const formatPeriodRuleMessage = ( message, startDate, endDate ) => {
    let
        start = moment( startDate ).format( 'DD.MM.YYYY HH:mm:ss' ),
        end = moment( endDate ).format( 'DD.MM.YYYY HH:mm:ss' );
    return `${message} (${start} - ${end})`;
};

const cleanCollections = async function() {
    await cleanDb( {user, collections2clean: ['rule', 'rulelog', 'activity', 'casefolder']} );
};

const postCaseFolder = async ( caseFolder, pId ) => {
    let [err] = await formatPromiseResult(
        postEntry( 'casefolder', {...caseFolder, patientId: pId || patientId} )
    );
    should.not.exist( err );
};

const makeRandomNumber = ( len ) => {
    return Math.random().toString( 10 ).substring( 2, len + 2 );
};

const defineExpected = ( originalExpected, uniqueData ) => {
    return {
        ...originalExpected,
        ...uniqueData
    };
};

const defineRuleLog = ( originalRuleLog, uniqueData, pId ) => {
    return defineExpected( originalRuleLog, {
        ...uniqueData,
        locationId,
        patientId: pId || patientId
    } );
};

const postRule = async ( rule ) => {
    let [err, ruleId] = await formatPromiseResult(
        postEntry( 'rule', rule )
    );
    should.not.exist( err );
    should.exist( ruleId );
    return ruleId;
};

const postActivity = async ( activity, pId, locId ) => {
    let [err, result] = await formatPromiseResult(
        postEntry( 'activity', {
            ...activity,
            patientId: pId || patientId,
            employeeId: employeeId,
            locationId: locId || locationId
        } )
    );
    should.not.exist( err );
    should.exist( result );
    return result;
};

const putActivity = async ( activityId, data ) => {
    let [err] = await formatPromiseResult(
        Y.doccirrus.mongodb.runDb( {
            user,
            model: 'activity',
            action: 'put',
            query: {
                _id: activityId
            },
            fields: Object.keys( data ),
            data: {...data, skipcheck_: true}
        } )
    );
    should.not.exist( err );
};

const deleteEntry = ( model, query ) => {
    return Y.doccirrus.mongodb.runDb( {
        user,
        action: 'delete',
        model,
        query,
        options: {override: true}
    } );
};

const postEntry = ( model, entry ) => {
    return Y.doccirrus.mongodb.runDb( {
        user,
        model,
        action: 'post',
        data: Y.doccirrus.filters.cleanDbObject( entry )
    } );
};

const insertEntry = ( model, data    ) => {
    return Y.doccirrus.mongodb.runDb( {
        user,
        model,
        action: 'mongoInsertOne',
        data
    } );
};

const putEntry = ( model, entryId, data ) => {
    return Y.doccirrus.mongodb.runDb( {
        user,
        action: 'put',
        model: model,
        query: {
            _id: entryId
        },
        fields: Object.keys( data ),
        data: {...data, skipcheck_: true}
    } );
};

const updateEntry = ( model, entryId, data ) => {
    return Y.doccirrus.mongodb.runDb( {
        user,
        action: 'update',
        model,
        query: {
            _id: entryId
        },
        data
    } );
};

const getEntry = ( model, query ) => {
    return Y.doccirrus.mongodb.runDb( {
        user,
        action: 'get',
        model,
        query
    } );
};

const assignLocationToEmployee = ( locationIds, specificEmployeeId ) => {
    return Y.doccirrus.mongodb.runDb( {
        user,
        action: 'update',
        model: 'employee',
        query: {_id: specificEmployeeId || employeeId },
        data: {$set: {locations: locationIds.map( locId => ({_id: locId}))}}
    } );
};

const extendByAdditionalCaseType = ( expectedTemplate, keyName = 'caseFolderType' ) => {
    //MOJ-14319 dynamically extend caseFolderType (code is similar from rule engine)
    (Array.isArray( expectedTemplate ) ? expectedTemplate : [expectedTemplate]).forEach( ruleLog => {
        if( !ruleLog || !ruleLog[keyName] ) {
            return;
        }
        const caseFolderType = ruleLog[keyName];
        if( caseFolderType.includes( 'PUBLIC' ) && !caseFolderType.includes( 'PUBLIC_A' ) ) {
            caseFolderType.push( 'PUBLIC_A' );
        }
        if( caseFolderType.includes( 'PRIVATE' ) && !caseFolderType.includes( 'PRIVATE_A' ) ) {
            caseFolderType.push( 'PRIVATE_A' );
        }
    } );
};

const checkExpectedToEqualActual = async ( expectedTemplate, model, query, mapFunction ) => {
    let [err, result] = await formatPromiseResult( getEntry( model, query ) );
    should.not.exist( err );

    switch( model ) {
        case 'rulelog':
            result = filterWhitelisted( result, [], ruleLogWhiteListed );
            break;
        case 'task':
            result = filterWhitelisted( result, [], taskWhiteListed );
            break;
        case 'activity':
            result = filterWhitelisted( result, [], activityWhiteListed );
            break;
    }

    result = mapFunction ? result.map( mapFunction ) : result;
    extendByAdditionalCaseType( expectedTemplate );
    expect( result ).to.deep.equalInAnyOrder( expectedTemplate );
};

const checkRuleLog = async ( expectedLog, mapFunction ) => {
    return checkExpectedToEqualActual( expectedLog, 'rulelog', {}, mapFunction );
};

const removeEnties = async ( entries ) => {
    for( let entry of entries ) { //eslint-disable-line no-unused-vars
        await deleteEntry( entry.model, entry._id ? {_id: entry._id} : entry.query );
    }
};

function getPeriodForRuleSet( ruleSet, timestamp ) {
    let type = ruleSet.periodType.toLowerCase(),
        count = parseInt( ruleSet.periodCount, 10 ) || 1,
        reference = ruleSet.periodReference,
        startDate,
        endDate = moment( timestamp );

    if( 'punkt' === reference ) {
        startDate = endDate.clone();
        startDate = startDate.subtract( count, `${type}s` );
    } else {
        startDate = endDate.clone();
        endDate = endDate.endOf( ('week' === type) ? 'isoweek' : type );
        startDate = startDate.subtract( count - 1, `${type}s` );
        startDate = startDate.startOf( ('week' === type) ? 'isoweek' : type );
    }
    return {startDate, endDate};
}

const getFixtureData = ( fileName ) => {
    let fixture;
    try {
        fixture = JSON.parse( fs.readFileSync( `${__dirname}/../fixtures/rule-engine/${fileName}`, 'utf8' ) );
    } catch( err ) {
        should.not.exist( err );
    }

    expect( fixture ).to.be.an( "object" );
    return fixture;
};

describe( 'Rule Engine tests', () => {
    let getSettingsOrg;


    before( async function(){
        //mock settings in code caching
        getSettingsOrg = Y.doccirrus.api.settings.getSettings;
        Y.doccirrus.api.settings.getSettings = () => ({});

        this.timeout( TIMEOUT_BEFORE_AFTER );
        Y.doccirrus.auth._isMocha = Y.doccirrus.auth.isMocha;
        Y.doccirrus.auth.isMocha = () => false;

        await postEntry( 'location', mochaUtils.getLocationData( {
            _id: locationId,
            commercialNo: makeRandomNumber( 9 )
        } ) );
        await postEntry( 'employee', mochaUtils.getEmployeeData( {_id: employeeId} ) );
        await postEntry( 'patient', mochaUtils.getPatientData( {_id: patientId} ) );
    });

    after( async function(){
        Y.doccirrus.api.settings.getSettings = getSettingsOrg;

        this.timeout( TIMEOUT_BEFORE_AFTER );
        Y.doccirrus.auth.isMocha = Y.doccirrus.auth._isMocha;
        delete Y.doccirrus.auth._isMocha;

        await deleteEntry( 'location', {_id: locationId} );
        await deleteEntry( 'patient', {_id: patientId} );
        await deleteEntry( 'employee', {_id: employeeId} );
    } );
    describe( '1. Check functionality of rule [EBM 40300 im Behandlungsfall]', () => {
        const suiteData = getFixtureData( 'data_for_40300_rule.json' ),
            [caseFolderId, ruleId, scheinId, activity40300Id, activity34291Id] = getObjectIds();
        let period;

        it( 'clean collections', async function() {
            await cleanCollections();
        } );

        it( 'setup test data', async function() {
            await postCaseFolder( mochaUtils.getCaseFolderData( {
                _id: caseFolderId,
                type: 'PUBLIC'
            } ) );
            await postRule( {
                ...suiteData.rule,
                _id: ruleId,
                parent: Y.doccirrus.schemas.rule.getDirectoryIdByCatalogShort( 'EBM' )
            } );
            await postActivity( {
                ...suiteData.schein,
                _id: scheinId,
                caseFolderId,
                timestamp: startQuarter
            } );
            await formatPromiseResult( waitForDelay( this, TIMEOUT_FOR_CACHE ) );
        } );

        it( 'post treatment 40300', async function() {
            await postActivity( {
                ...suiteData.treatment40300,
                _id: activity40300Id,
                caseFolderId,
                timestamp: startToday
            } );
        } );

        it( 'check triggered rule', async function() {
            this.retries( RETRIES_COUNT );
            period = getPeriodForRuleSet( suiteData.rule, startToday );
            await formatPromiseResult( waitForDelay( this ) );
            let ruleLog = defineRuleLog( suiteData.rulelogExprected[0], {
                caseFolderId,
                ruleSetId: ruleId
            } );
            ruleLog.message = formatPeriodRuleMessage( ruleLog.message, period.startDate, period.endDate );
            ruleLog.affectedActivities[0].id = activity40300Id;
            ruleLog.affectedActivities[0].locationId = locationId;
            await checkRuleLog( [ruleLog] );
        } );

        it( 'post treatment 34291', async function() {
            await postActivity( {
                ...suiteData.treatment34291,
                _id: activity34291Id,
                caseFolderId,
                timestamp: startToday
            } );
        } );

        it( 'check rule log removed', async function() {
            this.retries( RETRIES_COUNT );
            await formatPromiseResult( waitForDelay( this ) );
            await checkRuleLog( [] );
        } );

        it( 'delete entries', async function() {
            const entries = [];
            entries.push( {model: 'rulelog', query: {caseFolderId}} );
            entries.push( {model: 'activity', _id: scheinId} );
            entries.push( {model: 'activity', _id: activity40300Id} );
            entries.push( {model: 'activity', _id: activity34291Id} );
            entries.push( {model: 'casefolder', _id: caseFolderId} );
            entries.push( {model: 'rule', _id: ruleId} );
            await removeEnties( entries );
        } );

    } );

    // ACTIVITY log
    describe( '2. Check that entering schein without treatments trigger appropriate rule', () => {
        const suiteData = getFixtureData( 'data_for_07211_rule.json' ),
            [caseFolderId, scheinId, treatmentId] = getObjectIds(),
            ruleIdObj = new ObjectId(),
            ruleId = ruleIdObj.toString();

        let period, additionRuleLogData = {}, warnLog, activityLog, logResut;

        it( 'clean collections', async function() {
            await formatPromiseResult( cleanCollections() );
        } );

        it( 'setup test data', async function() {
            await postRule( {
                ...suiteData.rule,
                _id: ruleId,
                parent: Y.doccirrus.schemas.rule.getPracticeDirId()
            } );

            await postCaseFolder( mochaUtils.getCaseFolderData( {
                _id: caseFolderId,
                type: 'PUBLIC'
            } ) );
            await formatPromiseResult( waitForDelay( this, TIMEOUT_FOR_CACHE ) );
        } );

        it( 'post schein', async function() {
            await postActivity( {
                ...suiteData.schein,
                _id: scheinId,
                caseFolderId,
                timestamp: startQuarter
            } );
            period = getPeriodForRuleSet( suiteData.rule, startQuarter );
            additionRuleLogData.patientId = patientId;
            additionRuleLogData.caseFolderId = caseFolderId;
            additionRuleLogData.ruleSetId = ruleId;
            additionRuleLogData.affectedActivities = [
                {
                    id: scheinId,
                    actType: 'SCHEIN',
                    locationId: locationId
                }];
        } );
        it( 'check that rule will be triggered once schein will be created', async function() {
            this.retries( RETRIES_COUNT );
            await formatPromiseResult( waitForDelay( this ) );
            let [err, ruleLogs] = await formatPromiseResult(
                getEntry( 'rulelog', {caseFolderId} )
            );
            should.not.exist( err );
            ruleLogs.should.be.an( 'array' ).which.has.lengthOf( 2 );
            logResut = filterWhitelisted( ruleLogs, [], ruleLogWhiteListed );
        } );

        it( 'check ruleLog content', async function() {
            warnLog = suiteData.rulelogs[0];
            warnLog.message = formatPeriodRuleMessage( warnLog.message, period.startDate, period.endDate );
            warnLog = {...warnLog, ...additionRuleLogData, locationId: locationId};
            extendByAdditionalCaseType( warnLog );

            activityLog = suiteData.rulelogs[1];
            activityLog.activitiesToCreate[0].triggeredBy = [scheinId];
            activityLog.activitiesToCreate[0].ruleSetId = ruleId;
            activityLog.activitiesToCreate[0].caseFolderId = caseFolderId;
            activityLog = {...activityLog, ...additionRuleLogData};
            extendByAdditionalCaseType( activityLog.activitiesToCreate, 'ruleSetCaseFolder' );

            expect( logResut.find( el => el.ruleLogType === 'WARNING' ) ).to.deep.equalInAnyOrder( warnLog );
            expect( logResut.find( el => el.ruleLogType === 'ACTIVITY' ) ).to.deep.equalInAnyOrder( activityLog );
        } );

        it( 'post treatment 07211', async function() {
            await postActivity( {
                ...suiteData.treatment07211,
                _id: treatmentId,
                caseFolderId,
                timestamp: startToday
            } );
        } );

        it( 'check that after posting treatment 07211 rulelog will be empty', async function() {
            this.retries( RETRIES_COUNT );
            await formatPromiseResult( waitForDelay( this ) );
            await checkRuleLog( [] );
        } );

        it( 'remove treatment 07211', async function() {
            await deleteEntry( 'activity', {_id: treatmentId} );
        } );

        it( 'check that after removing treatment 07211 rulelog will contain WARNING log', async function() {
            this.retries( RETRIES_COUNT );
            await formatPromiseResult( waitForDelay( this ) );
            await checkRuleLog( [warnLog] );
        } );

        it( 'update schein', async function() {
            await putActivity( scheinId, {patientFirstName: 'Trigger'} );
        } );

        it( 'check that after updating schein - rulelog will contain warning and activity logs', async function() {
            this.retries( RETRIES_COUNT );
            await formatPromiseResult( waitForDelay( this ) );

            let [err, ruleLogs] = await formatPromiseResult(
                getEntry( 'rulelog', {caseFolderId} )
            );
            should.not.exist( err );
            ruleLogs.should.be.an( 'array' ).which.has.lengthOf( 2 );
            logResut = filterWhitelisted( ruleLogs, [], ruleLogWhiteListed );
        } );

        it( 'check ruleLog content', async function() {
            extendByAdditionalCaseType( warnLog );
            expect( logResut.find( el => el.ruleLogType === 'WARNING' ) ).to.deep.equalInAnyOrder( warnLog );
            extendByAdditionalCaseType( activityLog.activitiesToCreate, 'ruleSetCaseFolder' );
            expect( logResut.find( el => el.ruleLogType === 'ACTIVITY' ) ).to.deep.equalInAnyOrder( activityLog );
        } );

        it( 'delete entries', async function() {
            const entries = [];
            entries.push( {model: 'rulelog', query: {caseFolderId}} );
            entries.push( {model: 'activity', _id: scheinId} );
            entries.push( {model: 'activity', _id: treatmentId} );
            entries.push( {model: 'casefolder', _id: caseFolderId} );
            entries.push( {model: 'rule', _id: ruleId} );
            await removeEnties( entries );
        } );
    } );

    describe( '3. Check functionality for the rule [EBM 13664 im Behandlungsfall] (old Exclude rule with OR)', () => {
        const suiteData = getFixtureData( 'data_for_13664_rule.json' ),
            [caseFolderId, ruleId, scheinId] = getObjectIds();
        let ruleLog;

        it( 'clean collections', async function() {
            await cleanCollections();
        } );

        it( 'setup test data', async function() {
            await postCaseFolder( mochaUtils.getCaseFolderData( {
                _id: caseFolderId,
                type: 'PUBLIC'
            } ) );
            await postRule( {
                ...suiteData.rule,
                _id: ruleId,
                parent: Y.doccirrus.schemas.rule.getDirectoryIdByCatalogShort( 'EBM' )
            } );
            await postActivity( {
                ...suiteData.schein,
                _id: scheinId,
                caseFolderId,
                timestamp: startQuarter
            } );
            await formatPromiseResult( waitForDelay( this, TIMEOUT_FOR_CACHE ) );
            suiteData.treatments = suiteData.treatments.map( t => {
                t._id = ObjectId().toString();
                t.caseFolderId = caseFolderId;
                t.timestamp = startToday;
                return t;
            } );
            for( let treatment of suiteData.treatments.filter( treatment => treatment.code !== '13664' ) ) { //eslint-disable-line no-unused-vars
                await postActivity( treatment );
            }
        } );

        it( 'post treatment 13664', async function() {
            let treatment13664 = suiteData.treatments.filter( treatment => treatment.code === '13664' )[0];
            await postActivity( treatment13664 );
            let period = getPeriodForRuleSet( suiteData.rule, startToday );

            ruleLog = defineRuleLog( suiteData.rulelog, {
                caseFolderId,
                ruleSetId: ruleId
            } );

            let affectedActivities = suiteData.treatments.filter( treatment => treatment.code !== '13664' );
            affectedActivities = [affectedActivities[affectedActivities.length - 1], treatment13664]; //last inserted OR activity and AND activity

            ruleLog.actCodes = affectedActivities.map( t => t.code );
            ruleLog.affectedActivities = affectedActivities.map( t => ({
                id: t._id.toString(),
                code: t.code,
                actType: t.actType,
                locationId
            }) );
            ruleLog.message = formatPeriodRuleMessage( ruleLog.message, period.startDate, period.endDate );
        } );

        it( 'check corresponding rule', async function() {
            this.retries( RETRIES_COUNT );
            await formatPromiseResult( waitForDelay( this ) );
            await checkRuleLog( [ruleLog] );
        } );

        it( 'delete treatments', async function() {
            suiteData.treatments.forEach( async ( t ) => await deleteEntry( 'activity', {_id: t._id} ) );
        } );

        it( 'post 13664 treatment', async function() {
            let treatment13664 = suiteData.treatments.filter( treatment => treatment.code === '13664' )[0];
            await postActivity( treatment13664 );
        } );

        it( 'post addition treatment in order to trigger rule', async function() {
            for( let treatment of suiteData.treatments.filter( treatment => treatment.code !== '13664' ) ) { //eslint-disable-line no-unused-vars
                await postActivity( treatment );
            }
        } );

        it( 'check triggered rule', async function() {
            this.retries( RETRIES_COUNT );
            await formatPromiseResult( waitForDelay( this ) );
            await checkRuleLog( [ruleLog] );
        } );

        it( 'delete entries', async function() {
            suiteData.treatments.forEach( async ( t ) => await deleteEntry( 'activity', {_id: t._id} ) );
            const entries = [];
            entries.push( {model: 'rulelog', query: {caseFolderId}} );
            entries.push( {model: 'activity', _id: scheinId} );
            entries.push( {model: 'casefolder', _id: caseFolderId} );
            entries.push( {model: 'rule', _id: ruleId} );
            await removeEnties( entries );
        } );

    } );

    describe( '4. Check functionality for the rule [U-Untersuchungen GKV]', () => {
        const suiteData = JSON.parse( fs.readFileSync( `${__dirname}/../fixtures/rule-engine/data_for_U_Untersuchungen_rule.json`, 'utf8' ) ),
            [caseFolderId, ruleId, scheinId, treatmentId] = getObjectIds();
        let ruleLog, ruleLogU3;

        it( 'clean collections', async function() {
            await cleanCollections();
        } );

        it( 'setup test data', async function() {
            await postCaseFolder( mochaUtils.getCaseFolderData( {
                _id: caseFolderId,
                type: 'PUBLIC'
            } ) );
            await postRule( {
                ...suiteData.rule,
                _id: ruleId,
                parent: Y.doccirrus.schemas.rule.getPracticeDirId()
            } );
            await postActivity( {
                ...suiteData.schein,
                _id: scheinId,
                caseFolderId,
                timestamp: startQuarter
            } );
            await formatPromiseResult( waitForDelay( this, TIMEOUT_FOR_CACHE ) );
        } );

        it( 'post treatment with U3 in description', async function() {
            await postActivity( {
                ...suiteData.treatment,
                _id: treatmentId,
                caseFolderId,
                timestamp: startToday,
                userContent: 'U3',
                content: 'U3'
            } );

            ruleLog = defineRuleLog( suiteData.ruleLogExpected, {
                caseFolderId,
                factId: treatmentId,
                ruleSetId: ruleId
            } );
        } );

        it( 'check triggered rule', async function() {
            this.retries( RETRIES_COUNT );
            await formatPromiseResult( waitForDelay( this ) );
            await checkRuleLog( [ruleLog] );
        } );

        it( 'modify description to lower case', async function() {
            await putActivity( treatmentId, {
                userContent: 'u3',
                content: 'u3'
            } );
        } );

        it( 'check that rule was removed', async function() {
            this.retries( RETRIES_COUNT );
            await formatPromiseResult( waitForDelay( this ) );
            await checkRuleLog( [] );
        } );

        it( 'modify description to contain U3', async function() {
            await putActivity( treatmentId, {
                userContent: `${treatmentId}U3`,
                content: `${treatmentId}U3`
            } );
        } );

        it( 'check that rule was removed', async function() {
            this.retries( RETRIES_COUNT );
            await formatPromiseResult( waitForDelay( this ) );
            await checkRuleLog( [ruleLog] );
        } );

        it( 'add U4 to treatment description', async function() {
            let ruleId = suiteData.rule.rules.filter( r => r.description === 'U4' )[0].ruleId;
            await putActivity( treatmentId, {
                userContent: 'U4',
                content: 'U4'
            } );
            ruleLog.ruleId = ruleId;
            ruleLog.message = 'U4';
        } );

        it( 'check that rule was triggered', async function() {
            this.retries( RETRIES_COUNT );
            await formatPromiseResult( waitForDelay( this ) );
            await checkRuleLog( [ruleLog] );
        } );

        it( 'remove treatment', async function() {
            await deleteEntry( 'activity', {_id: treatmentId} );
        } );

        it( 'add u4 (lowercase)', async function() {
            await postActivity( {
                ...suiteData.treatment,
                _id: treatmentId,
                caseFolderId,
                timestamp: startToday,
                userContent: 'u4',
                content: 'u4'
            } );
        } );

        it( 'check that rule was triggered', async function() {
            this.retries( RETRIES_COUNT );
            await formatPromiseResult( waitForDelay( this ) );
            await checkRuleLog( [ruleLog] );
        } );

        it( 'remove treatment', async function() {
            await deleteEntry( 'activity', {_id: treatmentId} );
        } );

        it( 'add treatment with U3/U4 messages', async function() {
            let ruleIdU3 = suiteData.rule.rules.filter( r => r.description === 'U3' )[0].ruleId;
            await postActivity( {
                ...suiteData.treatment,
                _id: treatmentId,
                caseFolderId,
                timestamp: startToday,
                userContent: 'U4/U3',
                content: 'U4/U3'
            } );
            ruleLogU3 = JSON.parse( JSON.stringify( ruleLog ) );
            ruleLogU3.ruleId = ruleIdU3;
            ruleLogU3.message = 'U3';
        } );

        it( 'check that rule was triggered', async function() {
            this.retries( RETRIES_COUNT );
            await formatPromiseResult( waitForDelay( this ) );
            await checkRuleLog( [ruleLogU3, ruleLog] );
        } );

        it( 'delete entries', async function() {
            const entries = [];
            entries.push( {model: 'rulelog', query: {caseFolderId}} );
            entries.push( {model: 'activity', _id: scheinId} );
            entries.push( {model: 'activity', _id: treatmentId} );
            entries.push( {model: 'casefolder', _id: caseFolderId} );
            entries.push( {model: 'rule', _id: ruleId} );
            await removeEnties( entries );
        } );
    } );

    describe( '5. Check functionality for the rule [GOÄ 1028 je Leistung]', () => {
        const suiteData = JSON.parse( fs.readFileSync( `${__dirname}/../fixtures/rule-engine/data_for_1028_je_Leistung.json`, 'utf8' ) ),
            [caseFolderId, ruleId, treatmentId, localPatientId, scheinId] = getObjectIds();
        let
            ruleLog;

        it( 'clean collections', async function() {
            await cleanCollections();
        } );

        it( 'setup test data', async function() {
            await formatPromiseResult( postEntry( 'patient', {
                    ...suiteData.patient,
                    _id: localPatientId, activeCaseFolderId: caseFolderId
                } )
            );
            await postCaseFolder( mochaUtils.getCaseFolderData( {
                _id: caseFolderId,
                patientId: localPatientId,
                type: "PRIVATE"
            } ), localPatientId );
            await postRule( {...suiteData.rule, _id: ruleId} );
            await postActivity( {
                ...suiteData.schein,
                _id: scheinId,
                caseFolderId,
                timestamp: startQuarter
            }, localPatientId );
            await formatPromiseResult( waitForDelay( this, TIMEOUT_FOR_CACHE ) );
        } );

        it( 'post activity 1028', async function() {
            await postActivity( {
                ...suiteData.treatment,
                _id: treatmentId,
                caseFolderId,
                timestamp: startToday
            }, localPatientId );
            ruleLog = defineRuleLog( suiteData.rulelog, {
                caseFolderId,
                factId: treatmentId,
                ruleSetId: ruleId
            }, localPatientId );

            ruleLog.affectedActivities = [
                {
                    "actType": "TREATMENT",
                    "code": "1028",
                    "id": treatmentId
                }
            ];
        } );

        it( 'check that rule was triggered', async function() {
            this.retries( RETRIES_COUNT );
            await formatPromiseResult( waitForDelay( this ) );
            await checkRuleLog( [ruleLog] );
        } );

        it( 'remove activity', async function() {
            await deleteEntry( 'activity', {_id: treatmentId} );
        } );

        it( 'check that activity 1028 with Abrechenbar = Nein (areTreatmentDiagnosesBillable = 0)', async function() {
            await postActivity( {
                ...suiteData.treatment,
                _id: treatmentId,
                caseFolderId,
                timestamp: startToday,
                areTreatmentDiagnosesBillable: 0
            }, localPatientId );
        } );

        it( 'check that rule was not triggered', async function() {
            this.retries( RETRIES_COUNT );
            await formatPromiseResult( waitForDelay( this ) );
            await checkRuleLog( [] );
        } );

        it( 'remove activity', async function() {
            await deleteEntry( 'activity', {_id: treatmentId} );
        } );

        it( 'check that activity 1028 will trigger rule if patient gender = female', async function() {
            await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'patient',
                action: 'put',
                query: {
                    _id: localPatientId
                },
                fields: ['gender'],
                data: {gender: 'FEMALE', skipcheck_: true}
            } ) );
            await postActivity( {
                ...suiteData.treatment,
                _id: treatmentId,
                caseFolderId,
                timestamp: startToday
            }, localPatientId );
        } );

        it( 'check that rule was not triggered', async function() {
            this.retries( RETRIES_COUNT );
            await formatPromiseResult( waitForDelay( this ) );
            await checkRuleLog( [] );
        } );

        it( 'remove entries', async function() {
            const entries = [];
            entries.push( {model: 'rulelog', query: {caseFolderId}} );
            entries.push( {model: 'activity', _id: scheinId} );
            entries.push( {model: 'activity', _id: treatmentId} );
            entries.push( {model: 'casefolder', _id: caseFolderId} );
            entries.push( {model: 'rule', _id: ruleId} );
            await removeEnties( entries );
        } );
    } );

    describe( '6. Check functionality of rule [EBM 32784 im Behandlungsfall]', () => {
        const suiteData = getFixtureData( 'data_for_32784_rule.json' ),
            [caseFolderId, ruleId, scheinId] = getObjectIds();
        let ruleLog;

        it( 'clean collections', async function() {
            await cleanCollections();
        } );

        it( 'setup test data', async function() {
            await postRule( {
                ...suiteData.rule,
                _id: ruleId,
                parent: Y.doccirrus.schemas.rule.getPracticeDirId()
            } );
            await postCaseFolder( mochaUtils.getCaseFolderData( {
                _id: caseFolderId,
                type: 'PUBLIC'
            } ) );
            await formatPromiseResult( waitForDelay( this, TIMEOUT_FOR_CACHE ) );
        } );

        it( 'check typical scenario when rule should be triggered', async function() {
            await postActivity( {
                ...suiteData.schein,
                _id: scheinId,
                caseFolderId,
                timestamp: yesterdayOrStartQuarter
            } );

            suiteData.treatments = suiteData.treatments.map( treatment => {
                treatment._id = ObjectId().toString();
                treatment.timestamp = moment().startOf( 'day' ).add( 3, 'hour' ).toISOString();
                treatment.caseFolderId = caseFolderId;
                return treatment;
            } );
            for( let treatment of suiteData.treatments ) { //eslint-disable-line no-unused-vars
                await postActivity( treatment );
            }
            ruleLog = defineRuleLog( suiteData.rulelog, {
                caseFolderId,
                ruleSetId: ruleId
            } );
            ruleLog.affectedActivities[0].id = suiteData.treatments[0]._id;
            ruleLog.affectedActivities[0].locationId = locationId;
            ruleLog.affectedActivities[1].id = suiteData.treatments[1]._id;
            ruleLog.affectedActivities[1].locationId = locationId;
        } );

        it( 'check that rule was triggered', async function() {
            this.retries( RETRIES_COUNT );
            await formatPromiseResult( waitForDelay( this ) );
            await checkRuleLog( [ruleLog] );
        } );

        it( 'should not trigger when treatment areTreatmentDiagnosesBillable was changed to 0', async function() {
            await putActivity( suiteData.treatments[1]._id, {
                areTreatmentDiagnosesBillable: "0"
            } );
        } );

        it( 'check that rule was not triggered', async function() {
            this.retries( RETRIES_COUNT );
            await formatPromiseResult( waitForDelay( this ) );
            await checkRuleLog( [] );
        } );

        it( 'delete entries', async function() {
            const entries = [];
            entries.push( {model: 'rulelog', query: {caseFolderId}} );
            entries.push( {model: 'activity', _id: scheinId} );
            entries.push( {model: 'activity', _id: suiteData.treatments[0]._id} );
            entries.push( {model: 'activity', _id: suiteData.treatments[1]._id} );
            entries.push( {model: 'casefolder', _id: caseFolderId} );
            entries.push( {model: 'rule', _id: ruleId} );
            await removeEnties( entries );
        } );
    } );

    describe( '7. Check functionality of rule which puts marker on patient', () => {
        const suiteData = getFixtureData( 'data_for_alter_alergie.json' ),
            [caseFolderId, oldPatientId, ruleId, scheinId, treatmentId] = getObjectIds();
        let ruleLog;

        before( async function() {
            this.timeout( TIMEOUT_BEFORE_AFTER );
            await cleanCollections();

            const patientDob = moment().subtract( 73, 'year' ).toISOString();
            await postEntry( 'patient', {
                ...suiteData.patient,
                _id: oldPatientId,
                dob: patientDob,
                patientNo: makeRandomNumber( 3 )
            } );

            await postRule( {
                ...suiteData.rule,
                _id: ruleId,
                parent: Y.doccirrus.schemas.rule.getPracticeDirId()
            } );

            await postCaseFolder( mochaUtils.getCaseFolderData( {
                _id: caseFolderId,
                type: 'PUBLIC'
            } ), oldPatientId );
        } );

        after( async function() {
            this.timeout( TIMEOUT_BEFORE_AFTER );
            const entries = [];
            entries.push( {model: 'rulelog', query: {caseFolderId}} );
            entries.push( {model: 'activity', _id: treatmentId} );
            entries.push( {model: 'activity', _id: scheinId} );
            entries.push( {model: 'rule', _id: ruleId} );
            entries.push( {model: 'casefolder', _id: caseFolderId} );
            await removeEnties( entries );
        } );

        it( 'check typical scenario when rule should be triggered', async function() {
            const
                activityTimestamp = moment().startOf( 'day' ).add( 3, 'hour' ).toISOString();

            let [err] = await formatPromiseResult( postActivity( {
                ...suiteData.schein,
                _id: scheinId,
                caseFolderId,
                timestamp: yesterdayOrStartQuarter
            }, oldPatientId ) );
            should.not.exist( err );

            //check that patient markers are not modified before rule actions executed
            let patients;
            [err, patients] = await formatPromiseResult( getEntry( 'patient', {_id: oldPatientId} ) );
            should.not.exist( err );
            patients.should.be.an( 'array' ).which.has.lengthOf( 1 );
            expect( patients[0].markers ).to.deep.equalInAnyOrder( ['000000000000000000000012'] );

            await postActivity( {
                ...suiteData.treatment,
                _id: treatmentId,
                caseFolderId,
                timestamp: activityTimestamp
            }, oldPatientId );

            ruleLog = defineRuleLog( suiteData.rulelog, {
                caseFolderId,
                ruleSetId: ruleId
            }, oldPatientId );

            let period = getPeriodForRuleSet( suiteData.rule, activityTimestamp );
            let start = moment( period.startDate ).format( 'DD.MM.YYYY HH:mm:ss' );
            let end = moment( period.endDate ).format( 'DD.MM.YYYY HH:mm:ss' );
            ruleLog.affectedActivities[0].id = treatmentId;
            ruleLog.affectedActivities[0].locationId = locationId;
            ruleLog.message = `${ruleLog.message} (${start} - ${end})`;
        } );

        it( 'check that rule was triggered', async function() {
            //this.skip();
            this.retries( RETRIES_COUNT );
            await waitForDelay( this );
            await checkRuleLog( [ruleLog] );
        } );

        it( 'check that patient updated', async function() {
            this.retries( RETRIES_COUNT );
            await waitForDelay( this );
            //check marker is added to patient
            let [err, patients] = await formatPromiseResult( getEntry( 'patient', {_id: oldPatientId} ) );
            should.not.exist( err );
            patients.should.be.an( 'array' ).which.has.lengthOf( 1 );
            expect( patients[0].markers ).to.deep.equalInAnyOrder( ['000000000000000000000012', '000000000000000000000011'] );
        } );

        it( 'should not trigger when patient does not have Alergie marker ', async function() {
            await putEntry( 'patient', oldPatientId, {
                markers: []
            } );

            // need to update treatment because in other case rule won't recognize patient change
            await putActivity( treatmentId, {
                userContent: 'Herzkatheteruntersuchung mit Koronarangiographie 2'
            } );
        } );

        it( 'check that rule was not triggered', async function() {
            this.retries( RETRIES_COUNT );
            await waitForDelay( this, TIMEOUT_FOR_CACHE );
            await checkRuleLog( [] );
        } );

        it( 'should not trigger when patient age is less than 70 years ', async function() {
            const lessThan70Years = moment().subtract( 24, 'year' ).toISOString(),
                alergieMarker = '000000000000000000000012';
            let [err] = await formatPromiseResult( putEntry( 'patient', oldPatientId, {
                dob: lessThan70Years,
                markers: [
                    alergieMarker
                ]
            } ) );
            should.not.exist( err );
            await putActivity( treatmentId, {
                userContent: 'Herzkatheteruntersuchung mit Koronarangiographie 3'
            } );
        } );

        it( 'check that rule was not triggered', async function() {
            this.retries( RETRIES_COUNT );
            await waitForDelay( this );
            await checkRuleLog( [] );
        } );
    } );

    //TASKS
    describe( '8. Check functionality of rule which creates a task', () => {
        const suiteData = getFixtureData( 'data_for_rule_with_task.json' ),
            [caseFolderId, ruleId, scheinId, medicationId, treatmentId] = getObjectIds(),
            _ = require( 'lodash' ),
            mapFunction = (obj => _.omit( obj, ['dateCreated', 'alertTime'] ));
        let ruleLog;

        it( 'clean collections', async function() {
            await cleanCollections();
        } );

        it( 'setup data', async function() {
            await postCaseFolder( mochaUtils.getCaseFolderData( {
                _id: caseFolderId,
                type: 'PUBLIC'
            } ) );
            await postRule( {
                ...suiteData.rule,
                _id: ruleId,
                parent: Y.doccirrus.schemas.rule.getPracticeDirId()
            } );
            await postActivity( {
                ...suiteData.schein,
                _id: scheinId,
                caseFolderId,
                timestamp: yesterdayOrStartQuarter
            } );
            await formatPromiseResult( waitForDelay( this, TIMEOUT_FOR_CACHE ) );
        } );

        it( 'post medication', async function() {
            await postActivity( {
                ...suiteData.medication,
                _id: medicationId,
                caseFolderId,
                timestamp: moment().startOf( 'day' ).add( 3, 'hour' ).toISOString()
            } );
        } );

        it( 'check that rule was not triggered because schein subtype not match rule', async function() {
            this.retries( RETRIES_COUNT );
            await formatPromiseResult( waitForDelay( this ) );
            await checkRuleLog( [] );
        } );

        it( 'update schein subType', async function() {
            await putActivity( scheinId, {
                subType: "O123"
            } );

            ruleLog = defineRuleLog( suiteData.rulelog, {
                caseFolderId,
                factId: scheinId,
                ruleSetId: ruleId
            } );
            ruleLog.affectedActivities = [
                {
                    id: medicationId,
                    locationId: locationId,
                    actType: 'MEDICATION',
                    code: suiteData.medication.code
                },
                {
                    id: scheinId,
                    locationId: locationId,
                    actType: 'SCHEIN'
                }
            ];
        } );

        it( 'check that rule was triggered when schein subType added', async function() {
            this.retries( RETRIES_COUNT );
            await formatPromiseResult( waitForDelay( this ) );
            await checkRuleLog( [ruleLog] );

            let task = defineExpected( suiteData.taskTemplate, {
                patientId,
                activityId: scheinId
            } );
            await checkExpectedToEqualActual( [task], 'task', {activityId: scheinId}, mapFunction );
        } );

        it( 'cleanup after previous step', async function() {
            await deleteEntry( 'task', {activityId: scheinId} );
            await deleteEntry( 'activity', {_id: medicationId} );
        } );

        it( 'add treatment', async function() {
            await postActivity( {
                ...suiteData.treatment,
                _id: treatmentId,
                caseFolderId,
                timestamp: moment().startOf( 'day' ).add( 4, 'hour' ).toISOString()
            } );
            ruleLog = defineRuleLog( suiteData.rulelog, {
                caseFolderId,
                factId: scheinId,
                ruleSetId: ruleId
            } );
            ruleLog.affectedActivities = [
                {
                    id: treatmentId,
                    locationId: locationId,
                    actType: 'TREATMENT',
                    code: suiteData.treatment.code
                },
                {
                    id: scheinId,
                    locationId: locationId,
                    actType: 'SCHEIN'
                }
            ];
        } );

        it( 'check that rule was triggered when treatment added', async function() {
            this.retries( RETRIES_COUNT );
            await formatPromiseResult( waitForDelay( this ) );
            await checkRuleLog( [ruleLog] );

            let task = defineExpected( suiteData.taskTemplate, {
                patientId,
                activityId: scheinId
            } );

            await checkExpectedToEqualActual( [task], 'task', {activityId: scheinId}, mapFunction );
        } );

        it( 'cleanup after previous step', async function() {
            await deleteEntry( 'task', {activityId: scheinId} );
        } );

        it( 'add treatment and medication', async function() {
            await postActivity( {
                ...suiteData.medication,
                _id: medicationId,
                caseFolderId,
                timestamp: moment().startOf( 'day' ).add( 4, 'hour' ).toISOString()
            } );

            ruleLog = defineRuleLog( suiteData.rulelog, {
                caseFolderId,
                factId: scheinId,
                ruleSetId: ruleId
            } );

            ruleLog.affectedActivities = [
                {
                    id: medicationId,
                    locationId: locationId,
                    actType: 'MEDICATION',
                    code: suiteData.medication.code
                },
                {
                    id: scheinId,
                    locationId: locationId,
                    actType: 'SCHEIN'
                }
            ];

        } );

        it( 'should trigger when both treatment and medication added', async function() {
            this.retries( RETRIES_COUNT );
            await formatPromiseResult( waitForDelay( this ) );
            await checkRuleLog( [ruleLog] );

            let task = defineExpected( suiteData.taskTemplate, {
                patientId,
                activityId: scheinId
            } );
            await checkExpectedToEqualActual( [task], 'task', {activityId: scheinId}, mapFunction );
        } );

        it( 'delete entries', async function() {
            const entries = [];
            entries.push( {model: 'rulelog', query: {caseFolderId}} );
            entries.push( {model: 'activity', _id: medicationId} );
            entries.push( {model: 'activity', _id: treatmentId} );
            entries.push( {model: 'activity', _id: scheinId} );
            entries.push( {model: 'casefolder', _id: caseFolderId} );
            entries.push( {model: 'rule', _id: ruleId} );
            entries.push( {model: 'task', query: {activityId: scheinId}} );
            await removeEnties( entries );
        } );
    } );

    //FORM
    describe( '9. Check functionality of rule which creates a formular from telecardio measurement', () => {
        const suiteData = getFixtureData( 'data_for_rule_with_formular.json' ),
            [caseFolderId, ruleId, formId, formVersionId, scheinId, measurementId, practiceId] = getObjectIds(),
            documentIds = [
                new ObjectId().toString(),
                new ObjectId().toString(),
                new ObjectId().toString()
            ];
        let ruleLog, orgClientConnectedFn;

        before( async function() {
            this.timeout( TIMEOUT_BEFORE_AFTER );
            await cleanCollections();

            orgClientConnectedFn = Y.doccirrus.cacheUtils.mongoDbCache.isClientConnected;
            Y.doccirrus.cacheUtils.mongoDbCache.isClientConnected = () => {
                return false;
            };

            await assignLocationToEmployee( [ locationId ]  );

            await postEntry( 'practice', {
                ...suiteData.practice,
                _id: practiceId
            } );
            await postCaseFolder( mochaUtils.getCaseFolderData( {
                _id: caseFolderId,
                type: 'PUBLIC',
                additionalType: 'CARDIO'
            } ) );

            await postEntry( 'formtemplateversion', {
                ...suiteData.formTemplateVersion,
                formId: formId,
                _id: formVersionId,
                userId: employeeId
            } );

            await postEntry( 'formtemplate', {
                ...suiteData.formTemplate,
                _id: formId,
                versionId: formVersionId,
                userId: employeeId
            } );

            for( let i = 0; i < suiteData.documents.length; i++ ) {
                await postEntry( 'document', {
                    ...suiteData.documents[i],
                    _id: documentIds[i],
                    activityId: measurementId,
                    attachedTo: measurementId
                } );
            }

            suiteData.rule.rules[0].actions[1].template.formId = formId;

            await postRule( {
                ...suiteData.rule,
                _id: ruleId,
                parent: Y.doccirrus.schemas.rule.getPracticeDirId()
            } );

            await postActivity( {
                ...suiteData.schein,
                _id: scheinId,
                caseFolderId,
                timestamp: yesterdayOrStartQuarter
            } );
            await waitForDelay( this, TIMEOUT_FOR_CACHE );
        } );

        after( async function() {
            this.timeout( TIMEOUT_BEFORE_AFTER );

            await deleteEntry( 'document', {
                type: 'FORM',
                formId: formId
            } );
            await deleteEntry( 'document', {_id: {$in: documentIds } } );
            await waitForDelay( this, TIMEOUT_FOR_CACHE );

            await deleteEntry( 'activity', {
                caseFolderId
            } );
            await waitForDelay( this, TIMEOUT_FOR_CACHE );

            const entries = [];
            entries.push( {model: 'rulelog', query: {caseFolderId}} );
            entries.push( {model: 'formtemplateversion', _id: formVersionId} );
            entries.push( {model: 'formtemplate', _id: formId} );
            entries.push( {model: 'rule', _id: ruleId} );
            entries.push( {model: 'casefolder', _id: caseFolderId} );
            entries.push( {model: 'practice', _id: practiceId} );
            await removeEnties( entries );

            Y.doccirrus.cacheUtils.mongoDbCache.isClientConnected = orgClientConnectedFn;

        } );

        it( 'add measurement', async function() {
            await postActivity( {
                ...suiteData.measurement,
                _id: measurementId,
                caseFolderId,
                timestamp: startToday,
                eventDay: startToday,
                attachments: documentIds
            } );

            ruleLog = defineRuleLog( suiteData.rulelog, {
                caseFolderId,
                ruleSetId: ruleId,
                factId: measurementId
            } );
            ruleLog.affectedActivities[0].id = measurementId;
        } );

        it( 'should vreate rule log when measurement was added', async function() {
            this.retries( RETRIES_COUNT );
            await formatPromiseResult( waitForDelay( this ) );
            await checkRuleLog( [ruleLog] );
        } );

        it( 'should create form activity when measurement was added', async function() {
            this.retries( RETRIES_COUNT );
            await formatPromiseResult( waitForDelay( this ) );

            const result = await getEntry( 'activity', {caseFolderId, actType: 'FORM'} );
            result.should.be.an( 'array' ).which.has.lengthOf( 1 );
        } );
    } );

    //ACTIVITY creation
    describe( '10. Check rule which creates activity [03362 Q1/Q3 auto punkten]', () => {
        const suiteData = getFixtureData( 'data_for_rule_with_activity.json' ),
            [caseFolderId, ruleId, scheinId] = getObjectIds();
        let rulelog;

        it( 'clean collections', async function() {
            await cleanCollections();
        } );

        it( 'setup test data', async function() {
            const diabetMarker = "000000000000000000000011";

            let [err] = await formatPromiseResult( putEntry( 'patient', patientId, {
                markers: [
                    diabetMarker
                ]
            } ) );
            should.not.exist( err );

            await assignLocationToEmployee( [ locationId ]  );

            suiteData.rule.rules[0].actions[0].template.autoCreate = false;
            await postRule( {
                ...suiteData.rule,
                _id: ruleId,
                parent: Y.doccirrus.schemas.rule.getPracticeDirId()
            } );
            await postCaseFolder( mochaUtils.getCaseFolderData( {
                _id: caseFolderId,
                type: 'PUBLIC'
            } ) );

            await formatPromiseResult( waitForDelay( this, TIMEOUT_FOR_CACHE ) );
        } );
        it( 'should trigger once schein is added', async function() {
            await postActivity( {
                ...suiteData.schein,
                _id: scheinId,
                caseFolderId,
                timestamp: yesterdayOrStartQuarter
            } );
            rulelog = defineExpected( suiteData.rulelog, {
                caseFolderId,
                patientId,
                factId: scheinId,
                ruleSetId: ruleId
            } );
            rulelog.affectedActivities = [
                {
                    actType: 'SCHEIN',
                    id: scheinId,
                    locationId
                }];

            rulelog.activitiesToCreate = [
                {
                    ...rulelog.activitiesToCreate[0],
                    caseFolderId,
                    ruleSetId: ruleId,
                    triggeredBy: [
                        scheinId
                    ]
                }];
        } );

        it( 'should create activity when autoCreate=true', async function() {
            this.retries( RETRIES_COUNT );
            await formatPromiseResult( waitForDelay( this ) );
            extendByAdditionalCaseType( rulelog.activitiesToCreate, 'ruleSetCaseFolder' );
            const mapFunction = obj => {
                obj.activitiesToCreate.forEach( activity => {
                    activity.ruleSetId = activity.ruleSetId.toString();
                } );
                return obj;
            };
            await checkRuleLog( [rulelog], mapFunction );
        } );

        it( 'update activity to trigger rule with autoCreate=true', async function() {
            suiteData.rule.rules[0].actions[0].template.autoCreate = true;
            let [err] = await formatPromiseResult( putEntry( 'rule', ruleId, suiteData.rule ) );
            should.not.exist( err );
            await putActivity( scheinId, {
                userContent: `ambulante Behandlung (ambulante Behandlung) ${moment().toISOString()}`
            } );
        } );

        it( 'should create activity when autoCreate=true', async function() {
            this.retries( RETRIES_COUNT );
            await formatPromiseResult( waitForDelay( this ) );
            await checkRuleLog( [] );
            let treatment = defineExpected( suiteData.treatment, {
                locationId,
                patientId,
                caseFolderId,
                employeeId
            } );
            const mapFunction = obj => {
                obj.locationId = obj.locationId.toString();
                return obj;
            };
            await checkExpectedToEqualActual( [treatment], 'activity', {
                caseFolderId,
                actType: 'TREATMENT'
            }, mapFunction );
        } );

        it( 'delete all activities', async function() {
            this.retries( RETRIES_COUNT );
            await formatPromiseResult( waitForDelay( this, TIMEOUT_FOR_CACHE ) );

            let [err] = await formatPromiseResult( deleteEntry( 'activity', {caseFolderId} ) );
            should.not.exist( err );

            let result;
            [err, result] = await formatPromiseResult( getEntry( 'activity', {caseFolderId} ) );
            should.not.exist( err );
            result.should.be.an( 'array' ).which.has.lengthOf( 0 );
        } );

        it( 'delete entries', async function() {
            const entries = [];
            entries.push( {model: 'rulelog', query: {caseFolderId}} );
            entries.push( {model: 'activity', _id: scheinId} );
            entries.push( {model: 'casefolder', _id: caseFolderId} );
            entries.push( {model: 'rule', _id: ruleId} );
            await removeEnties( entries );
        } );

        it( 'clean markers on patient', async function() {
            let [err] = await formatPromiseResult( putEntry( 'patient', patientId, {markers: []} ) );
            should.not.exist( err );
        } );
    } );
    describe( '11. Check insurancestatus', () => {
        const suiteData = getFixtureData( 'data_for_insurance_type_rule_patient.json' ),
            [caseFolderId, ruleId, rulePatientId] = getObjectIds();
        let ruleLog;

        it( 'clean collections', async function() {
            await cleanCollections();
        } );

        it( 'init', async () => {
            const patientDob = moment().subtract( 36, 'year' ).toISOString();

            await postRule( {
                ...suiteData.rule,
                _id: ruleId,
                parent: Y.doccirrus.schemas.rule.getPracticeDirId()
            } );
            await postCaseFolder( mochaUtils.getCaseFolderData( {
                _id: caseFolderId,
                type: 'PUBLIC'
            }, rulePatientId ) );

            let [err] = await formatPromiseResult( postEntry( 'patient', {
                ...suiteData.patient,
                _id: rulePatientId,
                dob: patientDob,
                patientNo: makeRandomNumber( 3 ),
                activeCaseFolderId: caseFolderId
            } ) );
            should.not.exist( err );

            ruleLog = defineExpected( suiteData.rulelog, {
                caseFolderId,
                ruleSetId: ruleId,
                factId: rulePatientId,
                patientId: rulePatientId
            } );
        } );

        it( 'check rule log', async function() {
            this.retries( RETRIES_COUNT );
            await formatPromiseResult( waitForDelay( this ) );
            await checkRuleLog( [ruleLog] );
        } );

        it( 'change patient insurance IKNR', async function() {
            let [err] = await formatPromiseResult( putEntry( 'patient', rulePatientId, {
                insuranceStatus: [
                    {
                        ...suiteData.patient.insuranceStatus[0],
                        insuranceId: '104940003'
                    }]
            } ) );
            should.not.exist( err );
        } );

        it( 'check rule log to be empty', async function() {
            this.retries( RETRIES_COUNT );
            await formatPromiseResult( waitForDelay( this ) );
            await checkRuleLog( [] );
        } );

        it( 'delete entries', async function() {
            const entries = [];
            entries.push( {model: 'rulelog', query: {caseFolderId}} );
            entries.push( {model: 'casefolder', _id: caseFolderId} );
            entries.push( {model: 'rule', _id: ruleId} );
            entries.push( {model: 'patient', _id: rulePatientId} );
            await removeEnties( entries );
        } );
    } );

    describe( '12. Check insurancestatus', () => {
        const suiteData = getFixtureData( 'data_for_insurance_type_rule_activity.json' ),
            [caseFolderId, ruleId, rulePatientId, anamneseId] = getObjectIds();
        let ruleLog;

        it( 'clean collections', async function() {
            await cleanCollections();
        } );

        it( 'init', async () => {
            const patientDob = moment().subtract( 34, 'year' ).toISOString();
            let [err] = await formatPromiseResult( postEntry( 'patient', {
                ...suiteData.patient,
                _id: rulePatientId,
                dob: patientDob,
                patientNo: makeRandomNumber( 3 ),
                activeCaseFolderId: caseFolderId
            } ) );
            should.not.exist( err );

            await postRule( {
                ...suiteData.rule,
                _id: ruleId,
                parent: Y.doccirrus.schemas.rule.getPracticeDirId()
            } );

            await postCaseFolder( mochaUtils.getCaseFolderData( {
                _id: caseFolderId,
                type: 'PUBLIC'
            } ), rulePatientId );
            await formatPromiseResult( waitForDelay( this, TIMEOUT_FOR_CACHE ) );
        } );
        it( 'post anamnese', async function() {
            await postActivity( {
                _id: anamneseId,
                ...suiteData.anamnese,
                timestamp: startToday,
                caseFolderId
            }, rulePatientId );

            ruleLog = defineRuleLog( suiteData.rulelog, {
                caseFolderId,
                ruleSetId: ruleId,
                affectedActivities: [
                    {
                        actType: "HISTORY",
                        id: anamneseId,
                        locationId
                    }]
            }, rulePatientId );
        } );

        it( 'check rule log', async function() {
            this.retries( RETRIES_COUNT );
            await formatPromiseResult( waitForDelay( this ) );
            await checkRuleLog( [ruleLog] );
        } );

        it( 'put anamnese', async function() {
            await putActivity( anamneseId, {
                userContent: 'some text'
            } );
        } );

        it( 'check rule log after put', async function() {
            this.retries( RETRIES_COUNT );
            await formatPromiseResult( waitForDelay( this ) );
            await checkRuleLog( [] );
        } );

        it( 'delete entries', async function() {
            const entries = [];
            entries.push( {model: 'rulelog', query: {caseFolderId}} );
            entries.push( {model: 'activity', _id: anamneseId} );
            entries.push( {model: 'casefolder', _id: caseFolderId} );
            entries.push( {model: 'rule', _id: ruleId} );
            await removeEnties( entries );
        } );
    } );

    //ACTIVITY creation
    describe( '13. Rule chaining', () => {
        const suiteData = getFixtureData( 'data_for_rule_chain.json' ),
            [caseFolderId, scheinId, anamneseId, rulePatientId] = getObjectIds(),
            rulesId = [
                new ObjectId().toString(),
                new ObjectId().toString()
            ];
        let rulelogs;

        it( 'clean collections', async function() {
            await cleanCollections();
        } );

        it( 'init', async () => {
            await assignLocationToEmployee( [ locationId ]  );

            const patientDob = moment().subtract( 36, 'year' ).toISOString();

            for( let i = 0; i < rulesId.length; i++ ) {
                await postRule( {
                    ...suiteData.rules[i],
                    _id: rulesId[i],
                    parent: Y.doccirrus.schemas.rule.getPracticeDirId()
                } );
            }

            let [err] = await formatPromiseResult( postEntry( 'patient', {
                ...suiteData.patient,
                _id: rulePatientId,
                dob: patientDob,
                patientNo: makeRandomNumber( 3 ),
                activeCaseFolderId: caseFolderId
            } ) );
            should.not.exist( err );

            await postCaseFolder( mochaUtils.getCaseFolderData( {
                _id: caseFolderId,
                type: 'PUBLIC'
            } ), rulePatientId );
            await formatPromiseResult( waitForDelay( this, TIMEOUT_FOR_CACHE ) );
        } );

        it( 'post anamnese', async function() {
            await postActivity( {
                ...suiteData.schein,
                _id: scheinId,
                timestamp: new Date(),
                caseFolderId
            }, rulePatientId );

            await formatPromiseResult( waitForDelay( this, TIMEOUT_FOR_CACHE ) );

            await postActivity( {
                ...suiteData.anamnese,
                _id: anamneseId,
                timestamp: new Date(),
                caseFolderId
            }, rulePatientId );

            await formatPromiseResult( waitForDelay( this, TIMEOUT_FOR_CACHE ) );

            let communication = await getEntry( 'activity', {
                actType: 'COMMUNICATION',
                caseFolderId
            } );

            rulelogs = suiteData.rulelogs.map( ( rulelog, index ) => {
                return defineRuleLog( rulelog, {
                    patientId: rulePatientId,
                    ruleSetId: rulesId[index],
                    caseFolderId
                }, rulePatientId );
            } );
            rulelogs[0].factId = anamneseId;
            rulelogs[1].factId = communication && communication[0] && communication[0]._id.toString();
        } );

        it( 'check rule log', async function() {
            this.retries( RETRIES_COUNT );
            await formatPromiseResult( waitForDelay( this ) );
            await checkRuleLog( rulelogs );
        } );

        it( 'check communication and treatment creation', async function() {
            this.retries( RETRIES_COUNT );
            await formatPromiseResult( waitForDelay( this ) );
            const expectedTreatment = {
                ...suiteData.treatment,
                caseFolderId,
                employeeId,
                locationId,
                patientId: rulePatientId
            };
            const expectedCommunication = {
                ...suiteData.communication,
                caseFolderId,
                employeeId,
                locationId,
                patientId: rulePatientId
            };
            const mapFunction = ( obj ) => {
                obj.locationId = obj.locationId.toString();
                return obj;
            };
            const mapFunctionOmitCatalog = ( obj ) => {
                obj.locationId = obj.locationId.toString();
                delete obj.content;
                delete obj.code;
                delete obj.price;
                delete obj.userContent;
                return obj;
            };

            await checkExpectedToEqualActual( [expectedTreatment].map( el => mapFunctionOmitCatalog( el ) ), 'activity', {
                actType: 'TREATMENT',
                caseFolderId
            }, mapFunctionOmitCatalog );
            await checkExpectedToEqualActual( [expectedCommunication], 'activity', {
                actType: 'COMMUNICATION',
                caseFolderId
            }, mapFunction );
        } );

        it( 'delete all activities', async function() {
            this.retries( RETRIES_COUNT );
            await formatPromiseResult( waitForDelay( this, TIMEOUT_FOR_CACHE ) );

            let [err] = await formatPromiseResult( deleteEntry( 'activity', {caseFolderId} ) );
            should.not.exist( err );

            let result;
            [err, result] = await formatPromiseResult( getEntry( 'activity', {caseFolderId} ) );
            should.not.exist( err );
            result.should.be.an( 'array' ).which.has.lengthOf( 0 );
        } );

        it( 'delete entries', async function() {
            const entries = [];
            rulesId.forEach( ruleId => {
                entries.push( {model: 'rule', _id: ruleId} );
            } );
            entries.push( {model: 'rulelog', query: {caseFolderId}} );
            entries.push( {model: 'casefolder', _id: caseFolderId} );
            await removeEnties( entries );
        } );
    } );

    describe( '14. Check drop cache functionality', () => {
        // any suite data can be used here, no actual rule triggering will be tested
        const suiteData = getFixtureData( 'data_for_40300_rule.json' ),
            ruleId = new ObjectId().toString(),
            parent = Y.doccirrus.schemas.rule.getDirectoryIdByCatalogShort( 'EBM' ),
            EventEmitter = require( 'events' ).EventEmitter,
            event = new EventEmitter(),
            activateP = promisifyArgsCallback( Y.doccirrus.api.rule.activate );

        let
            fnOriginal,
            dropCacheCounter = 0;

        before( function() {
            fnOriginal = Y.doccirrus.api.rule.dropCacheIPC;
            Y.doccirrus.api.rule.dropCacheIPC = () => {
                event.emit( 'onDropCache' );
            };

            event.on( 'onDropCache', () => {
                dropCacheCounter++;
            } );
        } );
        after( function() {
            Y.doccirrus.email.event.removeAllListeners( 'onDropCache' );
            Y.doccirrus.api.rule.dropCacheIPC = fnOriginal;
        } );

        it( 'clean collections', async function() {
            await cleanCollections();
        } );

        it( 'posting rule should call drop cache', async function() {
            dropCacheCounter = 0;

            await postRule( {
                "_id": parent,
                "isDirectory": true,
                "isLocked": true,
                "name": "EBM",
                "parent": "000000000000000000000001",
                "idStr": parent
            } );

            await postRule( {
                ...suiteData.rule,
                _id: ruleId,
                parent
            } );
            //need small timeout while dropCache event will be sent, in this case from rule-process
            await formatPromiseResult( waitForDelay( this, 50 ) );
            dropCacheCounter.should.be.equal( 2 );
        } );

        it( 'set not active exact rule should call drop cache', async function() {
            dropCacheCounter = 0;
            let [err] = await formatPromiseResult( activateP( {
                    user,
                    originalParams: {
                        isActive: false,
                        ruleId
                    }
                } )
            );
            should.not.exist( err );
            //need small timeout while dropCache event will be sent, in this case from rule-process
            await formatPromiseResult( waitForDelay( this, 50 ) );
            dropCacheCounter.should.be.equal( 1 );
            //here additionally can be checked that in db particular rule have been update with active=false
        } );

        it( 'set active exact rule should call drop cache', async function() {
            dropCacheCounter = 0;
            let [err] = await formatPromiseResult( activateP( {
                    user,
                    originalParams: {
                        isActive: true,
                        ruleId
                    }
                } )
            );
            should.not.exist( err );
            //need small timeout while dropCache event will be sent, in this case from rule-process
            await formatPromiseResult( waitForDelay( this, 50 ) );
            dropCacheCounter.should.be.equal( 1 );
            //here additionally can be checked that in db particular rule have been update with active=true
        } );

        it( 'set not active rule directory should call drop cache', async function() {
            dropCacheCounter = 0;
            let [err] = await formatPromiseResult( activateP( {
                    user,
                    originalParams: {
                        isActive: false,
                        ruleId: parent
                    }
                } )
            );
            should.not.exist( err );
            //need small timeout while dropCache event will be sent, in this case after all descent tree processed
            await formatPromiseResult( waitForDelay( this, 50 ) );
            dropCacheCounter.should.be.equal( 1 );
            //here additionally can be checked that in db particular folder and all descent rules have been update with active=false
        } );

        it( 'set active rule directory should call drop cache', async function() {
            dropCacheCounter = 0;
            let [err] = await formatPromiseResult( activateP( {
                    user,
                    originalParams: {
                        isActive: true,
                        ruleId: parent
                    }
                } )
            );
            should.not.exist( err );
            //need small timeout while dropCache event will be sent, in this case after all descent tree processed
            await formatPromiseResult( waitForDelay( this, 50 ) );
            dropCacheCounter.should.be.equal( 1 );
            //here additionally can be checked that in db particular folder and all descent rules have been update with active=true
        } );

    } );

    describe( '15. Check sequence processing', () => {
        const suiteData = getFixtureData( 'data_for_sequence_rule.json' ),
            [caseFolderId, scheinId, sequenceId] = getObjectIds(),
            periodRule = suiteData.rules.find( el => el.referenceArea === 'PERIOD' ),
            period = getPeriodForRuleSet( periodRule, startToday );

        let rulelogs,
            activityIds = [],
            rulesPushed = [],
            fnOriginal;

        before( function() {
            fnOriginal = Y.doccirrus.api.catalog.getTreatmentCatalogEntry;

            Y.doccirrus.api.catalog.getTreatmentCatalogEntry = ( args ) => {
                args.callback( null, suiteData.catalog );
            };
        } );
        after( function() {
            Y.doccirrus.api.catalog.getTreatmentCatalogEntry = fnOriginal;
        } );

        it( 'clean collections', async function() {
            await cleanCollections();
        } );

        it( 'setup test data', async function() {
            await postCaseFolder( mochaUtils.getCaseFolderData( {
                _id: caseFolderId,
                type: 'PUBLIC'
            } ) );
            for( let ruleData of suiteData.rules ) { //eslint-disable-line no-unused-vars
                let ruleId = new ObjectId().toString();
                rulesPushed.push( {
                    _id: ruleId,
                    referenceArea: ruleData.referenceArea
                } );
                await postRule( {
                    ...ruleData,
                    _id: ruleId,
                    parent: Y.doccirrus.schemas.rule.getDirectoryIdByCatalogShort( 'EBM' )
                } );
            }

            await postActivity( {
                ...suiteData.schein,
                _id: scheinId,
                caseFolderId,
                timestamp: startToday
            } );

            let sequenceData = suiteData.sequence;
            sequenceData.activities.forEach( activity => {
                activity._id = new ObjectId( activity._id );
            } );

            let [err] = await formatPromiseResult(
                postEntry( 'activitysequence', {...sequenceData, _id: sequenceId} )
            );
            should.not.exist( err );

            await formatPromiseResult( waitForDelay( this, TIMEOUT_FOR_CACHE ) );
        } );

        it( 'apply sequence to create 2 activities', function( done ) {
            this.timeout( 20000 );
            Y.doccirrus.api.activitysequence.applySequence( {
                user,
                query: {
                    _id: sequenceId,
                    employeeId,
                    timestamp: moment().toISOString(),
                    locationId: locationId,
                    patientId,
                    caseFolderId,
                    caseFolderType: 'PUBLIC',
                    useOriginalValues: true
                },
                data: {
                    activitiesData: [
                        {
                            _id: suiteData.sequence.activities[0]._id.toString()
                        },
                        {
                            _id: suiteData.sequence.activities[1]._id.toString()
                        }
                    ]
                },
                callback( err, result ) {
                    should.not.exist( err );
                    should.exist( result );
                },
                onActivitiesPosted( err, result ) {
                    should.not.exist( err );
                    should.exist( result );

                    activityIds = result.map( el => el._id.toString() );
                    activityIds.should.be.an( 'array' ).which.has.lengthOf( 2 );
                    done();
                }
            } );
        } );

        it( 'prepare expected rulelogs', async function() {
            rulelogs = suiteData.rulelogs.map( ( rulelog ) => {
                return defineRuleLog( rulelog, {
                    patientId,
                    caseFolderId
                }, patientId );
            } );

            let entryRules = rulelogs.filter( el => el.referenceArea === 'ENTRY' ),
                entryRulesPushed = rulesPushed.filter( el => el.referenceArea === 'ENTRY' ),
                periodRules = rulelogs.filter( el => el.referenceArea === 'PERIOD' ),
                periodRulesPushed = rulesPushed.filter( el => el.referenceArea === 'PERIOD' );

            entryRules[0].ruleSetId = entryRulesPushed[0]._id;
            entryRules[0].factId = activityIds[0];
            entryRules[0].affectedActivities[0].id = entryRules[0].factId;

            entryRules[1].ruleSetId = entryRulesPushed[0]._id;
            entryRules[1].factId = activityIds[1];
            entryRules[1].affectedActivities[0].id = entryRules[1].factId;

            periodRules[0].ruleSetId = periodRulesPushed[0]._id;
            periodRules[0].affectedActivities[0].id = activityIds[0];
            periodRules[0].affectedActivities[0].locationId = locationId;
            periodRules[0].affectedActivities[1].id = activityIds[1];
            periodRules[0].affectedActivities[1].locationId = locationId;
            periodRules[0].message = formatPeriodRuleMessage( periodRules[0].message, period.startDate, period.endDate );
        } );

        it( 'check rulelogs generated by batch processing', async function() {
            this.retries( RETRIES_COUNT );
            await formatPromiseResult( waitForDelay( this ) );
            await checkRuleLog( rulelogs );
        } );

        it( 'delete entries', async function() {
            const entries = [];
            entries.push( {model: 'rulelog', query: {caseFolderId}} );
            entries.push( {model: 'activitysequence', _id: sequenceId} );
            entries.push( {model: 'activity', _id: scheinId} );
            for( let id of activityIds ) { //eslint-disable-line no-unused-vars
                entries.push( {model: 'activity', _id: id} );
            }
            entries.push( {model: 'casefolder', _id: caseFolderId} );
            for( let id of rulesPushed.map( el => el._id.toString() ) ) { //eslint-disable-line no-unused-vars
                entries.push( {model: 'rule', _id: id} );
            }
            await removeEnties( entries );
        } );

    } );

    describe( '16. Check batch copy processing', () => {
        const suiteData = getFixtureData( 'data_for_batch_copy_rule.json' ),
            [caseFolderId, scheinId, treatment1Id] = getObjectIds(),
            periodRule = suiteData.rules.find( el => el.referenceArea === 'PERIOD' ),
            period = getPeriodForRuleSet( periodRule, startToday );

        let rulelogs,
            entryRules,
            entryRulesPushed,
            periodRules,
            periodRulesPushed,
            rulesPushed = [],
            treatment2Id;

        it( 'clean collections', async function() {
            await cleanCollections();
        } );

        it( 'setup test data', async function() {
            await postCaseFolder( mochaUtils.getCaseFolderData( {
                _id: caseFolderId,
                type: 'PUBLIC'
            } ) );
            for( let ruleData of suiteData.rules ) { //eslint-disable-line no-unused-vars
                let ruleId = new ObjectId().toString();
                rulesPushed.push( {
                    _id: ruleId,
                    referenceArea: ruleData.referenceArea
                } );
                await postRule( {
                    ...ruleData,
                    _id: ruleId,
                    parent: Y.doccirrus.schemas.rule.getDirectoryIdByCatalogShort( 'EBM' )
                } );
            }

            await postActivity( {
                ...suiteData.schein,
                _id: scheinId,
                caseFolderId,
                timestamp: startToday
            } );

            await formatPromiseResult( waitForDelay( this, TIMEOUT_FOR_CACHE ) );
        } );

        it( 'post treatment 1 to trigger entry rule', async function() {
            await postActivity( {
                ...suiteData.treatment,
                _id: treatment1Id,
                caseFolderId,
                timestamp: now
            } );

            entryRules = suiteData.rulelogs.filter( el => el.referenceArea === 'ENTRY' ).map( ( rulelog ) => {
                return defineRuleLog( rulelog, {
                    patientId,
                    caseFolderId
                }, patientId );
            } );
            entryRulesPushed = rulesPushed.filter( el => el.referenceArea === 'ENTRY' );

            entryRules[0].ruleSetId = entryRulesPushed[0]._id;
            entryRules[0].factId = treatment1Id;
            entryRules[0].affectedActivities[0].id = entryRules[0].factId;
        } );

        it( 'check entry rule', async function() {
            this.retries( RETRIES_COUNT );
            await formatPromiseResult( waitForDelay( this ) );
            await checkRuleLog( [entryRules[0]] );
        } );

        it( 'copy treatment', function( done ) {
            this.timeout( 1000 );
            Y.doccirrus.api.activity.updateBatch( {
                user,
                query: {
                    activitiesId: [treatment1Id]
                },
                originalParams: {
                    copy: true
                },
                callback( err ) {
                    should.not.exist( err );
                    done();
                }
            } );
        } );

        it( 'check newly created treatment', async function() {
            this.retries( RETRIES_COUNT );
            await formatPromiseResult( waitForDelay( this ) );
            let [err, activities] = await formatPromiseResult( getEntry( 'activity', {caseFolderId} ) );
            should.not.exist( err );

            activities.should.be.an( 'array' ).which.has.lengthOf( 3 ); //SCHEIN + Original Treatment + Copied Treatment

            let copiedTreatment = activities.filter( el => el.actType === 'TREATMENT' && el._id.toString() !== treatment1Id );

            treatment2Id = copiedTreatment && copiedTreatment[0] && copiedTreatment[0]._id && copiedTreatment[0]._id.toString();
            should.exist( treatment2Id );
        } );

        it( 'prepare expected rulelogs after copying', async function() {
            rulelogs = suiteData.rulelogs.map( ( rulelog ) => {
                return defineRuleLog( rulelog, {
                    patientId,
                    caseFolderId
                }, patientId );
            } );

            entryRules = rulelogs.filter( el => el.referenceArea === 'ENTRY' );
            entryRulesPushed = rulesPushed.filter( el => el.referenceArea === 'ENTRY' );
            periodRules = rulelogs.filter( el => el.referenceArea === 'PERIOD' );
            periodRulesPushed = rulesPushed.filter( el => el.referenceArea === 'PERIOD' );

            entryRules[0].ruleSetId = entryRulesPushed[0]._id;
            entryRules[0].factId = treatment1Id;
            entryRules[0].affectedActivities[0].id = entryRules[0].factId;

            entryRules[1].ruleSetId = entryRulesPushed[0]._id;
            entryRules[1].factId = treatment2Id;
            entryRules[1].affectedActivities[0].id = entryRules[1].factId;

            periodRules[0].ruleSetId = periodRulesPushed[0]._id;
            periodRules[0].affectedActivities[0].id = treatment1Id;
            periodRules[0].affectedActivities[0].locationId = locationId;
            periodRules[0].affectedActivities[1].id = treatment2Id;
            periodRules[0].affectedActivities[1].locationId = locationId;
            periodRules[0].message = formatPeriodRuleMessage( periodRules[0].message, period.startDate, period.endDate );
        } );

        it( 'check rulelogs', async function() {
            this.retries( RETRIES_COUNT );
            await formatPromiseResult( waitForDelay( this ) );
            await checkRuleLog( rulelogs );
        } );

        it( 'delete entries', async function() {
            const entries = [];
            entries.push( {model: 'rulelog', query: {caseFolderId}} );
            entries.push( {model: 'activity', _id: treatment2Id} );
            entries.push( {model: 'activity', _id: treatment1Id} );
            entries.push( {model: 'activity', _id: scheinId} );

            entries.push( {model: 'casefolder', _id: caseFolderId} );
            for( let id of rulesPushed.map( el => el._id.toString() ) ) { //eslint-disable-line no-unused-vars
                entries.push( {model: 'rule', _id: id} );
            }

            await removeEnties( entries );
        } );

    } );

    describe( '17. Check rule operations', () => {
        const suiteData = getFixtureData( 'data_for_operations_rule.json' ),
            [caseFolderId, scheinId, treatment1Id, treatment2Id, treatment3Id, treatment4Id] = getObjectIds();

        let rulesPushed = [];

        it( 'clean collections', async function() {
            await cleanCollections();
        } );

        it( 'setup test data', async function() {
            await postCaseFolder( mochaUtils.getCaseFolderData( {
                _id: caseFolderId,
                type: 'PUBLIC'
            } ) );
            for( let ruleData of suiteData.rules ) { //eslint-disable-line no-unused-vars
                let ruleId = new ObjectId().toString();
                rulesPushed.push( {
                    _id: ruleId,
                    referenceArea: ruleData.referenceArea
                } );
                await postRule( {
                    ...ruleData,
                    _id: ruleId,
                    parent: Y.doccirrus.schemas.rule.getDirectoryIdByCatalogShort( 'EBM' )
                } );
            }

            let [err] = await formatPromiseResult( updateEntry( 'patient', patientId, {
                $set: {
                    "partnerIds": [
                        {
                            "partnerId": "CARDIO",
                            "patientId": "test-123",
                            "selectedType": "BIOTRONIK",
                            "isDisabled": true
                        },
                        {
                            "partnerId": "DOQUVIDE",
                            "patientId": "test-DQ-00078",
                            "isDisabled": true
                        },
                        {
                            "partnerId": "DQS",
                            "patientId": "test-DQ-00079",
                            "isDisabled": true
                        }
                    ]
                }
            } ) );
            should.not.exist( err );

            await postActivity( {
                ...suiteData.schein,
                _id: scheinId,
                caseFolderId,
                timestamp: startQuarter
            } );

            await formatPromiseResult( waitForDelay( this, TIMEOUT_FOR_CACHE ) );
        } );

        it( 'post first treatment (code 1) should not trigger rules', async function() {
            await postActivity( {
                ...suiteData.treatment,
                _id: treatment1Id,
                caseFolderId,
                patientId,
                locationId,
                timestamp: now,
                code: '1'
            } );
        } );

        it( 'rules should not be triggered', async function() {
            this.retries( RETRIES_COUNT );
            await formatPromiseResult( waitForDelay( this ) );
            let [err, ruleLogs] = await formatPromiseResult( getEntry( 'rulelog', {} ) );
            should.not.exist( err );
            ruleLogs.should.be.an( 'array' ).which.has.lengthOf( 0 );
        } );

        it( 'post second treatment (code 2) should trigger IN rule', async function() {
            await postActivity( {
                ...suiteData.treatment,
                _id: treatment2Id,
                caseFolderId,
                patientId,
                locationId,
                timestamp: now,
                code: '2'
            } );
        } );

        it( 'rules should be triggered', async function() {
            this.retries( RETRIES_COUNT );
            await formatPromiseResult( waitForDelay( this ) );

            let [err, ruleLogs] = await formatPromiseResult( getEntry( 'rulelog', {} ) );
            should.not.exist( err );
            ruleLogs.should.be.an( 'array' ).which.has.lengthOf( 1 );
            ruleLogs.find( el => el.message.indexOf( '1 and 2' ) === 0 ).should.be.an( 'object' );
        } );

        it( 'post third treatment (code 3) should trigger ALL rule', async function() {
            await postActivity( {
                ...suiteData.treatment,
                _id: treatment3Id,
                caseFolderId,
                patientId,
                locationId,
                timestamp: now,
                code: '3'
            } );
        } );

        it( 'ALL rules should be triggered', async function() {
            this.retries( RETRIES_COUNT );
            await formatPromiseResult( waitForDelay( this ) );

            let [err, ruleLogs] = await formatPromiseResult( getEntry( 'rulelog', {} ) );
            should.not.exist( err );
            ruleLogs.should.be.an( 'array' ).which.has.lengthOf( 2 );
            ruleLogs.find( el => el.message.indexOf( '1 and 2' ) === 0 ).should.be.an( 'object' );
            ruleLogs.find( el => el.message.indexOf( 'L3 patient ALL 1 and 2' ) === 0 ).should.be.an( 'object' );
        } );

        it( 'post fourth treatment (code 4) should trigger NIN rule', async function() {
            await postActivity( {
                ...suiteData.treatment,
                _id: treatment4Id,
                caseFolderId,
                patientId,
                locationId,
                timestamp: now,
                code: '4'
            } );

            await formatPromiseResult( waitForDelay( this ) );

            let [err, ruleLogs] = await formatPromiseResult( getEntry( 'rulelog', {} ) );
            should.not.exist( err );
            ruleLogs.should.be.an( 'array' ).which.has.lengthOf( 3 );
            ruleLogs.find( el => el.message.indexOf( '1 and 2' ) === 0 ).should.be.an( 'object' );
            ruleLogs.find( el => el.message.indexOf( 'L3 patient ALL 1 and 2' ) === 0 ).should.be.an( 'object' );
            ruleLogs.find( el => el.message.indexOf( '1 and not in [1,2,3]' ) === 0 ).should.be.an( 'object' );
        } );

        it( 'delete entries', async function() {
            const entries = [];
            entries.push( {model: 'rulelog', query: {caseFolderId}} );
            entries.push( {model: 'activity', _id: treatment4Id} );
            entries.push( {model: 'activity', _id: treatment3Id} );
            entries.push( {model: 'activity', _id: treatment2Id} );
            entries.push( {model: 'activity', _id: treatment1Id} );
            entries.push( {model: 'activity', _id: scheinId} );

            entries.push( {model: 'casefolder', _id: caseFolderId} );
            for( let id of rulesPushed.map( el => el._id.toString() ) ) { //eslint-disable-line no-unused-vars
                entries.push( {model: 'rule', _id: id} );
            }
            await removeEnties( entries );
        } );
    } );

    describe( '18. Check clenup rulelog on activity changing', () => {
        const suiteData = getFixtureData( 'data_for_moving_activity_rule.json' ),
            [caseFolderId, anotherCaseFolderId, anotherLocationId, ruleId, scheinId, anotherCaseFolderScheinId, anotherLocationScheinId] = getObjectIds(),
            scheinTimestamp = moment().startOf( 'quarter' ).add( 1, 'seconds' ).toISOString(),
            activityTimestamp = moment().startOf( 'day' ).add( 5, 'hours' ).toISOString();

        const skipOnQuarterFirstDay = moment( activityTimestamp ).diff( moment( scheinTimestamp ), 'hours' ) < 30;

        let postedActivities = [], ruleLog;

        before( async function() {
            await cleanCollections();
            await postCaseFolder( mochaUtils.getCaseFolderData( {
                _id: caseFolderId,
                type: 'PUBLIC'
            } ) );
            await postCaseFolder( mochaUtils.getCaseFolderData( {
                _id: anotherCaseFolderId,
                type: 'PUBLIC'
            } ) );
            await postRule( {
                ...suiteData.rule,
                _id: ruleId,
                parent: Y.doccirrus.schemas.rule.getDirectoryIdByCatalogShort( 'EBM' )
            } );
            await postActivity( {
                ...suiteData.schein,
                _id: scheinId,
                caseFolderId,
                timestamp: scheinTimestamp
            } );

            await postEntry( 'location', mochaUtils.getLocationData( {
                _id: anotherLocationId,
                commercialNo: makeRandomNumber( 9 )
            } ) );

            await postActivity( {
                ...suiteData.schein,
                _id: anotherLocationScheinId,
                caseFolderId,
                timestamp: scheinTimestamp
            }, patientId, anotherLocationId );

            await postActivity( {
                ...suiteData.schein,
                _id: anotherCaseFolderScheinId,
                caseFolderId: anotherCaseFolderId,
                timestamp: scheinTimestamp
            } );
            await formatPromiseResult( waitForDelay( this, TIMEOUT_FOR_CACHE ) );
        } );

        after( async function() {
            const entries = [];
            entries.push( {model: 'rulelog', query: {caseFolderId}} );
            entries.push( {model: 'activity', _id: scheinId} );
            entries.push( {model: 'activity', _id: anotherCaseFolderScheinId} );
            entries.push( {model: 'activity', _id: anotherLocationScheinId} );

            entries.push( {model: 'activity', _id: postedActivities[0]} );
            entries.push( {model: 'activity', _id: postedActivities[1]} );
            entries.push( {model: 'casefolder', _id: caseFolderId} );
            entries.push( {model: 'casefolder', _id: anotherCaseFolderId} );

            entries.push( {model: 'location', _id: anotherLocationId} );

            entries.push( {model: 'rule', _id: ruleId} );
            await removeEnties( entries );
        } );

        it( 'two 30110 treatment was posted', async function() {
            for( let i = 0; i < 2; i++ ) {
                let [activityId] = await postActivity( {
                    ...suiteData.treatment,
                    caseFolderId,
                    timestamp: activityTimestamp
                } );
                postedActivities.push( activityId );
            }
            let period = getPeriodForRuleSet( suiteData.rule, activityTimestamp );

            //globaly defined rulelog will be checked several time in next tests
            ruleLog = defineRuleLog( suiteData.rulelogExprected[0], {
                caseFolderId,
                ruleSetId: ruleId
            } );
            ruleLog.message = formatPeriodRuleMessage( ruleLog.message, period.startDate, period.endDate );
            ruleLog.affectedActivities[0].id = postedActivities[0];
            ruleLog.affectedActivities[0].locationId = locationId;
            ruleLog.affectedActivities[1].id = postedActivities[1];
            ruleLog.affectedActivities[1].locationId = locationId;
        } );

        it( 'check that appropriate rule was triggered', async function() {
            this.retries( RETRIES_COUNT );
            await formatPromiseResult( waitForDelay( this ) );
            await checkRuleLog( [ruleLog] );
        } );

        it( 'second treatment change timestamp to be out of "punkt" time range (24h)', async function() {
            if( skipOnQuarterFirstDay ) {
                this.skip();
            }

            await putActivity( postedActivities[1], {
                timestamp: moment( activityTimestamp ).add( -27, 'hours' ).toISOString()
            } );
        } );

        it( 'check that rulelog was removed', async function() {
            if( skipOnQuarterFirstDay ) {
                this.skip();
            }

            this.retries( RETRIES_COUNT );
            await formatPromiseResult( waitForDelay( this ) );
            await checkRuleLog( [] );
        } );

        it( 'second treatment change timestamp to be back within of "punkt" time range (24h)', async function() {
            if( skipOnQuarterFirstDay ) {
                this.skip();
            }

            await putActivity( postedActivities[1], {
                timestamp: moment( activityTimestamp ).add( -20, 'hours' ).toISOString()
            } );
        } );

        it( 'check that rulelog not created yet', async function() {
            if( skipOnQuarterFirstDay ) {
                this.skip();
            }

            this.retries( RETRIES_COUNT );
            await formatPromiseResult( waitForDelay( this ) );
            await checkRuleLog( [] );
        } );

        it( 'hence period it traced down from changed activity we also need touch the first activity', async function() {
            if( skipOnQuarterFirstDay ) {
                this.skip();
            }

            await putActivity( postedActivities[0], {
                userContent: 'some new string'
            } );
        } );

        it( 'check that rulelog created', async function() {
            if( skipOnQuarterFirstDay ) {
                this.skip();
            }

            this.retries( RETRIES_COUNT );
            await formatPromiseResult( waitForDelay( this ) );
            await checkRuleLog( [ruleLog] );
        } );

        it( 'first (newest in timeline!) treatment change code', async function() {
            await putActivity( postedActivities[0], {
                code: '30111'
            } );
        } );

        it( 'check that rulelog was removed', async function() {
            this.retries( RETRIES_COUNT );
            await formatPromiseResult( waitForDelay( this ) );
            await checkRuleLog( [] );
        } );

        it( 'first treatment change code back to fulfill rule', async function() {
            await putActivity( postedActivities[0], {
                code: suiteData.treatment.code
            } );
        } );

        it( 'check that rulelog triggered again', async function() {
            this.retries( RETRIES_COUNT );
            await formatPromiseResult( waitForDelay( this ) );
            await checkRuleLog( [ruleLog] );
        } );

        it( 'first treatment change casefolder', async function() {
            await putActivity( postedActivities[0], {
                caseFolderId: anotherCaseFolderId
            } );
        } );

        it( 'check that rulelog was removed', async function() {
            this.retries( RETRIES_COUNT );
            await formatPromiseResult( waitForDelay( this ) );
            await checkRuleLog( [] );
        } );

        it( 'first treatment change casefolder back to fulfill rule', async function() {
            await putActivity( postedActivities[0], {
                caseFolderId
            } );
        } );

        it( 'check that rulelog triggered again', async function() {
            this.retries( RETRIES_COUNT );
            await formatPromiseResult( waitForDelay( this ) );
            await checkRuleLog( [ruleLog] );
        } );

        it( 'first treatment change location', async function() {
            await putActivity( postedActivities[0], {
                locationId: anotherLocationId
            } );
        } );

        it( 'check that rulelog was removed', async function() {
            this.retries( RETRIES_COUNT );
            await formatPromiseResult( waitForDelay( this ) );
            await checkRuleLog( [] );
        } );

        it( 'first treatment change location back to fulfill rule', async function() {
            await putActivity( postedActivities[0], {
                locationId
            } );
        } );

        it( 'check that rulelog triggered again', async function() {
            this.retries( RETRIES_COUNT );
            await formatPromiseResult( waitForDelay( this ) );
            await checkRuleLog( [ruleLog] );
        } );
    } );

    describe( '19. Check functionality for the rule new format of Exclusion/Inclusion rules', () => {
        const suiteData = getFixtureData( 'data_for_exclude_include_rule.json' ),
            [privatePatientId, caseFolderId, scheinId, excludeRuleId, includeRuleId] = getObjectIds(),
            ruleParent = Y.doccirrus.schemas.rule.getDirectoryIdByCatalogShort( 'GOÄ' );

        let treatment_687, treatment_403, treatment_3, treatment_800,
            ruleLog;

        it( 'clean collections', async function() {
            await cleanCollections();
        } );

        it( 'setup test data', async function() {
            await formatPromiseResult( postEntry( 'patient', {
                    ...suiteData.patient,
                    _id: privatePatientId, activeCaseFolderId: caseFolderId
                } )
            );
            await postCaseFolder( {
                ...suiteData.casefolder,
                _id: caseFolderId,
                patientId: privatePatientId
            }, privatePatientId );
            await postRule( {
                ...suiteData.rules.exclude,
                _id: excludeRuleId,
                parent: ruleParent
            } );
            await postRule( {
                ...suiteData.rules.include,
                _id: includeRuleId,
                parent: ruleParent
            } );
            await postActivity( {
                ...suiteData.schein,
                _id: scheinId,
                patientId: privatePatientId,
                caseFolderId,
                timestamp: startQuarter
            }, privatePatientId );
            await formatPromiseResult( waitForDelay( this, TIMEOUT_FOR_CACHE ) );
        } );

        it( 'post treatment with main code of exclude rule should not trigger', async function() {
            treatment_687 = await postActivity( {
                ...suiteData.treatment,
                locationId,
                caseFolderId,
                patientId: privatePatientId,
                timestamp: new Date(),
                code: "687"
            }, privatePatientId );
            treatment_687 = treatment_687[0];
        } );

        it( 'check rulelogs count', async function() {
            this.retries( RETRIES_COUNT );
            await formatPromiseResult( waitForDelay( this ) );
            await formatPromiseResult( waitForDelay( this ) );

            let [err, ruleLogs] = await formatPromiseResult( getEntry( 'rulelog', {} ) );
            should.not.exist( err );
            ruleLogs.should.be.an( 'array' ).which.has.lengthOf( 0 );
        } );

        it( 'post tretment ti trigger exclude rule', async function() {
            treatment_403 = await postActivity( {
                ...suiteData.treatment,
                locationId,
                caseFolderId,
                patientId: privatePatientId,
                timestamp: new Date(),
                code: "403"
            }, privatePatientId );
            treatment_403 = treatment_403[0];
        } );

        it( 'check rulelogs count', async function() {
            this.retries( RETRIES_COUNT );
            await formatPromiseResult( waitForDelay( this ) );

            //check if
            let [err, ruleLogs] = await formatPromiseResult( getEntry( 'rulelog', {} ) );
            should.not.exist( err );
            ruleLogs.should.be.an( 'array' ).which.has.lengthOf( 1 );

            ruleLog = defineRuleLog( suiteData.rulelogs.exclude, {
                caseFolderId,
                ruleSetId: excludeRuleId
            }, privatePatientId );

            ruleLog.affectedActivities = [
                {id: treatment_687, code: '687', actType: 'TREATMENT', locationId},
                {id: treatment_403, code: '403', actType: 'TREATMENT', locationId}
            ];
        } );

        it( 'check rulelogs content', async function() {
            this.retries( RETRIES_COUNT );
            await formatPromiseResult( waitForDelay( this ) );
            await checkRuleLog( [ruleLog] );
        } );

        it( 'removing activities should clear rulelog', async function() {
            let [err] = await formatPromiseResult( deleteEntry( 'activity', {_id: treatment_687} ) );
            should.not.exist( err );
        } );

        it( 'delete all activities', async function() {
            this.retries( RETRIES_COUNT );
            await formatPromiseResult( waitForDelay( this ) );

            let [err, ruleLogs] = await formatPromiseResult( getEntry( 'rulelog', {} ) );
            should.not.exist( err );
            ruleLogs.should.be.an( 'array' ).which.has.lengthOf( 0 );
        } );

        it( 'delete activity for following cases', async function() {
            let [err] = await formatPromiseResult( deleteEntry( 'activity', {_id: treatment_403} ) );
            should.not.exist( err );
        } );

        it( 'post treatments with  main code of include and allowed inclusion codes should not trigger', async function() {
            treatment_3 = await postActivity( {
                ...suiteData.treatment,
                locationId,
                caseFolderId,
                patientId: privatePatientId,
                timestamp: new Date(),
                code: "3"
            }, privatePatientId );
            treatment_3 = treatment_3[0];

            treatment_800 = await postActivity( {
                ...suiteData.treatment,
                locationId,
                caseFolderId,
                patientId: privatePatientId,
                timestamp: new Date(),
                code: "800"
            }, privatePatientId );
            treatment_800 = treatment_800[0];
        } );

        it( 'check rulelogs count', async function() {
            this.retries( RETRIES_COUNT );
            await formatPromiseResult( waitForDelay( this ) );
            await formatPromiseResult( waitForDelay( this ) );

            let [err, ruleLogs] = await formatPromiseResult( getEntry( 'rulelog', {} ) );
            should.not.exist( err );
            ruleLogs.should.be.an( 'array' ).which.has.lengthOf( 0 );
        } );

        it( 'post treatment to trigger include rule', async function() {
            treatment_403 = await postActivity( {
                ...suiteData.treatment,
                locationId,
                caseFolderId,
                patientId: privatePatientId,
                timestamp: new Date(),
                code: "403"
            }, privatePatientId );
            treatment_403 = treatment_403[0];

        } );

        it( 'check rulelogs count', async function() {
            this.retries( RETRIES_COUNT );
            await formatPromiseResult( waitForDelay( this ) );
            //check if
            let [err, ruleLogs] = await formatPromiseResult( getEntry( 'rulelog', {} ) );
            should.not.exist( err );
            ruleLogs.should.be.an( 'array' ).which.has.lengthOf( 1 );

            ruleLog = defineRuleLog( suiteData.rulelogs.include, {
                caseFolderId,
                ruleSetId: includeRuleId
            }, privatePatientId );

            ruleLog.affectedActivities = [
                {id: treatment_3, code: '3', actType: 'TREATMENT', locationId},
                {id: treatment_403, code: '403', actType: 'TREATMENT', locationId}
            ];
        } );

        it( 'check rulelogs content', async function() {
            this.retries( RETRIES_COUNT );
            await formatPromiseResult( waitForDelay( this ) );
            await checkRuleLog( [ruleLog] );
        } );

        it( 'delete entries', async function() {
            const entries = [];
            entries.push( {model: 'rulelog', query: {caseFolderId}} );
            entries.push( {model: 'rule', _id: excludeRuleId} );
            entries.push( {model: 'rule', _id: includeRuleId} );

            entries.push( {model: 'activity', _id: treatment_3} );
            entries.push( {model: 'activity', _id: treatment_800} );
            entries.push( {model: 'activity', _id: treatment_403} );

            entries.push( {model: 'activity', _id: scheinId} );
            entries.push( {model: 'casefolder', _id: caseFolderId} );
            entries.push( {model: 'patient', _id: privatePatientId} );
            await removeEnties( entries );
        } );

    } );

    describe( '20. Hierarchy rules use more strict rule sets that only has exact codes defined in metadata', () => {
        const suiteData = getFixtureData( 'data_for_hierarchy_rule.json' ),
            ruleParent = Y.doccirrus.schemas.rule.getPracticeDirId(),
            [privatePatientId, privateLocationId, caseFolderId, callId] = getObjectIds(),
            su = Y.doccirrus.auth.getSUForLocal(),
            postedRules = [],
            postedCatalogs = [];

        let
            countryMode,
            countryModeFromConfig,
            emmitedEvents = [];

        before( async function() {
            this.timeout( TIMEOUT_BEFORE_AFTER );
            Y.doccirrus.communication.event.on( 'onEmitEventForUser', ( params ) => {
                emmitedEvents.push( params );
            } );

            if( !Y.config ) {
                Y.config = {};
            }

            if( !Y.config.doccirrus ) {
                Y.config.doccirrus = {};
            }

            if( !Y.config.doccirrus.Env ) {
                Y.config.doccirrus.Env = {};
            }

            countryMode = Y.config.doccirrus.Env.countryMode;
            Y.config.doccirrus.Env.countryMode = ['CH'];

            countryModeFromConfig = Y.doccirrus.commonutils.getCountryModeFromConfigs;
            Y.doccirrus.commonutils.getCountryModeFromConfigs = () => ( [ 'CH' ] );

            await cleanCollections();

            // must validate for CH countryMode
            const catalogDescriptor = Y.doccirrus.api.catalog.getCatalogDescriptor( {
                actType: 'TREATMENT',
                short: 'TARMED'
            } );

            await postEntry( 'patient', {
                ...suiteData.patient,
                _id: privatePatientId, activeCaseFolderId: caseFolderId
            } );

            await postEntry( 'location', {
                ...suiteData.location,
                _id: privateLocationId
            } );

            await postCaseFolder( mochaUtils.getCaseFolderData( {
                _id: caseFolderId,
                type: 'PRIVATE_CH'
            } ), privatePatientId );

            for( let rule of suiteData.rules ) { //eslint-disable-line no-unused-vars
                let ruleSetId = await postRule( {
                    ...rule,
                    parent: ruleParent
                } );
                postedRules.push( ruleSetId );
            }
            for( let catalog of suiteData.catalogs ) { //eslint-disable-line no-unused-vars
                await Y.doccirrus.mongodb.runDb( {
                    user: su,
                    model: 'catalog',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( {...catalog, catalog: catalogDescriptor.filename} )
                } ).then( catalogId => {
                    postedCatalogs.push( catalogId );
                } );
                await formatPromiseResult( waitForDelay( this, TIMEOUT_FOR_CACHE ) );
            }
        } );

        after( async function() {
            this.timeout( TIMEOUT_BEFORE_AFTER );
            const entries = [];
            entries.push( {model: 'rulelog', query: {caseFolderId}} );
            for( let _id of postedRules ) { //eslint-disable-line no-unused-vars
                entries.push( {model: 'rule', _id} );
            }

            entries.push( {model: 'patient', _id: privatePatientId} );
            entries.push( {model: 'catalog', query: {_id: {$in: postedCatalogs}}} );

            entries.push( {model: 'casefolder', _id: caseFolderId} );
            await removeEnties( entries );

            Y.doccirrus.communication.event.removeAllListeners( 'onEmitEventForUser' );
            Y.config.doccirrus.Env.countryMode = countryMode || ['D'];
            Y.doccirrus.commonutils.getCountryModeFromConfigs = countryModeFromConfig;
        } );

        it( 'run prevalidate call', async function() {
            //ip call not return results, need to catch them over events
            emmitedEvents = [];
            Y.doccirrus.api.rule.triggerIpcQueue( {
                user,
                tenantId: user.tenantId,
                caseFolderId,
                locationId: privateLocationId,
                patientId: privatePatientId,
                type: 'activity',
                onDelete: false,
                preValidateActivities: true,
                callId,
                data: {
                    ...suiteData.treatment,
                    caseFolderId,
                    locationId: privateLocationId,
                    patientId: privatePatientId
                }
            } );
        } );

        it( 'check triggered rules', async function() {
            //this.skip();
            this.retries( RETRIES_COUNT );
            await formatPromiseResult( waitForDelay( this ) );

            //expected only one (from 3) rule should be triggered
            const
                eventName = `preEvaluateRule_${callId}`,
                ruleEngineResponse = emmitedEvents.filter( item => item.event === eventName );
            ruleEngineResponse.should.be.an( 'array' ).which.has.lengthOf( 1 );
            expect( ruleEngineResponse[0].msg.data ).to.be.equal( '[{"affectedCodes":["00.0040"],"message":"Altersbedingung 00.0040 (TARMED)"}]' );
        } );

    } );

    describe( '21. Check age rules', () => {
        const suiteData = getFixtureData( 'data_for_age_rule.json' ),
            [customPatientId, caseFolderId, ruleSetId] = getObjectIds(),
            ruleParent = Y.doccirrus.schemas.rule.getDirectoryIdByCatalogShort( 'EBM' );

        let history_before, history_after,
            onNow_ruleLog;

        before( async function() {
            this.timeout( TIMEOUT_BEFORE_AFTER );
            await cleanCollections();

            await postEntry( 'patient', {
                ...suiteData.patient,
                _id: customPatientId,
                activeCaseFolderId: caseFolderId,
                dob: moment().add( -10, 'years' ).add( -5, 'days' ).toDate()
            } );

            await postCaseFolder( mochaUtils.getCaseFolderData( {
                _id: caseFolderId,
                type: 'PUBLIC'
            } ), customPatientId );

            await postRule( {
                ...suiteData.rule,
                _id: ruleSetId,
                parent: ruleParent
            } );
        } );

        after( async function(){
            this.timeout( TIMEOUT_BEFORE_AFTER );
            const entries = [];
            entries.push( {model: 'rulelog', query: {caseFolderId}} );
            entries.push( {model: 'rule', _id: ruleSetId} );

            entries.push( {model: 'patient', _id: customPatientId} );
            entries.push( {model: 'casefolder', _id: caseFolderId} );
            await removeEnties( entries );
        });

        it( 'crete activity prior birthday', async function() {
            history_before = await postActivity( {
                ...suiteData.history,
                locationId,
                caseFolderId,
                patientId: customPatientId,
                timestamp: moment().add( -7, 'days' ).toDate()
            }, customPatientId );
            history_before = history_before[0];
        } );

        it( 'check rulelogs', async function() {
            //this.skip();
            this.retries( RETRIES_COUNT );
            await formatPromiseResult( waitForDelay( this ) );

            let [err, ruleLogs] = await formatPromiseResult( getEntry( 'rulelog', {} ) );
            should.not.exist( err );
            ruleLogs.should.be.an( 'array' ).which.has.lengthOf( 1 );
            let expectedTemplate = {
                ...suiteData.rulelogs.onNow,
                factId: history_before,
                locationId,
                ruleSetId,
                patientId: customPatientId,
                caseFolderId
            };

            onNow_ruleLog = ruleLogs[0]._id.toString();
            expect( filterWhitelisted( ruleLogs[0], [], ruleLogWhiteListed ) ).to.deep.equalInAnyOrder( expectedTemplate );
        } );

        it( 'crete activity after birthday', async function() {
            history_after = await postActivity( {
                ...suiteData.history,
                locationId,
                caseFolderId,
                patientId: customPatientId,
                timestamp: now
            }, customPatientId );
            history_after = history_after[0];
        } );

        it( 'check canged rulelogs', async function() {
            //this.skip();
            this.retries( RETRIES_COUNT );
            await formatPromiseResult( waitForDelay( this ) );

            let [err, ruleLogs] = await formatPromiseResult( getEntry( 'rulelog', {} ) );
            should.not.exist( err );
            ruleLogs.should.be.an( 'array' ).which.has.lengthOf( 3 ); //two new and one from previous
            ruleLogs = ruleLogs.filter( el => el._id.toString() !== onNow_ruleLog );
            ruleLogs.should.be.an( 'array' ).which.has.lengthOf( 2 ); //only two new

            ruleLogs = filterWhitelisted( ruleLogs, [], ruleLogWhiteListed );
            let onNow_expectedTemplate = {
                    ...suiteData.rulelogs.onNow,
                    factId: history_after,
                    locationId,
                    ruleSetId,
                    patientId: customPatientId,
                    caseFolderId
                },
                onDate_expectedTemplate = {
                    ...suiteData.rulelogs.onDate,
                    factId: history_after,
                    locationId,
                    ruleSetId,
                    patientId: customPatientId,
                    caseFolderId
                };
            expect( ruleLogs.find( el => el.message === 'Age on Now' ) ).to.deep.equalInAnyOrder( onNow_expectedTemplate );
            expect( ruleLogs.find( el => el.message === 'Age on Date' ) ).to.deep.equalInAnyOrder( onDate_expectedTemplate );
        } );

        it( 'delete activities should clear logs', async function() {
            let [err] = await formatPromiseResult( deleteEntry( 'activity', {_id: history_before} ) );
            should.not.exist( err );
            [err] = await formatPromiseResult( deleteEntry( 'activity', {_id: history_after} ) );
            should.not.exist( err );
        } );

        it( 'check rulelog deleted', async function() {
            this.retries( RETRIES_COUNT );
            await formatPromiseResult( waitForDelay( this ) );

            let [err, ruleLogs] = await formatPromiseResult( getEntry( 'rulelog', {} ) );
            should.not.exist( err );
            ruleLogs.should.be.an( 'array' ).which.has.lengthOf( 0 );
        } );
    } );

    describe( '22. Check task types', () => {
        const suiteData = getFixtureData( 'data_for_rule_engine_action_task.json' ),
            [caseFolderId, ruleSetId, historyId] = getObjectIds();

        before( async function() {
            this.timeout( TIMEOUT_BEFORE_AFTER );
            await cleanCollections();

            await postCaseFolder( mochaUtils.getCaseFolderData( {
                _id: caseFolderId,
                type: 'PUBLIC'
            } ) );

            await postRule( {
                ...suiteData.rule,
                _id: ruleSetId
            } );

            await postEntry( 'tasktype', suiteData.taskType );
        } );

        after( async function() {
            this.timeout( TIMEOUT_BEFORE_AFTER );
            const entries = [];
            entries.push( {model: 'rulelog', query: {caseFolderId}} );
            entries.push( {model: 'rule', _id: ruleSetId} );
            entries.push( {model: 'activity', _id: historyId} );
            entries.push( {model: 'tasktype', _id: suiteData.taskType._id} );

            entries.push( {model: 'casefolder', _id: caseFolderId} );
            await removeEnties( entries );
        } );

        it( 'post activity to trigger rule', async function() {
            await postActivity( {
                ...suiteData.history,
                _id: historyId,
                caseFolderId,
                timestamp: now
            } );
        } );

        it( 'check created task and task type', async function() {
            //this.skip();
            this.retries( RETRIES_COUNT );
            await formatPromiseResult( waitForDelay( this ) );
            let [err, result] = await formatPromiseResult( getEntry( 'task', {} ) );
            should.not.exist( err );

            result.should.be.an( 'array' ).which.has.lengthOf( 1 );
            result[0].taskType.should.be.equal( suiteData.taskType._id );
        } );
    } );

    describe( '23. Continious Diagnosis from another casefolder', () => {
        const suiteData = getFixtureData( 'data_continiousDD_rule.json' ),
            [caseFolder_1Id, caseFolder_2Id, ruleId, scheinId, diagnosis_1Id, diagnosis_2Id] = getObjectIds();
        let period;

        before( async function() {
            this.timeout( TIMEOUT_BEFORE_AFTER );
            await cleanCollections();
            await postEntry( 'casefolder', mochaUtils.getCaseFolderData( {
                patientId,
                _id: caseFolder_1Id,
                type: 'PUBLIC'
            } ) );
            await postEntry( 'rule', {
                ...suiteData.rule,
                _id: ruleId,
                parent: Y.doccirrus.schemas.rule.getDirectoryIdByCatalogShort( 'EBM' )
            } );
            await insertEntry( 'activity', {
                ...suiteData.diagnosis_1,
                _id: new ObjectId( diagnosis_1Id ),
                caseFolderId: caseFolder_1Id,
                employeeId,
                patientId,
                locationId: new ObjectId( locationId ),
                timestamp: yesterdayOrStartQuarter
            } );
            await insertEntry( 'activity', {
                ...suiteData.diagnosis_2,
                _id: new ObjectId( diagnosis_2Id ),
                caseFolderId: caseFolder_2Id, //NOTE: casefolder is different
                employeeId,
                patientId,
                locationId: new ObjectId( locationId ),
                timestamp: yesterdayOrStartQuarter
            } );
        } );

        after( async function() {
            this.timeout( TIMEOUT_BEFORE_AFTER );
            const entries = [];
            entries.push( {model: 'rulelog', query: {caseFolderId: caseFolder_1Id}} );
            entries.push( {model: 'activity', _id: diagnosis_1Id} );
            entries.push( {model: 'activity', _id: diagnosis_2Id} );
            entries.push( {model: 'activity', _id: scheinId} );
            entries.push( {model: 'casefolder', _id: caseFolder_1Id} );
            entries.push( {model: 'rule', _id: ruleId} );
            await removeEnties( entries );
        } );

        it( 'post schein to trigger rule', async function() {
            await postActivity( {
                ...suiteData.schein,
                _id: scheinId,
                patientId,
                locationId,
                employeeId,
                continuousIcds: [ diagnosis_1Id, diagnosis_2Id ],
                caseFolderId: caseFolder_1Id,
                timestamp: new Date()
            } );
        } );

        it( 'rule log should be triggered', async function() {
            this.retries( RETRIES_COUNT );
            period = getPeriodForRuleSet( suiteData.rule, startToday );
            await formatPromiseResult( waitForDelay( this ) );
            let ruleLog = defineRuleLog( suiteData.rulelogExprected, {
                caseFolderId: caseFolder_1Id,
                ruleSetId: ruleId
            } );
            ruleLog.message = formatPeriodRuleMessage( ruleLog.message, period.startDate, period.endDate );
            ruleLog.affectedActivities[0].id = scheinId;
            ruleLog.affectedActivities[0].locationId = locationId;
            ruleLog.affectedActivities[1].id = diagnosis_1Id;
            ruleLog.affectedActivities[1].locationId = locationId;
            ruleLog.affectedActivities[2].id = diagnosis_2Id;
            ruleLog.affectedActivities[2].locationId = locationId;
            await checkRuleLog( [ruleLog] );
        } );

    } );

    describe( 'generated rule with short operators (including null comparison)', () => {
        const suiteData = getFixtureData( 'data_shortOperator_rule.json' ),
            [caseFolderId, ruleId, scheinId, diagnosisId] = getObjectIds();

        before( async function() {
            this.timeout( TIMEOUT_BEFORE_AFTER );
            await cleanCollections();
            await postEntry( 'casefolder', mochaUtils.getCaseFolderData( {
                patientId,
                _id: caseFolderId,
                type: 'PUBLIC'
            } ) );
            await postEntry( 'rule', {
                ...suiteData.rule,
                _id: ruleId,
                parent: Y.doccirrus.schemas.rule.getDirectoryIdByCatalogShort( 'EBM' )
            } );
            await postActivity( {
                ...suiteData.schein,
                _id: scheinId,
                patientId,
                locationId,
                employeeId,
                caseFolderId: caseFolderId,
                timestamp: startQuarter
            } );
        } );

        after( async function() {
            this.timeout( TIMEOUT_BEFORE_AFTER );
            const entries = [];
            entries.push( {model: 'rulelog', query: {caseFolderId: caseFolderId}} );
            entries.push( {model: 'activity', _id: diagnosisId} );
            entries.push( {model: 'activity', _id: scheinId} );
            entries.push( {model: 'casefolder', _id: caseFolderId} );
            entries.push( {model: 'rule', _id: ruleId} );
            await removeEnties( entries );
        } );

        it( 'post diagnosis to trigger rule', async function() {
            await postActivity( {
                ...suiteData.diagnosis,
                _id: diagnosisId,
                patientId,
                locationId,
                employeeId,
                caseFolderId: caseFolderId,
                timestamp: now
            } );
        } );

        it( 'rule log should be triggered', async function() {
            this.retries( RETRIES_COUNT );
            await formatPromiseResult( waitForDelay( this ) );
            let ruleLog = defineRuleLog( suiteData.rulelogExprected, {
                caseFolderId: caseFolderId,
                ruleSetId: ruleId,
                factId: diagnosisId
            } );
            ruleLog.affectedActivities[0].id = diagnosisId;
            await checkRuleLog( [ruleLog] );
        } );

    } );

    describe( '#begruendungen_liste() - ebm-rulemapper #KAP-76', () => {
        context( 'given Schein, Treatment in casefolder', function() {
            before( 'when adding Treatment without adding diagnosis from the treatment icd-liste', async function() {
                const suiteData = getFixtureData( '/data_for_13505_rule_diagnosis_selection_for_treatment.json' ),
                    [caseFolderId, ruleId, scheinId, activity13505Id] = getObjectIds();

                this.suiteData = suiteData;
                this.objectIds = {caseFolderId, ruleId, scheinId, activity13505Id};

                await cleanCollections();

                await postCaseFolder( mochaUtils.getCaseFolderData( {
                    _id: caseFolderId,
                    type: 'PUBLIC'
                } ) );
                await postRule( {
                    ...suiteData.rule,
                    _id: ruleId,
                    parent: Y.doccirrus.schemas.rule.getDirectoryIdByCatalogShort( 'EBM' )
                } );
                await postActivity( {
                    ...suiteData.schein,
                    _id: scheinId,
                    caseFolderId,
                    timestamp: startQuarter
                } );

                await postActivity( {
                    ...suiteData.treatment13505,
                    _id: activity13505Id,
                    caseFolderId,
                    timestamp: startToday
                } );

                await formatPromiseResult( waitForDelay( this, TIMEOUT_FOR_CACHE ) );
            } );
            it( 'then should throw a warning to add diagnosis', async function() {
                //this.retries( RETRIES_COUNT );
                this.period = getPeriodForRuleSet( this.suiteData.rule, startToday );

                await formatPromiseResult( waitForDelay( this ) );

                let [err, ruleLogs] = await formatPromiseResult( getEntry( 'rulelog', {} ) );
                should.not.exist( err );
                ruleLogs.should.be.an( 'array' ).which.has.lengthOf( 1 );

                const ruleLogsActual = filterWhitelisted( ruleLogs, [], ruleLogWhiteListed );

                let ruleLog = defineRuleLog( this.suiteData.rulelogExpected[0], {
                    caseFolderId: this.objectIds.caseFolderId,
                    ruleSetId: this.objectIds.ruleId
                } );

                ruleLog.message = formatPeriodRuleMessage( ruleLog.message, this.period.startDate, this.period.endDate );
                ruleLog.affectedActivities[0].id = this.objectIds.activity13505Id;
                ruleLog.affectedActivities[0].locationId = locationId;

                expect( ruleLogsActual[0] ).to.deep.equal( ruleLog );
            } );
            after( 'clean up the added identities', async function() {
                const entries = [];
                const caseFolderId = this.objectIds.caseFolderId;
                const ruleSetId = this.objectIds.ruleId;
                const scheinId = this.objectIds.scheinId;
                const treatmentId = this.objectIds.activity13505Id;

                entries.push( {model: 'rulelog', query: {caseFolderId}} );
                entries.push( {model: 'rule', _id: ruleSetId} );
                entries.push( {model: 'activity', _id: scheinId} );
                entries.push( {model: 'activity', _id: treatmentId} );

                entries.push( {model: 'casefolder', _id: caseFolderId} );
                await removeEnties( entries );
            } );
        } );
        context( 'given Schein, treatment, diagnosis from icd_list of treatment in casefolder', function() {
            before( 'when adding Treatment without adding diagnosis from the treatment icd-liste', async function() {
                const suiteData = getFixtureData( '/data_for_13505_rule_diagnosis_selection_for_treatment.json' ),
                    [caseFolderId, ruleId, scheinId, activity13505Id, activityD45Id] = getObjectIds();

                this.suiteData = suiteData;
                this.objectIds = {caseFolderId, ruleId, scheinId, activity13505Id, activityD45Id};

                await cleanCollections();

                await postCaseFolder( mochaUtils.getCaseFolderData( {
                    _id: caseFolderId,
                    type: 'PUBLIC'
                } ) );
                await postRule( {
                    ...suiteData.rule,
                    _id: ruleId,
                    parent: Y.doccirrus.schemas.rule.getDirectoryIdByCatalogShort( 'EBM' )
                } );
                await postActivity( {
                    ...suiteData.schein,
                    _id: scheinId,
                    caseFolderId,
                    timestamp: startQuarter
                } );

                await postActivity( {
                    ...suiteData.treatment13505,
                    _id: activity13505Id,
                    caseFolderId,
                    timestamp: startToday
                } );

                await postActivity( {
                    ...suiteData.diagnosisD45,
                    _id: activityD45Id,
                    caseFolderId,
                    timestamp: startToday
                } );

                await formatPromiseResult( waitForDelay( this, TIMEOUT_FOR_CACHE ) );
            } );
            it( 'then should be no warning because recommended diagnosis is added.', async function() {
                //this.retries( RETRIES_COUNT );
                this.period = getPeriodForRuleSet( this.suiteData.rule, startToday );

                await formatPromiseResult( waitForDelay( this ) );

                let [err, ruleLogs] = await formatPromiseResult( getEntry( 'rulelog', {} ) );
                should.not.exist( err );
                ruleLogs.should.be.an( 'array' ).which.has.lengthOf( 0 );
            } );
            after( 'clean up the added identities', async function() {
                const entries = [];
                const caseFolderId = this.objectIds.caseFolderId;
                const ruleSetId = this.objectIds.ruleId;
                const scheinId = this.objectIds.scheinId;
                const treatmentId = this.objectIds.activity13505Id;
                const diagnosisId = this.objectIds.activityD45Id;

                entries.push( {model: 'rulelog', query: {caseFolderId}} );
                entries.push( {model: 'rule', _id: ruleSetId} );
                entries.push( {model: 'activity', _id: scheinId} );
                entries.push( {model: 'activity', _id: treatmentId} );
                entries.push( {model: 'activity', _id: diagnosisId} );

                entries.push( {model: 'casefolder', _id: caseFolderId} );
                await removeEnties( entries );
            } );
        } );
        context( 'given Schein, treatment, diagnosis not from icd_list of treatment in casefolder', function() {
            before( 'when adding Treatment with adding diagnosis not from the treatment icd-liste', async function() {
                const suiteData = getFixtureData( '/data_for_13505_rule_diagnosis_selection_for_treatment.json' ),
                    [caseFolderId, ruleId, scheinId, activity13505Id, activityD40Id] = getObjectIds();

                this.suiteData = suiteData;
                this.objectIds = {caseFolderId, ruleId, scheinId, activity13505Id, activityD40Id};

                await cleanCollections();

                await postCaseFolder( mochaUtils.getCaseFolderData( {
                    _id: caseFolderId,
                    type: 'PUBLIC'
                } ) );
                await postRule( {
                    ...suiteData.rule,
                    _id: ruleId,
                    parent: Y.doccirrus.schemas.rule.getDirectoryIdByCatalogShort( 'EBM' )
                } );
                await postActivity( {
                    ...suiteData.schein,
                    _id: scheinId,
                    caseFolderId,
                    timestamp: startQuarter
                } );

                await postActivity( {
                    ...suiteData.treatment13505,
                    _id: activity13505Id,
                    caseFolderId,
                    timestamp: startToday
                } );

                await postActivity( {
                    ...suiteData.diagnosisD40,
                    _id: activityD40Id,
                    caseFolderId,
                    timestamp: startToday
                } );

                await formatPromiseResult( waitForDelay( this, TIMEOUT_FOR_CACHE ) );
            } );
            it( 'then should throw a warning to add a diagnosis from lcd_liste', async function() {
                //this.retries( RETRIES_COUNT );
                this.period = getPeriodForRuleSet( this.suiteData.rule, startToday );

                await formatPromiseResult( waitForDelay( this ) );

                let [err, ruleLogs] = await formatPromiseResult( getEntry( 'rulelog', {} ) );
                should.not.exist( err );
                ruleLogs.should.be.an( 'array' ).which.has.lengthOf( 1 );

                const ruleLogsActual = filterWhitelisted( ruleLogs, [], ruleLogWhiteListed );

                let ruleLog = defineRuleLog( this.suiteData.rulelogExpected[0], {
                    caseFolderId: this.objectIds.caseFolderId,
                    ruleSetId: this.objectIds.ruleId
                } );

                ruleLog.message = formatPeriodRuleMessage( ruleLog.message, this.period.startDate, this.period.endDate );
                ruleLog.affectedActivities[0].id = this.objectIds.activity13505Id;
                ruleLog.affectedActivities[0].locationId = locationId;

                expect( ruleLogsActual[0] ).to.deep.equal( ruleLog );
            } );
            after( 'clean up the added identities', async function() {
                const entries = [];
                const caseFolderId = this.objectIds.caseFolderId;
                const ruleSetId = this.objectIds.ruleId;
                const scheinId = this.objectIds.scheinId;
                const treatmentId = this.objectIds.activity13505Id;
                const diagnosisId = this.objectIds.activityD40Id;

                entries.push( {model: 'rulelog', query: {caseFolderId}} );
                entries.push( {model: 'rule', _id: ruleSetId} );
                entries.push( {model: 'activity', _id: scheinId} );
                entries.push( {model: 'activity', _id: treatmentId} );
                entries.push( {model: 'activity', _id: diagnosisId} );

                entries.push( {model: 'casefolder', _id: caseFolderId} );
                await removeEnties( entries );
            } );
        } );
        context( 'given Schein, treatment, diagnosis from icd_list of treatment with TreatmentRelevance: Dokumentativ', function() {
            before( 'when adding Treatment and adding diagnosis from icd-liste but an TreatmentRelevance: Dokumentativ', async function() {
                const suiteData = getFixtureData( '/data_for_13505_rule_diagnosis_selection_for_treatment.json' ),
                    [caseFolderId, ruleId, scheinId, activity13505Id, diagnosisD45TreatmentRelevanceDokumentativId] = getObjectIds();

                this.suiteData = suiteData;
                this.objectIds = {caseFolderId, ruleId, scheinId, activity13505Id, diagnosisD45TreatmentRelevanceDokumentativId};

                await cleanCollections();

                await postCaseFolder( mochaUtils.getCaseFolderData( {
                    _id: caseFolderId,
                    type: 'PUBLIC'
                } ) );
                await postRule( {
                    ...suiteData.rule,
                    _id: ruleId,
                    parent: Y.doccirrus.schemas.rule.getDirectoryIdByCatalogShort( 'EBM' )
                } );
                await postActivity( {
                    ...suiteData.schein,
                    _id: scheinId,
                    caseFolderId,
                    timestamp: startQuarter
                } );

                await postActivity( {
                    ...suiteData.treatment13505,
                    _id: activity13505Id,
                    caseFolderId,
                    timestamp: startToday
                } );

                await postActivity( {
                    ...suiteData.diagnosisD45TreatmentRelevanceDokumentativ,
                    _id: diagnosisD45TreatmentRelevanceDokumentativId,
                    caseFolderId,
                    timestamp: startToday
                } );

                await formatPromiseResult( waitForDelay( this, TIMEOUT_FOR_CACHE ) );
            } );
            it( 'then should throw a warning to add a diagnosis from lcd_liste', async function() {
                //this.retries( RETRIES_COUNT );
                this.period = getPeriodForRuleSet( this.suiteData.rule, startToday );

                await formatPromiseResult( waitForDelay( this ) );

                let [err, ruleLogs] = await formatPromiseResult( getEntry( 'rulelog', {} ) );
                should.not.exist( err );
                ruleLogs.should.be.an( 'array' ).which.has.lengthOf( 1 );

                const ruleLogsActual = filterWhitelisted( ruleLogs, [], ruleLogWhiteListed );

                let ruleLog = defineRuleLog( this.suiteData.rulelogExpected[0], {
                    caseFolderId: this.objectIds.caseFolderId,
                    ruleSetId: this.objectIds.ruleId
                } );

                ruleLog.message = formatPeriodRuleMessage( ruleLog.message, this.period.startDate, this.period.endDate );
                ruleLog.affectedActivities[0].id = this.objectIds.activity13505Id;
                ruleLog.affectedActivities[0].locationId = locationId;

                expect( ruleLogsActual[0] ).to.deep.equal( ruleLog );

            } );
            after( 'clean up the added identities', async function() {
                const entries = [];
                const caseFolderId = this.objectIds.caseFolderId;
                const ruleSetId = this.objectIds.ruleId;
                const scheinId = this.objectIds.scheinId;
                const treatmentId = this.objectIds.activity13505Id;
                const diagnosisId = this.objectIds.diagnosisD45TreatmentRelevanceDokumentativId;

                entries.push( {model: 'rulelog', query: {caseFolderId}} );
                entries.push( {model: 'rule', _id: ruleSetId} );
                entries.push( {model: 'activity', _id: scheinId} );
                entries.push( {model: 'activity', _id: treatmentId} );
                entries.push( {model: 'activity', _id: diagnosisId} );

                entries.push( {model: 'casefolder', _id: caseFolderId} );
                await removeEnties( entries );
            } );
        } );
    } );

} );
