'use strict';
var
    media =
        {
            "_id": "5a956cc193cc3638317d142f",
            "ownerCollection": "activity",
            "ownerId": "5a956c6793cc3638317d1429",
            "label": "user",
            "mime": "IMAGE_PNG",
            "name": "screenshot-2.png",
            "descr": "Read from disk on Tue Feb 27 2018 15:35:45 GMT+0100 (CET)",
            "widthPx": 630,
            "heightPx": 906,
            "origFilename": "/Users/rrrw/Projects/doccirrus/dc-insuite/var/tmp/imagetemp/32784711818fd974b4d16091e0441a8b.png",
            "source":"data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/4ge4SUNDX1BST0ZJTEUAAQEAAAeoYXBwbAIgAABtbnRyUkdCIFhZWiAH2QACABkACwAaAAthY3NwQVBQTAAAAABhcHBsAAAAAAAAAAAAAA==",
            "docType": "OTHER"
        },
    putParams = {
        data: media
    };

module.exports = {
    getData: function() {
        var
            data = JSON.parse( JSON.stringify( media ) );

        return data;
    },
    putParams: putParams
};

