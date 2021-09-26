const { desktopCapturer, ipcRenderer } = require('electron');

const { writeFile } = require('fs');

document.addEventListener('DOMContentLoaded', readyfn, false);
var videoElement;
function readyfn() {
    videoElement = document.querySelector('video');

    // Buttons
    
    const startBtn = document.getElementById('startBtn');
    startBtn.onclick = e => {
        mediaRecorder.start();
        startBtn.classList.add('is-danger');
        startBtn.innerText = 'Recording';
    };

    const stopBtn = document.getElementById('stopBtn');

    stopBtn.onclick = e => {
        mediaRecorder.stop();
        startBtn.classList.remove('is-danger');
        startBtn.innerText = 'Start';
      };
      
      const videoSelectBtn = document.getElementById('videoSelectBtn');
      videoSelectBtn.onclick = getVideoSources;
      
}

// Global state
let mediaRecorder; // MediaRecorder instance to capture footage
const recordedChunks = [];

// Get the available video sources
async function getVideoSources() {
  const inputSources = await desktopCapturer.getSources({
    types: ['window', 'screen']
  });

  const sources = inputSources.map(source => ({'name': source.name, 'id': source.id}));
  await ipcRenderer.invoke('electron-menu', sources);

}

ipcRenderer.on('menuselect', (event, source) => {
    selectSource(source)
})

// Change the videoSource window to record
async function selectSource(source) {

  videoSelectBtn.innerText = source.name;

  const constraints = {
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: source.id
      }
    }
  };

  // Create a Stream
  const stream = await navigator.mediaDevices
    .getUserMedia(constraints);

  // Preview the source in a video element
  videoElement.srcObject = stream;
  videoElement.play();

  // Create the Media Recorder
  const options = { mimeType: 'video/webm; codecs=vp9' };
  mediaRecorder = new MediaRecorder(stream, options);

  // Register Event Handlers
  mediaRecorder.ondataavailable = handleDataAvailable;
  mediaRecorder.onstop = handleStop;

  // Updates the UI
}

// Captures all recorded chunks
function handleDataAvailable(e) {
  console.log('video data available');
  recordedChunks.push(e.data);
}

// Saves the video file on stop
async function handleStop(e) {
  const blob = new Blob(recordedChunks, {
    type: 'video/webm; codecs=vp9'
  });

  const buffer = Buffer.from(await blob.arrayBuffer());
  
  const filePath = await ipcRenderer.invoke('electron-dialog', 
    {'defaultPath': `myvid-${Date.now()}.webm`, 'buttonLabel': 'Save recorded video'}
  );

  if (filePath) {
    writeFile(filePath, buffer, () => console.log('video saved successfully!'));
  }

}
