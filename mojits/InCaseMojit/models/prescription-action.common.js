/*global YUI */

YUI.add( 'prescription-action', function( Y ) {

    function PrescriptionAction( countries ) {
        this.countries = countries;
    }

    /**
     * Checks whether this action is enabled or not for the given context
     *
     * @param {object} caseFolder
     * @param {object[]} activities
     * @returns {boolean}
     */
    PrescriptionAction.prototype.isEnabled = function( caseFolder, activities ) {
        const common = caseFolder.type &&
            caseFolder.type !== 'PREPARED' &&
            activities.every( function( activity ) {
                return activity.status === 'VALID' &&
                    ( activity.linkedAct || [] ).every( function( linked ) {
                        return linked.status !== 'LOCKED';
                    } );
            } );

        if ( this.countries.includes( 'CH' ) ) {
            return common && ( activities.every( function( activity ) {
                return activity.actType === 'MEDICATION';
            } ) || activities.length === 1 && activities[0].actType === 'MEDICATIONPLAN' );
        }

        return common && activities.every( function( activity ) {
            return activity.actType === 'MEDICATION';
        } );
    };

    /**
     * Check whether this action is available or not for the given context
     *
     * @param {object} caseFolder
     * @param {object} caseFolderSchema
     * @returns {boolean}
     */
    PrescriptionAction.prototype.isAvailable = function( caseFolder, caseFolderSchema ) {
        return !caseFolder || !caseFolderSchema.isEDOC( caseFolder );
    };

    Y.namespace( 'doccirrus.incase.actions' ).prescription = PrescriptionAction;
} );