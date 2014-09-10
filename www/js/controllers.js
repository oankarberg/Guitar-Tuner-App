angular.module('starter.controllers', [])

.controller('DashCtrl', function($scope, $window) {

  //Copyright Tom Hoddes 2014 http://freetuner.co 
  var numTicks = 10;
  var dialDegrees = 45;
  window.addEventListener('load', function(){
    var $tunerViewContainer = $("#tunerView");
    for (var i = 1; i <= numTicks; i++) {
      var $div = $("<div>", {id: "tick_"+i});
      $tunerViewContainer.append($div);
      var $div = $("<div>", {id: "tick_"+(-1)*i});
      $tunerViewContainer.append($div);
    };
  }); 

  var timerInterval;

  function play()
  {
    var div = document.getElementById("playPause");
    div.className = "pause";
    console.log('Play', div.className)
    startAudio();
    startClock();
    $scope.playing = true;
  }


  function pause()
  {
    var div = document.getElementById("playPause");
    div.className = "play";
    stopAudio();
    $scope.playing = false;
    var message = $("#message");
    message.text("Paused: Click Play to continue");
    clearInterval(timerInterval);
  }
  $scope.playPause = function ()
  {
    
    var el = document.getElementById("playPause");
    console.log('Play', el.$attrs)
    if($scope.playing == true)
    {
      pause();
    }
    else
    {
      play();
    }
  }

  function startClock()
  {
    var timeoutLengthSeconds = 5*60;
    var start = new Date;
    updateClock(timeoutLengthSeconds);
      timerInterval = setInterval(function() {
          var secondsPassed = (new Date - start)/1000;
          if(secondsPassed < timeoutLengthSeconds)
          {
            updateClock(timeoutLengthSeconds-secondsPassed);
          }
          else
          {
            pause();
          }
      }, 1000);
  }

  function updateClock(timeoutLengthSeconds)
  {
    function formatNumberLength(num, length) {
        var r = "" + num;
        while (r.length < length) {
            r = "0" + r;
        }
        return r;
    }
    var minutes = Math.floor(timeoutLengthSeconds / 60);
    var seconds = Math.floor(timeoutLengthSeconds%60);
    var clock = $("#message").text("Timeout: "+formatNumberLength(minutes,2)+":"+formatNumberLength(seconds,2));
  }

  function updateTuner(noteIndex, noteError) 
  {
    //TODO: Assert params
    if(!(noteIndex && noteError) || !(noteIndex > 0 && noteIndex <12) || !(noteError > -50 && noteError < 50))
      return;

    var sharpHtml = '<sup class="sharp">#</sup>';
    var notes = ['C','C'+sharpHtml,'D','D'+sharpHtml,'E','F','F'+sharpHtml,'G','G'+sharpHtml,'A','A'+sharpHtml,'B'];
    var needle = document.getElementById("needle2");

    var degrees = noteError*2.0*dialDegrees;
    needle.style.webkitTransform = 'rotate('+degrees+'deg)';
    needle.style.MozTransform = 'rotate('+degrees+'deg)';

    var noteView = document.getElementById("noteView");
    noteView.innerHTML = notes[noteIndex];

    var body = document.getElementsByTagName("body")[0];

    if (Math.abs(noteError) < 0.05)
    {
      var tip = document.getElementById("tip");
      var tick = document.getElementById("tick_0");
      tip.className = "tipHighlighted";
      tick.style.backgroundColor = '#ffffff';
    }
    else
    {
      var tip = document.getElementById("tip");
      var tick = document.getElementById("tick_0");
      tip.className = "tipNormal";
      tick.style.backgroundColor = '';
    }
    
  }
    //Copyright Tom Hoddes 2014 http://freetuner.co 
  var audioContext = new AudioContext();
  var inputStreamNode = null,
      gainNode = null;

  function getMaxPeak(inputVector,numFreq)
  {
      numFreq = typeof numFreq !== 'undefined' ? numFreq : 2000;
      var peaks = [];
      var peakMax = 0;
      var peakMaxInd = 0;
      var size = inputVector.length * 2;

      for(var i=7;i<numFreq;i++)
      {
          var amplitude = inputVector[i];
          if(amplitude>peakMax)
          {
              peakMax=amplitude;
              peakMaxInd=i;
          }
      }
      return {"peakInd":peakMaxInd,"peakAmp":peakMax};
  }

  var scriptProcessorNode;
  var audioWindowSize = 65536;
  var audioWindow = new Float32Array(audioWindowSize);
  var audioWindowProcessed = new Float32Array(audioWindowSize);
  var hammingWindowFilter = new Float32Array(audioWindowSize);
  var sampleRate;
  for (var i = 0; i < hammingWindowFilter.length; i++) {
      hammingWindowFilter[i] = 0.54 - 0.46 * Math.cos(2*Math.PI * i/(hammingWindowFilter.length-1));
  };
  var fft;

  function applyHamming(inputVector, outputVector)
  {
      for (var i = 0; i < inputVector.length; i++) {
          outputVector[i] = inputVector[i] * hammingWindowFilter[i];
      };
  }

  function log2(val) 
  {
    return Math.log(val) / Math.LN2;
  }

  function getNoteInfo(frequency)
  {
      var note = (Math.round(57+log2( frequency/440.0 )*12 ))%12;
      var noteFull = Math.round(log2( frequency/440.0 )*12);
      var noteFreq = Math.pow(2,noteFull/12.0)*440.0;
      var errorMin = frequency - noteFreq;
      var noteOther = (errorMin > 0) ? noteFull+1 : noteFull-1;
      var freqOther = Math.pow(2,noteOther/12.0)*440.0;
      var cent = errorMin / Math.abs(noteFreq - freqOther);
      
      var noteInfo = {
          "noteIndex": note,
          "noteError": cent,
          "noteFreq": frequency
      };

      return noteInfo;
  }

  function gotStream(stream) {
      var bufferSize = 2048;
      gainNode = audioContext.createGain();
      gainNode.gain.value = 1000.0;

      inputStreamNode = audioContext.createMediaStreamSource(stream);
      inputStreamNode.connect(gainNode);

      //TODO: use deprecated function in other versions?
      scriptProcessorNode = audioContext.createScriptProcessor(bufferSize, 1, 1);
      console.log('script ', scriptProcessorNode);
      sampleRate = audioContext.sampleRate;
      fft = new FFT(audioWindowSize, sampleRate);

      gainNode.connect (scriptProcessorNode);

      zeroGain = audioContext.createGain();
      zeroGain.gain.value = 0.0;
      scriptProcessorNode.connect( zeroGain );
      zeroGain.connect( audioContext.destination );

      play();
  }

  function stopAudio()
  {
      scriptProcessorNode.onaudioprocess = null;
  }

  function startAudio()
  {
      scriptProcessorNode.onaudioprocess = function(e){
          var timeVector = e.inputBuffer.getChannelData(0);
          audioWindow.set(audioWindow.subarray(timeVector.length));
          audioWindow.set(timeVector,audioWindowSize - timeVector.length);
          applyHamming(audioWindow,audioWindowProcessed);
          fft.forward(audioWindowProcessed);

          var spectrum = fft.spectrum;
          var peakInfo = getMaxPeak(spectrum);
          if (peakInfo["peakAmp"] > 0.5)
          {
              var frequency = peakInfo["peakInd"]*sampleRate/audioWindowSize;
              var noteInfo = getNoteInfo(frequency);
              updateTuner(noteInfo["noteIndex"],noteInfo["noteError"]);
          }

      }
  }

  function browserNotSupported()
  {
      alert("Sorry. Your browser is not supported. Please use latest versions of either Chrome or Firefox.")
  }

  $scope.initAudio = function () {
      console.log('initAudio')
      if (!navigator.getUserMedia)
      {
          navigator.getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
      }

      if (!navigator.getUserMedia)
      {
          browserNotSupported();
      }


      navigator.getUserMedia({audio:true}, gotStream, function(e) {
              alert('Error getting audio');
              console.log(e);
          });
  }

  $scope.$on('$viewContentLoaded', function(){
      $scope.initAudio();
  }) ;

})

.controller('FriendsCtrl', function($scope, Friends) {
  $scope.friends = Friends.all();
})

.controller('FriendDetailCtrl', function($scope, $stateParams, Friends) {
  $scope.friend = Friends.get($stateParams.friendId);
})

.controller('AccountCtrl', function($scope) {


});
