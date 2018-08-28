$(function () {

    // test
    var socket = io();

    /**  
        Parse CSV file and create table HTML
    */
    var fileInput = document.getElementById("csv")

    readFile = function () {
        var reader = new FileReader();
        reader.onload = function () {
            var arr = reader.result.split('\n');     

            var dataObj = [];
            var headers = arr[0].split(',');
            $.each(headers, function( index, value ) {
                headers[index] = value.trim();              
            });

            for(var i = 1; i < arr.length; i++) {
                var data = arr[i].split(',');
                var obj = {};
                for(var j = 0; j < data.length; j++) {
                    obj[headers[j].trim()] = data[j].trim();
                }
                dataObj.push(obj);
            }

            // create HTML for psm table
            var table = '';

            for (var index = 0; index < headers.length; index++) {
                if (index === 0){
                    table += '<thead>';
                }
                table += '<th>';
                table += headers[index];
                table += '</th>';
                if (index === headers.length - 1){
                    table += '</thead>';
                }
            }

            $.each(dataObj[index], function( index, value ) {
                table += '<td>';
                table += value;
                table += '</td>';               
            });

            for (var index = 0; index < dataObj.length; index++) {
                
                table += '<tr>';

                $.each(dataObj[index], function( index, value ) {
                    table += '<td>';
                    table += value;
                    table += '</td>';               
                });
 
                table += '</tr>';
            }

            document.getElementById('psm-data').innerHTML = table;

            // add markers to map
            $.each(dataObj, function( index, psm ) {
                addMarker(psm);
            });

            // interval
            // var testIndex = 0;
            // const intervalObj = setInterval(() => {
            //     if (dataObj.length > testIndex) {
            //         addMarker(dataObj[testIndex]);
            //         testIndex++;
            //     } else {
            //         clearInterval(intervalObj);
            //     }
            // }, 1500);
        };
        // start reading the file. When it is done, calls the onload event defined above.
        reader.readAsBinaryString(fileInput.files[0]);
    };

    // listen for csv file to be selected
    fileInput.addEventListener('change', readFile);
    
    /**  
        Create all leaflet stuff and add all markers to map (need to integrate with redis)
    */

    var map = L.map('map').setView([42.4873617, -83.1474653], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    addMarker = function (mapData) {
        var psm = mapData;
        //$.each(mapData, function( index, psm ) {
        if (psm.latitude >= -90 && psm.latitude <= 90 && psm.longitude >= -180 && psm.longitude <= 180) {
            if (psm.compass > 0) {
                psm.myIcon = L.icon({
                    iconUrl: 'green.png',
                    iconSize: [15, 15],
                });
            } else {
                psm.myIcon = L.icon({
                    iconUrl: 'blue.png',
                    iconSize: [15, 15],
                });
            }
            L.marker([psm.latitude, psm.longitude], {
                rotationAngle: psm.bearing,
                icon: psm.myIcon
            }).addTo(map);
        }
        //});
    };

    $('#clear').click(function () {
        map.eachLayer(function(layer){
            map.removeLayer(layer);
        });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
        $('#csv').val('');
        document.getElementById('psm-data').innerHTML = '';
    });
});
