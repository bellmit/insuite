/*
 *  Copyright DocCirrus GmbH 2013
 *
 *  Used by CaseFile to map patient data and billable activities into forms mapped with Invoice_T
 *
 *  Note change after move to server - invoice used to be mapped on each load, is now mapped on creation and form
 *  state changed to FORM type document.  Partial remapping occurs when linked activities are changed, or on approval,
 *  at which point the activity is assigned an invoice number and date.
 *
 *  Note that QUOTATION type activities also use this mapper, they are similar to INVOICE activities, but will not be
 *  assigned an invoice number on approval.
 */

/*jslint anon:true, sloppy:true, nomen:true*/

/*jshint latedef:false */
/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-map-invoice',

    /* Module code */
    function( Y, NAME ) {
        'use strict';

        /**
         *  Factory for mapper objects
         *
         *  @param  template    {Object}    Form template
         *  @param  context     {Object}    Set of viewmodels providing values for invoice forms
         */

        Y.namespace( 'dcforms.mapper' ).invoice = function( template, context ) {

            //  PRIVATE MEMBERS

            var
                bindCollection = context.bindCollection,
                bindId = context.bindId,
                currentActivity = context.activity,
                currentPatient = context.patient,

                treatments = [],        //  cache of linked activities for table rows
                koSubscriptions = [],   //  holds KO subscriptions so they can be removed on unload [array]

                formDoc = null,

                lastState = '',

                _moment = Y.dcforms.mapper.objUtils.getMoment(),
                _k = Y.dcforms.mapper.koUtils.getKo(),
                fullMapOnce = Y.dcforms.isOnServer,
                codeComparator = Y.doccirrus.commonutils.getCodeComparator();

            if ( false === Y.dcforms.isOnServer) {
                //  subscribe to the set of linked activities
                koSubscriptions.push( currentActivity._activitiesObj.subscribe( onSelectionChanged ) );
                koSubscriptions.push( currentActivity._icdsObj.subscribe( onSelectionChanged ) );

                //  subscribe to state changes
                koSubscriptions.push( currentActivity.status.subscribe( onStateChanged ) );

                //  subscribe to user-driven changes in form values
                template.on( 'valueChanged', 'dcforms-map-invoice', onFormValueChanged );
                //  subscribe to changes in form mode
                template.on( 'modeSet', 'dcforms-map-invoice', onModeSet );
            }

            context.attachments.getOrCreateFormDocument(context, template, onFormDocumentLoaded);

            /**
             *  Called after searching activity for saved form state to be loaded
             *
             *  @param  err         {Object}    If failure of getOrCreateFormDocument
             *  @param  myDoc       {Object}    A document viewModel (client) or object (server)
             *  @param  needsRemap  {Boolean}   If true then bound fields on the form should be updated from activity
             */

            function onFormDocumentLoaded( err, myDoc, needsRemap ) {

                if( err ) {
                    //  form event with empty response prevents server zombie on error
                    Y.log( 'Could not load or create form document: ' + err, 'warn', NAME );
                    template.raise( 'mapcomplete', {} );
                    template.raise( 'mapperinitialized', {} );
                    return;
                }

                fullMapOnce = (true !== needsRemap);
                formDoc = myDoc;

                //alert( 'Loading saved data: ' + JSON.stringify(Y.doccirrus.api.document.formDocToDict(formDoc)));
                template.fromDict( Y.doccirrus.api.document.formDocToDict(formDoc), onLoadFromDict );

                function onLoadFromDict( err ) {
                    if ( err ) {
                        Y.log( 'Problem loading form from formDoc: ' + JSON.stringify( err ), 'warn', NAME );
                        return;
                    }

                    if (true === needsRemap || false === fullMapOnce) {
                        //alert('remapping / no form document was present on load');
                        Y.log('remapping / no form document was present on load', 'debug', NAME);
                        map( bindCollection, bindId, currentActivity, onFormMapped );
                    } else {
                        //Y.log('form document loaded, not remapping', 'debug', NAME);
                        //alert('form restored');
                        Y.log( 'Loading saved data...', 'warn', NAME );
                        fullMapOnce = true;
                        onFormRestored(null);
                    }
                }

                //  after mapping the form document should be updated

                function onFormMapped(err) {
                    if (err) {
                        //  form event with empty response prevents server zombie on error
                        Y.log( 'Could not map the form from current activity: ' + err, 'warn', NAME );
                        template.raise( 'mapcomplete', {} );
                        template.raise( 'mapperinitialized', {} );
                        return;
                    }

                    //alert('form mapped, saving form: ' + JSON.stringify(template.toDict()), 'debug', NAME);
                    context.attachments.updateFormDoc( context, template, onFormRestored );
                }

                //  called when form values restored from save or copied from activity

                function onFormRestored(err) {
                    if (err) {
                        //  form event with empty response prevents server zombie on error
                        Y.log( 'Could not load or create form document: ' + err, 'warn', NAME );
                        template.raise( 'mapcomplete', {} );
                        template.raise( 'mapperinitialized', {} );
                        return;
                    }

                    template.render( onTemplateRendered );
                }

                //  called when form is displayed (client) or ready for export to PDF (server)

                function onTemplateRendered() {

                    template.raise( 'formDocumentLoaded', formDoc );
                    template.raise( 'mapcomplete', unmap() );
                    template.raise( 'mapperinitialized', unmap() );
                }
            }

            //  PUBLIC METHODS

            /**
             *  Fill a form with the contents of this passed object
             *
             *  @param  objCollection   {String}    Type of object we are mapping in
             *  @param  objId           {String}    Database _id of mapped object
             *  @param  viewModel       {Object}    Plain javascript object matching Invoice_T.reduced.json
             *  @param  callback        {Function}  Of the form fn(err)
             */

            function map( objCollection, objId, viewModel, callback ) {
                callback = callback || function() {};

                Y.log( 'Mapping invoice into form: ' + objCollection + '::' + objId, 'debug', NAME );

                var
                //  will assume this was invoked from CaseFile, rather than reload this VIA rest
                    addr = currentPatient.getAddressByKind( 'OFFICIAL' ) ||        //  if available
                           currentPatient.getAddressByKind( 'POSTAL' ) ||         //  postal preferred
                           currentPatient.getAddressByKind( 'POSTBOX' ),

                    formData = {},               //  created from viewModel, matches Invoice_T, is mapped [object]

                //  from current patient
                    accounts;

                /**
                 *  Called when all sub-tasks and linked data has been loaded and mapped
                 */

                function onFormDataComplete() {
                    //Y.doccirrus.nav.activateElement( 'activityDetailMenu', 'prescriptionform' );

                    function onMapComplete( err ) {

                        if( err ) {
                            Y.log( 'Error mapping into form: ' + err, 'warn', NAME);
                            callback(err);
                            return;
                        }

                        /*
                        if( Y.config.debug ) {
                            Y.log('Mapped: ' + JSON.stringify(formData, undefined, 2), 'debug', NAME);
                        }
                        */

                        fullMapOnce = true;

                        //  parent binder and other listeners may need to know when object has
                        //  been loaded, raise event through template
                        //template.raiseBinderEvent( 'onMappedObjectLoaded', formData );
                        //template.raise('mapcomplete', formData);
                        //callback ? callback(null) : template.raise('mapcomplete', formData);
                        callback(null, formData);

                    }

                    //  map values into form
                    //Y.log('Mapping values into invoice: ' + JSON.stringify(formData, 'undefined', 2), 'debug', NAME);
                    template.map( formData, true, onMapComplete );
                }

                // invoice special fields
                formData.invoiceNo = '' + ( _k.unwrap( currentActivity.invoiceNo ) || '---' );
                formData.patientId = _k.unwrap( currentPatient.patientNo ) || '';
                    //  add patient address

                accounts = _k.unwrap( currentPatient.accounts );
                // add patient bank details
                if( Array.isArray( accounts ) && accounts[0] ) {
                    formData.bankName = _k.unwrap( accounts[0].bankName );
                    formData.trial = _k.unwrap( accounts[0].trial );
                    formData.bankIBAN = _k.unwrap( accounts[0].bankIBAN );
                    formData.bankBIC = _k.unwrap( accounts[0].bankBIC );
                    formData.accountOwner = _k.unwrap( accounts[0].accountOwner );
                }

                formData.diagnoses = '';

                //  adds address from patient object, insurance info
                Y.dcforms.mapper.objUtils.setup1(formData, currentActivity, currentPatient, addr, null, null, onSetup1Done );

                function onSetup3Complete( err ) {

                    if(err) {
                        Y.log('Error occured while mapping docletter into form: ' + err, 'warn', NAME );
                        return;
                    }

                    //  add personalienfeld
                    Y.dcforms.mapper.objUtils.setup2(formData, addr, null, null );

                    Y.dcforms.mapper.objUtils.setBarcodeData( formData );

                    formData.docBlock = Y.dcforms.mapper.objUtils.docBlock( formData );

                    formData = processLinkedActivities(formData, viewModel);
                    onFormDataComplete();
                }

                function onSetup1Done( err ) {
                    if( err ) {
                        Y.log( 'Could not do setup1', 'error', NAME );
                    }

                    // adds additional data: location info, employee info
                    Y.dcforms.mapper.objUtils.setup3(formData, currentActivity, currentPatient, onSetup3Complete);
                }

            }

            /**
             *  Generate mappings for set of linked activities (treatments, total, date range, etc)
             *
             *  Note: now also allowing diagnosis types, not used in table but to use in ICDs string
             *
             *  @param  formData    {Object}    Bound fields processed so far - fields will be added to this
             *  @param  viewModel   {Object}    Should be context.activity
             *  @return             {Object}    Expanded formData
             */

            function processLinkedActivities(formData, viewModel) {

                treatments = Y.dcforms.mapper.objUtils.getAllLinkedActivities( context.activity );

                var
                    validTreatments = [],           //  to update current selection if bad entries chosen [array]
                    tableRows = [],
                    vatList = {},
                    treatment,
                    vat = 0,
                    vatPerc,
                    vatType,
                    hasVat,

                    lastDate = '',
                    thisDate = '',
                    showDate = '',

                    price,
                    rows,
                    i;

                //  add items
                formData.diagnoses = '';
                formData.diagnosesText = '';
                for( i = 0; i < treatments.length; i++ ) {

                    treatment = treatments[i];

                    Y.log( 'Adding activity: ' + _k.unwrap( treatment.actType ), 'info', NAME );

                    if(
                        (treatment._id) &&
                        (treatment.actType) &&
                        (('TREATMENT' === _k.unwrap( treatment.actType )) || ('DIAGNOSIS' === _k.unwrap( treatment.actType )))
                    ) {

                        price = treatment.price ? _k.unwrap( treatment.price ) : 0.00;
                        price = +(parseFloat(price));

                        // vat is a vat code, we still need to calculate the amount
                        hasVat = _k.unwrap(treatment.hasVat);
                        vatType = hasVat ? ( treatment.vat ? _k.unwrap( treatment.vat ) : 0) : 0;
                        // keep track of the different subtotals by VAT type
                        if( vatList[vatType] ) {
                            vatList[vatType] = vatList[vatType] + price;
                        } else {
                            vatList[vatType] = price;
                        }
                        vatType = +vatType; // this is now the vatType code as a number
                        // get percent from code
                        vatPerc = Y.doccirrus.vat.getPercent( vatType ) + '%';

                        vat = _k.unwrap( treatment.vatAmount );

                        if( 'TREATMENT' === _k.unwrap( treatment.actType ) ) {

                            //  Must match InvoiceItem_T.reduced.json
                            tableRows.push( {
                                'activityId': treatment._id,
                                'item': _k.unwrap( treatment.content ),
                                'code': _k.unwrap( treatment.code ),
                                'unit': treatment.unit ? _k.unwrap( treatment.unit ) : 1,
                                'factor': treatment.billingFactorValue ? _k.unwrap( treatment.billingFactorValue ) : 1,
                                'costperitem': '',
                                'quantity': '1',
                                'cost': Y.doccirrus.comctl.numberToLocalCurrency( price, true ),
                                'vat': vat ? Y.doccirrus.comctl.numberToLocalCurrency( vat, true ) : '',
                                'vatPerc': vatPerc,
                                'timestamp': _k.unwrap( treatment.timestamp ),
                                'date': _moment.utc( _k.unwrap( treatment.timestamp ) ).local().format( 'DD.MM.YYYY' ),
                                'extraBSK': Y.doccirrus.comctl.numberToLocalCurrency( _k.unwrap(treatment.BSK), true ),
                                'extraASK': Y.doccirrus.comctl.numberToLocalCurrency( _k.unwrap(treatment.ASK), true ),
                                'extraAHB': Y.doccirrus.comctl.numberToLocalCurrency( _k.unwrap(treatment.AHB), true ),
                                'extraBHB': Y.doccirrus.comctl.numberToLocalCurrency( _k.unwrap(treatment.BHB), true ),
                                'explanations': _k.unwrap( treatment.explanations )
                            } );

                            validTreatments.push( treatment );
                        }

                        if( 'DIAGNOSIS' === _k.unwrap( treatment.actType ) ) {
                            //  used to build diagnosis field
                            //Y.log('Adding DIAGNOSIS: ' + JSON.stringify(treatment, undefined, 2), 'debug', NAME);

                            formData.diagnoses = formData.diagnoses + '**' +
                                                 _k.unwrap( treatment.code ) + '**: ' +
                                                 _k.unwrap( treatment.content ) + "\n";

                            formData.diagnosesText = formData.diagnosesText + _k.unwrap( treatment.content ) +
                                                     (_k.unwrap( treatment.explanations ) ?
                                                     ' B: ' + _k.unwrap( treatment.explanations ) :
                                                         '') +
                                                     "\n";
                            validTreatments.push( treatment );
                        }

                    } else {
                        Y.log( 'Invalid item(s) in treatments table: ' + _k.unwrap( treatment.actType ), 'warn', NAME );
                    }
                }

                Y.doccirrus.invoiceutils.calcInvoice( context.activity, formData, treatments );

                //  sort and group by date

                function compareTs(a, b) {
                    var
                        aTs = _moment(a.timestamp),
                        bTs = _moment(b.timestamp);

                    if (aTs.isAfter(bTs)) {
                        return 1;
                    }

                    if (bTs.isAfter(aTs)) {
                        return -1;
                    }

                    return 0;

                }

                function compareCode( a, b ) {
                    return codeComparator( a.code, b.code );
                }

                tableRows.sort( (Y.doccirrus.auth.isMVPRC() ? compareCode : compareTs) );
                lastDate = '';

                for (i = 0; i < tableRows.length; i++) {
                    thisDate = tableRows[i].date;

                    if (lastDate === thisDate) {
                        showDate = '';
                    } else {
                        showDate = thisDate;
                    }

                    if (0 === i) {
                        showDate = tableRows[0].date;
                    }

                    //console.log('thisdate: ' + thisDate + ' lastDate: ' + lastDate + ' showDate: ' + showDate);

                    tableRows[i].date = showDate;
                    lastDate = thisDate;
                }

                //console.log('tablerows: ', tableRows);

                Y.log( 'Built diagnosis string: ' + formData.diagnoses, 'debug', NAME );

                //  start over if set of linked activities needs to be corrected

                if( Y.config.debug ) {
                    Y.log( 'Mapping TREATMENT and DIAGNOSIS activities to ' + JSON.stringify( tableRows ), 'debug', NAME );
                }
                //Y.log( 'Number of rows, filtered: ' + mArray.length, 'debug', NAME );
                formData.items = tableRows;

                formData.currency = 'EUR';      //  placeholder. not yet used in form
                formData.beforetax = Y.doccirrus.comctl.numberToLocalCurrency( _k.unwrap( viewModel.total ) );
                formData.vat = Y.doccirrus.comctl.numberToLocalCurrency( _k.unwrap( viewModel.totalVat ) );
                formData.vatList = Y.dcforms.mapper.objUtils.getVatSummary( vatList );

                formData.totalDoc = Y.doccirrus.comctl.numberToLocalCurrency( _k.unwrap( viewModel.totalDoc ) );
                formData.total = Y.doccirrus.comctl.numberToLocalCurrency( _k.unwrap( viewModel.price ) );
                formData.totalASK = Y.doccirrus.comctl.numberToLocalCurrency( _k.unwrap( viewModel.totalASK ) );
                formData.totalBSK = Y.doccirrus.comctl.numberToLocalCurrency( _k.unwrap( viewModel.totalBSK ) );
                formData.totalAHB = Y.doccirrus.comctl.numberToLocalCurrency( _k.unwrap( viewModel.totalAHB ) );
                formData.totalBHB = Y.doccirrus.comctl.numberToLocalCurrency( _k.unwrap( viewModel.totalBHB ) );
                // Add date range for treatments

                rows = formData.items;

                if( 0 === rows.length ) {
                    formData.from = '';
                    formData.to = '';
                } else {
                    formData.from = -1;
                    formData.to = -1;

                    for( i = 0; i < rows.length; i++ ) {
                        formData.from = (-1 === formData.from) ? rows[i].timestamp : formData.from;
                        formData.to = (-1 === formData.to) ? rows[i].timestamp : formData.to;

                        formData.from = (rows[i].timestamp < formData.from) ? rows[i].timestamp : formData.from;
                        formData.to = (rows[i].timestamp > formData.to) ? rows[i].timestamp : formData.to;
                    }

                    formData.from = _moment.utc( formData.from ).local().format( 'DD.MM.YYYY' );
                    formData.to = _moment.utc( formData.to ).local().format( 'DD.MM.YYYY' );
                }

                //console.log('mapping valuues generated from linked activities:', formData);

                //  done, next map to form
                return formData;
            }

            /**
             *  Returns the current contents of a form as a plain javascript object
             *
             *  @returns    {Object}    Returned object will match Innvoice_T
             */

            function unmap() {
                return template.unmap();
            }

            //  EVENT HANDLING - update currentActivity in response to changes by user

            /**
             *  Template events are passed by the parent
             *
             *  (legacy form event pattern, deprecated)
             *
             *  @param  eventName   {String}
             *  @param  eventData   {Object}
             */

            function onTemplateEvent( eventName, eventData ) {

                //Y.log( 'invoice mapper received event: ' + eventName, 'debug', NAME );

                switch( eventName ) {

                    case 'onModeSet':
                        onModeSet( eventData );
                        break;

                    case 'onSchemaSet':
                        Y.log( 'Schema has been set.', 'debug', NAME );
                        break;

                    case 'onTableValueChanged':
                        onTableValueChanged( eventData );
                        break;

                    case 'beforeUnload':
                        onUnload( eventData );
                        break;

                    //  temp, testing
                    //case 'onPageSelected':                                                  //  fallthrough
                    //    break;

                    default:
                        //  noisy, used when debuggiong subforms
                        //Y.log( 'Unhandled template event: ' + eventName, 'warn', NAME );
                        break;
                }

            }

            /**
             *  Clear knockout dependencies for a clean close
             *  @/param formUID
             */

            function onUnload( /* formUID */ ) {

                if (Y.dcforms.isOnServer) {
                    return;
                }

                var i;
                for( i = 0; i < koSubscriptions.length; i++ ) {
                    koSubscriptions[i].dispose();
                }
                koSubscriptions = [];

                template.off( '*', 'dcforms-map-invoice' );
            }

            /**
             *  Raised in response to user changing the value of form elements
             */

            function onFormValueChanged( /* element */ ) {

                function onResetToStoredData() {
                    template.render( Y.dcforms.nullCallback );
                    Y.log( 'Form reset to state before edit.', 'debug', NAME );
                }

                function onUpdatedFormData() {
                    Y.log( 'Saved form state has been updated.', 'debug', NAME );
                }

                if( currentActivity._isEditable() ) {

                    context.attachments.updateFormDoc( context, template, onUpdatedFormData );

                } else  {

                    if (formDoc && formDoc.type) {
                        try {
                            template.fromDict( Y.doccirrus.api.document.formDocToDict(formDoc), onResetToStoredData );
                        } catch( parseErr ) {
                            Y.log( 'Could not parse saved form state.', 'warn', NAME );
                        }
                    }

                    return;
                }
            }

            /**
             *  Now redundant code to allow change in table.
             *  For now, it is not possible to change values in tables dynamically, this is planned to change soon.
             *
             *  @param detail
             */
            function onTableValueChanged( detail ) {

                var
                    row = detail.row,
                    col = detail.col,
                    value = detail.text,
                    element = detail.element,
                    ds = element.dataSet;

                if( 'object' !== typeof element.dataSet ) {
                    return;
                }

                Y.log( 'Changed - cellId: ' + detail.id + ' row: ' + row + ' col:' + col + ' value: ' + value, 'debug', NAME );

                if(
                    (ds[row].hasOwnProperty( 'costperitem' )) &&
                    (ds[row].hasOwnProperty( 'quantity' )) &&
                    (ds[row].hasOwnProperty( 'cost' )) &&
                    (!isNaN( ds[row].quantity )) &&
                    (!isNaN( ds[row].costperitem )) &&
                    (('costperitem' === col) || ('quantity' === col))
                    ) {
                    ds[row].cost = (parseFloat( ds[row].quantity ) * parseFloat( ds[row].costperitem ));
                    element.setTableCell(
                        row,
                        'cost',
                        Y.doccirrus.comctl.numberToLocalCurrency( ds[row].cost ) +
                        ''
                    );

                } else {
                    if( Y.config.debug ) {
                        Y.log( 'Not changed ' + JSON.stringify( ds[row] ), 'debug', NAME );
                    }
                }

                onRecalculateTotal( element );

            }

            /**
             *  Update the invoice total from the items table in response to user action
             *  @param tableElement
             */

            function onRecalculateTotal( tableElement ) {
                var
                    ds = tableElement.dataSet,
                    row,
                    total = 0;

                for( row = 0; row < ds.length; row++ ) {

                    if( ds[row].hasOwnProperty( 'cost' ) && !isNaN( ds[row].cost ) ) {
                        total = total + parseFloat( ds[row].cost );
                    }
                }

                //  DEPRECATED: we should get the total from the activity, which should set it from API call
                Y.log( 'Grand total: ' + total, 'debug', NAME );

                //total = total.toFixed(2);
                //currentActivity.content('EUR ' + total.toFixed( 2 ) + ' (' + ds.length + ')');
                template.map( { 'total': Y.doccirrus.comctl.numberToLocalCurrency( total ) }, true, onReMapComplete );

                function onReMapComplete( err ) {
                    if( err ) {
                        Y.log( 'Problem mapping invoice: ' + err, 'warn', NAME );
                        return;
                    }

                    template.raise( 'mapcomplete', {} );

                    //alert('form mapped after selection change, saving form: ' + JSON.stringify(template.toDict()), 'debug', NAME);
                    context.attachments.updateFormDoc( context, template, onTotalUpdated );
                }

                function onTotalUpdated(err) {
                    if (err) {
                        Y.log('Problem updating linked form document: ' + JSON.stringify(err), 'warn', NAME);
                    }
                }
            }

            /**
             *  Called by table via casefile_detail when the user selects or deselects items
             *
             *  Partially re-maps activity into form (treatments, diagnoses, date ranges, totals, etc)
             *
             *  @param  newSelection    {String}    Set of _ids of selected items
             */

            function onSelectionChanged( /* newSelection */ ) {

                function onMapLinkedActivities(err, mappedData) {
                    if (err) {
                        Y.log('Problem mapping linked activities: ' + JSON.stringify(err), 'warn', NAME);
                    }

                    formData = mappedData;

                    //alert('form mapped after selection change, saving form: ' + JSON.stringify(template.toDict()), 'debug', NAME);
                    context.attachments.updateFormDoc( context, template, onFormDocUpdated );

                }

                function onFormDocUpdated(err) {
                    if (err) {
                        Y.log('Problem updating form document: ' + JSON.stringify(err), 'warn', NAME);
                    }
                    template.raise('mapcomplete', formData);
                }

                //if( Y.config.debug ) {
                //    Y.log( 'Selection changed to: ' + JSON.stringify( newSelection, undefined, 2 ), 'debug', NAME );
                //}

                if (currentActivity.inTransition()) {
                    Y.log( 'Activity is in transition, not remapping form.', 'info', NAME );
                    return;
                }

                if( false === currentActivity._isEditable() ) {
                    Y.log( 'Invoice is not in an editable state, not remapping', 'warn', NAME );
                    return;
                }

                //  full mapping, selection was changed before form completely initialized
                var formData = {};
                map( bindCollection, bindId, currentActivity, onMapLinkedActivities );

            }

            /**
             *  Change form editable state according to activity status
             *  @param   newState    {String}    A member of ActStatus_E
             */

            function onStateChanged( newState ) {

                function onNewModeSet() {
                    Y.log( 'Form mode changed to: ' + template.mode, 'debug', NAME );
                }

                if (lastState === newState) {
                    //  skipping duplicate event
                    return;
                }

                lastState = newState + '';

                var editable = false;

                switch( newState ) {
                    case 'CREATED':
                        editable = true;
                        break;
                    case 'VALID':
                        editable = true;
                        break;

                    case 'APPROVED':
                        onInvoiceApproved();
                        break;

                }

                if( editable ) {
                    Y.log( 'set form editable for invoice state ' + newState, 'info', NAME );
                    template.setMode( 'fill', onNewModeSet );
                } else {
                    Y.log( 'set form uneditable for invoice state ' + newState, 'info', NAME );
                    template.setMode( 'locked', onNewModeSet );
                }
            }


            /**
             *  When a form is approved an invoice number will be generated on the server, we need to fetch and map it
             *
             *  Note that this should not upset the new state of the activity
             */

            function onInvoiceApproved() {

                Y.log('invoice approved, loading new invoice number...', 'debug', NAME);

                function onActivityReloaded(err, data) {
                    if (err || !data) {
                        Y.log('Could not load new invoice number of approved activity: ' + currentActivity._id, 'warn', NAME);
                        return;
                    }

                    data = data.data ? data.data : data;

                    Y.log('New invoice number: ' + data[0].invoiceNo, 'debug', NAME);

                    //  this may be a quotation, which would not have an invoice number

                    mapData = {
                        'invoiceNo': (data[0].invoiceNo || ''),
                        'date': _moment( data[0].timestamp ).format( 'DD.MM.YY' )
                    };

                    //  update the loaded form, do not rerender yet, doing so uses settimeout which breaks event order
                    template.map(mapData, false, onMapInvoiceNo );
                }

                function onMapInvoiceNo(err) {
                    if (err) {
                        Y.log('Could not map invoice number: ' + JSON.stringify(err), 'warn', NAME);
                    }

                    context.attachments.updateFormDoc( context, template, onFormDocUpdated );
                }

                function onFormDocUpdated(err) {
                    if (err) {
                        Y.log('Could not update form document: ' + currentActivity._id, 'warn', NAME);
                        return;
                    }

                    template.render(onReRender);
                }

                function onReRender() {
                    template.raise('mapcomplete', template.toDict());
                }

                var mapData;
                Y.doccirrus.comctl.privateGet('1/activity/' + _k.unwrap( currentActivity._id ), {}, onActivityReloaded);
            }
            /**
             *  Prevent changes caused by PDF rendering or other mode changes from being saved
             *
             *  Note that this view should only see 'fill', 'pdf' and 'locked' modes, and require no action at present
             *
             *  @param  mode    {String}    Name of a template mode
             */

            function onModeSet( mode ) {
                if ('shutdown' === mode) {
                    onUnload();
                }
            }

            //  RETURN MAPPER INTERFACE / API

            return {
                'map': map,
                'unmap': unmap,
                'destroy': onUnload,
                'handleEvent': onTemplateEvent      // legacy, deprecated
            };

        };
    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: ['dc-comctl', 'dcformmap-util', 'dcformmap-ko-util', 'document-api', 'dcinvoiceutils', 'dccommonutils']
    }
);