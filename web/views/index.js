// Global Variables
let localClientStream;
let webSocket;
let localClientVideo;
let remoteClientVideo;
let peerRef;

window.onload = () => {
  InitApp();
  document.getElementById('chat_message_input').onsubmit = SendMessage;

  // ------ WEBRTC ------------- //
  document.getElementById('createMeeting').onclick = InitiateMeeting;
  document.getElementById('joinMeeting').onclick = InitiateMeeting;

  console.log('about requesting cams');
  openCamera().then((stream) => {
    localClientVideo = document.getElementById('localClientVideo');
    localClientVideo.srcObject = stream;
    localClientStream = stream;

    remoteClientVideo = document.getElementById('remoteClientVideo');
  });

  // -------------------------- //
};

// ----- WEBRTC -----///

const openCamera = async () => {
  if ('mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices) {
    const allDevices = await navigator.mediaDevices.enumerateDevices();

    const cameras = allDevices.filter((device) => device.kind === 'videoinput');

    const constraints = {
      audio: true,
      video: {
        deviceId: cameras[0].deviceId,
      },
    };

    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
      console.log(error);
    }
  }
};

async function InitiateMeeting(e) {
  // create a meeting

  // join a meeting

  e.preventDefault();
  var meetingCodeBox = document.getElementById('meeting_code_box');

  room_id = meetingCodeBox.value;

  if (room_id) {
    console.log('joining a meeting');
    room_id = meetingCodeBox.value;
  } else {
    console.log('creating a meeting');
    const response = await fetch('create-room');
    let data = await response.json();
    room_id = data.room_id;

    meetingCodeBox.value = room_id;
    meetingCodeBox.setAttribute('readonly', true);
  }

  let socket = new WebSocket(
    `ws://${document.location.host}/join-room?roomID=${room_id}`
  );

  webSocket = socket;

  socket.addEventListener('open', () => {
    socket.send(JSON.stringify({ join: true }));
  });

  socket.addEventListener('message', async (e) => {
    const message = JSON.parse(e.data);

    console.log(message);

    if (message.join) {
      console.log('Someone just joined the call');
      callUser();
    }

    if (message.iceCandidate) {
      console.log('recieving and adding ICE candidate');
      try {
        await peerRef.addIceCandidate(message.iceCandidate);
      } catch (error) {
        console.log(error);
      }
    }

    if (message.offer) {
      handleOffer(message.offer, socket);
    }

    if (message.answer) {
      handleAnswer(message.answer);
    }
  });
}

const handleOffer = async (offer, socket) => {
  console.log('recieved an offer, creating an answer');

  peerRef = createPeer();

  await peerRef.setRemoteDescription(new RTCSessionDescription(offer));

  localClientStream.getTracks().forEach((track) => {
    peerRef.addTrack(track, localClientStream);
  });

  const answer = await peerRef.createAnswer();
  await peerRef.setLocalDescription(answer);

  socket.send(JSON.stringify({ answer: peerRef.localDescription }));
};

const handleAnswer = (answer) => {
  peerRef.setRemoteDescription(new RTCSessionDescription(answer));
};

const callUser = () => {
  console.log('calling other remote user');
  peerRef = createPeer();

  localClientStream.getTracks().forEach((track) => {
    peerRef.addTrack(track, localClientStream);
  });
};

const createPeer = () => {
  console.log('creating peer connection');
  const peer = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
  });

  peer.onnegotiationneeded = handleNegotiationNeeded;
  peer.onicecandidate = handleIceCandidate;
  peer.ontrack = handleTrackEvent;

  return peer;
};

const handleNegotiationNeeded = async () => {
  console.log('creating offer');

  try {
    const myOffer = await peerRef.createOffer();
    await peerRef.setLocalDescription(myOffer);
    webSocket.send(JSON.stringify({ offer: peerRef.localDescription }));
  } catch (error) {
    console.log(error);
  }
};

const handleIceCandidate = (e) => {
  console.log('found ice candidate');
  if (e.candidate) {
    webSocket.send(JSON.stringify({ iceCandidate: e.candidate }));
  }
};

const handleTrackEvent = (e) => {
  console.log('Recieved tacks');
  remoteClientVideo.srcObject = e.streams[0];
};
///------------------///

// event class
class Event {
  constructor(payload, type) {
    this.payload = payload;
    this.type = type;
  }
}

class SendMessageEvent {
  constructor(message, from) {
    this.message = message;
    this.from = from;
  }
}

class IncomingMessageEvent {
  constructor(message, from, timeSent) {
    this.message = message;
    this.from = from;
    this.timeSent = timeSent;
  }
}
// ----------------

// global variables
let connection = null;
const SEND_MESSAGE = 'send_message';
const INCOMING_MESSAGE = 'incoming_message';

InitApp = () => {
  console.log('setting up streamify');
  const isConnected = ConnectToWebSocket();

  if (!isConnected) return;

  let status_element = document.getElementById('socket_status');
  status_element.innerHTML =
    'Connected <span class="inline-block w-2 h-2 mr-2 bg-green-600 rounded-full">';

  return;
};

ConnectToWebSocket = () => {
  if (!window['WebSocket']) {
    alert('Unable to proceed, browser does not support websocket');
    return false;
  }

  connection = new WebSocket(`ws://${document.location.host}/ws`);

  connection.onmessage = function (evt) {
    const eventData = JSON.parse(evt.data);
    const event = Object.assign(new Event(), eventData);

    routeEvent(event);
  };
  return true;
};

routeEvent = (event) => {
  if (event.type === undefined) {
    alert('unsupported action');
    return false;
  }

  switch (event.type) {
    case INCOMING_MESSAGE:
      const messageEvent = Object.assign(
        new IncomingMessageEvent(),
        event.payload
      );
      appendChatForDisplay(messageEvent);
      break;
    default:
      alert('unsupported message type');
  }
};

appendChatForDisplay = (messageEvent) => {
  let date = new Date(messageEvent.timeSent);
  const formattedMsgTemplate = `<div class="flex justify-between w-full">
  <p class="flex-auto  w-5/6"><span class="text-sm"></span> ${
    messageEvent.message
  }</p>
  <p class="flext-none w-18 text-sm text-gray-300 italic">${date.toLocaleTimeString()}</p>
</div>`;

  let chatWall = document.getElementById('chat_messages');
  chatWall.innerHTML = chatWall.innerHTML + formattedMsgTemplate;
  chatWall.scrollTop = chatWall.scrollHeight;
};

SendEvent = (eventName, payload) => {
  const event = new Event(payload, eventName);

  connection.send(JSON.stringify(event));
};

SendMessage = () => {
  console.log('sending message');
  const newMessage = document.getElementById('message');
  if (newMessage == null) return false;

  // hardcoded usernames for now
  const outgoingMsgEvent = new SendMessageEvent(newMessage.value, '');

  //create sendMessage event
  SendEvent(SEND_MESSAGE, outgoingMsgEvent);
  return false;
};
