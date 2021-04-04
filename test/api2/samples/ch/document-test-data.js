
var
    document = {
        "type" : "FORMPDF",
        "contentType" : "application/pdf",
        "publisher" : "Doc-Cirrus Kundendienst",
        "activityId" : "5694b56e278e534b27c52d24",
        "printerName" : "",
        //"locationId" : "000000000000000000000001",
        "locationId" : "54eb41b878382da863181d3b",
        "mediaId" : "5694b579278e534b27c52d39",
        "attachedTo" : "5633384650a73bf00499933f",
        "formState" : {
            "neverSaved" : true
        },
        "createdOn" : "2016-01-12T08:12:41.606Z",
        "caption" : "R. Nr. 00002 Privatrechnung",
        "isEditable" : false,
        "url" : "/r/media/downloadpdf?action=downloadpdf&id=5694b579278e534b27c52d39",
        "accessBy" : [],
        "tags" : [],
        "usesMedia" : []
    },
    putParams = {
        data: document
    };

module.exports = {
    getData: function() {
        return document;
    },
    putParams: putParams
};

