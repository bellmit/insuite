/*
 *  A first draft of a state machine to hold business logic for the invoice process flow.
 *
 *  REMOVEME: this is no longer used and will shortly be removed from git - state machine is defined in models
 *  directory on the server
 *
 *  Invoices are an activity type whose state may be one of:
 *
 *      CREATED
 *      DELETED
 *      CANCELLED
 *      APPROVED
 *      TRANSFERED (sp?)
 *      BILLED
 *      BILLINGREJECTED
 *      PAID (sp?)
 *      EDITING
 *      ARCHIVED
 *      CHECKED
 *
 *  The transitions between these possible states are
 *
 *         O
 *         |
 *         |
 *      CREATED ---> (is deleted)
 *         |
 *         | * approve() [click 'ok' on composition form]
 *         |
 *      APPROVED <---------- * approve() ---------- EDITING <-----------\
 *         |                                                            |
 *         |------------------------->\                                 |
 *         |                          |                                 |
 *         | * rulesCheck()           |                                 |
 *         |                          |                                 |
 *      CHECKED ---------------- * cancel() ------> CANCELLED            | * revise()
 *         |                                           |                |
 *         | * transfer()                              | * cancel()     |
 *         |                                           |                |
 *      TRANSFERED -------- * rejectBill() ------> BILLINGREJECTED -----/
 *         |
 *         | * acceptBill()
 *         |
 *      BILLED
 *         |
 *         | *pay() [indicates payment received]
 *         |
 *       PAID ---> (is eventually archived)
 *
 *  Reference UML diagram set of early January 2014
 *
 *  @author: strix
 *  @date: 2014/01/08
 */

/*jslint anon:true, nomen:true*/
/*global YUI */

'use strict';

YUI.add( 'dcinvoicemodel', function( Y, NAME ) {

        /**
         *  Constructor for invoice model state machines
         *
         *  @param  initialState    {String}    Name of initial state
         *  @param  activity        {Object}    Activity view model for an invoice
         *  @returns                {Object}    API to state machine
         *  @constructor
         */

        function InvoiceState( activity ) {

            //  private members
            /*
            var
                states = [
                    'CREATED',
                    'DELETED',
                    'CANCELLED',
                    'APPROVED',
                    'TRANSFERED',
                    'BILLED',
                    'BILLINGREJECTED',
                    'PAID',
                    'EDITING',
                    'ARCHIVED',
                    'CHECKED'
                ]; */

            //  PRIVATE METHODS

            //  Save the activity / current state of the invoice

            function persistInvoice() {
                Y.log('Saving state changes to activity and linked items.', 'info', NAME);
                activity._save();
            }

            /**
             *  Create a new Invoice activity
             *
             *  @param  activityTable   {Object}    Data table of activities for which we are creating an invoice
             *  @method create
             */

            function create(activityTable) {
                var
                    i,
                    currentRow,
                    selectedActivities = [];

                for (i = 0; i < activityTable.length; i++) {
                    currentRow = activityTable._arrayModel.data()[i];
                    if (true === currentRow._selected()) {
                        selectedActivities.push(currentRow._id);
                    }
                }

                activity.activities(selectedActivities.join(','));
                activity.status('CREATED');
                persistInvoice();
            }

            //  TRANSITIONS / PUBLIC METHODS

            /**
             *  Corresponds to clicking 'OK' on the form for editing an invoice
             *  @method approve
             */

            function approve() {
                if (('CREATED' !== activity.status()) && ('EDITING' !== activity.status())) {
                    if( Y.config.debug ) {
                        Y.log('Invalid state to approve invoice: ' + activity.status(), 'warn', NAME);
                    }
                    return;
                }

                activity.status('APPROVED');
                persistInvoice();
            }

            /**
             *  Discard an unpaid invoice
             *  @method cancel
             */

            function cancel() {

                if (
                    ('APPROVED' !== activity.status()) &&
                    ('CHECKED' !== activity.status()) &&
                    ('BILLINGREJECTED' !== activity.status())
                ) {
                    if( Y.config.debug ) {
                        Y.log('Invalid state to cancel invoice: ' + activity.status(), 'warn', NAME);
                    }
                    return;
                }

                //TODO: return all invoiced activities to unclaimed state

                activity.status('CANCELLED');
                persistInvoice();
            }

            /**
             *  Check invoice created by user against
             *  @method rulesCheck
             */

            function rulesCheck() {
                if ('APPROVED' !== activity.status()) {
                    if( Y.config.debug ) {
                        Y.log('Invalid state to check rules for invoice: ' + activity.status(), 'warn', NAME);
                    }
                    return;
                }

                //  TODO: implement rules here - policy, sanity, insurance, etc

                activity.status('CHECKED');
                persistInvoice();
            }

            /**
             *  Step unclear from UML diagram [CHECKME] - may involve checking bill with client before logding?
             *  @method transfer
             */

            function transfer() {

                if ('APPROVED' !== activity.status()) {
                    if( Y.config.debug ) {
                        Y.log('Invalid state to transfer invoice: ' + activity.status(), 'warn', NAME);
                    }
                    return;
                }



                activity.status('TRANSFERED');
                persistInvoice();
            }

            /**
             *  Invoice contested by client or insurance company?
             *  @method rejectBill
             */

            function rejectBill() {

                if ('TRANSFERED' !== activity.status()) {
                    if( Y.config.debug ) {
                        Y.log('Invalid state to reject invoice: ' + activity.status(), 'warn', NAME);
                    }
                    return;
                }

                activity.status('BILLINGREJECTED');
                persistInvoice();
            }

            /**
             *  Invoice accepted by client or insurance company?
             *  @method rejectBill
             */

            function acceptBill() {

                if ('TRANSFERED' !== activity.status()) {
                    if( Y.config.debug ) {
                        Y.log('Invalid state to accept invoice: ' + activity.status(), 'warn', NAME);
                    }
                    return;
                }

                activity.status('BILLED');
                persistInvoice();
            }

            /**
             *  Edit an invoice which was rejected
             *  @method approve
             */

            function revise() {
                if ('BILLINGREJECTED' !== activity.status()) {
                    if( Y.config.debug ) {
                        Y.log('Invalid state to revise invoice: ' + activity.status(), 'warn', NAME);
                    }
                    return;
                }

                activity.status('EDITING');
                persistInvoice();
            }

            /**
             *  Expect this may be extended to work with online payment gateway
             *  @method pay
             */

            function pay() {
                if ('BILLED' !== activity.status()) {
                    if( Y.config.debug ) {
                        Y.log('Invalid state to pay invoice: ' + activity.status(), 'warn', NAME);
                    }
                    return;
                }

                //TODO: mark status in all linked activitiies

                activity.status('PAID');
                persistInvoice();
            }

            /**
             *  Archive a paid invoice
             *  @method archive
             */

            function archive() {
                if ('PAID' !== activity.status()) {
                    if( Y.config.debug ) {
                        Y.log('Invalid state to archive invoice: ' + activity.status(), 'warn', NAME);
                    }
                    //return;
                }

                //  TODO: server-side / REST action to move this to an archive collcection?

                //  state remains 'PAID'
            }

            //  return API to this state machine

            return {
                'create': create,
                'approve': approve,
                'rulesCheck': rulesCheck,
                'cancel': cancel ,
                'transfer': transfer,
                'acceptBill': acceptBill,
                'rejectBill': rejectBill,
                'revise': revise,
                'pay': pay,
                'archive': archive
            };
        }

        Y.namespace( 'doccirrus.uam' ).InvoiceState = InvoiceState;
    },
    '0.0.1', {requires: [ 'dcviewmodel', 'dcsubviewmodel' ] }
);