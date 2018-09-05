var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var redis = require('redis');

client = redis.createClient();

// Redis Client Ready
client.once('ready', function () {
  // Flush Redis DB
  // client.flushdb();
});

var port = process.env.PORT || 8080;

// Start the Server
http.listen(port, function () {
  console.log('Server Started. Listening on *:' + port);
});

// Express Middleware
app.use(express.static('public'));
app.use(bodyParser.urlencoded({
  extended: true
}));

// Render Main HTML file
app.get('/', function (req, res) {
  res.sendFile('views/index.html', {
    root: __dirname
  });
});

// Socket Connection
// UI Stuff
io.on('connection', function (socket) {

});

var Gpio = require('onoff').Gpio;
var blinkLED = new Gpio(12, 'out'); // Corresponds to Pin #32
var onLED = new Gpio(5, 'out');
//These are only imported if it's this is not a module
var config;
var udpClient;
var fs = require('fs');
const exec = require('child_process').exec;


var handlePSM = (psm) => {
  if (decodePSM(psm) == 0) {
    blink();
    sendPSM(psm);
  }
}
var sendPSM = (psm) => {
  if (udpClient) {
    udpClient.send(psm, config.socket.port, config.socket.host, (err) => { });
  }
}

var decodePSM = (psm) => {
  if (fs.existsSync('isMsgFrame')) {
    if (!decodePSM.count) decodePSM.count = 0;
    decodePSM.count++;
    var verbose = false;
    if (decodePSM.count % 10 == 0) {
      verbose = true;
      console.log("count: ", decodePSM.count);
    }
    //we have psm message frame checker
    try {
      exec(`./isMsgFrame ${psm.toString('hex')} ${verbose ? '-d' : ''}`,
        function (error, stdout, stderr) {
          parseMessage(stdout);
        });
    } catch (err) {
      return 1
    }
    return 0;
  } else {
    console.log("isMsgFrame doesn't exist, can't check PSM validity");
    console.log(`got: ${psm.toString('hex')}`);
    return 0;
  }

}

var parseMessage = (message) => {
  var psm = {
    value: {
      position: {},
      accuracy: {}
    }
  };
  psm.messageId = message.match(/messageId: (\d+)/)[1];
  psm.value.basicType = message.match(/basicType: (\d+)/)[1];
  psm.value.secMark = message.match(/secMark: (\d+)/)[1];
  psm.value.msgCnt = message.match(/msgCnt: (\d+)/)[1];
  psm.value.id = message.match(/messageId: (\d+)/)[1];
  psm.value.position.lat = message.match(/lat: (\d+)/)[1];
  psm.value.position.long = message.match(/long: (\d+)/)[1];
  psm.value.accuracy.semiMajor = message.match(/semiMajor: (\d+)/)[1];
  psm.value.accuracy.semiMinor = message.match(/semiMinor: (\d+)/)[1];
  psm.value.accuracy.orientation = message.match(/orientation: (\d+)/)[1];
  psm.value.speed = message.match(/speed: (\d+)/)[1];
  psm.value.heading = message.match(/heading: (\d+)/)[1];

  var blink = () => {
    //using functions as objects is a workaround for using static variables
    // blink.blinkEndInterval;

    blinkLED.writeSync(1)
    clearTimeout(blink.blinkEndInterval);
    blink.blinkEndInterval = setTimeout(function () {
      blinkLED.writeSync(0);
    }, config.BLINK_LENGTH);
  }

  var setupStdinCallback = () => {
    process.stdin.on('readable', function () {
      process.stdin.read();
      console.log("stdin read line");

      var psm_frame = Buffer.from([0x00, 0x20, 0x1a, 0x00, 0x00, 0x04, 0x00, 0x02, 0x08, 0x10, 0x08, 0x10, 0x08, 0x4e, 0xf7, 0xf7, 0x91, 0x39, 0xba, 0x86, 0x22, 0xff, 0xff, 0xff, 0xff, 0x03, 0x20, 0x10, 0xe0]);
      var psm_no_frame = Buffer.from([0x00, 0x00, 0x04, 0x00, 0x14, 0x15, 0x09, 0x09, 0x09, 0x08, 0x4E, 0xF7, 0xF7, 0x91, 0x39, 0xBA, 0x86, 0x22, 0xFF, 0xFF, 0xFF, 0xFF, 0x00, 0x50, 0x10, 0xE0]);

      //blink();
      handlePSM(psm_frame);
    });

  }
  var setupSerialPort = () => {
    var SerialPort = require('serialport')
    var Readline = require('@serialport/parser-readline')
    var serialPort = new SerialPort('/dev/ttyACM0', {
      baudRate: 115200
    });

    const parser = serialPort.pipe(new Readline({ delimiter: '\r\n' }))

    var measureTiming = [];
    var timingLen = 100;
    var timingCur = 0;

    //parser.on('ready', () => console.log('the ready byte sequence has been received'))
    parser.on('data', (data) => {
      if (data.substring(0, 3) == 'psm') {
        dataArr = data.split(' ');
        var len = parseInt(dataArr[1], 16);
        if (dataArr.length != len + 2) {
          console.log('wrong length array, bad data');
          return;
        }
        var readData = new Uint8Array(len);
        //console.log('len:', len);
        for (var i = 2; i < len + 2; ++i) {
          //console.log(dataArr[i]);
          readData[i - 2] = parseInt(dataArr[i], 16);
        }
        var buf = Buffer.from(readData);

        handlePSM(buf);
      } else {
        //some other data?
        console.log('dat:', data);
      }
    });
  }

  var setup = () => {
    onLED.writeSync(1);
    console.log("Features enabled:");

    if (config.enabled.socket) {
      udpClient = require('dgram').createSocket('udp4');
      console.log("    socket reporting enabled");
    }

    if (config.enabled.serial) {
      console.log("    serial detection enabled, normal operation");
      setupSerialPort();
    }

    if (config.enabled.stdin) {
      console.log("    stdin detection enabled, press enter to simulate detection");
      setupStdinCallback();
    }

    //Blink LED on start
    console.log("init led on");
    blinkLED.writeSync(1);
    setTimeout(function () {
      blinkLED.writeSync(0);
      console.log("init led off");
    }, 500);
  };

  module.exports = {
    setup: setup,
    //blink: blink,
  };

  //On ctrl c, cleanup a bit better than just exiting
  process.on('SIGINT', function () {
    blinkLED.unexport();
    onLED.unexport();
    process.exit();
  });


  //EXECUTION STARTS HERE
  if (require.main === module) {
    try {
      config = require('./config.json');
      setup();
    } catch (e) {
      //json parse failed
      console.log("parse json failed");
      console.log(e);
      setInterval(function () {
        blinkLED.writeSync(blinkLED.readSync() === 0 ? 1 : 0)
      }, 100);
    }
  } else {
    //called as module
  }
}