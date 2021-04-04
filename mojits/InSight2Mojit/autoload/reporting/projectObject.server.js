/*global YUI */



YUI.add( 'ProjectObject', function( Y/*, NAME*/ ) {

    function ProjectObject() {
        this.q = {
            $project: {}
        };
    }

    ProjectObject.prototype.getQuery = function () {
        return this.q;
    };

    ProjectObject.prototype.setId = function (idField) {
        this.q.$project._id = idField;
    };

    ProjectObject.prototype.setCopyField = function (field) {
        this.q.$project[field] = 1;
    };

    ProjectObject.prototype.moveField = function(newFieldName, path) {
        this.q.$project[newFieldName] = path;
    };

    ProjectObject.prototype.setFilterFieldNotEqual = function (field, valueToRemove, nestedField) {
        var itemValueField = nestedField ? '$$item.' + nestedField : '$$item';

        this.q.$project[field] = {
            $filter: {
                input: '$' + field,
                as: 'item',
                cond: {
                    $ne: [itemValueField, valueToRemove]
                }
            }
        };
    };

    ProjectObject.prototype.setSliceArray = function(field, limit) {
        this.q.$project[field] = {
            $slice: ['$' + field, limit || 10]
        };
    };

    Y.namespace( 'doccirrus.insight2' ).ProjectObject = ProjectObject;

}, '0.0.1', {requires: [

]});